'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { tokenStorage } from '@/lib/api/client';
import { toast } from '@/stores/toast-store';
import {
  ProjectEventPayload,
  OnlineUser,
  ProjectJoinAck,
  TaskEditingEventData,
  TaskRiskUpdatedEventData,
} from '@/types/socket';
import { Task, Comment, Attachment, Notification } from '@/types/api';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:5000';

export interface PeerEditingState {
  taskId: string;
  userId: string;
  userName: string;
  avatarUrl?: string | null;
  timestamp: number;
}

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  activeProjectId: string | null;
  setActiveProject: (projectId: string | null) => void;
  onlineUsers: OnlineUser[];
  peerEditingMap: Record<string, PeerEditingState>; // taskId -> editing state
  lastSeqMap: Record<string, number>; // projectId -> lastSeq
  isResynced: boolean;
  startEditingTask: (taskId: string, projectId: string) => void;
  stopEditingTask: (taskId: string, projectId: string) => void;
  highlightedTaskId: string | null;
  lastUpdatedActorName: string | null;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
  activeProjectId: null,
  setActiveProject: () => {},
  onlineUsers: [],
  peerEditingMap: {},
  lastSeqMap: {},
  isResynced: false,
  startEditingTask: () => {},
  stopEditingTask: () => {},
  highlightedTaskId: null,
  lastUpdatedActorName: null,
});

export const useSocket = () => useContext(SocketContext);

