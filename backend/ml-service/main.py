import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import health, embed, risk, train
from config import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("ml-service")

app = FastAPI(
    title="Collaborative Workspace ML Microservice",
    version="1.0.0",
    description="XGBoost Deadline Risk Predictor and sentence-transformers Embedding Service",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(embed.router)
app.include_router(risk.router)
app.include_router(train.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=False)
