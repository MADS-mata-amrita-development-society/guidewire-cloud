"""Fraud detection service.

Assigns a fraud score (0–1) to a claim based on:
- Claim frequency in last 30 days
- Claims across multiple concurrent disruptions
- Payout-to-premium ratio
- Profile completeness
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models import Claim, WorkerProfile

logger = logging.getLogger(__name__)

# Weights for each signal (must sum to 1.0)
_W_FREQUENCY = 0.35
_W_PAYOUT_RATIO = 0.30
_W_MULTI_CLAIM = 0.20
_W_PROFILE = 0.15

FRAUD_THRESHOLD = 0.70   # claims with score >= this are flagged


def compute_fraud_score(
    worker_id: int,
    claim_amount: float,
    policy_premium: float,
) -> float:
    """Return a fraud score in [0, 1].

    Signals:
    1. Claim frequency – how many claims the worker filed in the last 30 days
    2. Payout/premium ratio – suspiciously high when ratio > 20×
    3. Multi-claim – multiple pending claims at the same time
    4. Incomplete profile – missing phone or work_area
    """
    from app.models import Claim, WorkerProfile, db

    score = 0.0

    # --- Signal 1: claim frequency ---
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    recent_count = (
        db.session.query(Claim)
        .filter(Claim.worker_id == worker_id, Claim.created_at >= cutoff)
        .count()
    )
    # 0 = no recent claims, 1.0 = 8+ claims in 30 days
    freq_score = min(recent_count / 8.0, 1.0)
    score += _W_FREQUENCY * freq_score

    # --- Signal 2: payout / premium ratio ---
    if policy_premium > 0:
        ratio = claim_amount / policy_premium
        # Suspicious if ratio > 20 (i.e., claiming 20× the premium paid)
        ratio_score = min(ratio / 20.0, 1.0)
    else:
        ratio_score = 0.5
    score += _W_PAYOUT_RATIO * ratio_score

    # --- Signal 3: simultaneous pending claims ---
    pending_count = (
        db.session.query(Claim)
        .filter(Claim.worker_id == worker_id, Claim.status == "pending")
        .count()
    )
    multi_score = min(pending_count / 3.0, 1.0)
    score += _W_MULTI_CLAIM * multi_score

    # --- Signal 4: profile completeness ---
    profile = WorkerProfile.query.filter_by(user_id=worker_id).first()
    if profile:
        missing_fields = sum([
            not profile.phone,
            not profile.work_area,
            not profile.city,
        ])
        profile_score = missing_fields / 3.0
    else:
        profile_score = 1.0   # missing profile is highly suspicious
    score += _W_PROFILE * profile_score

    final = round(min(max(score, 0.0), 1.0), 4)
    logger.debug("Fraud score for worker %d: %.4f", worker_id, final)
    return final


def evaluate_claim(claim_id: int) -> dict[str, object]:
    """Compute fraud score for a claim and update its status accordingly.

    Returns a dict with ``fraud_score``, ``status``, and ``auto_approved``.
    """
    from app.models import Claim, WorkerProfile, db

    claim = db.session.get(Claim, claim_id)
    if not claim:
        return {"error": "Claim not found"}

    fraud_score = compute_fraud_score(
        worker_id=claim.worker_id,
        claim_amount=claim.claim_amount,
        policy_premium=claim.policy.premium_amount,
    )

    claim.fraud_score = fraud_score

    if fraud_score >= FRAUD_THRESHOLD:
        claim.status = "fraud_flagged"
        claim.auto_approved = False
        # Also flag the worker's profile
        profile = WorkerProfile.query.filter_by(user_id=claim.worker_id).first()
        if profile:
            profile.fraud_flag = True
        logger.warning("Claim %d flagged as potential fraud (score=%.4f)", claim_id, fraud_score)
    else:
        claim.status = "approved"
        claim.auto_approved = True

    claim.processed_at = datetime.now(timezone.utc)
    db.session.commit()

    return {
        "fraud_score": fraud_score,
        "status": claim.status,
        "auto_approved": claim.auto_approved,
    }
