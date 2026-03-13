"""Worker dashboard, profile, and policy purchase routes."""
from datetime import datetime, timedelta, timezone

from flask import Blueprint, flash, redirect, render_template, request, url_for
from flask_login import current_user, login_required

from app.models import Claim, Policy, Payout, WorkerProfile, db
from app.services.premium import calculate_premium

worker_bp = Blueprint("worker", __name__)


def _get_profile_or_404():
    profile = WorkerProfile.query.filter_by(user_id=current_user.id).first()
    if not profile:
        flash("Please complete your profile first.", "warning")
    return profile


@worker_bp.route("/dashboard")
@login_required
def dashboard():
    if current_user.role == "admin":
        return redirect(url_for("admin.dashboard"))

    profile = _get_profile_or_404()
    active_policy = Policy.query.filter_by(
        worker_id=current_user.id, status="active"
    ).order_by(Policy.purchased_at.desc()).first()

    recent_claims = (
        Claim.query.filter_by(worker_id=current_user.id)
        .order_by(Claim.created_at.desc())
        .limit(5)
        .all()
    )
    recent_payouts = (
        Payout.query.filter_by(worker_id=current_user.id)
        .order_by(Payout.paid_at.desc())
        .limit(5)
        .all()
    )

    total_paid = (
        db.session.query(db.func.sum(Payout.amount))
        .filter_by(worker_id=current_user.id, status="completed")
        .scalar() or 0.0
    )

    return render_template(
        "worker/dashboard.html",
        profile=profile,
        active_policy=active_policy,
        recent_claims=recent_claims,
        recent_payouts=recent_payouts,
        total_paid=total_paid,
    )


@worker_bp.route("/profile", methods=["GET", "POST"])
@login_required
def profile():
    profile = WorkerProfile.query.filter_by(user_id=current_user.id).first()

    if request.method == "POST":
        full_name = request.form.get("full_name", "").strip()
        city = request.form.get("city", "").strip()
        phone = request.form.get("phone", "").strip()
        vehicle_type = request.form.get("vehicle_type", "bicycle")
        work_area = request.form.get("work_area", "").strip()

        if not full_name or not city:
            flash("Full name and city are required.", "danger")
            return render_template("worker/profile.html", profile=profile)

        if profile:
            profile.full_name = full_name
            profile.city = city
            profile.phone = phone
            profile.vehicle_type = vehicle_type
            profile.work_area = work_area
        else:
            profile = WorkerProfile(
                user_id=current_user.id,
                full_name=full_name,
                city=city,
                phone=phone,
                vehicle_type=vehicle_type,
                work_area=work_area,
            )
            db.session.add(profile)

        db.session.commit()
        flash("Profile updated successfully.", "success")
        return redirect(url_for("worker.dashboard"))

    return render_template("worker/profile.html", profile=profile)


@worker_bp.route("/policy/buy", methods=["GET", "POST"])
@login_required
def buy_policy():
    profile = _get_profile_or_404()
    if not profile:
        return redirect(url_for("worker.profile"))

    estimate = None
    coverage_options = [500, 1000, 2000, 3000, 5000]

    if request.method == "POST":
        action = request.form.get("action", "estimate")
        coverage_amount = float(request.form.get("coverage_amount", 1000))

        now = datetime.now(timezone.utc)
        result = calculate_premium(profile, coverage_amount, now.month)

        if action == "estimate":
            estimate = {
                "coverage_amount": coverage_amount,
                **result,
            }
            return render_template(
                "worker/policy.html",
                profile=profile,
                coverage_options=coverage_options,
                estimate=estimate,
            )

        # Purchase
        # Expire any previous active policy
        Policy.query.filter_by(worker_id=current_user.id, status="active").update(
            {"status": "expired"}
        )
        db.session.flush()

        week_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_end = week_start + timedelta(days=7)

        policy = Policy(
            worker_id=current_user.id,
            coverage_amount=coverage_amount,
            premium_amount=result["premium_amount"],
            risk_score=result["risk_score"],
            week_start=week_start,
            week_end=week_end,
        )
        db.session.add(policy)
        db.session.commit()

        flash(
            f"Policy purchased! Coverage: ₹{coverage_amount:,.0f} | "
            f"Premium: ₹{result['premium_amount']:,.2f}",
            "success",
        )
        return redirect(url_for("worker.dashboard"))

    return render_template(
        "worker/policy.html",
        profile=profile,
        coverage_options=coverage_options,
        estimate=estimate,
    )


@worker_bp.route("/claims")
@login_required
def claims():
    all_claims = (
        Claim.query.filter_by(worker_id=current_user.id)
        .order_by(Claim.created_at.desc())
        .all()
    )
    return render_template("worker/claims.html", claims=all_claims)


@worker_bp.route("/payouts")
@login_required
def payouts():
    all_payouts = (
        Payout.query.filter_by(worker_id=current_user.id)
        .order_by(Payout.paid_at.desc())
        .all()
    )
    return render_template("worker/payouts.html", payouts=all_payouts)
