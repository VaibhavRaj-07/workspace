# Collaborative Project Workspace (Frontend) // PS ID: ALG-WEB-01

> **A High-Frequency Real-Time Control Room with Optimistic Concurrency Control (OCC), AI-Assisted 3-Way Conflict Synthesis, and XGBoost Deadline Risk Intelligence.**

Built in a signature **Neo-Brutalist Maximalist** visual aesthetic: 3px solid ink borders, hard offset shadows, tactile micro-animations, pure CSS architectural patterns, oversized typography, and real-time monotonic sequence streams.

---

## ⚡ Quick Start: Running the Full Stack

### 1. PostgreSQL Database & Backend Service (Port 5000)
```bash
# Start PostgreSQL (Database: algo_workspace on port 5433)
& "C:\Program Files\PostgreSQL\18\bin\postgres.exe" -D "C:\dev\pgdata" -p 5433

# Start Backend
cd "C:\Users\HP\OneDrive\Desktop\algo bknd"
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

### 2. ML / AI Microservice (Port 8000 - FastAPI)
```bash
cd "C:\Users\HP\OneDrive\Desktop\algo bknd\ml-service"
python -m uvicorn main:app --port 8000
```
*(Note: If ML service is stopped, the backend automatically uses zero-downtime heuristic and deterministic 3-way fallbacks without throwing errors).*

### 3. Frontend Application (Port 3000)
```bash
cd "C:\Users\HP\OneDrive\Desktop\algo frtnd"

# Development Server (Do NOT run dev and build concurrently in the same directory without distDir)
npm run dev

# Separate Build (Uses NEXT_DIST_DIR to avoid dev chunk collisions)
$env:NEXT_DIST_DIR=".next-build"; npm run build
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🔑 Seeded Demo Credentials

Use one-click quick login buttons on `/login` or enter credentials manually:

| Name | Email | Password | Role |
| :--- | :--- | :--- | :--- |
| **Alex Rivers** | `alex@workspace.dev` | `Password123!` | Lead |
| **Sarah Chen** | `sarah@workspace.dev` | `Password123!` | Full-Stack |
| **Rahul Patel** | `rahul@workspace.dev` | `Password123!` | Frontend |

---

## 🛠️ Diagnostics & Troubleshooting Table

| Issue / Symptom | Root Cause | Solution |
| :--- | :--- | :--- |
| **CORS Error** | Backend `CORS_ORIGIN` does not match `http://localhost:3000` | In `algo bknd/.env`, ensure `CORS_ORIGIN=*` or `CORS_ORIGIN=http://localhost:3000`. Restart backend. |
| **Socket Not Connecting** | Port mismatch or missing JWT handshake token | Verify `NEXT_PUBLIC_WS_URL=http://localhost:5000` in `.env.local`. Ensure token exists in session/memory. |
| **401 Unauthorized Loop** | Refresh token expired or invalidated | The API client automatically attempts a single `/auth/refresh` before redirecting to `/login` to clear tokens. |
| **ML / AI Service Offline** | Port 8000 FastAPI container not running | The Node backend circuit-breaker automatically falls back to deterministic heuristic merges and synthetic features with zero downtime. |
| **OCC 409 Conflict Detected** | Two peers edited overlapping fields concurrently | The interactive **Collision Modal** opens with side-by-side comparison, word-level diff, and AI merge suggestion. |

---

## 🎨 Design System: Brutalist Maximalism

- **Structure (Brutalism)**: 3px–4px solid ink (`#0A0A0A`) borders, 0px border-radius, hard offset shadows (`4px 4px 0px #0A0A0A`, `8px 8px 0px #0A0A0A`), tactile active button press states (`translate(4px, 4px)` + `shadow: none`).
- **Energy (Maximalism)**: Saturated clashing palette (Paper `#F4F0E6`, Acid Yellow `#FFE600`, Hot Pink `#FF3EA5`, Electric Blue `#2B4BFF`, Signal Red `#FF2E2E`, Toxic Green `#19E36B`, Orange `#FF8A00`, Cyan `#00E5FF`), pure CSS halftone dots, grid paper, diagonal stripes, and hazard warning tapes.
- **Typography**: Display = `Archivo Black` (uppercase, tight tracking); Body/UI = `Space Grotesk`; Data/Labels/Logs = `Space Mono`.
- **Motion & Accessibility**: Snappy 120ms cubic transitions, real-time flash highlight when peers modify tasks, full `prefers-reduced-motion` support, WCAG AA high-contrast compliance.
- **Component Kit & Showcase**: Visit **`/styleguide`** to inspect all buttons, cards, badges, modal dialogs, drawers, segmented progress bars, and ticker marquees.

---

## 🛡️ Conflict-Safe Concurrency (OCC & AI Merge)

1. **Optimistic Concurrency Control**: Every update sends the entity's known `version` via payload and `If-Match` header.
2. **Auto-Merge for Non-Overlapping Edits**: If User A edits `title` and User B edits `dueDate`, the server detects disjoint field sets, merges them atomically without 409, and emits `task:updated` with `autoMerged: true`.
3. **Collision Modal (409 Interception)**: If two collaborators modify the same field (e.g. `description`), the UI intercepts the 409 conflict and presents:
   - **Base Version** (grey)
   - **Your Local Version** (blue)
   - **Their Server Version** (pink, with author name & timestamp)
   - **Word-Level Inline Diff Highlighting**
   - **✨ AI 3-Way Merge Synthesis**: Requests Claude / local heuristic synthesis to intelligently combine both collaborators' ideas into a cohesive output.
   - **Per-Field Decisions**: `KEEP MINE`, `KEEP THEIRS`, or `EDIT MANUALLY`.
4. **Interactive Demo Helper**: Visit **`/demo-conflict`** to trigger and inspect a simulated concurrent collision between Sarah and Alex directly in one browser tab.

---

## 🧠 AI & Machine Learning Capabilities

1. **AI 3-Way Conflict Merge**: Combines conflicting text modifications with semantic context and confidence scoring.
2. **XGBoost Deadline Risk Predictor**: Evaluates 11 dynamic lifecycle features (`task_age_days`, `priority_encoded`, `hours_in_current_status`, `assignee_open_tasks`, `days_to_due_date`, etc.) to predict delay probability with top-3 explainability factors. *(Note: Risk model is bootstrapped on synthetic task lifecycle distributions).*
3. **Smart Assignee Recommendation**: Scores candidates by domain expertise matching (45%), active workload balancing (30%), and historical on-time delivery rate (25%).
4. **Duplicate & Similar Task Warning**: 384-dimensional dense cosine similarity search preventing duplicate work items across open tasks.

---

## 🧪 Testing & Validation

```bash
# Run Vitest Suite (Cache reducers, OCC version ordering, API client, conflict logic)
npm test

# Verify Next.js Production Build
npm run build
```
