import { prisma } from '../db/prisma.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';

export interface ProjectEventPayload {
  seq: number;
  eventType: string;
  projectId: string;
  entity: string;
  entityId: string;
  version?: number;
  actorId?: string;
  timestamp: string;
  data: any;
}

class EventBufferService {
  // In-memory ring buffer per project for ultra-fast replay
  private memoryBuffers = new Map<string, ProjectEventPayload[]>();
  private maxBufferSize = env.SOCKET_EVENT_BUFFER_SIZE || 500;
  // Current sequence per project cache
  private projectSeqCache = new Map<string, number>();
  private initLocks = new Map<string, Promise<number>>();

  async getNextSeq(projectId: string): Promise<number> {
    if (this.projectSeqCache.has(projectId)) {
      const nextSeq = this.projectSeqCache.get(projectId)! + 1;
      this.projectSeqCache.set(projectId, nextSeq);
      return nextSeq;
    }

    if (this.initLocks.has(projectId)) {
      await this.initLocks.get(projectId);
      const nextSeq = (this.projectSeqCache.get(projectId) ?? 0) + 1;
      this.projectSeqCache.set(projectId, nextSeq);
      return nextSeq;
    }

    const initPromise = (async () => {
      let currentSeq = 0;
      try {
        const latestEvent = await prisma.projectEvent.findFirst({
          where: { projectId },
          orderBy: { seq: 'desc' },
          select: { seq: true },
        });
        currentSeq = latestEvent?.seq ?? 0;
      } catch (err) {
        logger.debug('DB sequence lookup fell back to in-memory counter');
      }
      this.projectSeqCache.set(projectId, currentSeq);
      return currentSeq;
    })();

    this.initLocks.set(projectId, initPromise);
    try {
      await initPromise;
    } finally {
      this.initLocks.delete(projectId);
    }

    const nextSeq = (this.projectSeqCache.get(projectId) ?? 0) + 1;
    this.projectSeqCache.set(projectId, nextSeq);
    return nextSeq;
  }

  async recordEvent(event: ProjectEventPayload): Promise<void> {
    // 1. Add to in-memory buffer
    if (!this.memoryBuffers.has(event.projectId)) {
      this.memoryBuffers.set(event.projectId, []);
    }
    const buffer = this.memoryBuffers.get(event.projectId)!;
    buffer.push(event);
    if (buffer.length > this.maxBufferSize) {
      buffer.shift();
    }

    // 2. Persist to DB for durable history and long reconnects
    try {
      await prisma.projectEvent.create({
        data: {
          projectId: event.projectId,
          seq: event.seq,
          eventType: event.eventType,
          actorId: event.actorId,
          payload: event as any,
          createdAt: new Date(event.timestamp),
        },
      });
    } catch (err) {
      logger.error({ err, event }, 'Failed to persist project event in database');
    }
  }

  /**
   * Replays events from lastSeq + 1 up to latest.
   * If gap is beyond maxBufferSize / historical limit, returns { syncRequired: true }
   */
  async getEventsSince(
    projectId: string,
    lastSeq: number
  ): Promise<{ events: ProjectEventPayload[]; syncRequired: boolean; currentSeq: number }> {
    const memoryBuffer = this.memoryBuffers.get(projectId) || [];
    let currentSeq = this.projectSeqCache.get(projectId) || 0;

    try {
      const latestEvent = await prisma.projectEvent.findFirst({
        where: { projectId },
        orderBy: { seq: 'desc' },
        select: { seq: true },
      });
      if (latestEvent) currentSeq = latestEvent.seq;
    } catch (err) {
      // Fall back to memory buffer seq
    }

    if (lastSeq >= currentSeq) {
      return { events: [], syncRequired: false, currentSeq };
    }

    // Check if gap is too large (> 500 events)
    if (currentSeq - lastSeq > this.maxBufferSize) {
      return { events: [], syncRequired: true, currentSeq };
    }

    // Check memory buffer first
    if (memoryBuffer.length > 0 && memoryBuffer[0].seq <= lastSeq + 1) {
      const missed = memoryBuffer.filter((e) => e.seq > lastSeq);
      return { events: missed, syncRequired: false, currentSeq };
    }

    // Fallback to database query
    try {
      const dbEvents = await prisma.projectEvent.findMany({
        where: {
          projectId,
          seq: { gt: lastSeq },
        },
        orderBy: { seq: 'asc' },
        take: this.maxBufferSize,
      });

      const parsedEvents: ProjectEventPayload[] = dbEvents.map(
        (e) => e.payload as unknown as ProjectEventPayload
      );
      return { events: parsedEvents, syncRequired: false, currentSeq };
    } catch (err) {
      return { events: memoryBuffer.filter((e) => e.seq > lastSeq), syncRequired: false, currentSeq };
    }
  }
}

export const eventBufferService = new EventBufferService();
