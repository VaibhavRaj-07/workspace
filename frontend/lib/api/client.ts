import { v4 as uuidv4 } from 'uuid';
import {
  User,
  Project,
  Task,
  Comment,
  Attachment,
  ActivityLog,
  Notification,
  DashboardOverview,
  ProjectProgress,
  TaskRiskData,
  ProjectRiskData,
  AssigneeCandidate,
  SimilarTaskMatch,
  AIMergeResponse,
  ApiResponse,
  ProjectRole,
  TaskStatus,
  TaskPriority,
} from '@/types/api';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export class ApiErrorInstance extends Error {
  public code: string;
  public status: number;
  public details?: any;

  constructor(status: number, code: string, message: string, details?: any) {
    super(message);
    this.name = 'ApiErrorInstance';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// In-memory token management with local backup for page reloads
let inMemoryAccessToken: string | null = null;

export const tokenStorage = {
  getAccessToken(): string | null {
    if (inMemoryAccessToken) return inMemoryAccessToken;
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('algo_access_token');
    }
    return null;
  },
  setAccessToken(token: string | null) {
    inMemoryAccessToken = token;
    if (typeof window !== 'undefined') {
      if (token) {
        sessionStorage.setItem('algo_access_token', token);
      } else {
        sessionStorage.removeItem('algo_access_token');
      }
    }
  },
  getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('algo_refresh_token');
    }
    return null;
  },
  setRefreshToken(token: string | null) {
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('algo_refresh_token', token);
      } else {
        localStorage.removeItem('algo_refresh_token');
      }
    }
  },
  clear() {
    inMemoryAccessToken = null;
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('algo_access_token');
      localStorage.removeItem('algo_refresh_token');
    }
  },
};

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

interface RequestOptions extends RequestInit {
  idempotencyKey?: string;
  version?: number;
  skipAuth?: boolean;
  isRetry?: boolean;
}

export async function apiClient<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    idempotencyKey,
    version,
    skipAuth = false,
    isRetry = false,
    headers: customHeaders,
    ...restOptions
  } = options;

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const headers = new Headers(customHeaders);

  // Set default Content-Type for JSON payloads if not FormData
  if (!(restOptions.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Attach JWT
  if (!skipAuth) {
    const token = tokenStorage.getAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  // Attach Idempotency-Key for POST requests
  if (restOptions.method === 'POST') {
    const key = idempotencyKey || uuidv4();
    headers.set('Idempotency-Key', key);
  }

  // Attach If-Match header if version is provided
  if (version !== undefined && (restOptions.method === 'PATCH' || restOptions.method === 'PUT')) {
    headers.set('If-Match', String(version));
  }

  try {
    const response = await fetch(url, {
      ...restOptions,
      headers,
    });

    if (response.status === 204) {
      return {} as T;
    }

    // Handle 401 Unauthorized -> Attempt single refresh
    if (response.status === 401 && !skipAuth && !isRetry && endpoint !== '/auth/refresh' && endpoint !== '/auth/login') {
      if (!isRefreshing) {
        isRefreshing = true;
        const refreshToken = tokenStorage.getRefreshToken();
        if (refreshToken) {
          try {
            const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken }),
            });

            if (refreshRes.ok) {
              const refreshJson = await refreshRes.json();
              const newAccessToken = refreshJson.data?.tokens?.accessToken || refreshJson.data?.accessToken;
              const newRefreshToken = refreshJson.data?.tokens?.refreshToken || refreshJson.data?.refreshToken;
              tokenStorage.setAccessToken(newAccessToken);
              if (newRefreshToken) {
                tokenStorage.setRefreshToken(newRefreshToken);
              }
              isRefreshing = false;
              onRefreshed(newAccessToken);
              return apiClient<T>(endpoint, { ...options, isRetry: true });
            } else {
              isRefreshing = false;
              tokenStorage.clear();
              if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
                window.location.href = '/login';
              }
            }
          } catch (e) {
            isRefreshing = false;
            tokenStorage.clear();
          }
        } else {
          isRefreshing = false;
          tokenStorage.clear();
        }
      } else {
        // Queue the request until refresh completes
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((newToken: string) => {
            apiClient<T>(endpoint, { ...options, isRetry: true })
              .then(resolve)
              .catch(reject);
          });
        });
      }
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const err = data.error || {};
      const code = err.code || `HTTP_${response.status}`;
      const message = err.message || response.statusText || 'An error occurred';
      const details = err.details;
      throw new ApiErrorInstance(response.status, code, message, details);
    }

    return (data.data !== undefined ? data.data : data) as T;
  } catch (error: any) {
    if (error instanceof ApiErrorInstance) {
      throw error;
    }
    throw new ApiErrorInstance(
      0,
      'NETWORK_ERROR',
      error.message || 'Network request failed',
      error
    );
  }
}

