import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { socketAuthMiddleware } from './socket.auth.js';
import { realtimeEmitter } from './event.emitter.js';
import { presenceService } from './presence.service.js';
import { eventBufferService } from './event.buffer.js';
import { prisma } from '../db/prisma.js';

export function initializeSocketServer(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  // Attach emitter
  realtimeEmitter.setIO(io);

  // Authentication middleware
  io.use(socketAuthMiddleware);

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user;
    logger.info(`[Socket.IO] User connected: ${user.name} (${user.id}), socketId: ${socket.id}`);

    // Join personal user room for direct notifications
    const userRoom = `user:${user.id}`;
    socket.join(userRoom);

    // --- PROJECT ROOM JOINING & RESYNC ---
    socket.on(
      'project:join',
      async (data: { projectId: string; lastSeq?: number }, callback?: Function) => {
        try {
          const { projectId, lastSeq } = data;
          if (!projectId) {
            if (callback) callback({ error: 'projectId is required' });
            return;
          }

          // Verify user is a member of the project
          const membership = await prisma.projectMember.findUnique({
            where: {
              projectId_userId: {
                projectId,
                userId: user.id,
              },
            },
          });

          if (!membership) {
            if (callback) callback({ error: 'Unauthorized: not a member of project' });
            return;
          }

          const projectRoom = `project:${projectId}`;
          socket.join(projectRoom);

          // Update presence
          const onlineUsers = presenceService.addUserToProject(
            projectId,
            { id: user.id, name: user.name },
            socket.id
          );

          // Broadcast presence update to project room
          io.to(projectRoom).emit('presence:update', {
            projectId,
            onlineUsers,
            actor: user,
            action: 'joined',
            timestamp: new Date().toISOString(),
          });

          // Check if replay is needed
          let resyncInfo = {
            events: [] as any[],
            syncRequired: false,
            currentSeq: 0,
          };

          if (typeof lastSeq === 'number') {
            resyncInfo = await eventBufferService.getEventsSince(projectId, lastSeq);
          }

          logger.info(`[Socket.IO] User ${user.name} joined room ${projectRoom}`);

          if (callback) {
            callback({
              success: true,
              projectId,
              currentSeq: resyncInfo.currentSeq,
              missedEvents: resyncInfo.events,
              syncRequired: resyncInfo.syncRequired,
              onlineUsers,
            });
          }
        } catch (error: any) {
          logger.error({ error }, 'Error joining project room');
          if (callback) callback({ error: error.message || 'Failed to join project room' });
        }
      }
    );

    // --- PROJECT ROOM LEAVE ---
    socket.on('project:leave', (data: { projectId: string }, callback?: Function) => {
      const { projectId } = data;
      if (!projectId) return;

      const projectRoom = `project:${projectId}`;
      socket.leave(projectRoom);

      const onlineUsers = presenceService.removeUserFromProject(projectId, user.id, socket.id);
      io.to(projectRoom).emit('presence:update', {
        projectId,
        onlineUsers,
        actor: user,
        action: 'left',
        timestamp: new Date().toISOString(),
      });

      logger.info(`[Socket.IO] User ${user.name} left room ${projectRoom}`);
      if (callback) callback({ success: true });
    });

    // --- SOFT TASK LOCKING / ADVISORY PRESENCE ---
    socket.on(
      'task:editing:start',
      (data: { taskId: string; projectId: string }, callback?: Function) => {
        const { taskId, projectId } = data;
        if (!taskId || !projectId) return;

        const result = presenceService.startEditingTask(taskId, {
          id: user.id,
          name: user.name,
        });

        // Broadcast to project room
        io.to(`project:${projectId}`).emit('task:editing', {
          taskId,
          projectId,
          isEditing: true,
          editor: result.currentEditor,
          timestamp: new Date().toISOString(),
        });

        if (callback) {
          callback({
            success: result.success,
            editor: result.currentEditor,
          });
        }
      }
    );

    socket.on('task:editing:heartbeat', (data: { taskId: string }) => {
      const { taskId } = data;
      if (taskId) {
        presenceService.heartbeatTaskEditing(taskId, user.id);
      }
    });

    socket.on(
      'task:editing:stop',
      (data: { taskId: string; projectId: string }, callback?: Function) => {
        const { taskId, projectId } = data;
        if (!taskId || !projectId) return;

        presenceService.stopEditingTask(taskId, user.id);

        // Broadcast release to project room
        io.to(`project:${projectId}`).emit('task:editing', {
          taskId,
          projectId,
          isEditing: false,
          editor: null,
          timestamp: new Date().toISOString(),
        });

        if (callback) callback({ success: true });
      }
    );

    // --- DISCONNECT HANDLING ---
    socket.on('disconnect', () => {
      logger.info(`[Socket.IO] User disconnected: ${user.name} (${user.id})`);
      const affected = presenceService.removeSocketFromAll(socket.id);

      for (const item of affected) {
        io.to(`project:${item.projectId}`).emit('presence:update', {
          projectId: item.projectId,
          onlineUsers: item.onlineUsers,
          actor: user,
          action: 'disconnected',
          timestamp: new Date().toISOString(),
        });
      }
    });
  });

  return io;
}
