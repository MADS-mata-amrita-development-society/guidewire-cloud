"""JSON API endpoints for premium estimation and disruption detection."""
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from app.models import DisruptionEvent, Policy, WorkerProfile
from app.services.premium import calculate_premium

api_bp = Blueprint("api", __name__, url_prefix="/api")


@api_bp.route("/premium/estimate", methods=["POST"])
@login_required
def estimate_premium():
    """Return a premium estimate for the current worker.

    Body JSON: { "coverage_amount": 1000 }
    """
    data = request.get_json(force=True, silent=True) or {}
    coverage_amount = float(data.get("coverage_amount", 1000))
    if coverage_amount <= 0:
        return jsonify({"error": "coverage_amount must be positive"}), 400

    profile = WorkerProfile.query.filter_by(user_id=current_user.id).first()
    if not profile:
        return jsonify({"error": "Worker profile not found"}), 404

    now = datetime.now(timezone.utc)
    result = calculate_premium(profile, coverage_amount, now.month)
    return jsonify({
        "coverage_amount": coverage_amount,
        "premium_amount": result["premium_amount"],
        "risk_score": result["risk_score"],
    })


@api_bp.route("/disruptions/active", methods=["GET"])
@login_required
def active_disruptions():
    """Return active disruptions, optionally filtered by city."""
    city = request.args.get("city")
    q = DisruptionEvent.query.filter_by(is_active=True)
    if city:
        q = q.filter(DisruptionEvent.city.ilike(city))
    disruptions = q.order_by(DisruptionEvent.detected_at.desc()).all()
    return jsonify([
        {
            "id": d.id,
            "city": d.city,
            "type": d.disruption_type,
            "severity": d.severity,
            "description": d.description,
            "detected_at": d.detected_at.isoformat(),
        }
        for d in disruptions
    ])


@api_bp.route("/worker/summary", methods=["GET"])
@login_required
def worker_summary():
    """Return summary stats for the current worker."""
    from app.models import Claim, Payout, db

    active_policy = (
        Policy.query.filter_by(worker_id=current_user.id, status="active")
        .order_by(Policy.purchased_at.desc())
        .first()
    )
    claim_count = Claim.query.filter_by(worker_id=current_user.id).count()
    total_paid = (
        db.session.query(db.func.sum(Payout.amount))
        .filter_by(worker_id=current_user.id, status="completed")
        .scalar() or 0.0
    )

    return jsonify({
        "has_active_policy": active_policy is not None,
        "policy_coverage": active_policy.coverage_amount if active_policy else 0,
        "total_claims": claim_count,
        "total_paid_out": total_paid,
    })
