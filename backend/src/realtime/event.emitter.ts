import { Server as SocketIOServer } from 'socket.io';
import { eventBufferService, ProjectEventPayload } from './event.buffer.js';
import { logger } from '../config/logger.js';

class RealtimeEventEmitter {
  private io: SocketIOServer | null = null;

  setIO(io: SocketIOServer) {
    this.io = io;
  }

  getIO(): SocketIOServer | null {
    return this.io;
  }

  /**
   * Broadcast an event to a project room with monotonic sequence number
   */
  async emitProjectEvent(params: {
    projectId: string;
    eventType: string;
    entity: string;
    entityId: string;
    version?: number;
    actorId?: string;
    data: any;
  }): Promise<ProjectEventPayload> {
    const seq = await eventBufferService.getNextSeq(params.projectId);
    const eventPayload: ProjectEventPayload = {
      seq,
      eventType: params.eventType,
      projectId: params.projectId,
      entity: params.entity,
      entityId: params.entityId,
      version: params.version,
      actorId: params.actorId,
      timestamp: new Date().toISOString(),
      data: params.data,
    };

    // Save to event buffer (memory + DB)
    await eventBufferService.recordEvent(eventPayload);

    // Emit to project room
    if (this.io) {
      const room = `project:${params.projectId}`;
      this.io.to(room).emit(params.eventType, eventPayload);
      logger.debug(`[Socket.IO] Emitted '${params.eventType}' (seq #${seq}) to room '${room}'`);
    }

    return eventPayload;
  }

  /**
   * Emit a direct notification to a specific user room
   */
  emitUserEvent(userId: string, eventType: string, data: any) {
    if (this.io) {
      const room = `user:${userId}`;
      this.io.to(room).emit(eventType, {
        eventType,
        userId,
        timestamp: new Date().toISOString(),
        data,
      });
      logger.debug(`[Socket.IO] Emitted '${eventType}' to user room '${room}'`);
    }
  }
}

export const realtimeEmitter = new RealtimeEventEmitter();
