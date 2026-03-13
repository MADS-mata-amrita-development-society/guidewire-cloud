"""Flask application factory."""
from __future__ import annotations

import logging

from flask import Flask, redirect, url_for
from flask_login import LoginManager

from app.models import User, db


def create_app(config_object=None) -> Flask:
    app = Flask(__name__, template_folder="templates", static_folder="static")

    # ── Configuration ─────────────────────────────────────────────────────────
    if config_object is None:
        from config import Config
        app.config.from_object(Config)
    else:
        app.config.from_object(config_object)

    # ── Extensions ────────────────────────────────────────────────────────────
    db.init_app(app)

    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = "auth.login"
    login_manager.login_message_category = "info"

    @login_manager.user_loader
    def load_user(user_id: str):
        return db.session.get(User, int(user_id))

    # ── Blueprints ────────────────────────────────────────────────────────────
    from app.routes.auth import auth_bp
    from app.routes.worker import worker_bp
    from app.routes.admin import admin_bp
    from app.routes.api import api_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(worker_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(api_bp)

    # ── Root redirect ─────────────────────────────────────────────────────────
    @app.route("/")
    def index():
        return redirect(url_for("auth.login"))

    # ── Database initialisation ───────────────────────────────────────────────
    with app.app_context():
        db.create_all()
        _seed_admin(app)

    # ── Background scheduler ──────────────────────────────────────────────────
    if not app.config.get("TESTING"):
        _start_scheduler(app)

    logging.basicConfig(level=logging.INFO)
    return app


def _seed_admin(app: Flask) -> None:
    """Create a default admin account if none exists."""
    from app.models import User

    if not User.query.filter_by(role="admin").first():
        admin = User(email="admin@guidewire.app", role="admin")
        admin.set_password("Admin@1234")
        db.session.add(admin)
        db.session.commit()
        app.logger.info("Default admin created: admin@guidewire.app / Admin@1234")


def _start_scheduler(app: Flask) -> None:
    """Start APScheduler to periodically check for disruptions."""
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        from app.services.disruption import detect_and_store_disruptions
        from app.services.claims import create_claims_for_disruption

        interval = app.config.get("DISRUPTION_CHECK_INTERVAL_MINUTES", 30)
        scheduler = BackgroundScheduler()

        def run_check():
            new_ids = detect_and_store_disruptions(app)
            for did in new_ids:
                create_claims_for_disruption(did)

        scheduler.add_job(run_check, "interval", minutes=interval, id="disruption_check")
        scheduler.start()
        app.logger.info("Disruption scheduler started (every %d min)", interval)
    except Exception as exc:  # noqa: BLE001
        app.logger.warning("Could not start scheduler: %s", exc)
