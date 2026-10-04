from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class HealthResponse(BaseModel):
    status: str
    version: str
    modelsLoaded: Dict[str, bool]

class EmbedRequest(BaseModel):
    texts: List[str] = Field(..., min_length=1, description="List of strings to embed")

class EmbedResponse(BaseModel):
    embeddings: List[List[float]]
    dimensions: int

class RiskFeatureInput(BaseModel):
    task_age_days: float = Field(0.0, description="Age of task in days")
    priority_encoded: int = Field(1, description="0=low, 1=medium, 2=high, 3=urgent")
    status_encoded: int = Field(0, description="0=todo, 1=in_progress, 2=in_review, 3=done")
    hours_in_current_status: float = Field(0.0, description="Hours elapsed since last status change")
    status_changes_count: int = Field(0, description="Number of status changes in task lifecycle")
    assignee_open_tasks: int = Field(0, description="Number of currently active open tasks assigned to user")
    assignee_ontime_rate: float = Field(0.85, description="Historical on-time completion percentage (0.0 to 1.0)")
    comment_count: int = Field(0, description="Total comment count on task")
    days_to_due_date: float = Field(7.0, description="Days remaining until due date (negative if overdue)")
    project_completion_rate: float = Field(0.0, description="Ratio of done tasks in project (0.0 to 1.0)")
    description_length: int = Field(0, description="Character length of task description")

class ContributingFactor(BaseModel):
    feature: str
    importance: float
    impact: str # 'increases_risk' | 'decreases_risk'
    reason: str

class RiskPredictionOutput(BaseModel):
    riskProbability: float
    riskScore: int # 0 - 100
    riskLevel: str # 'low' | 'medium' | 'high' | 'critical'
    topFactors: List[ContributingFactor]
    confidence: float

class TrainModelResponse(BaseModel):
    status: str
    message: str
    metrics: Dict[str, float]
    sampleCount: int
    modelPath: str
