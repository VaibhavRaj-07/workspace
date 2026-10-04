import fs from 'fs';
import path from 'path';

const backendPath = path.resolve('../algo bknd/src/realtime/presence.service.ts');

const code = `import { logger } from '../config/logger.js';

export interface UserPresence {
  userId: string;
  name: string;
  avatarUrl?: string | null;
  socketIds: Set<string>;
  lastSeen: number;
}

export interface TaskEditingSession {
  taskId: string;
  userId: string;
  userName: string;
  userAvatar?: string | null;
  startedAt: number;
  lastHeartbeat: number;
}

class PresenceService {
  // Map: projectId -> Map: userId -> UserPresence
  private projectPresences = new Map<string, Map<string, UserPresence>>();
  // Map: taskId -> TaskEditingSession
  private taskEditingSessions = new Map<string, TaskEditingSession>();

  private LOCK_EXPIRY_MS = 30000; // 30 seconds auto-expiry

  constructor() {
    // Periodic cleanup of stale editing locks
    setInterval(() => {
      this.cleanStaleLocks();
    }, 5000);
  }

  // --- Project Presence ---
  addUserToProject(projectId: string, user: { id: string; name: string; avatarUrl?: string | null }, socketId: string) {
    if (!this.projectPresences.has(projectId)) {
      this.projectPresences.set(projectId, new Map());
    }

    const projectMap = this.projectPresences.get(projectId)!;
    let presence = projectMap.get(user.id);
    if (!presence) {
      presence = {
        userId: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl,
        socketIds: new Set<string>([socketId]),
        lastSeen: Date.now(),
      };
      projectMap.set(user.id, presence);
    } else {
      presence.socketIds.add(socketId);
      presence.lastSeen = Date.now();
      if (user.name) presence.name = user.name;
      if (user.avatarUrl !== undefined) presence.avatarUrl = user.avatarUrl;
    }

    return this.getOnlineUsers(projectId);
  }

  removeUserFromProject(projectId: string, userId: string, socketId?: string) {
    const projectMap = this.projectPresences.get(projectId);
    if (projectMap) {
      const presence = projectMap.get(userId);
      if (presence) {
        if (socketId) {
          presence.socketIds.delete(socketId);
        }
        if (!socketId || presence.socketIds.size === 0) {
          projectMap.delete(userId);
          this.releaseUserTaskLocks(userId);
        }
      }
      if (projectMap.size === 0) {
        this.projectPresences.delete(projectId);
      }
    }
    return this.getOnlineUsers(projectId);
  }

  removeSocketFromAll(socketId: string): { projectId: string; onlineUsers: { userId: string; name: string; avatarUrl?: string | null; lastSeen: number }[] }[] {
    const affectedProjects: { projectId: string; onlineUsers: { userId: string; name: string; avatarUrl?: string | null; lastSeen: number }[] }[] = [];

    for (const [projectId, users] of this.projectPresences.entries()) {
      let changed = false;
      for (const [userId, presence] of users.entries()) {
        if (presence.socketIds.has(socketId)) {
          presence.socketIds.delete(socketId);
          if (presence.socketIds.size === 0) {
            users.delete(userId);
            this.releaseUserTaskLocks(userId);
            changed = true;
          }
        }
      }
      if (changed) {
        affectedProjects.push({
          projectId,
          onlineUsers: this.getOnlineUsers(projectId),
        });
      }
    }

    return affectedProjects;
  }

  getOnlineUsers(projectId: string): { userId: string; name: string; avatarUrl?: string | null; lastSeen: number }[] {
    const map = this.projectPresences.get(projectId);
    if (!map) return [];
    return Array.from(map.values()).map((p) => ({
      userId: p.userId,
      name: p.name,
      avatarUrl: p.avatarUrl,
      lastSeen: p.lastSeen,
    }));
  }

  // --- Task Advisory Lock / Editing State ---
  startEditingTask(
    taskId: string,
    user: { id: string; name: string; avatarUrl?: string | null }
  ): { success: boolean; currentEditor?: TaskEditingSession } {
    const existing = this.taskEditingSessions.get(taskId);
    const now = Date.now();

    if (existing && existing.userId !== user.id && now - existing.lastHeartbeat < this.LOCK_EXPIRY_MS) {
      return { success: false, currentEditor: existing };
    }

    const session: TaskEditingSession = {
      taskId,
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatarUrl,
      startedAt: now,
      lastHeartbeat: now,
    };

    this.taskEditingSessions.set(taskId, session);
    return { success: true, currentEditor: session };
  }

  heartbeatTaskEditing(taskId: string, userId: string): boolean {
    const existing = this.taskEditingSessions.get(taskId);
    if (existing && existing.userId === userId) {
      existing.lastHeartbeat = Date.now();
      return true;
    }
    return false;
  }

  stopEditingTask(taskId: string, userId: string): boolean {
    const existing = this.taskEditingSessions.get(taskId);
    if (existing && existing.userId === userId) {
      this.taskEditingSessions.delete(taskId);
      return true;
    }
    return false;
  }

  getTaskEditor(taskId: string): TaskEditingSession | null {
    const existing = this.taskEditingSessions.get(taskId);
    if (!existing) return null;
    if (Date.now() - existing.lastHeartbeat > this.LOCK_EXPIRY_MS) {
      this.taskEditingSessions.delete(taskId);
      return null;
    }
    return existing;
  }

  private releaseUserTaskLocks(userId: string) {
    for (const [taskId, session] of this.taskEditingSessions.entries()) {
      if (session.userId === userId) {
        this.taskEditingSessions.delete(taskId);
      }
    }
  }

  private cleanStaleLocks() {
    const now = Date.now();
    for (const [taskId, session] of this.taskEditingSessions.entries()) {
      if (now - session.lastHeartbeat > this.LOCK_EXPIRY_MS) {
        logger.debug(\`[Presence] Expired advisory editing lock on task \${taskId} held by \${session.userName}\`);
        this.taskEditingSessions.delete(taskId);
      }
    }
  }
}

export const presenceService = new PresenceService();
`;

fs.writeFileSync(backendPath, code, 'utf8');
console.log('Successfully written presence.service.ts with multi-socket Set');
