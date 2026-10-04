import os
import csv
import random
import numpy as np

def generate_synthetic_dataset(num_samples: int = 3500, output_path: str = None):
    if output_path is None:
        output_path = os.path.join(os.path.dirname(__file__), "synthetic_tasks.csv")

    random.seed(42)
    np.random.seed(42)

    headers = [
        "task_age_days",
        "priority_encoded",
        "status_encoded",
        "hours_in_current_status",
        "status_changes_count",
        "assignee_open_tasks",
        "assignee_ontime_rate",
        "comment_count",
        "days_to_due_date",
        "project_completion_rate",
        "description_length",
        "is_late", # Target: 1 if completed late or overdue, 0 if on-time
    ]

    rows = []
    for _ in range(num_samples):
        # 1. Base features with realistic distributions
        task_age = round(np.random.exponential(scale=12.0) + 1.0, 1) # 1 to 60 days
        priority = np.random.choice([0, 1, 2, 3], p=[0.2, 0.45, 0.25, 0.10]) # low, med, high, urgent
        status = np.random.choice([0, 1, 2, 3], p=[0.25, 0.35, 0.15, 0.25])  # todo, in_prog, in_rev, done

        hours_in_status = round(np.random.exponential(scale=36.0) + 0.5, 1)
        status_changes = int(np.random.poisson(lam=1.8))
        assignee_open = int(np.random.poisson(lam=3.2))
        assignee_ontime = round(np.clip(np.random.beta(a=8, b=2), 0.3, 1.0), 2)
        comment_count = int(np.random.poisson(lam=2.5))
        days_to_due = round(np.random.normal(loc=6.0, scale=8.0), 1)
        project_completion = round(np.random.uniform(0.05, 0.95), 2)
        desc_length = int(np.random.exponential(scale=180.0) + 20)

        # 2. Correlated Risk Formula (with realistic noise)
        # Higher probability of being late if:
        # - days_to_due is negative or small
        # - assignee has many open tasks
        # - task has been stuck in current status for long time
        # - assignee has low historical on-time rate
        # - urgent priority without progress
        logit = -1.8 # Base bias

        if days_to_due < 0:
            logit += 2.8 + abs(days_to_due) * 0.15
        elif days_to_due < 2.0:
            logit += 1.6
        elif days_to_due > 14.0:
            logit -= 1.4

        if assignee_open >= 7:
            logit += 1.3
        elif assignee_open >= 4:
            logit += 0.6
        elif assignee_open <= 1:
            logit -= 0.7

        if hours_in_status > 96.0:
            logit += 1.1
        elif hours_in_status > 48.0:
            logit += 0.5

        if assignee_ontime < 0.65:
            logit += 1.2
        elif assignee_ontime >= 0.90:
            logit -= 1.0

        if priority == 3 and status < 2:
            logit += 0.8

        if comment_count > 8: # High debate/confusion
            logit += 0.4

        # Add Gaussian noise
        logit += np.random.normal(0, 0.4)

        # Sigmoid probability
        prob = 1.0 / (1.0 + np.exp(-logit))
        is_late = 1 if prob >= 0.5 else 0

        # If task was already completed ('done') with positive due date, it was likely on-time
        if status == 3 and days_to_due > 0 and np.random.random() > 0.15:
            is_late = 0

        rows.append([
            task_age,
            priority,
            status,
            hours_in_status,
            status_changes,
            assignee_open,
            assignee_ontime,
            comment_count,
            days_to_due,
            project_completion,
            desc_length,
            is_late,
        ])

    with open(output_path, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(rows)

    print(f"Generated {num_samples} synthetic training records at {output_path}")
    return output_path

if __name__ == "__main__":
    generate_synthetic_dataset()
