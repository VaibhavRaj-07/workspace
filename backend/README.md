# Collaborative Project Workspace Backend (PS ID: ALG-WEB-01)

> Enterprise Real-Time Collaborative Workspace Backend with Conflict-Safe Concurrent Edits, Optimistic Concurrency Control (OCC), Socket.IO Sequencing, and RBAC.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue.svg)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-darkblue.svg)](https://www.prisma.io/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-black.svg)](https://socket.io/)

---

## 🌟 Judging Highlights & Key Innovations

1. **★ Conflict-Safe Concurrent Edits (OCC Engine)**:
   - Atomic version check (`UPDATE tasks SET ... version = version + 1 WHERE id = $1 AND version = $2`).
   - **Intelligent Field-Level Auto-Merge**: When two clients update non-overlapping fields simultaneously (e.g. Alice edits title, Bob edits priority), the changes are merged automatically without 409 errors.
   - **Explicit 409 `VERSION_CONFLICT`**: When both clients modify the same field, the backend returns detailed conflict metadata (`conflictingFields`, `currentTask`, `yourChanges`).
   - **Conflict Resolution Endpoint (`POST /tasks/:id/resolve-conflict`)**: Offers `keep_mine`, `keep_theirs`, and `manual` strategies.
   - **Concurrency Stress Test**: Validates 20 parallel competing requests with zero silent lost updates.
2. **★ AI/ML Intelligence Microservice Layer**:
   - **Feature 1 (AI Conflict Merge)**: LLM (Claude Sonnet 4.6) reconciles overlapping OCC conflicts with explanation & confidence; 409 error includes `aiSuggestionAvailable: true`.
   - **Feature 2 (Deadline Risk Predictor)**: XGBoost/GBM classifier evaluates 11 lifecycle features, outputs probability, risk tier, and top-3 explainable factors ("Assignee has 9 open tasks"). Real-time `task:risk_updated` socket broadcast.
   - **Feature 3 (Smart Assignee Suggestion)**: Hybrid multi-factor scoring combining semantic similarity to past completed tasks (45%), active workload balancing (30%), and historical on-time delivery rate (25%).
   - **Feature 4 (Duplicate / Similar Task Detection)**: 384-dimensional cosine similarity matching across open tasks with configurable threshold (default 0.80).
   - **Circuit Breaker & Fallback**: 2-second timeout, 3-failure threshold, zero downtime graceful fallback to heuristic synthesis.
3. **Real-time Reliability**:
   - Monotonically increasing per-project `seq` sequence buffer in memory + database.
   - Reconnection catch-up: Client passes `lastSeq` on reconnect to replay all missed events.
4. **Collaboration UX**:
   - Soft advisory task editing locks with heartbeat and 30s auto-expiry.
   - Live user presence tracking per project.
5. **Production Architecture**:
   - JWT access + refresh tokens, bcrypt password hashing, Zod schema validation.
   - Multi-role RBAC (`owner`, `admin`, `member`, `viewer`).
   - `Idempotency-Key` header handling on POST requests.
   - File upload abstraction (Local disk + Supabase Storage fallback, 10MB limit, MIME whitelisting).
   - Automated deadline alerts and task status cron scheduler (`node-cron`).
   - Interactive Swagger OpenAPI 3.0 UI at `/docs`.

---

## 🚀 Quick Start (Docker Compose)

The easiest way to run the entire backend with PostgreSQL is via Docker Compose:

```bash
# 1. Clone repository and navigate to directory
cd "c:\Users\HP\OneDrive\Desktop\algo bknd"

# 2. Copy environment file
cp .env.example .env

# 3. Start PostgreSQL and API service in containers
docker-compose up --build -d

# 4. Run database seed for demo data
docker-compose exec api npm run prisma:seed
```

The API will be available at:
- **API Base**: `http://localhost:5000/api/v1`
- **Swagger Documentation**: `http://localhost:5000/docs`
- **Health Check**: `http://localhost:5000/health`
- **Socket.IO**: `ws://localhost:5000`

---

## 💻 Local Development Setup (Manual)

### 1. Prerequisites
- Node.js >= 20
- PostgreSQL database instance running on port 5432

### 2. Installation & Database Setup
```bash
# Install dependencies
npm install

# Generate Prisma Client
npm run prisma:generate

# Run Database Migrations
npx prisma migrate dev --name init

# Seed Demo Data (3 users, 2 projects, 15+ tasks)
npm run prisma:seed
```

### 3. Start Development Server
```bash
npm run dev
```

---

## 🔑 Demo Accounts (Pre-Seeded)

All demo accounts use password: `Password123!`

| Name | Email | Role in Demo Project |
| :--- | :--- | :--- |
| **Alex Rivers** | `alex@workspace.dev` | Lead Architect & Project Owner |
| **Sarah Chen** | `sarah@workspace.dev` | Senior Full-Stack Engineer / Admin |
| **Rahul Sharma** | `rahul@workspace.dev` | Product & UI Engineer / Member |

---

## 🧪 Running Automated Tests

Run the full Vitest test suite including auth, RBAC, Kanban, comments, dashboard metrics, real-time buffering, and the **20 parallel updates OCC stress test**:

```bash
npm test
```

---

## 📐 Conflict-Resolution Strategy (Judges Guide)

```
                       [Client Updates Task with version: 2]
                                        │
                                        ▼
                       [Is DB Task Version == 2?]
                                   /         \
                              YES /           \ NO (DB is at Version 3)
                                 /             \
                   [Apply Atomic Update]       [Check TaskFieldHistory between v2 and v3]
                   [Version becomes 3]                          │
                   [Emit task:updated]             [Did other user edit same field?]
                   [Return 200 OK]                             /      \
                                                          NO  /        \ YES
                                                             /          \
                                              [Auto-Merge Fields]     [Return HTTP 409]
                                              [Version becomes 4]     [VERSION_CONFLICT]
                                              [Emit task:updated]              │
                                              [Return 200 OK]         [Interactive Resolution Modal]
                                                                      [POST /resolve-conflict]
```

---

## 📚 REST API Reference Summary

All routes are prefixed with `/api/v1`:

### Auth
- `POST /auth/register` - Create user account
- `POST /auth/login` - Authenticate and retrieve access & refresh tokens
- `POST /auth/refresh` - Refresh access token
- `GET /auth/me` - Get current user profile (JWT protected)

### Projects
- `POST /projects` - Create project (creator becomes owner)
- `GET /projects` - List projects user belongs to (with pagination & search)
- `GET /projects/:id` - Get project details
- `PATCH /projects/:id` - Update project settings (OCC protected)
- `DELETE /projects/:id` - Delete project (owner only)
- `POST /projects/:id/members` - Add member with role (`admin`, `member`, `viewer`)
- `PATCH /projects/:id/members/:userId` - Change member role
- `DELETE /projects/:id/members/:userId` - Remove member

### Tasks & Concurrency
- `POST /projects/:id/tasks` - Create task
- `GET /projects/:id/tasks` - List tasks (filters: status, assignee, priority, dueBefore, search, position sort)
- `GET /tasks/:id` - Get task with comments, attachments, activity history, and field versions
- `PATCH /tasks/:id` - Update task with OCC version check & field-level auto-merge
- `PATCH /tasks/:id/status` - Update task status (auto-sets `completedAt` on `done`)
- `PATCH /tasks/:id/assign` - Reassign task (sends real-time notification)
- `PATCH /tasks/:id/move` - Update status and position for Kanban drag-and-drop
- `POST /tasks/:id/resolve-conflict` - Resolve 409 conflict (`keep_mine`, `keep_theirs`, `manual`)
- `DELETE /tasks/:id` - Delete task

### Comments & Attachments
- `GET /tasks/:id/comments` - List task comments
- `POST /tasks/:id/comments` - Add comment
- `PATCH /comments/:id` - Edit comment (author only, OCC protected)
- `DELETE /comments/:id` - Delete comment
- `POST /tasks/:id/attachments` - Upload multipart file (max 10MB)
- `GET /tasks/:id/attachments` - List task attachments
- `DELETE /attachments/:id` - Remove attachment

### Dashboard & Analytics
- `GET /dashboard/overview` - User task metrics (overdue, due this week, status counts)
- `GET /projects/:id/progress` - Progress percentage, overdue count, status & assignee distribution, days to deadline
- `GET /projects/:id/activity` - Paginated project activity feed

### Notifications
- `GET /notifications` - List user notifications (with unread count)
- `PATCH /notifications/:id/read` - Mark notification as read
- `POST /notifications/read-all` - Mark all notifications as read

### AI & Machine Learning Intelligence
- `POST /tasks/:id/ai-merge-suggestion` - AI conflict reconciliation with Claude Sonnet 4.6
- `GET /tasks/:id/risk` - Task deadline risk score, level, and top 3 explainable factors
- `POST /projects/:id/tasks/check-duplicates` - Semantic similarity search for duplicate open tasks
- `GET /projects/:id/tasks/suggest-assignee` - Multi-factor smart assignee recommendations
- `GET /projects/:id/risk` - Aggregated project deadline risk analysis

---

## 📡 WebSocket Documentation
For complete WebSocket connection guidelines, event payloads, sequence catch-up flow, presence, and advisory task locking, see [`docs/REALTIME_EVENTS.md`](file:///c:/Users/HP/OneDrive/Desktop/algo%20bknd/docs/REALTIME_EVENTS.md).

---

## 🏛 Architecture Details
For in-depth architecture diagrams, OCC algorithm specifications, and data flow, see [`docs/ARCHITECTURE.md`](file:///c:/Users/HP/OneDrive/Desktop/algo%20bknd/docs/ARCHITECTURE.md).
