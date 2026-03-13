"""Premium calculation service using AI-style risk scoring."""
from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models import WorkerProfile


# Risk scores by city (normalised 0-1, higher = more risky)
_CITY_RISK: dict[str, float] = {
    "mumbai": 0.85,
    "chennai": 0.80,
    "kolkata": 0.75,
    "delhi": 0.65,
    "bangalore": 0.55,
    "hyderabad": 0.50,
    "pune": 0.50,
    "ahmedabad": 0.45,
    "jaipur": 0.40,
    "default": 0.50,
}

# Vehicle vulnerability (higher = more exposed to disruption)
_VEHICLE_RISK: dict[str, float] = {
    "bicycle": 0.90,
    "motorcycle": 0.75,
    "on_foot": 0.95,
    "car": 0.40,
    "default": 0.60,
}

# Seasonal weather risk multipliers (month -> risk index)
_MONTH_RISK: dict[int, float] = {
    1: 0.30, 2: 0.25, 3: 0.30, 4: 0.45,
    5: 0.55, 6: 0.90, 7: 1.00, 8: 0.95,
    9: 0.85, 10: 0.60, 11: 0.40, 12: 0.30,
}


def calculate_risk_score(
    profile: "WorkerProfile",
    coverage_amount: float,
    purchase_month: int,
) -> float:
    """Return a normalised risk score in [0, 1].

    The score combines:
    - Seasonal weather risk (35 %)
    - Location/city risk     (30 %)
    - Claim history risk     (20 %)
    - Vehicle type risk      (15 %)
    """
    from app.config import WEIGHTS  # imported lazily to avoid circular imports

    weather_risk = _MONTH_RISK.get(purchase_month, 0.50)
    city_key = (profile.city or "default").lower()
    location_risk = _CITY_RISK.get(city_key, _CITY_RISK["default"])
    vehicle_key = (profile.vehicle_type or "default").lower()
    vehicle_risk = _VEHICLE_RISK.get(vehicle_key, _VEHICLE_RISK["default"])

    # History risk: caps at 1.0 when a worker has ≥10 claims
    history_risk = min(profile.total_claims / 10.0, 1.0)

    score = (
        WEIGHTS["weather"] * weather_risk
        + WEIGHTS["location"] * location_risk
        + WEIGHTS["history"] * history_risk
        + WEIGHTS["vehicle"] * vehicle_risk
    )
    return round(min(max(score, 0.0), 1.0), 4)


def calculate_premium(
    profile: "WorkerProfile",
    coverage_amount: float,
    purchase_month: int,
    base_rate: float = 0.05,
) -> dict[str, float]:
    """Return a dict with ``risk_score`` and ``premium_amount``.

    Premium = coverage × base_rate × (1 + risk_score)
    """
    risk_score = calculate_risk_score(profile, coverage_amount, purchase_month)
    premium = round(coverage_amount * base_rate * (1 + risk_score), 2)
    return {"risk_score": risk_score, "premium_amount": premium}
