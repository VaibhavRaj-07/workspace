from fastapi import APIRouter
from models.schemas import RiskFeatureInput, RiskPredictionOutput
from services.risk_predictor import risk_predictor

router = APIRouter(tags=["Risk"])

@router.post("/predict-risk", response_model=RiskPredictionOutput)
def predict_deadline_risk(features: RiskFeatureInput):
    result = risk_predictor.predict_risk(features.model_dump())
    return RiskPredictionOutput(**result)
