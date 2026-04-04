from __future__ import annotations

from datetime import date
from typing import Any

from .models import ClaimBundle, DecisionResult
from .settings import settings


def _clamp(value: float, minimum: float = 0.0, maximum: float = 1.0) -> float:
    return max(minimum, min(maximum, value))


def _amount_anomaly(claimed_amount: float, avg_weekly_earnings: float, tier_coverage: float) -> float:
    baseline = max(avg_weekly_earnings * tier_coverage, 500)
    ratio = claimed_amount / baseline if baseline > 0 else 1
    if ratio <= 1:
        return 0.05
    if ratio <= 1.2:
        return 0.25
    if ratio <= 1.5:
        return 0.55
    return 0.85


def _frequency_risk(recent_claims_30d: int) -> float:
    return _clamp(recent_claims_30d / 8)


def _event_mismatch(claim_type: str, weather: dict[str, Any] | None, news: dict[str, Any] | None) -> float:
    if claim_type == "natural_disaster":
        if weather and weather.get("available"):
            if weather.get("severe_rain"):
                return 0.05
            if weather.get("moderate_rain"):
                return 0.25
            return 0.75
        return 0.40

    if claim_type == "strike_curfew":
        if news and news.get("available"):
            count = int(news.get("article_count") or 0)
            if count >= 8:
                return 0.15
            if count >= 3:
                return 0.35
            return 0.75
        return 0.45

    return 0.50


def _zone_match_risk(location_text: str | None, city: str | None, zone: str | None, disruptions: list[dict[str, Any]]) -> float:
    text = (location_text or "").lower()
    city_norm = (city or "").lower()
    zone_norm = (zone or "").lower()

    if city_norm and city_norm in text:
        return 0.10
    if zone_norm and zone_norm in text:
        return 0.10

    if disruptions:
        for event in disruptions:
            e_city = str(event.get("city", "")).lower()
            e_zone = str(event.get("zone", "")).lower()
            if (e_city and e_city in text) or (e_zone and e_zone in text):
                return 0.15

    return 0.60


def _time_mismatch(event_date_raw: str | None) -> float:
    if not event_date_raw:
        return 0.50

    try:
        event_date = date.fromisoformat(event_date_raw)
    except ValueError:
        return 0.60

    days = abs((date.today() - event_date).days)
    if days <= 1:
        return 0.05
    if days <= 5:
        return 0.20
    if days <= 14:
        return 0.50
    return 0.80


def deterministic_decision(bundle: ClaimBundle) -> DecisionResult:
    claim = bundle.claim
    profile = bundle.driver_profile

    claim_type = str(claim.get("claim_type") or "")
    claimed_amount = float(claim.get("claimed_amount") or 0)
    avg_weekly_earnings = float(profile.get("avg_weekly_earnings") or 3000)
    tier = str(profile.get("tier") or "basic")

    tier_coverage = {"basic": 0.5, "standard": 0.75, "premium": 1.0}.get(tier, 0.5)

    amount_anomaly = _amount_anomaly(claimed_amount, avg_weekly_earnings, tier_coverage)
    frequency_risk = _frequency_risk(len(bundle.recent_claims_30d))
    event_mismatch = _event_mismatch(claim_type, bundle.weather_signal, bundle.news_signal)
    zone_risk = _zone_match_risk(
        str(claim.get("location_text") or ""),
        str(profile.get("city") or ""),
        str(profile.get("zone") or ""),
        bundle.disruptions,
    )
    time_mismatch = _time_mismatch(claim.get("event_date"))

    # Weighted risk model in [0,1]
    risk = _clamp(
        (0.30 * amount_anomaly)
        + (0.20 * frequency_risk)
        + (0.25 * event_mismatch)
        + (0.15 * zone_risk)
        + (0.10 * time_mismatch)
    )

    confidence = _clamp(1 - (0.55 * abs(0.5 - risk) + 0.20))
    if risk <= 0.25:
        confidence = max(confidence, 0.85)
    if risk >= 0.80:
        confidence = max(confidence, 0.88)

    decision = "manual_review"
    if risk <= settings.auto_approve_max_risk and confidence >= settings.min_confidence_approve:
        decision = "approve"
    elif risk >= settings.auto_reject_min_risk and confidence >= settings.min_confidence_reject:
        decision = "reject"

    rationale = (
        f"risk={risk:.2f}, amount_anomaly={amount_anomaly:.2f}, frequency={frequency_risk:.2f}, "
        f"event_mismatch={event_mismatch:.2f}, zone_risk={zone_risk:.2f}, time_mismatch={time_mismatch:.2f}"
    )

    factors = {
        "tier": tier,
        "tier_coverage": tier_coverage,
        "claimed_amount": claimed_amount,
        "avg_weekly_earnings": avg_weekly_earnings,
        "recent_claims_30d": len(bundle.recent_claims_30d),
        "amount_anomaly": amount_anomaly,
        "frequency_risk": frequency_risk,
        "event_mismatch": event_mismatch,
        "zone_risk": zone_risk,
        "time_mismatch": time_mismatch,
        "weather_signal": bundle.weather_signal,
        "news_signal": bundle.news_signal,
    }

    return DecisionResult(
        suggested_decision=decision,
        confidence=confidence,
        risk_score=risk,
        rationale=rationale,
        factors=factors,
        model_provider="rules",
        model_name="deterministic-baseline",
        model_version="v1",
    )
