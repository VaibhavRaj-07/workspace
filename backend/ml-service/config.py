import os

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

class Settings:
    HOST: str = os.getenv("ML_HOST", "0.0.0.0")
    PORT: int = int(os.getenv("ML_PORT", "8000"))
    MODEL_PATH: str = os.getenv("RISK_MODEL_PATH", os.path.join(os.path.dirname(__file__), "models", "deadline_risk_xgb.joblib"))
    EMBEDDING_MODEL_NAME: str = os.getenv("EMBEDDING_MODEL_NAME", "all-MiniLM-L6-v2")
    DEVICE: str = os.getenv("DEVICE", "cpu")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/algo_workspace")

settings = Settings()
