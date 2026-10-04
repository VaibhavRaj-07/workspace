# Model Card: Deadline Risk Predictor

## 1. Model Overview
- **Model Type**: PurePythonRiskModel (Binary Classification Risk Model)
- **Framework**: scikit-learn / XGBoost / Pure-Python Resilience
- **Target**: `is_late` (1 if completed past `due_date` or currently open past `due_date`, 0 otherwise)
- **Last Trained**: 2026-10-04T06:19:54.084556Z
- **Training Samples**: 3500 tasks

---

## 2. Evaluation Metrics (Test Set 20%)

| Metric | Score | Description |
| :--- | :--- | :--- |
| **AUC-ROC** | **0.9688** | Area under the ROC curve (discrimination capacity) |
| **Accuracy** | **0.9186** | Overall classification accuracy |
| **Precision** | **0.8837** | Precision on delayed tasks |
| **Recall** | **0.8042** | Recall rate on identifying actual delayed tasks |
| **F1-Score** | **0.8421** | Harmonic mean of precision and recall |

---

## 3. Input Features

| Feature Name | Type | Description |
| :--- | :--- | :--- |
| `task_age_days` | Float | Elapsed time since task creation |
| `priority_encoded` | Int | Ordinal: 0 (low), 1 (medium), 2 (high), 3 (urgent) |
| `status_encoded` | Int | Ordinal: 0 (todo), 1 (in_progress), 2 (in_review), 3 (done) |
| `hours_in_current_status` | Float | Hours since last status transition |
| `status_changes_count` | Int | Number of status changes in task activity log |
| `assignee_open_tasks` | Int | Current active uncompleted workload on assignee |
| `assignee_ontime_rate` | Float | Historical on-time delivery rate of assignee (0.0 - 1.0) |
| `comment_count` | Int | Number of comments/discussion turns on task |
| `days_to_due_date` | Float | Days to deadline (negative if already overdue) |
| `project_completion_rate`| Float | Percentage of completed tasks in parent project |
| `description_length` | Int | Character length of task description |

---

## 4. Explainability & Contributing Factors
The model provides top-3 feature contribution explanations per prediction based on feature importance and directional thresholds:
- **Overdue / Imminent Deadline**: `days_to_due_date < 0` or `< 1.0 days`
- **High Assignee Workload**: `assignee_open_tasks >= 6`
- **Stagnant Status**: `hours_in_current_status > 72 hours`
- **Reliability Boost**: `assignee_ontime_rate >= 90%`

---

## 5. Honest Note on Synthetic Data & Limitations
> [!NOTE]
> **Synthetic Data Notice**: Initial training and evaluation datasets are generated synthetically via `ml-service/scripts/generate_synthetic_data.py` (3,500 samples) with parameterized noise and realistic software engineering correlations (Poisson-distributed comment counts, exponential status durations, Beta-distributed on-time rates).
> As real users interact with the platform, the nightly scheduler triggers `build_training_data_from_db.py` to retrain on actual project telemetry.
