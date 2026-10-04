export type EventType =
  | 'task:created'
  | 'task:updated'
  | 'task:moved'
  | 'task:deleted'
  | 'comment:created'
  | 'comment:updated'
  | 'comment:deleted'
  | 'attachment:added'
  | 'attachment:removed'
  | 'member:added'
  | 'member:updated'
  | 'member:removed'
  | 'project:updated'
  | 'presence:update'
  | 'task:editing'
  | 'task:risk_updated'
  | 'notification:new';

export interface ProjectEventPayload<T = any> {
  seq: number;
  eventType: EventType;
  projectId: string;
  entity: 'task' | 'comment' | 'attachment' | 'project_member' | 'project' | 'notification';
  entityId: string;
  version?: number;
  actorId?: string;
  timestamp: string;
  data: T;
}

export interface OnlineUser {
  userId: string;
  name: string;
  avatarUrl?: string | null;
  lastSeen: number;
  status?: string;
}

export interface ProjectJoinAck {
  success: boolean;
  projectId: string;
  currentSeq: number;
  missedEvents: ProjectEventPayload[];
  syncRequired: boolean;
  onlineUsers: OnlineUser[];
}

export interface TaskEditingEventData {
  taskId: string;
  projectId: string;
  userId: string;
  userName: string;
  avatarUrl?: string | null;
  isEditing: boolean;
  timestamp: string;
}

export interface TaskRiskUpdatedEventData {
  taskId: string;
  riskProbability: number;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  topFactors: Array<{
    feature: string;
    importance: number;
    impact: 'increases_risk' | 'decreases_risk';
    reason: string;
  }>;
  confidence: number;
}
