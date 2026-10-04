import os
import csv
import logging
from typing import List

logger = logging.getLogger(__name__)

def build_dataset_from_db(db_url: str = None, output_path: str = None) -> str:
    """
    Extracts feature matrix from tasks and activity_log tables.
    Falls back gracefully to synthetic generator if database is not reachable.
    """
    if output_path is None:
        output_path = os.path.join(os.path.dirname(__file__), "db_tasks.csv")

    try:
        import psycopg2
        import urllib.parse

        if not db_url:
            db_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/algo_workspace")

        result = urllib.parse.urlparse(db_url)
        conn = psycopg2.connect(
            database=result.path[1:],
            user=result.username,
            password=result.password,
            host=result.hostname,
            port=result.port or 5432
        )
        cur = conn.cursor()

        query = """
        SELECT
            EXTRACT(EPOCH FROM (NOW() - t.created_at)) / 86400.0 AS task_age_days,
            CASE t.priority
                WHEN 'low' THEN 0
                WHEN 'medium' THEN 1
                WHEN 'high' THEN 2
                WHEN 'urgent' THEN 3
                ELSE 1
            END AS priority_encoded,
            CASE t.status
                WHEN 'todo' THEN 0
                WHEN 'in_progress' THEN 1
                WHEN 'in_review' THEN 2
                WHEN 'done' THEN 3
                ELSE 0
            END AS status_encoded,
            EXTRACT(EPOCH FROM (NOW() - t.updated_at)) / 3600.0 AS hours_in_current_status,
            COALESCE(act.cnt, 0) AS status_changes_count,
            COALESCE(open_t.cnt, 0) AS assignee_open_tasks,
            0.85 AS assignee_ontime_rate,
            COALESCE(c.cnt, 0) AS comment_count,
            COALESCE(EXTRACT(EPOCH FROM (t.due_date - NOW())) / 86400.0, 7.0) AS days_to_due_date,
            0.50 AS project_completion_rate,
            LENGTH(COALESCE(t.description, '')) AS description_length,
            CASE
                WHEN t.status = 'done' AND t.completed_at > t.due_date THEN 1
                WHEN t.status != 'done' AND t.due_date < NOW() THEN 1
                ELSE 0
            END AS is_late
        FROM tasks t
        LEFT JOIN (
            SELECT task_id, COUNT(*) AS cnt FROM activity_log GROUP BY task_id
        ) act ON act.task_id = t.id
        LEFT JOIN (
            SELECT task_id, COUNT(*) AS cnt FROM comments GROUP BY task_id
        ) c ON c.task_id = t.id
        LEFT JOIN (
            SELECT assignee_id, COUNT(*) AS cnt FROM tasks WHERE status != 'done' GROUP BY assignee_id
        ) open_t ON open_t.assignee_id = t.assignee_id;
        """

        cur.execute(query)
        rows = cur.fetchall()
        cur.close()
        conn.close()

        if len(rows) >= 50:
            headers = [
                "task_age_days", "priority_encoded", "status_encoded",
                "hours_in_current_status", "status_changes_count", "assignee_open_tasks",
                "assignee_ontime_rate", "comment_count", "days_to_due_date",
                "project_completion_rate", "description_length", "is_late"
            ]
            with open(output_path, "w", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                writer.writerow(headers)
                writer.writerows(rows)
            return output_path

    except Exception as e:
        logger.warning(f"Could not extract training data from DB: {e}. Falling back to synthetic generator.")

    from scripts.generate_synthetic_data import generate_synthetic_dataset
    return generate_synthetic_dataset(num_samples=3500, output_path=output_path)

if __name__ == "__main__":
    build_dataset_from_db()
