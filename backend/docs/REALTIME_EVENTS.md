# Real-Time WebSocket Layer Documentation (Socket.IO)

This document provides the complete specification for the Socket.IO real-time layer designed for frontend integration (React / Next.js).

---

## 1. Connection & Handshake Authentication

### Endpoint
```
ws://<HOST>:<PORT>/socket.io/?EIO=4&transport=websocket
```

### Handshake Authentication
Pass the JWT access token in the `auth` payload or `Authorization` header:

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
  auth: {
    token: userAccessToken,
  },
  transports: ["websocket", "polling"],
});
```

On successful handshake, the server automatically assigns the connection to the personal room: `user:<userId>`.

---

## 2. Rooms and Scopes

| Room Name | Scope | How to Join | Description |
| :--- | :--- | :--- | :--- |
| `user:<userId>` | Private to User | Automatic upon handshake | Direct user notifications (`notification:new`) |
| `project:<projectId>` | Project Members | Client emits `project:join` | Broadcast stream for task, comment, member, and presence updates |

---

## 3. Client-to-Server Events

### `project:join`
Joins a project room and requests an optional replay of missed events since `lastSeq`.

**Payload**:
```json
{
  "projectId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "lastSeq": 42
}
```

**Acknowledgement Callback**:
```json
{
  "success": true,
  "projectId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "currentSeq": 45,
  "missedEvents": [
    {
      "seq": 43,
      "eventType": "task:updated",
      "data": { ... }
    },
    {
      "seq": 44,
      "eventType": "comment:created",
      "data": { ... }
    },
    {
      "seq": 45,
      "eventType": "task:moved",
      "data": { ... }
    }
  ],
  "syncRequired": false,
  "onlineUsers": [
    { "userId": "u1", "name": "Alex Rivers", "lastSeen": 1728000000000 }
  ]
}
```
*Note: If `syncRequired: true` is returned (e.g. client disconnected for too long), the frontend should perform a fresh HTTP `GET /projects/:id/tasks` fetch.*

---

### `project:leave`
Leaves a project room.

**Payload**:
```json
{
  "projectId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

---

### `task:editing:start` (Soft Advisory Lock)
Notifies peers that current user is modifying a task in the UI modal or inline.

**Payload**:
```json
{
  "taskId": "task-uuid",
  "projectId": "project-uuid"
}
```

---

### `task:editing:heartbeat`
Pings every 10–15 seconds to maintain active editing lock (locks auto-expire after 30 seconds of inactivity).

**Payload**:
```json
{
  "taskId": "task-uuid"
}
```

---

### `task:editing:stop`
Releases the advisory editing indicator.

**Payload**:
```json
{
  "taskId": "task-uuid",
  "projectId": "project-uuid"
}
```

---

## 4. Server-to-Client Broadcast Events

Every project event payload includes monotonic `seq` numbering, entity identifiers, version, and timestamps:

```typescript
interface ProjectEventPayload<T = any> {
  seq: number;             // Monotonically increasing sequence per project
  eventType: string;       // e.g. "task:updated"
  projectId: string;
  entity: string;          // "task" | "comment" | "attachment" | "project_member" | "project"
  entityId: string;
  version?: number;        // Latest OCC version
  actorId?: string;        // User ID who performed action
  timestamp: string;       // ISO 8601
  data: T;
}
```

### Event Catalog

| Event Name | Emitted To | Trigger Description |
| :--- | :--- | :--- |
| `task:created` | `project:<id>` | A new task was created |
| `task:updated` | `project:<id>` | Task properties modified (contains `diff`, `changedFields`, `autoMerged` flag) |
| `task:moved` | `project:<id>` | Task moved between Kanban columns or re-ordered |
| `task:deleted` | `project:<id>` | Task deleted |
| `comment:created` | `project:<id>` | New comment added to task |
| `comment:updated` | `project:<id>` | Comment edited |
| `comment:deleted` | `project:<id>` | Comment deleted |
| `attachment:added` | `project:<id>` | File attached to task |
| `attachment:removed` | `project:<id>` | File attachment removed |
| `member:added` | `project:<id>` | New collaborator added to project |
| `member:updated` | `project:<id>` | Member role modified |
| `member:removed` | `project:<id>` | Member removed from project |
| `project:updated` | `project:<id>` | Project metadata or status changed |
| `presence:update` | `project:<id>` | Peer joined, left, or disconnected |
| `task:editing` | `project:<id>` | Peer started or stopped editing task (`isEditing: true/false`) |
| `task:risk_updated` | `project:<id>` | Deadline risk score & contributing factors recomputed |
| `notification:new` | `user:<id>` | Real-time push notification for assignments, due dates, or invites |