// ----------------------------------------------------------------------
// Specific API Resource Methods
// ----------------------------------------------------------------------

export const api = {
  // Auth
  auth: {
    login: (body: { email: string; password: string }) =>
      apiClient<{ user: User; accessToken: string; refreshToken: string }>(
        '/auth/login',
        { method: 'POST', body: JSON.stringify(body), skipAuth: true }
      ),
    register: (body: { name: string; email: string; password: string; avatarUrl?: string }) =>
      apiClient<{ user: User; accessToken: string; refreshToken: string }>(
        '/auth/register',
        { method: 'POST', body: JSON.stringify(body), skipAuth: true }
      ),
    refresh: (refreshToken: string) =>
      apiClient<{ accessToken: string; refreshToken: string }>(
        '/auth/refresh',
        { method: 'POST', body: JSON.stringify({ refreshToken }), skipAuth: true }
      ),
    me: () => apiClient<User>('/auth/me'),
  },

  // Projects
  projects: {
    list: (params?: { status?: string; search?: string }) => {
      const query = new URLSearchParams();
      if (params?.status) query.set('status', params.status);
      if (params?.search) query.set('search', params.search);
      const qs = query.toString();
      return apiClient<Project[]>(`/projects${qs ? `?${qs}` : ''}`);
    },
    getById: (id: string) => apiClient<Project>(`/projects/${id}`),
    create: (body: { name: string; description?: string; deadline?: string; autoCompleteWhenAllDone?: boolean }) =>
      apiClient<Project>('/projects', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: { name?: string; description?: string; deadline?: string; status?: string; autoCompleteWhenAllDone?: boolean }, version?: number) =>
      apiClient<Project>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(body), version }),
    delete: (id: string) => apiClient<void>(`/projects/${id}`, { method: 'DELETE' }),

    // Members
    addMember: (projectId: string, body: { email: string; role?: ProjectRole }) =>
      apiClient<any>(`/projects/${projectId}/members`, { method: 'POST', body: JSON.stringify(body) }),
    updateMemberRole: (projectId: string, userId: string, body: { role: ProjectRole }) =>
      apiClient<any>(`/projects/${projectId}/members/${userId}`, { method: 'PATCH', body: JSON.stringify(body) }),
    removeMember: (projectId: string, userId: string) =>
      apiClient<void>(`/projects/${projectId}/members/${userId}`, { method: 'DELETE' }),
  },

  // Tasks
  tasks: {
    listByProject: (projectId: string, params?: { status?: TaskStatus; priority?: TaskPriority; assigneeId?: string; search?: string; sortBy?: string; sortOrder?: string }) => {
      const query = new URLSearchParams();
      if (params?.status) query.set('status', params.status);
      if (params?.priority) query.set('priority', params.priority);
      if (params?.assigneeId) query.set('assigneeId', params.assigneeId);
      if (params?.search) query.set('search', params.search);
      if (params?.sortBy) query.set('sortBy', params.sortBy);
      if (params?.sortOrder) query.set('sortOrder', params.sortOrder);
      const qs = query.toString();
      return apiClient<Task[]>(`/projects/${projectId}/tasks${qs ? `?${qs}` : ''}`);
    },
    getById: (id: string) => apiClient<Task>(`/tasks/${id}`),
    create: (projectId: string, body: { title: string; description?: string; status?: TaskStatus; priority?: TaskPriority; assigneeId?: string | null; dueDate?: string | null; position?: number }) =>
      apiClient<Task>(`/projects/${projectId}/tasks`, { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: Partial<Task> & { version?: number }) =>
      apiClient<Task>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(body), version: body.version }),
    updateStatus: (id: string, body: { status: TaskStatus; version?: number }) =>
      apiClient<Task>(`/tasks/${id}/status`, { method: 'PATCH', body: JSON.stringify(body), version: body.version }),
    assign: (id: string, body: { assigneeId: string | null; version?: number }) =>
      apiClient<Task>(`/tasks/${id}/assign`, { method: 'PATCH', body: JSON.stringify(body), version: body.version }),
    move: (id: string, body: { status?: TaskStatus; position: number; version?: number }) =>
      apiClient<Task>(`/tasks/${id}/move`, { method: 'PATCH', body: JSON.stringify(body), version: body.version }),
    resolveConflict: (id: string, body: { strategy: 'keep_mine' | 'keep_theirs' | 'manual'; baseVersion: number; manualData?: Partial<Task> }) =>
      apiClient<Task>(`/tasks/${id}/resolve-conflict`, { method: 'POST', body: JSON.stringify(body) }),
    delete: (id: string) => apiClient<void>(`/tasks/${id}`, { method: 'DELETE' }),
  },

  // Comments
  comments: {
    listByTask: (taskId: string) => apiClient<Comment[]>(`/tasks/${taskId}/comments`),
    create: (taskId: string, body: { body: string }) =>
      apiClient<Comment>(`/tasks/${taskId}/comments`, { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: { body: string; version?: number }) =>
      apiClient<Comment>(`/comments/${id}`, { method: 'PATCH', body: JSON.stringify(body), version: body.version }),
    delete: (id: string) => apiClient<void>(`/comments/${id}`, { method: 'DELETE' }),
  },

  // Attachments
  attachments: {
    listByTask: (taskId: string) => apiClient<Attachment[]>(`/tasks/${taskId}/attachments`),
    upload: (taskId: string, file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiClient<Attachment>(`/tasks/${taskId}/attachments`, {
        method: 'POST',
        body: formData,
      });
    },
    delete: (id: string) => apiClient<void>(`/attachments/${id}`, { method: 'DELETE' }),
  },

  // Dashboard & Analytics
  dashboard: {
    getOverview: () => apiClient<DashboardOverview>('/dashboard/overview'),
    getProjectProgress: (projectId: string) => apiClient<ProjectProgress>(`/projects/${projectId}/progress`),
    getProjectActivity: (projectId: string, params?: { page?: number; limit?: number }) => {
      const query = new URLSearchParams();
      if (params?.page) query.set('page', String(params.page));
      if (params?.limit) query.set('limit', String(params.limit));
      const qs = query.toString();
      return apiClient<ActivityLog[]>(`/projects/${projectId}/activity${qs ? `?${qs}` : ''}`);
    },
  },

  // Notifications
  notifications: {
    list: (params?: { unreadOnly?: boolean }) => {
      const query = new URLSearchParams();
      if (params?.unreadOnly) query.set('unreadOnly', 'true');
      const qs = query.toString();
      return apiClient<Notification[]>(`/notifications${qs ? `?${qs}` : ''}`);
    },
    markRead: (id: string) => apiClient<Notification>(`/notifications/${id}/read`, { method: 'PATCH' }),
    markAllRead: () => apiClient<{ count: number }>('/notifications/read-all', { method: 'POST' }),
  },

  // AI & ML Services
  ai: {
    getStatus: () =>
      apiClient<{ mergeProvider: 'claude' | 'rule_based'; mlService: 'up' | 'down'; breaker: 'closed' | 'open' | 'half_open' }>(
        '/ai/status',
        { skipAuth: true }
      ),
    getMergeSuggestion: (taskId: string, body: { conflicts: Record<string, { baseValue: any; myValue: any; theirValue: any }>; baseVersion?: number }) =>
      apiClient<AIMergeResponse>(`/tasks/${taskId}/ai-merge-suggestion`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    getTaskRisk: (taskId: string) =>
      apiClient<TaskRiskData>(`/tasks/${taskId}/risk`),
    getProjectRisk: (projectId: string) =>
      apiClient<ProjectRiskData>(`/projects/${projectId}/risk`),
    suggestAssignee: (projectId: string, params: { title: string; description?: string; priority?: TaskPriority }) => {
      const query = new URLSearchParams({ title: params.title });
      if (params.description) query.set('description', params.description);
      if (params.priority) query.set('priority', params.priority);
      return apiClient<AssigneeCandidate[]>(`/projects/${projectId}/tasks/suggest-assignee?${query.toString()}`);
    },
    checkDuplicates: (projectId: string, body: { title: string; description?: string; threshold?: number }) =>
      apiClient<SimilarTaskMatch[]>(`/projects/${projectId}/tasks/check-duplicates`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  },

  // Health
  health: () =>
    fetch('http://localhost:5000/health')
      .then((res) => res.json())
      .catch(() => ({ status: 'unreachable' })),
};
