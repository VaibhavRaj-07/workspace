export type ProjectRole = 'owner' | 'admin' | 'member' | 'viewer';
export type ProjectStatus = 'active' | 'archived' | 'completed';
export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  joinedAt: string;
  user: User;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  ownerId: string;
  deadline?: string | null;
  status: ProjectStatus;
  autoCompleteWhenAllDone: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  owner?: User;
  members?: ProjectMember[];
  tasks?: Task[];
  _count?: {
    tasks?: number;
    members?: number;
  };
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string | null;
  createdById: string;
  dueDate?: string | null;
  position: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  assignee?: User | null;
  createdBy?: User;
  project?: {
    id: string;
    name: string;
    autoCompleteWhenAllDone?: boolean;
  };
  comments?: Comment[];
  attachments?: Attachment[];
  fieldHistories?: TaskFieldHistory[];
}

export interface TaskFieldHistory {
  id: string;
  taskId: string;
  fromVersion: number;
  toVersion: number;
  changedFields: string[];
  diff: Record<string, any>;
  actorId: string;
  createdAt: string;
  actor?: User;
}

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  version: number;
  createdAt: string;
  editedAt?: string | null;
  author: User;
}

export interface Attachment {
  id: string;
  taskId: string;
  uploadedById: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  uploadedBy?: User;
}

export interface ActivityLog {
  id: string;
  projectId: string;
  taskId?: string | null;
  actorId: string;
  action: string;
  metadata: Record<string, any>;
  createdAt: string;
  actor: User;
  task?: {
    id: string;
    title: string;
  } | null;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  payload: Record<string, any>;
  readAt?: string | null;
  createdAt: string;
}

export interface PaginationMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
  nextCursor?: string | null;
}

export interface ApiResponse<T = any> {
  success?: boolean;
  data: T;
  pagination?: PaginationMeta;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface ConflictDetails {
  currentTask: Task;
  yourChanges: Partial<Task>;
  conflictingFields: string[];
  aiSuggestionAvailable?: boolean;
}

export interface DashboardOverview {
  myTasksCount: number;
  overdueTasksCount: number;
  dueThisWeekCount: number;
  tasksByStatus: Record<TaskStatus, number>;
  tasksByPriority: Record<TaskPriority, number>;
  assignedTasks: Task[];
  recentProjects: Project[];
  atRiskTasks?: TaskRiskData[];
}

export interface ProjectProgress {
  projectId: string;
  completionRate: number;
  totalTasks: number;
  doneTasks: number;
  inProgressTasks: number;
  inReviewTasks: number;
  todoTasks: number;
  overdueCount: number;
  daysToDeadline: number | null;
  tasksByAssignee: Array<{
    userId: string | null;
    userName: string;
    avatarUrl?: string | null;
    taskCount: number;
    completedCount: number;
  }>;
}

export interface TaskRiskFactor {
  feature: string;
  importance: number;
  impact: 'increases_risk' | 'decreases_risk';
  reason: string;
}

export interface TaskRiskData {
  taskId: string;
  riskProbability: number;
  riskScore: number;
  riskLevel: RiskLevel;
  topFactors: TaskRiskFactor[];
  confidence: number;
  available?: boolean;
}

export interface ProjectRiskData {
  projectId: string;
  overallRiskScore: number;
  overallRiskLevel: RiskLevel;
  atRiskTasksCount: number;
  topAtRiskTasks: Array<{
    task: Task;
    riskScore: number;
    riskLevel: RiskLevel;
    topFactors: TaskRiskFactor[];
  }>;
  available?: boolean;
}

export interface AssigneeCandidate {
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  overallScore: number;
  fitPercentage: number;
  reasons: string[];
  breakdown: {
    domainFit: number;
    workloadScore: number;
    reliabilityScore: number;
  };
}

export interface SimilarTaskMatch {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee?: User | null;
  similarityScore: number;
  similarityPercentage: number;
}

export interface AIMergeFieldSuggestion {
  field: string;
  mergedValue: string;
  explanation: string;
  confidence: number;
  strategyUsed: string;
}

export interface AIMergeResponse {
  taskId: string;
  available: boolean;
  suggestions: Record<string, AIMergeFieldSuggestion>;
}
