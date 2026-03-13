"""Admin dashboard routes."""
from flask import Blueprint, flash, redirect, render_template, request, url_for
from flask_login import current_user, login_required

from app.models import Claim, DisruptionEvent, Policy, Payout, User, WorkerProfile, db
from app.services.claims import create_claims_for_disruption
from app.services.disruption import detect_and_store_disruptions
from app.services.fraud import evaluate_claim
from app.services.payout import process_payout

admin_bp = Blueprint("admin", __name__)


def _admin_required(f):
    """Decorator that ensures the current user is an admin."""
    from functools import wraps

    @wraps(f)
    @login_required
    def decorated(*args, **kwargs):
        if current_user.role != "admin":
            flash("Admin access required.", "danger")
            return redirect(url_for("worker.dashboard"))
        return f(*args, **kwargs)

    return decorated


@admin_bp.route("/admin/dashboard")
@_admin_required
def dashboard():
    total_workers = User.query.filter_by(role="worker").count()
    active_policies = Policy.query.filter_by(status="active").count()
    pending_claims = Claim.query.filter_by(status="pending").count()
    fraud_flagged = Claim.query.filter_by(status="fraud_flagged").count()
    total_payout = (
        db.session.query(db.func.sum(Payout.amount))
        .filter_by(status="completed")
        .scalar() or 0.0
    )
    active_disruptions = DisruptionEvent.query.filter_by(is_active=True).all()
    recent_claims = (
        Claim.query.order_by(Claim.created_at.desc()).limit(10).all()
    )
    flagged_workers = (
        WorkerProfile.query.filter_by(fraud_flag=True).all()
    )

    return render_template(
        "admin/dashboard.html",
        total_workers=total_workers,
        active_policies=active_policies,
        pending_claims=pending_claims,
        fraud_flagged=fraud_flagged,
        total_payout=total_payout,
        active_disruptions=active_disruptions,
        recent_claims=recent_claims,
        flagged_workers=flagged_workers,
    )


@admin_bp.route("/admin/workers")
@_admin_required
def workers():
    page = request.args.get("page", 1, type=int)
    workers_q = (
        User.query.filter_by(role="worker")
        .order_by(User.created_at.desc())
        .paginate(page=page, per_page=20)
    )
    return render_template("admin/workers.html", workers=workers_q)


@admin_bp.route("/admin/disruptions")
@_admin_required
def disruptions():
    all_disruptions = DisruptionEvent.query.order_by(DisruptionEvent.detected_at.desc()).all()
    return render_template("admin/disruptions.html", disruptions=all_disruptions)


@admin_bp.route("/admin/disruptions/trigger", methods=["POST"])
@_admin_required
def trigger_disruption_check():
    """Manually trigger a disruption detection run."""
    from flask import current_app
    new_ids = detect_and_store_disruptions(current_app._get_current_object())
    for did in new_ids:
        create_claims_for_disruption(did)
    flash(f"Disruption check complete. {len(new_ids)} new disruption(s) detected.", "success")
    return redirect(url_for("admin.disruptions"))


@admin_bp.route("/admin/disruptions/simulate", methods=["POST"])
@_admin_required
def simulate_disruption():
    """Simulate a manual disruption event for testing."""
    city = request.form.get("city", "").strip()
    disruption_type = request.form.get("disruption_type", "heavy_rain")
    severity = request.form.get("severity", "high")
    description = request.form.get("description", "Manual simulation").strip()

    if not city:
        flash("City is required.", "danger")
        return redirect(url_for("admin.disruptions"))

    from datetime import datetime, timezone
    from app.models import DisruptionEvent

    disruption = DisruptionEvent(
        city=city,
        disruption_type=disruption_type,
        severity=severity,
        description=description,
        source="manual",
        detected_at=datetime.now(timezone.utc),
    )
    db.session.add(disruption)
    db.session.flush()
    db.session.commit()

    created = create_claims_for_disruption(disruption.id)
    flash(
        f"Disruption simulated for {city}. {len(created)} auto-claim(s) triggered.",
        "success",
    )
    return redirect(url_for("admin.disruptions"))


@admin_bp.route("/admin/claims")
@_admin_required
def claims():
    status_filter = request.args.get("status", "")
    page = request.args.get("page", 1, type=int)
    q = Claim.query.order_by(Claim.created_at.desc())
    if status_filter:
        q = q.filter_by(status=status_filter)
    claims_paged = q.paginate(page=page, per_page=20)
    return render_template("admin/claims.html", claims=claims_paged, status_filter=status_filter)


@admin_bp.route("/admin/claims/<int:claim_id>/approve", methods=["POST"])
@_admin_required
def approve_claim(claim_id: int):
    claim = Claim.query.get_or_404(claim_id)
    if claim.status not in ("pending", "fraud_flagged"):
        flash("Claim cannot be approved in its current state.", "warning")
        return redirect(url_for("admin.claims"))
    claim.status = "approved"
    claim.auto_approved = False
    db.session.commit()
    result = process_payout(claim_id)
    if result["success"]:
        flash(f"Claim #{claim_id} approved and paid (ref: {result['transaction_ref']}).", "success")
    else:
        flash(f"Claim approved but payout failed: {result.get('error')}", "warning")
    return redirect(url_for("admin.claims"))


@admin_bp.route("/admin/claims/<int:claim_id>/reject", methods=["POST"])
@_admin_required
def reject_claim(claim_id: int):
    claim = Claim.query.get_or_404(claim_id)
    claim.status = "rejected"
    db.session.commit()
    flash(f"Claim #{claim_id} rejected.", "info")
    return redirect(url_for("admin.claims"))


@admin_bp.route("/admin/claims/<int:claim_id>/evaluate", methods=["POST"])
@_admin_required
def evaluate_claim_route(claim_id: int):
    result = evaluate_claim(claim_id)
    flash(
        f"Claim #{claim_id} evaluated: status={result.get('status')} "
        f"fraud_score={result.get('fraud_score', 0):.2f}",
        "info",
    )
    return redirect(url_for("admin.claims"))
