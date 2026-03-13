from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timezone

db = SQLAlchemy()


class User(UserMixin, db.Model):
    """Worker or admin account."""

    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(150), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="worker")  # worker | admin
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    profile = db.relationship("WorkerProfile", back_populates="user", uselist=False)
    policies = db.relationship("Policy", back_populates="worker")
    claims = db.relationship("Claim", back_populates="worker")
    payouts = db.relationship("Payout", back_populates="worker")

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def __repr__(self) -> str:  # pragma: no cover
        return f"<User {self.email}>"


class WorkerProfile(db.Model):
    """Extended profile information for a worker."""

    __tablename__ = "worker_profiles"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), unique=True, nullable=False)
    full_name = db.Column(db.String(150), nullable=False)
    phone = db.Column(db.String(20))
    city = db.Column(db.String(100), nullable=False)
    latitude = db.Column(db.Float, default=0.0)
    longitude = db.Column(db.Float, default=0.0)
    vehicle_type = db.Column(db.String(50), default="bicycle")  # bicycle|motorcycle|car|on_foot
    work_area = db.Column(db.String(200))
    total_claims = db.Column(db.Integer, default=0)
    fraud_flag = db.Column(db.Boolean, default=False)
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = db.relationship("User", back_populates="profile")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<WorkerProfile {self.full_name}>"


class Policy(db.Model):
    """Weekly parametric insurance policy."""

    __tablename__ = "policies"

    id = db.Column(db.Integer, primary_key=True)
    worker_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    coverage_amount = db.Column(db.Float, nullable=False)
    premium_amount = db.Column(db.Float, nullable=False)
    risk_score = db.Column(db.Float, default=0.0)
    status = db.Column(db.String(20), default="active")  # active|expired|cancelled
    week_start = db.Column(db.DateTime, nullable=False)
    week_end = db.Column(db.DateTime, nullable=False)
    purchased_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    worker = db.relationship("User", back_populates="policies")
    claims = db.relationship("Claim", back_populates="policy")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Policy {self.id} worker={self.worker_id} status={self.status}>"


class DisruptionEvent(db.Model):
    """A detected external disruption (weather, traffic, curfew)."""

    __tablename__ = "disruption_events"

    id = db.Column(db.Integer, primary_key=True)
    city = db.Column(db.String(100), nullable=False, index=True)
    disruption_type = db.Column(db.String(50), nullable=False)  # heavy_rain|extreme_heat|flooding|curfew|traffic_jam
    severity = db.Column(db.String(20), default="moderate")   # low|moderate|high|critical
    description = db.Column(db.Text)
    detected_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    resolved_at = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True)
    source = db.Column(db.String(50), default="weather_api")

    claims = db.relationship("Claim", back_populates="disruption")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<DisruptionEvent {self.disruption_type} in {self.city}>"


class Claim(db.Model):
    """Auto-generated claim tied to a disruption event."""

    __tablename__ = "claims"

    id = db.Column(db.Integer, primary_key=True)
    worker_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    policy_id = db.Column(db.Integer, db.ForeignKey("policies.id"), nullable=False)
    disruption_id = db.Column(db.Integer, db.ForeignKey("disruption_events.id"), nullable=False)
    claim_amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), default="pending")  # pending|approved|paid|rejected|fraud_flagged
    fraud_score = db.Column(db.Float, default=0.0)        # 0-1, higher = more suspicious
    auto_approved = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    processed_at = db.Column(db.DateTime)
    notes = db.Column(db.Text)

    worker = db.relationship("User", back_populates="claims")
    policy = db.relationship("Policy", back_populates="claims")
    disruption = db.relationship("DisruptionEvent", back_populates="claims")
    payout = db.relationship("Payout", back_populates="claim", uselist=False)

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Claim {self.id} worker={self.worker_id} status={self.status}>"


class Payout(db.Model):
    """Instant mock payout record."""

    __tablename__ = "payouts"

    id = db.Column(db.Integer, primary_key=True)
    worker_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    claim_id = db.Column(db.Integer, db.ForeignKey("claims.id"), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), default="completed")  # completed|failed|reversed
    transaction_ref = db.Column(db.String(64), unique=True)
    paid_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    worker = db.relationship("User", back_populates="payouts")
    claim = db.relationship("Claim", back_populates="payout")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Payout {self.transaction_ref} amount={self.amount}>"
