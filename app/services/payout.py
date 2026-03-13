"""Instant mock payout service.

Processes approved claims and generates a simulated payout record.
In a production system this would integrate with a payment gateway.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


def process_payout(claim_id: int) -> dict[str, object]:
    """Create a Payout record for an approved claim and mark it as paid.

    Returns a dict describing the result.
    """
    from app.models import Claim, Payout, WorkerProfile, db

    claim = db.session.get(Claim, claim_id)
    if not claim:
        return {"success": False, "error": "Claim not found"}

    if claim.status not in ("approved",):
        return {"success": False, "error": f"Claim is not in approved state (current: {claim.status})"}

    if claim.payout:
        return {"success": False, "error": "Payout already exists for this claim"}

    # Generate a unique transaction reference
    transaction_ref = f"GW-{uuid.uuid4().hex[:12].upper()}"

    payout = Payout(
        worker_id=claim.worker_id,
        claim_id=claim.id,
        amount=claim.claim_amount,
        status="completed",
        transaction_ref=transaction_ref,
        paid_at=datetime.now(timezone.utc),
    )
    db.session.add(payout)

    # Update claim status
    claim.status = "paid"

    # Update worker profile claim counter
    profile = WorkerProfile.query.filter_by(user_id=claim.worker_id).first()
    if profile:
        profile.total_claims += 1

    db.session.commit()

    logger.info(
        "Payout %s processed: worker=%d amount=%.2f",
        transaction_ref, claim.worker_id, payout.amount,
    )

    return {
        "success": True,
        "transaction_ref": transaction_ref,
        "amount": payout.amount,
        "paid_at": payout.paid_at.isoformat(),
    }


def trigger_auto_payouts(disruption_id: int) -> list[dict[str, object]]:
    """Process payouts for all approved claims linked to a disruption.

    This is called automatically after a disruption is detected and claims
    are evaluated by the fraud service.
    """
    from app.models import Claim

    claims = Claim.query.filter_by(disruption_id=disruption_id, status="approved").all()
    results = []
    for claim in claims:
        result = process_payout(claim.id)
        results.append({"claim_id": claim.id, **result})
    return results
