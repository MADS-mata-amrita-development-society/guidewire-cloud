from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from supabase import Client, create_client

from .models import ClaimBundle, DecisionResult
from .settings import settings


class SupabaseGateway:
    def __init__(self) -> None:
        self.client: Client = create_client(settings.supabase_url, settings.supabase_service_role_key)

    def dequeue(self, batch_size: int) -> list[dict[str, Any]]:
        response = self.client.rpc("claim_ai_dequeue", {"p_batch_size": batch_size}).execute()
        return response.data or []

    def mark_failed(self, queue_id: str, error: str, retry_after_seconds: int = 300) -> None:
        self.client.rpc(
            "claim_ai_mark_failed",
            {
                "p_queue_id": queue_id,
                "p_error": error,
                "p_retry_after_seconds": retry_after_seconds,
            },
        ).execute()

    def fetch_claim_bundle(self, claim_id: str) -> ClaimBundle:
        claim = (
            self.client.table("claims")
            .select("*")
            .eq("id", claim_id)
            .single()
            .execute()
            .data
        )

        if not claim:
            raise ValueError(f"Claim not found: {claim_id}")

        profile = (
            self.client.table("driver_profiles")
            .select("*")
            .eq("user_id", claim["driver_id"])
            .maybe_single()
            .execute()
            .data
            or {}
        )

        since = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
        recent = (
            self.client.table("claims")
            .select("id,status,filed_at,claimed_amount")
            .eq("driver_id", claim["driver_id"])
            .gte("filed_at", since)
            .order("filed_at", desc=True)
            .execute()
            .data
            or []
        )

        disruptions_query = self.client.table("disruption_events").select("*").eq("is_active", True)
        city = str(profile.get("city") or "").strip()
        zone = str(profile.get("zone") or "").strip()

        if city:
            disruptions_query = disruptions_query.eq("city", city)
        elif zone:
            disruptions_query = disruptions_query.eq("zone", zone)

        disruptions = disruptions_query.limit(10).execute().data or []

        return ClaimBundle(
            claim=claim,
            driver_profile=profile,
            recent_claims_30d=recent,
            disruptions=disruptions,
        )

    def save_decision(self, queue_id: str, claim_id: str, result: DecisionResult) -> str:
        response = self.client.rpc(
            "apply_ai_claim_decision",
            {
                "p_queue_id": queue_id,
                "p_claim_id": claim_id,
                "p_suggested_decision": result.suggested_decision,
                "p_confidence": result.confidence,
                "p_risk_score": result.risk_score,
                "p_rationale": result.rationale,
                "p_factors": result.factors,
                "p_model_provider": result.model_provider,
                "p_model_name": result.model_name,
                "p_model_version": result.model_version,
            },
        ).execute()
        return str(response.data or "pending")

    def recompute_premium(self, driver_id: str) -> float:
        response = self.client.rpc("recompute_driver_premium", {"p_driver_id": driver_id}).execute()
        return float(response.data or 0)
