import os
from fastapi import APIRouter, HTTPException
from models.schemas import TrainModelResponse
from scripts.train_model import run_training_pipeline

router = APIRouter(tags=["Training"])

@router.post("/train-risk-model", response_model=TrainModelResponse)
def retrain_model():
    try:
        metrics, sample_count, model_path = run_training_pipeline()
        return TrainModelResponse(
            status="success",
            message="Trained XGBoost / GradientBoosting deadline risk model successfully",
            metrics=metrics,
            sampleCount=sample_count,
            modelPath=model_path,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training pipeline error: {str(e)}")
