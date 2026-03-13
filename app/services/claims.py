"""Claims creation service.

Auto-generates claims for all affected workers when a disruption is detected.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


def create_claims_for_disruption(disruption_id: int) -> list[int]:
    """Create pending claims for every active-policy worker in the disrupted city.

    Returns a list of newly created Claim IDs.
    """
    from app.models import Claim, DisruptionEvent, Policy, WorkerProfile, db
    from app.services.fraud import evaluate_claim
    from app.services.payout import process_payout

    disruption = db.session.get(DisruptionEvent, disruption_id)
    if not disruption:
        logger.error("DisruptionEvent %d not found", disruption_id)
        return []

    # Find all workers with active policies in the affected city
    now = datetime.now(timezone.utc)
    active_policies = (
        Policy.query.join(WorkerProfile, Policy.worker_id == WorkerProfile.user_id)
        .filter(
            WorkerProfile.city.ilike(disruption.city),
            Policy.status == "active",
            Policy.week_start <= now,
            Policy.week_end >= now,
        )
        .all()
    )

    created_ids: list[int] = []
    for policy in active_policies:
        # Skip if a claim for this worker+disruption already exists
        existing = Claim.query.filter_by(
            worker_id=policy.worker_id, disruption_id=disruption_id
        ).first()
        if existing:
            continue

        # Severity multiplier for claim amount
        severity_multiplier = {
            "low": 0.25,
            "moderate": 0.50,
            "high": 0.75,
            "critical": 1.00,
        }.get(disruption.severity, 0.50)

        claim_amount = round(policy.coverage_amount * severity_multiplier, 2)

        claim = Claim(
            worker_id=policy.worker_id,
            policy_id=policy.id,
            disruption_id=disruption_id,
            claim_amount=claim_amount,
            status="pending",
            created_at=datetime.now(timezone.utc),
        )
        db.session.add(claim)
        db.session.flush()
        created_ids.append(claim.id)
        logger.info(
            "Auto-claim %d created: worker=%d amount=%.2f disruption=%d",
            claim.id, policy.worker_id, claim_amount, disruption_id,
        )

    db.session.commit()

    # Evaluate fraud and trigger payouts for each new claim
    for claim_id in created_ids:
        result = evaluate_claim(claim_id)
        if result.get("auto_approved"):
            process_payout(claim_id)

    return created_ids
