import pytest
from fastapi.testclient import TestClient
from main import app
from services.risk_predictor import risk_predictor
from services.embedding_service import embedding_service

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "modelsLoaded" in data

def test_embed_endpoint():
    texts = ["Implement real-time WebSocket sequencing", "Design optimistic concurrency control"]
    response = client.post("/embed", json={"texts": texts})
    assert response.status_code == 200
    data = response.json()
    assert len(data["embeddings"]) == 2
    assert data["dimensions"] == 384
    assert len(data["embeddings"][0]) == 384

def test_predict_risk_normal_task():
    payload = {
        "task_age_days": 2.0,
        "priority_encoded": 1,
        "status_encoded": 1,
        "hours_in_current_status": 12.0,
        "status_changes_count": 1,
        "assignee_open_tasks": 2,
        "assignee_ontime_rate": 0.92,
        "comment_count": 3,
        "days_to_due_date": 10.0,
        "project_completion_rate": 0.45,
        "description_length": 150,
    }
    response = client.post("/predict-risk", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert 0.0 <= data["riskProbability"] <= 1.0
    assert 0 <= data["riskScore"] <= 100
    assert data["riskLevel"] in ["low", "medium", "high", "critical"]
    assert len(data["topFactors"]) <= 3

def test_predict_risk_overdue_high_workload_task():
    payload = {
        "task_age_days": 25.0,
        "priority_encoded": 3, # urgent
        "status_encoded": 0,   # todo
        "hours_in_current_status": 120.0,
        "status_changes_count": 0,
        "assignee_open_tasks": 8,
        "assignee_ontime_rate": 0.55,
        "comment_count": 12,
        "days_to_due_date": -3.0, # 3 days overdue
        "project_completion_rate": 0.10,
        "description_length": 50,
    }
    response = client.post("/predict-risk", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["riskScore"] >= 50
    assert data["riskLevel"] in ["high", "critical"]
    # Check that overdue or workload factor was identified
    factor_features = [f["feature"] for f in data["topFactors"]]
    assert "days_to_due_date" in factor_features or "assignee_open_tasks" in factor_features

def test_embedding_cosine_similarity():
    vec1 = embedding_service.embed_texts(["Optimize database indexing with B-tree"])[0]
    vec2 = embedding_service.embed_texts(["PostgreSQL database index tuning"])[0]
    vec3 = embedding_service.embed_texts(["Frontend CSS animation color gradients"])[0]

    import numpy as np
    sim1_2 = np.dot(vec1, vec2)
    sim1_3 = np.dot(vec1, vec3)

    assert sim1_2 > sim1_3
