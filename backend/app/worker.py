from __future__ import annotations

import asyncio
from typing import Any

from .models import DecisionResult
from .providers import fetch_news_signal, fetch_weather_signal, llm_decision
from .scoring import deterministic_decision
from .settings import settings
from .supabase_client import SupabaseGateway


class ClaimAiWorker:
    def __init__(self, gateway: SupabaseGateway | None = None) -> None:
        self.gateway = gateway or SupabaseGateway()

    async def evaluate_claim(self, queue_id: str, claim_id: str) -> dict[str, Any]:
        bundle = self.gateway.fetch_claim_bundle(claim_id)

        bundle.weather_signal, bundle.news_signal = await asyncio.gather(
            fetch_weather_signal(bundle.claim.get("location_text"), bundle.claim.get("event_date")),
            fetch_news_signal(bundle.claim.get("location_text")),
        )

        base = deterministic_decision(bundle)

        llm_output = await llm_decision(base.factors)
        result = base

        if llm_output:
            decision = str(llm_output.get("decision") or base.suggested_decision)
            confidence = float(llm_output.get("confidence") or base.confidence)
            risk_score = float(llm_output.get("risk_score") or base.risk_score)
            rationale = str(llm_output.get("rationale") or base.rationale)

            # Deterministic guardrails.
            if decision == "approve" and risk_score > settings.auto_approve_max_risk:
                decision = "manual_review"
            if decision == "reject" and risk_score < settings.auto_reject_min_risk:
                decision = "manual_review"

            result = DecisionResult(
                suggested_decision=decision,
                confidence=max(0.0, min(1.0, confidence)),
                risk_score=max(0.0, min(1.0, risk_score)),
                rationale=rationale,
                factors={**base.factors, "llm_raw": llm_output},
                model_provider="openai",
                model_name=settings.openai_model,
                model_version="v1",
            )

        applied = self.gateway.save_decision(queue_id, claim_id, result)

        return {
            "queue_id": queue_id,
            "claim_id": claim_id,
            "suggested": result.suggested_decision,
            "applied": applied,
            "risk_score": result.risk_score,
            "confidence": result.confidence,
        }

    async def process_batch(self, batch_size: int | None = None) -> dict[str, Any]:
        size = batch_size or settings.process_batch_size
        queue_items = self.gateway.dequeue(size)

        processed: list[dict[str, Any]] = []
        failed: list[dict[str, Any]] = []

        for item in queue_items:
            queue_id = item.get("queue_id")
            claim_id = item.get("claim_id")
            if not queue_id or not claim_id:
                continue

            try:
                summary = await self.evaluate_claim(str(queue_id), str(claim_id))
                processed.append(summary)
            except Exception as exc:  # noqa: BLE001
                self.gateway.mark_failed(str(queue_id), str(exc))
                failed.append({"queue_id": str(queue_id), "claim_id": str(claim_id), "error": str(exc)})

        return {
            "dequeued": len(queue_items),
            "processed": processed,
            "failed": failed,
        }