function normalizeOnlineUsers(rawUsers: any[], currentUser: any): OnlineUser[] {
  const map = new Map<string, OnlineUser>();
  if (currentUser && currentUser.id) {
    map.set(currentUser.id, {
      userId: currentUser.id,
      name: currentUser.name || 'You',
      avatarUrl: currentUser.avatarUrl || null,
      lastSeen: Date.now(),
    });
  }
  if (Array.isArray(rawUsers)) {
    rawUsers.forEach((u) => {
      const id = u.userId || u.id;
      if (id) {
        map.set(id, {
          userId: id,
          name: u.name || (currentUser && id === currentUser.id ? currentUser.name : 'Collaborator'),
          avatarUrl: u.avatarUrl || null,
          lastSeen: u.lastSeen || Date.now(),
        });
      }
    });
  }
  return Array.from(map.values());
}

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [peerEditingMap, setPeerEditingMap] = useState<Record<string, PeerEditingState>>({});
  const [lastSeqMap, setLastSeqMap] = useState<Record<string, number>>({});
  const [isResynced, setIsResynced] = useState(false);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  const [lastUpdatedActorName, setLastUpdatedActorName] = useState<string | null>(null);

  const activeProjectIdRef = useRef<string | null>(null);
  const lastSeqMapRef = useRef<Record<string, number>>({});
  const userRef = useRef<any>(user);
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const editingHeartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const currentEditingTaskRef = useRef<{ taskId: string; projectId: string } | null>(null);

  useEffect(() => {
    userRef.current = user;
    if (user && isConnected && onlineUsers.length === 0) {
      setOnlineUsers(normalizeOnlineUsers([], user));
    }
  }, [user, isConnected, onlineUsers.length]);

  useEffect(() => {
    activeProjectIdRef.current = activeProjectId;
  }, [activeProjectId]);

  useEffect(() => {
    lastSeqMapRef.current = lastSeqMap;
  }, [lastSeqMap]);

  // Join project room implementation with ACK & replay handling
  const joinProjectRoom = useCallback(
    (projectId: string, lastSeq: number = 0) => {
      const s = socketRef.current;
      if (!s || !s.connected) return;

      s.emit(
        'project:join',
        { projectId, lastSeq },
        (ack: ProjectJoinAck) => {
          if (ack && ack.success) {
            setLastSeqMap((prev) => ({
              ...prev,
              [projectId]: ack.currentSeq || 0,
            }));

            const merged = normalizeOnlineUsers(ack.onlineUsers || [], userRef.current);
            setOnlineUsers(merged);

            if (ack.missedEvents && ack.missedEvents.length > 0) {
              setIsResynced(true);
              setTimeout(() => setIsResynced(false), 4000);
              toast.success(
                '✦ RESYNCED',
                `Replayed ${ack.missedEvents.length} missed workspace stream event(s).`
              );
            }

            if (ack.syncRequired) {
              queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
              queryClient.invalidateQueries({ queryKey: ['project-progress', projectId] });
              setIsResynced(true);
              setTimeout(() => setIsResynced(false), 4000);
              toast.info('✦ RESYNCED', 'Full workspace snapshot re-synchronized from server.');
            }
          }
        }
      );
    },
    [queryClient]
  );

  // Initialize Socket connection on auth
  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    const token = tokenStorage.getAccessToken();
    if (!token) return;

    const socketInstance = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socketInstance;

    socketInstance.on('connect', () => {
      setIsConnected(true);
      // Immediately normalize user in presence
      setOnlineUsers((prev) => normalizeOnlineUsers(prev, userRef.current));

      // Re-join active project room if present
      if (activeProjectIdRef.current) {
        const lastSeq = lastSeqMapRef.current[activeProjectIdRef.current] || 0;
        joinProjectRoom(activeProjectIdRef.current, lastSeq);
      }
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (err) => {
      console.warn('[Socket Connection Error]:', err.message);
    });

    // Handle Project-Level and Notification broadcast events
    const handleProjectEvent = (payload: ProjectEventPayload) => {
      if (!payload || !payload.eventType) return;

      const { seq, eventType, projectId, entityId, actorId, data } = payload;

      // Update sequence tracking
      if (projectId && seq) {
        setLastSeqMap((prev) => ({
          ...prev,
          [projectId]: Math.max(prev[projectId] || 0, seq),
        }));
      }

      const isMyAction = actorId && userRef.current && actorId === userRef.current.id;

      // Flash highlight on task modified by peer
      if (!isMyAction && (eventType === 'task:updated' || eventType === 'task:moved' || eventType === 'task:created')) {
        setHighlightedTaskId(entityId);
        if (data?.task?.assignee?.name || data?.actorName) {
          setLastUpdatedActorName(data.actorName || 'Team member');
        }
        setTimeout(() => setHighlightedTaskId(null), 3000);
      }

      switch (eventType) {
        case 'task:created': {
          if (data?.task) {
            queryClient.setQueryData<Task[]>(['tasks', projectId], (old) => {
              if (!old) return [data.task];
              if (old.some((t) => t.id === data.task.id)) return old;
              return [data.task, ...old];
            });
            queryClient.invalidateQueries({ queryKey: ['project-progress', projectId] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
          }
          break;
        }

        case 'task:updated': {
          const updatedTask: Task = data?.task || data;
          if (updatedTask && updatedTask.id) {
            queryClient.setQueryData<Task[]>(['tasks', projectId], (old) => {
              if (!old) return [updatedTask];
              return old.map((t) => {
                if (t.id === updatedTask.id) {
                  if (t.version && updatedTask.version && updatedTask.version < t.version) {
                    return t;
                  }
                  return { ...t, ...updatedTask };
                }
                return t;
              });
            });

            queryClient.setQueryData<Task>(['task', updatedTask.id], (old) => {
              if (!old) return updatedTask;
              if (old.version && updatedTask.version && updatedTask.version < old.version) {
                return old;
              }
              return { ...old, ...updatedTask };
            });

            if (data?.autoMerged && !isMyAction) {
              toast.merged(
                'AUTO-MERGED CONCURRENT EDIT',
                `Changes to "${updatedTask.title}" were merged cleanly without conflicts.`
              );
            }
          }
          break;
        }

        case 'task:moved': {
          const movedTask: Task = data?.task || data;
          if (movedTask && movedTask.id) {
            queryClient.setQueryData<Task[]>(['tasks', projectId], (old) => {
              if (!old) return [movedTask];
              return old.map((t) => (t.id === movedTask.id ? { ...t, ...movedTask } : t));
            });
          }
          break;
        }

        case 'task:deleted': {
          queryClient.setQueryData<Task[]>(['tasks', projectId], (old) => {
            if (!old) return [];
            return old.filter((t) => t.id !== entityId);
          });
          queryClient.invalidateQueries({ queryKey: ['project-progress', projectId] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
          break;
        }

        case 'comment:created': {
          const newComment: Comment = data?.comment || data?.data?.comment || data?.data || data;
          const targetTaskId = newComment?.taskId || data?.taskId || data?.data?.taskId || entityId;
          if (targetTaskId && newComment?.id) {
            queryClient.setQueryData<Comment[]>(['comments', targetTaskId], (old) => {
              if (!old) return [newComment];
              if (old.some((c) => c.id === newComment.id)) return old;
              return [...old, newComment];
            });
            queryClient.invalidateQueries({ queryKey: ['comments', targetTaskId] });
          } else if (targetTaskId) {
            queryClient.invalidateQueries({ queryKey: ['comments', targetTaskId] });
          }
          break;
        }

        case 'comment:updated': {
          const updatedComment: Comment = data?.comment || data?.data?.comment || data?.data || data;
          const targetTaskId = updatedComment?.taskId || data?.taskId || data?.data?.taskId || entityId;
          if (targetTaskId && updatedComment?.id) {
            queryClient.setQueryData<Comment[]>(['comments', targetTaskId], (old) => {
              if (!old) return [updatedComment];
              return old.map((c) => (c.id === updatedComment.id ? updatedComment : c));
            });
            queryClient.invalidateQueries({ queryKey: ['comments', targetTaskId] });
          }
          break;
        }

        case 'comment:deleted': {
          const targetTaskId = data?.taskId || data?.data?.taskId;
          if (targetTaskId) {
            queryClient.setQueryData<Comment[]>(['comments', targetTaskId], (old) => {
              if (!old) return [];
              return old.filter((c) => c.id !== entityId);
            });
            queryClient.invalidateQueries({ queryKey: ['comments', targetTaskId] });
          }
          break;
        }

        case 'attachment:added': {
          const att = data?.attachment || data?.data?.attachment || data?.data || data;
          const targetTaskId = att?.taskId || data?.taskId || data?.data?.taskId;
          if (targetTaskId && att?.id) {
            queryClient.setQueryData<Attachment[]>(['attachments', targetTaskId], (old) => {
              if (!old) return [att];
              if (old.some((a) => a.id === att.id)) return old;
              return [...old, att];
            });
            queryClient.invalidateQueries({ queryKey: ['attachments', targetTaskId] });
          }
          break;
        }

        case 'attachment:removed': {
          const targetTaskId = data?.taskId || data?.data?.taskId;
          if (targetTaskId) {
            queryClient.setQueryData<Attachment[]>(['attachments', targetTaskId], (old) => {
              if (!old) return [];
              return old.filter((a) => a.id !== entityId);
            });
            queryClient.invalidateQueries({ queryKey: ['attachments', targetTaskId] });
          }
          break;
        }

        case 'presence:update': {
          if (data?.onlineUsers) {
            const merged = normalizeOnlineUsers(data.onlineUsers, userRef.current);
            setOnlineUsers(merged);
          }
          break;
        }

        case 'task:editing': {
          const editingData = data as TaskEditingEventData;
          if (editingData && editingData.taskId) {
            if (editingData.isEditing) {
              setPeerEditingMap((prev) => ({
                ...prev,
                [editingData.taskId]: {
                  taskId: editingData.taskId,
                  userId: editingData.userId,
                  userName: editingData.userName || 'Peer',
                  avatarUrl: editingData.avatarUrl,
                  timestamp: Date.now(),
                },
              }));
            } else {
              setPeerEditingMap((prev) => {
                const next = { ...prev };
                delete next[editingData.taskId];
                return next;
              });
            }
          }
          break;
        }

        case 'task:risk_updated': {
          const riskData = data as TaskRiskUpdatedEventData;
          if (riskData && riskData.taskId) {
            queryClient.setQueryData(['task-risk', riskData.taskId], riskData);
            queryClient.invalidateQueries({ queryKey: ['project-risk', projectId] });
          }
          break;
        }

        case 'notification:new': {
          const notif = data as Notification;
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          toast.info('NEW NOTIFICATION', notif?.payload?.message || notif?.type || 'Workspace update');
          break;
        }

        case 'project:updated': {
          queryClient.invalidateQueries({ queryKey: ['project', projectId] });
          queryClient.invalidateQueries({ queryKey: ['projects'] });
          break;
        }

        case 'member:added':
        case 'member:updated':
        case 'member:removed': {
          queryClient.invalidateQueries({ queryKey: ['project', projectId] });
          break;
        }

        default:
          break;
      }
    };

    const eventTypes = [
      'task:created',
      'task:updated',
      'task:moved',
      'task:deleted',
      'comment:created',
      'comment:updated',
      'comment:deleted',
      'attachment:added',
      'attachment:removed',
      'member:added',
      'member:updated',
      'member:removed',
      'project:updated',
      'presence:update',
      'task:editing',
      'task:risk_updated',
      'notification:new',
    ];

    eventTypes.forEach((evt) => {
      socketInstance.on(evt, (data: any) => {
        handleProjectEvent({
          seq: data.seq || 0,
          eventType: evt as any,
          projectId: data.projectId || activeProjectIdRef.current || '',
          entity: data.entity || 'task',
          entityId: data.entityId || data.taskId || data.id,
          actorId: data.actorId,
          version: data.version,
          timestamp: data.timestamp || new Date().toISOString(),
          data,
        });
      });
    });

    return () => {
      if (editingHeartbeatRef.current) {
        clearInterval(editingHeartbeatRef.current);
      }
      socketInstance.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, user?.id, joinProjectRoom]);

  // Active Project Management with debounce to avoid StrictMode churn
  const setActiveProject = useCallback(
    (projectId: string | null) => {
      if (leaveTimeoutRef.current) {
        clearTimeout(leaveTimeoutRef.current);
        leaveTimeoutRef.current = null;
      }

      const prevProjectId = activeProjectIdRef.current;

      if (!projectId) {
        // Debounce leaving to handle quick React StrictMode unmount/remount
        leaveTimeoutRef.current = setTimeout(() => {
          if (prevProjectId && socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('project:leave', { projectId: prevProjectId });
          }
          activeProjectIdRef.current = null;
          setActiveProjectId(null);
          setOnlineUsers(normalizeOnlineUsers([], userRef.current));
          setPeerEditingMap({});
        }, 150);
        return;
      }

      if (prevProjectId && prevProjectId !== projectId && socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('project:leave', { projectId: prevProjectId });
      }

      activeProjectIdRef.current = projectId;
      setActiveProjectId(projectId);
      setOnlineUsers(normalizeOnlineUsers([], userRef.current));

      const lastSeq = lastSeqMapRef.current[projectId] || 0;
      joinProjectRoom(projectId, lastSeq);
    },
    [joinProjectRoom]
  );

  // Advisory Editing Lock Controls
  const startEditingTask = useCallback((taskId: string, projectId: string) => {
    if (!socketRef.current || !socketRef.current.connected) return;

    currentEditingTaskRef.current = { taskId, projectId };
    socketRef.current.emit('task:editing:start', { taskId, projectId });

    if (editingHeartbeatRef.current) {
      clearInterval(editingHeartbeatRef.current);
    }

    editingHeartbeatRef.current = setInterval(() => {
      if (socketRef.current && socketRef.current.connected && currentEditingTaskRef.current) {
        socketRef.current.emit('task:editing:heartbeat', {
          taskId: currentEditingTaskRef.current.taskId,
        });
      }
    }, 10000);
  }, []);

  const stopEditingTask = useCallback((taskId: string, projectId: string) => {
    if (editingHeartbeatRef.current) {
      clearInterval(editingHeartbeatRef.current);
      editingHeartbeatRef.current = null;
    }
    currentEditingTaskRef.current = null;

    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('task:editing:stop', { taskId, projectId });
    }
  }, []);

  // Clean stale peer editing locks after 30s
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setPeerEditingMap((prev) => {
        let changed = false;
        const next = { ...prev };
        Object.entries(next).forEach(([taskId, state]) => {
          if (now - state.timestamp > 30000) {
            delete next[taskId];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 5000);

    return () => clearInterval(cleanupInterval);
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        isConnected,
        activeProjectId,
        setActiveProject,
        onlineUsers,
        peerEditingMap,
        lastSeqMap,
        isResynced,
        startEditingTask,
        stopEditingTask,
        highlightedTaskId,
        lastUpdatedActorName,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
