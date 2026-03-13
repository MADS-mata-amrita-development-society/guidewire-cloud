"""Authentication routes: register, login, logout."""
from flask import Blueprint, flash, redirect, render_template, request, url_for
from flask_login import current_user, login_required, login_user, logout_user
from app.models import User, WorkerProfile, db

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["GET", "POST"])
def register():
    if current_user.is_authenticated:
        return redirect(url_for("worker.dashboard"))

    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        confirm = request.form.get("confirm_password", "")
        full_name = request.form.get("full_name", "").strip()
        city = request.form.get("city", "").strip()
        phone = request.form.get("phone", "").strip()
        vehicle_type = request.form.get("vehicle_type", "bicycle")
        work_area = request.form.get("work_area", "").strip()

        errors = []
        if not email or "@" not in email:
            errors.append("A valid email is required.")
        if len(password) < 8:
            errors.append("Password must be at least 8 characters.")
        if password != confirm:
            errors.append("Passwords do not match.")
        if not full_name:
            errors.append("Full name is required.")
        if not city:
            errors.append("City is required.")
        if User.query.filter_by(email=email).first():
            errors.append("Email already registered.")

        if errors:
            for err in errors:
                flash(err, "danger")
            return render_template("auth/register.html",
                                   form_data=request.form)

        user = User(email=email, role="worker")
        user.set_password(password)
        db.session.add(user)
        db.session.flush()

        profile = WorkerProfile(
            user_id=user.id,
            full_name=full_name,
            city=city,
            phone=phone,
            vehicle_type=vehicle_type,
            work_area=work_area,
        )
        db.session.add(profile)
        db.session.commit()

        login_user(user)
        flash("Welcome to GuideWire! Your account has been created.", "success")
        return redirect(url_for("worker.dashboard"))

    return render_template("auth/register.html", form_data={})


@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    if current_user.is_authenticated:
        return redirect(url_for("worker.dashboard"))

    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        user = User.query.filter_by(email=email).first()

        if user and user.check_password(password):
            login_user(user, remember=bool(request.form.get("remember")))
            next_page = request.args.get("next")
            if user.role == "admin":
                return redirect(next_page or url_for("admin.dashboard"))
            return redirect(next_page or url_for("worker.dashboard"))

        flash("Invalid email or password.", "danger")

    return render_template("auth/login.html")


@auth_bp.route("/logout")
@login_required
def logout():
    logout_user()
    flash("You have been logged out.", "info")
    return redirect(url_for("auth.login"))
