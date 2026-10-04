from fastapi import APIRouter
from models.schemas import HealthResponse
from services.embedding_service import embedding_service
from services.risk_predictor import risk_predictor

router = APIRouter(tags=["Health"])

@router.get("/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        modelsLoaded={
            "riskPredictor": risk_predictor.model is not None,
            "embeddingModel": embedding_service.model is not None,
        }
    )
