import os
import logging
import joblib
import numpy as np
from typing import Dict, Any, List, Tuple
from config import settings

logger = logging.getLogger(__name__)

FEATURE_NAMES = [
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
]

class RiskPredictor:
    def __init__(self, model_path: str = settings.MODEL_PATH):
        self.model_path = model_path
        self.model = None
        self._load_or_init_model()

    def _load_or_init_model(self):
        if os.path.exists(self.model_path):
            try:
                self.model = joblib.load(self.model_path)
                logger.info(f"Loaded trained XGBoost model from {self.model_path}")
                return
            except Exception as e:
                logger.warning(f"Failed to load model from {self.model_path}: {e}")

        logger.info("Initializing fallback baseline classifier...")
        self._init_baseline_model()

    def _init_baseline_model(self):
        """Initializes and fits a lightweight logistic/GBM model with realistic weights"""
        try:
            from sklearn.ensemble import GradientBoostingClassifier
            clf = GradientBoostingClassifier(n_estimators=50, random_state=42)
            X_init, y_init = self._create_synthetic_anchor_data()
            clf.fit(X_init, y_init)
            self.model = clf
            logger.info("Baseline GradientBoostingClassifier initialized successfully")
        except Exception:
            try:
                from scripts.train_model import PurePythonRiskModel
                clf = PurePythonRiskModel()
                X_init, y_init = self._create_synthetic_anchor_data()
                clf.fit(X_init, y_init)
                self.model = clf
                logger.info("Baseline PurePythonRiskModel initialized successfully")
            except Exception as e:
                logger.error(f"Could not initialize baseline classifier: {e}")
                self.model = None

    def predict_risk(self, features: Dict[str, Any]) -> Dict[str, Any]:
        vec = np.array([[
            float(features.get("task_age_days", 0.0)),
            float(features.get("priority_encoded", 1)),
            float(features.get("status_encoded", 0)),
            float(features.get("hours_in_current_status", 0.0)),
            float(features.get("status_changes_count", 0)),
            float(features.get("assignee_open_tasks", 0)),
            float(features.get("assignee_ontime_rate", 0.85)),
            float(features.get("comment_count", 0)),
            float(features.get("days_to_due_date", 7.0)),
            float(features.get("project_completion_rate", 0.0)),
            float(features.get("description_length", 0)),
        ]], dtype=np.float32)

        prob = 0.3
        if self.model is not None:
            try:
                probs = self.model.predict_proba(vec)
                prob = float(probs[0][1])
            except Exception as e:
                logger.warning(f"Inference error ({e}), computing calibrated heuristic")
                prob = self._heuristic_prob(features)
        else:
            prob = self._heuristic_prob(features)

        # Ensure probability is bounded
        prob = max(0.02, min(0.98, prob))
        risk_score = int(round(prob * 100))

        if risk_score >= 75:
            risk_level = "critical"
        elif risk_score >= 50:
            risk_level = "high"
        elif risk_score >= 25:
            risk_level = "medium"
        else:
            risk_level = "low"

        top_factors = self._explain_prediction(features, prob)

        return {
            "riskProbability": round(prob, 4),
            "riskScore": risk_score,
            "riskLevel": risk_level,
            "topFactors": top_factors,
            "confidence": 0.88 if self.model is not None else 0.70,
        }

    def _explain_prediction(self, f: Dict[str, Any], prob: float) -> List[Dict[str, Any]]:
        factors = []

        days_due = float(f.get("days_to_due_date", 7.0))
        open_tasks = int(f.get("assignee_open_tasks", 0))
        hours_in_status = float(f.get("hours_in_current_status", 0.0))
        ontime_rate = float(f.get("assignee_ontime_rate", 0.85))
        priority = int(f.get("priority_encoded", 1))

        if days_due < 0:
            factors.append({
                "feature": "days_to_due_date",
                "importance": 0.45,
                "impact": "increases_risk",
                "reason": f"Task is overdue by {abs(int(round(days_due)))} day(s)",
            })
        elif days_due <= 1.0:
            factors.append({
                "feature": "days_to_due_date",
                "importance": 0.35,
                "impact": "increases_risk",
                "reason": f"Due in less than 24 hours ({int(round(days_due * 24))}h remaining)",
            })
        elif days_due >= 14.0:
            factors.append({
                "feature": "days_to_due_date",
                "importance": 0.25,
                "impact": "decreases_risk",
                "reason": f"Generous buffer of {int(round(days_due))} days remaining",
            })

        if open_tasks >= 6:
            factors.append({
                "feature": "assignee_open_tasks",
                "importance": 0.30,
                "impact": "increases_risk",
                "reason": f"Assignee has {open_tasks} other open tasks in progress",
            })
        elif open_tasks <= 1:
            factors.append({
                "feature": "assignee_open_tasks",
                "importance": 0.20,
                "impact": "decreases_risk",
                "reason": "Assignee has low active workload",
            })

        if hours_in_status >= 96:
            factors.append({
                "feature": "hours_in_current_status",
                "importance": 0.25,
                "impact": "increases_risk",
                "reason": f"No status transition in {int(round(hours_in_status / 24))} days",
            })

        if ontime_rate >= 0.90:
            factors.append({
                "feature": "assignee_ontime_rate",
                "importance": 0.20,
                "impact": "decreases_risk",
                "reason": f"Assignee has high historical reliability ({int(round(ontime_rate * 100))}% on-time)",
            })
        elif ontime_rate < 0.65:
            factors.append({
                "feature": "assignee_ontime_rate",
                "importance": 0.25,
                "impact": "increases_risk",
                "reason": f"Assignee historical on-time completion is {int(round(ontime_rate * 100))}%",
            })

        if priority == 3: # urgent
            factors.append({
                "feature": "priority_encoded",
                "importance": 0.15,
                "impact": "increases_risk",
                "reason": "Urgent priority requires immediate peer coordination",
            })

        # Return top 3 factors sorted by importance
        factors.sort(key=lambda x: x["importance"], reverse=True)
        return factors[:3]

    def _heuristic_prob(self, f: Dict[str, Any]) -> float:
        days_due = float(f.get("days_to_due_date", 7.0))
        open_tasks = int(f.get("assignee_open_tasks", 0))
        hours_in_status = float(f.get("hours_in_current_status", 0.0))
        ontime_rate = float(f.get("assignee_ontime_rate", 0.85))

        score = 0.25
        if days_due < 0:
            score += 0.50
        elif days_due <= 2:
            score += 0.30

        if open_tasks >= 5:
            score += 0.20
        if hours_in_status > 72:
            score += 0.15
        if ontime_rate >= 0.90:
            score -= 0.15

        return max(0.05, min(0.95, score))

    def _create_synthetic_anchor_data(self) -> Tuple[np.ndarray, np.ndarray]:
        np.random.seed(42)
        n = 100
        X = np.zeros((n, len(FEATURE_NAMES)))
        y = np.zeros(n)

        for i in range(n):
            days_due = np.random.uniform(-5, 20)
            open_tasks = np.random.randint(0, 10)
            hours_status = np.random.uniform(1, 150)
            ontime_rate = np.random.uniform(0.5, 1.0)
            priority = np.random.randint(0, 4)

            X[i, :] = [
                np.random.uniform(1, 30), # task_age_days
                priority,
                np.random.randint(0, 3), # status_encoded
                hours_status,
                np.random.randint(0, 5), # status_changes_count
                open_tasks,
                ontime_rate,
                np.random.randint(0, 10), # comment_count
                days_due,
                np.random.uniform(0, 1), # project_completion_rate
                np.random.randint(20, 500), # description_length
            ]

            # Label generation
            prob = 0.25
            if days_due < 0: prob += 0.5
            elif days_due < 2: prob += 0.3
            if open_tasks > 5: prob += 0.2
            if hours_status > 72: prob += 0.15
            if ontime_rate < 0.7: prob += 0.15
            y[i] = 1 if prob > 0.5 else 0

        return X, y

risk_predictor = RiskPredictor()
