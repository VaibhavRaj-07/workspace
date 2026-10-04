export const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Collaborative Project Workspace API (PS ID: ALG-WEB-01)',
    version: '1.0.0',
    description: `
### Real-Time Project Management Backend with Conflict-Safe Concurrent Edits

Key Highlights:
- **Optimistic Concurrency Control (OCC)** on tasks, projects, and comments with automatic field-level merging when non-overlapping.
- **Real-Time Socket.IO** rooms with sequence buffering, reconnection replay, presence tracking, and soft editing locks.
- **RESTful Endpoints** for Auth, Projects, Tasks, Comments, Attachments, Dashboard, and Notifications.
    `,
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API v1 Base URL',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          avatarUrl: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Project: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          ownerId: { type: 'string', format: 'uuid' },
          deadline: { type: 'string', format: 'date-time', nullable: true },
          status: { type: 'string', enum: ['active', 'archived', 'completed'] },
          version: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Task: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          projectId: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          description: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['todo', 'in_progress', 'in_review', 'done'] },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
          assigneeId: { type: 'string', format: 'uuid', nullable: true },
          createdById: { type: 'string', format: 'uuid' },
          dueDate: { type: 'string', format: 'date-time', nullable: true },
          position: { type: 'number' },
          version: { type: 'integer', description: 'Monotonic OCC version' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          completedAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      VersionConflictError: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VERSION_CONFLICT' },
              message: { type: 'string' },
              currentVersion: { type: 'integer', example: 3 },
              currentTask: { $ref: '#/components/schemas/Task' },
              yourChanges: { type: 'object' },
              conflictingFields: { type: 'array', items: { type: 'string' }, example: ['status', 'title'] },
            },
          },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: { type: 'object' },
            },
          },
        },
      },
    },
  },
  paths: {
    '/auth/register': {
      post: {
        summary: 'Register a new user',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', example: 'Alice Smith' },
                  email: { type: 'string', example: 'alice@workspace.dev' },
                  password: { type: 'string', example: 'Password123!' },
                  avatarUrl: { type: 'string', example: 'https://i.pravatar.cc/150?u=alice' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'User registered successfully' },
          409: { description: 'Email already exists' },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Login with email and password',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'alice@workspace.dev' },
                  password: { type: 'string', example: 'Password123!' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Authentication tokens generated' },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/auth/me': {
      get: {
        summary: 'Get current authenticated user profile',
        tags: ['Auth'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Current user profile' },
        },
      },
    },
    '/projects': {
      get: {
        summary: 'List projects the current user is a member of',
        tags: ['Projects'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'archived', 'completed'] } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: { 200: { description: 'List of projects with pagination' } },
      },
      post: {
        summary: 'Create a new project',
        tags: ['Projects'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  deadline: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Project created' } },
      },
    },
    '/tasks/{id}': {
      get: {
        summary: 'Get task by ID with comments, attachments, and field history',
        tags: ['Tasks'],
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Task details' } },
      },
      patch: {
        summary: 'Update task with OCC (Optimistic Concurrency Control)',
        tags: ['Tasks'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'If-Match', in: 'header', description: 'Task version for OCC', schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  status: { type: 'string', enum: ['todo', 'in_progress', 'in_review', 'done'] },
                  priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
                  assigneeId: { type: 'string', format: 'uuid' },
                  dueDate: { type: 'string', format: 'date-time' },
                  position: { type: 'number' },
                  version: { type: 'integer', description: 'Client OCC version' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Task updated (or auto-merged successfully)' },
          409: { description: 'OCC Version Conflict', content: { 'application/json': { schema: { $ref: '#/components/schemas/VersionConflictError' } } } },
        },
      },
      delete: {
        summary: 'Delete task',
        tags: ['Tasks'],
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Task deleted' } },
      },
    },
    '/tasks/{id}/resolve-conflict': {
      post: {
        summary: 'Resolve OCC version conflict explicitly',
        tags: ['Tasks'],
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['strategy', 'baseVersion'],
                properties: {
                  strategy: { type: 'string', enum: ['keep_mine', 'keep_theirs', 'manual'] },
                  baseVersion: { type: 'integer' },
                  manualData: { type: 'object' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Conflict resolved cleanly' },
        },
      },
    },
    '/dashboard/overview': {
      get: {
        summary: 'Get user overview metrics (tasks count, overdue, due this week)',
        tags: ['Dashboard'],
        security: [{ BearerAuth: [] }],
        responses: { 200: { description: 'Overview statistics' } },
      },
    },
    '/projects/{id}/progress': {
      get: {
        summary: 'Get project progress %, status distribution, overdue count, days to deadline',
        tags: ['Dashboard'],
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Progress metrics' } },
      },
    },
    '/projects/{id}/activity': {
      get: {
        summary: 'Get paginated project activity log feed',
        tags: ['Dashboard'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 25 } },
        ],
        responses: { 200: { description: 'Activity feed' } },
      },
    },
    '/tasks/{id}/ai-merge-suggestion': {
      post: {
        summary: 'AI-assisted conflict merge suggestion using Claude Sonnet 4.6',
        tags: ['AI Intelligence'],
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['conflicts'],
                properties: {
                  conflicts: {
                    type: 'object',
                    example: {
                      title: { baseValue: 'Old Title', myValue: 'My Title', theirValue: 'Their Title' }
                    }
                  },
                  baseVersion: { type: 'integer' }
                }
              }
            }
          }
        },
        responses: { 200: { description: 'AI merge suggestions per conflicting field' } }
      }
    },
    '/tasks/{id}/risk': {
      get: {
        summary: 'Predict deadline risk probability and top 3 contributing factors for a task',
        tags: ['AI Intelligence'],
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Task deadline risk metrics and explainability reasons' } }
      }
    },
    '/projects/{id}/tasks/check-duplicates': {
      post: {
        summary: 'Check for potential duplicate or highly similar open tasks in a project',
        tags: ['AI Intelligence'],
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title'],
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  threshold: { type: 'number', default: 0.80 }
                }
              }
            }
          }
        },
        responses: { 200: { description: 'Similar tasks and similarity scores' } }
      }
    },
    '/projects/{id}/tasks/suggest-assignee': {
      get: {
        summary: 'Smart assignee recommendation based on semantic domain fit, workload, and on-time rate',
        tags: ['AI Intelligence'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'title', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'description', in: 'query', schema: { type: 'string' } },
          { name: 'priority', in: 'query', schema: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] } }
        ],
        responses: { 200: { description: 'Top 3 ranked assignee candidates with explainable reasons' } }
      }
    },
    '/projects/{id}/risk': {
      get: {
        summary: 'Get project-level aggregated deadline risk score and top at-risk tasks',
        tags: ['AI Intelligence'],
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Project risk metrics and at-risk task rankings' } }
      }
    },
  },
};
