from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class ClaimBundle:
    claim: dict[str, Any]
    driver_profile: dict[str, Any]
    recent_claims_30d: list[dict[str, Any]] = field(default_factory=list)
    disruptions: list[dict[str, Any]] = field(default_factory=list)
    weather_signal: dict[str, Any] | None = None
    news_signal: dict[str, Any] | None = None


@dataclass
class DecisionResult:
    suggested_decision: str
    confidence: float
    risk_score: float
    rationale: str
    factors: dict[str, Any]
    model_provider: str
    model_name: str
    model_version: str
