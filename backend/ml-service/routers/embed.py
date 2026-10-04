from fastapi import APIRouter
from models.schemas import EmbedRequest, EmbedResponse
from services.embedding_service import embedding_service

router = APIRouter(tags=["Embeddings"])

@router.post("/embed", response_model=EmbedResponse)
def get_embeddings(request: EmbedRequest):
    embeddings = embedding_service.embed_texts(request.texts)
    return EmbedResponse(
        embeddings=embeddings,
        dimensions=embedding_service.dimensions,
    )
