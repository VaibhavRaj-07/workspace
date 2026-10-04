# Machine Learning & AI Architecture: Collaborative Project Workspace

## 1. Executive Summary & Architecture

The **AI/ML Layer** extends the Collaborative Project Workspace with 4 core intelligence features:
1. **AI-Assisted Conflict Merge**: LLM-driven reconciliation for concurrent OCC conflicts (Claude Sonnet 4.6 + deterministic 3-way synthesis).
2. **Deadline Risk Predictor**: XGBoost classifier predicting task delay probability with top-3 explainability factors.
3. **Smart Assignee Suggestion**: Hybrid semantic domain matching, workload balancing, and reliability ranking.
4. **Duplicate / Similar Task Detection**: 384-dimensional cosine similarity search across open project tasks.

### Architecture Overview

```mermaid
flowchart TD
    subgraph Frontend["React / Next.js Client"]
        UI[Workspace UI]
    end

    subgraph NodeBackend["Node.js / Express Backend"]
        Gateway[AI Gateway & Circuit Breaker]
        Cache[AI In-Memory TTL Cache]
        OCC[OCC Concurrency Engine]
        DB[(PostgreSQL + Prisma)]
    end

    subgraph MLService["Python FastAPI Microservice (:8000)"]
        FastAPI[FastAPI Router]
        XGBoost[XGBoost Risk Classifier]
        Embeddings[sentence-transformers: all-MiniLM-L6-v2]
    end

    subgraph ExternalLLM["Anthropic Claude API"]
        Claude[claude-sonnet-4-6]
    end

    UI -->|REST / WS| NodeBackend
    NodeBackend -->|Check Cache| Cache
    Gateway -->|2s Timeout + Circuit Breaker| FastAPI
    Gateway -->|AI-Assisted Merge (Opt-in)| Claude
    FastAPI --> XGBoost
    FastAPI --> Embeddings
    NodeBackend --> DB
```

---

## 2. Feature 1: AI-Assisted Conflict Merge

### Overview
When two users concurrently modify overlapping text fields (e.g. `title` or `description`), the OCC engine returns `HTTP 409 VERSION_CONFLICT` with `aiSuggestionAvailable: true`.

The client requests a suggestion via:
```http
POST /api/v1/tasks/:id/ai-merge-suggestion
```
**Request Body**:
```json
{
  "conflicts": {
    "title": {
      "baseValue": "Setup Database Indexing",
      "myValue": "Setup Database Indexing with B-tree",
      "theirValue": "Setup Database Indexing and Add Slow Query Logger"
    },
    "description": {
      "baseValue": "Initial scope.",
      "myValue": "Initial scope.\nAdded index on status and priority.",
      "theirValue": "Initial scope.\nConfigured pg_stat_statements metrics."
    }
  },
  "baseVersion": 2
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "taskId": "task-uuid",
    "available": true,
    "suggestions": {
      "title": {
        "field": "title",
        "mergedValue": "Setup Database Indexing with B-tree and Slow Query Logger",
        "explanation": "Combined local indexing technique with remote query logging enhancements",
        "confidence": 0.94,
        "strategyUsed": "llm_claude_sonnet"
      },
      "description": {
        "field": "description",
        "mergedValue": "Initial scope.\nAdded index on status and priority.\nConfigured pg_stat_statements metrics.",
        "explanation": "Preserved distinct additions from both collaborators",
        "confidence": 0.92,
        "strategyUsed": "llm_claude_sonnet"
      }
    }
  }
}
```

### Safety & Fallback Guarantees
- **Never Auto-Applied**: Suggestions are advisory only. The user reviews the merged preview in the UI modal and applies it via `POST /tasks/:id/resolve-conflict` with strategy `manual`.
- **PII Opt-Out**: If `AI_PII_OPTOUT=true`, text is not sent to external LLMs; the backend uses high-fidelity 3-way paragraph union synthesis.
- **Circuit Breaker**: If the external call exceeds 2.0 seconds, the engine gracefully falls back to deterministic heuristic synthesis.

---

## 3. Feature 2: Deadline Risk Predictor

### Overview
Predicts whether a task will be completed late or missed based on 11 dynamic lifecycle features.

```http
GET /api/v1/tasks/:id/risk
GET /api/v1/projects/:id/risk
```

