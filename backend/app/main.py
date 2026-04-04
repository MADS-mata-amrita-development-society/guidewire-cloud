from __future__ import annotations

from fastapi import FastAPI, Query

from .settings import settings
from .supabase_client import SupabaseGateway
from .worker import ClaimAiWorker


app = FastAPI(title="Aegis AI Claim Worker", version="0.1.0")
worker = ClaimAiWorker()
gateway = SupabaseGateway()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "aegis-ai-worker"}


@app.post("/process")
async def process(batch_size: int = Query(default=settings.process_batch_size, ge=1, le=100)) -> dict:
    return await worker.process_batch(batch_size)


@app.post("/premium/recompute/{driver_id}")
def recompute(driver_id: str) -> dict:
    premium = gateway.recompute_premium(driver_id)
    return {"driver_id": driver_id, "premium": premium}