### Feature Matrix

| Feature | Description | Encoding / Scale |
| :--- | :--- | :--- |
| `task_age_days` | Days since task creation | Continuous ($[0, \infty)$) |
| `priority_encoded` | Priority level | `low`=0, `medium`=1, `high`=2, `urgent`=3 |
| `status_encoded` | Kanban status | `todo`=0, `in_progress`=1, `in_review`=2, `done`=3 |
| `hours_in_current_status`| Hours elapsed in current status | Continuous |
| `status_changes_count` | Number of status transitions | Integer ($[0, \infty)$) |
| `assignee_open_tasks` | Assignee's active concurrent tasks | Integer ($[0, \infty)$) |
| `assignee_ontime_rate` | Assignee's historical on-time rate | Float ($[0.0, 1.0]$) |
| `comment_count` | Comment count (debate proxy) | Integer |
| `days_to_due_date` | Days to deadline | Float (negative if overdue) |
| `project_completion_rate`| Project done tasks / total tasks | Float ($[0.0, 1.0]$) |
| `description_length` | Character count of task description | Integer |

### Output Example
```json
{
  "taskId": "task-uuid",
  "riskProbability": 0.78,
  "riskScore": 78,
  "riskLevel": "critical",
  "topFactors": [
    {
      "feature": "days_to_due_date",
      "importance": 0.45,
      "impact": "increases_risk",
      "reason": "Due in less than 24 hours (14h remaining)"
    },
    {
      "feature": "assignee_open_tasks",
      "importance": 0.30,
      "impact": "increases_risk",
      "reason": "Assignee has 7 other open tasks in progress"
    },
    {
      "feature": "hours_in_current_status",
      "importance": 0.25,
      "impact": "increases_risk",
      "reason": "No status transition in 4 days"
    }
  ],
  "confidence": 0.88
}
```

### Real-Time Socket Event
Whenever a task is created or updated, the backend recomputes the risk and broadcasts:
```json
{
  "eventType": "task:risk_updated",
  "entity": "task",
  "entityId": "task-uuid",
  "data": { ... }
}
```

---

## 4. Feature 3: Smart Assignee Suggestion

```http
GET /api/v1/projects/:id/tasks/suggest-assignee?title=...&description=...&priority=...
```

### Multi-Factor Scoring Formula
$$\text{Overall Score} = 0.45 \times \text{DomainFit} + 0.30 \times \text{Workload} + 0.25 \times \text{Reliability}$$

1. **Domain Fit (45%)**: Maximum cosine similarity between the candidate task vector and all tasks previously completed by the member.
2. **Workload Score (30%)**: $\max(10, 100 - (\text{openTasks} \times 10))$.
3. **Reliability Score (25%)**: Historical on-time delivery rate ($\text{completedOnTime} / \text{totalCompletedDated}$).

---

## 5. Feature 4: Duplicate & Similar Task Detection

```http
POST /api/v1/projects/:id/tasks/check-duplicates
```
**Request Body**:
```json
{
  "title": "Database Query Index Optimization",
  "description": "Add index on tasks table",
  "threshold": 0.80
}
```

### Embedding Pipeline
- Model: `sentence-transformers/all-MiniLM-L6-v2` (384-dimensional dense vectors).
- Cosine similarity matching against open tasks in project:
  $$\text{sim}(A, B) = \frac{\mathbf{A} \cdot \mathbf{B}}{\|\mathbf{A}\|_2 \|\mathbf{B}\|_2}$$
- Task embeddings are persisted in `task_embeddings` table and automatically refreshed on title/description modifications.

---

## 6. Circuit Breaker & Fallback System

The Node.js gateway employs an active 3-state Circuit Breaker:
- **State Transition**:
  - `CLOSED`: Normal operation, latency budget is 2.0s.
  - `OPEN`: After 3 consecutive timeouts/failures, the circuit trips OPEN for 10 seconds. In this state, requests immediately return lightweight heuristic fallbacks without network overhead.
  - `HALF_OPEN`: After 10s, a trial request tests recovery.
- **Zero Downtime**: If the ML service container is stopped or unreachable, all core workspace functionalities (tasks, comments, OCC, Kanban) continue operating with `{ available: false }` fallback flags.
