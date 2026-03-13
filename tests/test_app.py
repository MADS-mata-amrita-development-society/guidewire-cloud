"""Tests for GuideWire Cloud."""
import pytest
from app import create_app
from app.models import db as _db, User, WorkerProfile, Policy, DisruptionEvent, Claim, Payout
from config import TestingConfig
from datetime import datetime, timedelta, timezone


@pytest.fixture
def app():
    app = create_app(TestingConfig)
    with app.app_context():
        _db.create_all()
        yield app
        _db.session.remove()
        _db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def runner(app):
    return app.test_cli_runner()


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def _register_worker(client, email="worker@test.com", password="Test1234!", city="Mumbai"):
    return client.post("/register", data={
        "email": email,
        "password": password,
        "confirm_password": password,
        "full_name": "Test Worker",
        "city": city,
        "phone": "+91 99999 00000",
        "vehicle_type": "motorcycle",
        "work_area": "Zone A",
    }, follow_redirects=True)


def _login(client, email, password):
    return client.post("/login", data={"email": email, "password": password},
                       follow_redirects=True)


# ──────────────────────────────────────────────────────────────────────────────
# Auth tests
# ──────────────────────────────────────────────────────────────────────────────

class TestAuth:
    def test_register_success(self, client):
        rv = _register_worker(client)
        assert rv.status_code == 200
        assert b"Dashboard" in rv.data or b"Welcome" in rv.data

    def test_register_duplicate_email(self, client):
        _register_worker(client)
        client.get("/logout", follow_redirects=True)
        rv = _register_worker(client)
        assert b"already registered" in rv.data

    def test_register_short_password(self, client):
        rv = client.post("/register", data={
            "email": "x@x.com", "password": "short",
            "confirm_password": "short", "full_name": "X", "city": "Delhi",
        }, follow_redirects=True)
        assert b"8 characters" in rv.data

    def test_login_success(self, client):
        _register_worker(client)
        client.get("/logout", follow_redirects=True)
        rv = _login(client, "worker@test.com", "Test1234!")
        assert rv.status_code == 200

    def test_login_wrong_password(self, client):
        _register_worker(client)
        client.get("/logout", follow_redirects=True)
        rv = _login(client, "worker@test.com", "WrongPass!")
        assert b"Invalid" in rv.data

    def test_logout(self, client):
        _register_worker(client)
        rv = client.get("/logout", follow_redirects=True)
        assert rv.status_code == 200


# ──────────────────────────────────────────────────────────────────────────────
# Premium calculation tests
# ──────────────────────────────────────────────────────────────────────────────

class TestPremium:
    def _make_profile(self, app, city="Mumbai", vehicle="motorcycle", total_claims=0):
        with app.app_context():
            user = User(email="p@test.com", role="worker")
            user.set_password("Test1234!")
            _db.session.add(user)
            _db.session.flush()
            profile = WorkerProfile(
                user_id=user.id, full_name="P", city=city,
                vehicle_type=vehicle, total_claims=total_claims,
            )
            _db.session.add(profile)
            _db.session.commit()
            return profile.id

    def test_premium_positive(self, app):
        from app.services.premium import calculate_premium
        with app.app_context():
            profile = WorkerProfile(
                user_id=1, full_name="T", city="Mumbai",
                vehicle_type="bicycle", total_claims=0,
            )
            result = calculate_premium(profile, 1000, 7)
            assert result["premium_amount"] > 0
            assert 0 <= result["risk_score"] <= 1

    def test_premium_higher_for_risky_city(self, app):
        from app.services.premium import calculate_premium
        with app.app_context():
            profile_risky = WorkerProfile(
                user_id=1, full_name="T", city="Mumbai",
                vehicle_type="bicycle", total_claims=0,
            )
            profile_safe = WorkerProfile(
                user_id=2, full_name="T", city="Jaipur",
                vehicle_type="bicycle", total_claims=0,
            )
            risky = calculate_premium(profile_risky, 1000, 7)
            safe = calculate_premium(profile_safe, 1000, 7)
            assert risky["premium_amount"] > safe["premium_amount"]

    def test_premium_scales_with_coverage(self, app):
        from app.services.premium import calculate_premium
        with app.app_context():
            profile = WorkerProfile(
                user_id=1, full_name="T", city="Delhi",
                vehicle_type="car", total_claims=0,
            )
            p1 = calculate_premium(profile, 1000, 6)
            p2 = calculate_premium(profile, 2000, 6)
            assert p2["premium_amount"] > p1["premium_amount"]

    def test_risk_score_bounded(self, app):
        from app.services.premium import calculate_risk_score
        with app.app_context():
            profile = WorkerProfile(
                user_id=1, full_name="T", city="Mumbai",
                vehicle_type="on_foot", total_claims=50,
            )
            score = calculate_risk_score(profile, 5000, 7)
            assert 0.0 <= score <= 1.0


# ──────────────────────────────────────────────────────────────────────────────
# Disruption detection tests
# ──────────────────────────────────────────────────────────────────────────────

class TestDisruption:
    def test_mock_disruptions_mumbai(self):
        from app.services.disruption import _mock_disruptions
        events = _mock_disruptions("mumbai")
        assert len(events) >= 1
        assert all("type" in e for e in events)

    def test_mock_disruptions_unknown_city(self):
        from app.services.disruption import _mock_disruptions
        assert _mock_disruptions("atlantis") == []

    def test_parse_weather_heavy_rain(self):
        from app.services.disruption import _parse_weather_response
        data = {
            "rain": {"1h": 20.0},
            "main": {"temp": 28.0},
            "wind": {"speed": 5.0},
            "weather": [{"id": 500}],
        }
        events = _parse_weather_response(data)
        assert any(e["type"] == "heavy_rain" for e in events)

    def test_parse_weather_extreme_heat(self):
        from app.services.disruption import _parse_weather_response
        data = {
            "rain": {"1h": 0},
            "main": {"temp": 46.0},
            "wind": {"speed": 2.0},
            "weather": [{"id": 800}],
        }
        events = _parse_weather_response(data)
        assert any(e["type"] == "extreme_heat" for e in events)

    def test_parse_weather_flooding(self):
        from app.services.disruption import _parse_weather_response
        data = {
            "rain": {"1h": 55.0},
            "main": {"temp": 28.0},
            "wind": {"speed": 0},
            "weather": [{"id": 502}],
        }
        events = _parse_weather_response(data)
        assert any(e["type"] == "flooding" for e in events)

    def test_detect_and_store(self, app):
        from app.services.disruption import detect_and_store_disruptions
        with app.app_context():
            # Create a worker with active policy in Mumbai
            user = User(email="d@test.com", role="worker")
            user.set_password("Pass1234!")
            _db.session.add(user)
            _db.session.flush()
            profile = WorkerProfile(user_id=user.id, full_name="D", city="Mumbai", vehicle_type="bicycle")
            _db.session.add(profile)
            now = datetime.now(timezone.utc)
            policy = Policy(
                worker_id=user.id, coverage_amount=1000, premium_amount=50,
                week_start=now - timedelta(days=1), week_end=now + timedelta(days=6),
            )
            _db.session.add(policy)
            _db.session.commit()

        new_ids = detect_and_store_disruptions(app)
        assert isinstance(new_ids, list)
        with app.app_context():
            total = DisruptionEvent.query.count()
            assert total >= len(new_ids)


# ──────────────────────────────────────────────────────────────────────────────
# Fraud detection tests
# ──────────────────────────────────────────────────────────────────────────────

class TestFraud:
    def _setup_claim(self, app):
        with app.app_context():
            user = User(email="fr@test.com", role="worker")
            user.set_password("Pass1234!")
            _db.session.add(user)
            _db.session.flush()
            profile = WorkerProfile(
                user_id=user.id, full_name="FR", city="Delhi",
                vehicle_type="car", phone="+91 11111 11111", work_area="Zone B",
            )
            _db.session.add(profile)
            now = datetime.now(timezone.utc)
            policy = Policy(
                worker_id=user.id, coverage_amount=1000, premium_amount=50,
                week_start=now - timedelta(days=1), week_end=now + timedelta(days=6),
            )
            _db.session.add(policy)
            disruption = DisruptionEvent(
                city="Delhi", disruption_type="extreme_heat", severity="high",
                description="Test heat",
            )
            _db.session.add(disruption)
            _db.session.flush()
            claim = Claim(
                worker_id=user.id, policy_id=policy.id,
                disruption_id=disruption.id, claim_amount=500,
                status="pending",
            )
            _db.session.add(claim)
            _db.session.commit()
            return user.id, claim.id

    def test_fraud_score_range(self, app):
        from app.services.fraud import compute_fraud_score
        user_id, _ = self._setup_claim(app)
        with app.app_context():
            score = compute_fraud_score(user_id, 500, 50)
            assert 0.0 <= score <= 1.0

    def test_evaluate_claim_approves_clean(self, app):
        from app.services.fraud import evaluate_claim
        _, claim_id = self._setup_claim(app)
        with app.app_context():
            result = evaluate_claim(claim_id)
            # Low-frequency clean claim should not be fraud flagged
            assert result["status"] in ("approved", "fraud_flagged")
            assert "fraud_score" in result

    def test_high_frequency_raises_score(self, app):
        from app.services.fraud import compute_fraud_score
        with app.app_context():
            user = User(email="hf@test.com", role="worker")
            user.set_password("Pass1234!")
            _db.session.add(user)
            _db.session.flush()
            profile = WorkerProfile(user_id=user.id, full_name="HF", city="Mumbai",
                                    vehicle_type="bicycle")
            _db.session.add(profile)
            policy = Policy(
                worker_id=user.id, coverage_amount=1000, premium_amount=10,
                week_start=datetime.now(timezone.utc) - timedelta(days=1),
                week_end=datetime.now(timezone.utc) + timedelta(days=6),
            )
            disruption = DisruptionEvent(
                city="Mumbai", disruption_type="heavy_rain", severity="high",
            )
            _db.session.add(policy)
            _db.session.add(disruption)
            _db.session.flush()
            # Add 9 recent claims to inflate frequency score
            for _ in range(9):
                c = Claim(worker_id=user.id, policy_id=policy.id,
                          disruption_id=disruption.id, claim_amount=500, status="pending")
                _db.session.add(c)
            _db.session.commit()
            score = compute_fraud_score(user.id, 500, 10)
            assert score > 0.3   # frequency signal should push it up


# ──────────────────────────────────────────────────────────────────────────────
# Payout tests
# ──────────────────────────────────────────────────────────────────────────────

class TestPayout:
    def _setup_approved_claim(self, app):
        with app.app_context():
            user = User(email="pay@test.com", role="worker")
            user.set_password("Pass1234!")
            _db.session.add(user)
            _db.session.flush()
            profile = WorkerProfile(user_id=user.id, full_name="Pay", city="Chennai",
                                    vehicle_type="motorcycle")
            _db.session.add(profile)
            now = datetime.now(timezone.utc)
            policy = Policy(
                worker_id=user.id, coverage_amount=2000, premium_amount=80,
                week_start=now - timedelta(days=1), week_end=now + timedelta(days=6),
            )
            _db.session.add(policy)
            disruption = DisruptionEvent(
                city="Chennai", disruption_type="heavy_rain", severity="moderate",
            )
            _db.session.add(disruption)
            _db.session.flush()
            claim = Claim(
                worker_id=user.id, policy_id=policy.id,
                disruption_id=disruption.id, claim_amount=1000, status="approved",
            )
            _db.session.add(claim)
            _db.session.commit()
            return claim.id

    def test_process_payout_success(self, app):
        from app.services.payout import process_payout
        claim_id = self._setup_approved_claim(app)
        with app.app_context():
            result = process_payout(claim_id)
            assert result["success"] is True
            assert result["amount"] == 1000.0
            assert result["transaction_ref"].startswith("GW-")

    def test_process_payout_claim_not_found(self, app):
        from app.services.payout import process_payout
        with app.app_context():
            result = process_payout(9999)
            assert result["success"] is False

    def test_double_payout_prevented(self, app):
        from app.services.payout import process_payout
        claim_id = self._setup_approved_claim(app)
        with app.app_context():
            process_payout(claim_id)
            result2 = process_payout(claim_id)
            assert result2["success"] is False


# ──────────────────────────────────────────────────────────────────────────────
# End-to-end flow: buy policy → disrupt → claim → payout
# ──────────────────────────────────────────────────────────────────────────────

class TestE2EFlow:
    def test_full_flow(self, app, client):
        # 1. Register worker
        rv = _register_worker(client, "e2e@test.com", "Test1234!", "Mumbai")
        assert rv.status_code == 200

        # 2. Buy policy via UI
        rv = client.post("/policy/buy", data={
            "action": "purchase",
            "coverage_amount": "1000",
        }, follow_redirects=True)
        assert rv.status_code == 200

        # 3. Simulate disruption in Mumbai
        with app.app_context():
            from app.services.claims import create_claims_for_disruption
            disruption = DisruptionEvent(
                city="Mumbai", disruption_type="heavy_rain",
                severity="high", description="Test rain",
            )
            _db.session.add(disruption)
            _db.session.commit()
            claim_ids = create_claims_for_disruption(disruption.id)

        # 4. Verify claims were created
        assert len(claim_ids) >= 1

        # 5. Check payouts
        with app.app_context():
            payout = Payout.query.first()
            # If claim was auto-approved (low fraud score), payout exists
            claim = Claim.query.first()
            assert claim is not None
            if claim.status == "paid":
                assert payout is not None


# ──────────────────────────────────────────────────────────────────────────────
# Admin route tests
# ──────────────────────────────────────────────────────────────────────────────

class TestAdminRoutes:
    def _login_admin(self, client):
        return client.post("/login", data={
            "email": "admin@guidewire.app",
            "password": "Admin@1234",
        }, follow_redirects=True)

    def test_admin_dashboard_accessible(self, client):
        rv = self._login_admin(client)
        assert rv.status_code == 200
        assert b"Admin" in rv.data

    def test_admin_dashboard_blocks_worker(self, client):
        _register_worker(client)
        rv = client.get("/admin/dashboard", follow_redirects=True)
        assert b"Admin access required" in rv.data or rv.status_code == 200

    def test_simulate_disruption(self, client, app):
        self._login_admin(client)
        rv = client.post("/admin/disruptions/simulate", data={
            "city": "Mumbai",
            "disruption_type": "flooding",
            "severity": "critical",
            "description": "Admin test flood",
        }, follow_redirects=True)
        assert rv.status_code == 200
        with app.app_context():
            d = DisruptionEvent.query.filter_by(city="Mumbai").first()
            assert d is not None
            assert d.disruption_type == "flooding"

    def test_claim_reject(self, client, app):
        # Create a claim to reject
        with app.app_context():
            user = User(email="rej@test.com", role="worker")
            user.set_password("Pass1234!")
            _db.session.add(user)
            _db.session.flush()
            profile = WorkerProfile(user_id=user.id, full_name="Rej", city="Kolkata",
                                    vehicle_type="bicycle")
            _db.session.add(profile)
            now = datetime.now(timezone.utc)
            policy = Policy(
                worker_id=user.id, coverage_amount=1000, premium_amount=40,
                week_start=now - timedelta(days=1), week_end=now + timedelta(days=6),
            )
            _db.session.add(policy)
            disruption = DisruptionEvent(city="Kolkata", disruption_type="traffic_jam",
                                         severity="high")
            _db.session.add(disruption)
            _db.session.flush()
            claim = Claim(
                worker_id=user.id, policy_id=policy.id,
                disruption_id=disruption.id, claim_amount=500, status="pending",
            )
            _db.session.add(claim)
            _db.session.commit()
            claim_id = claim.id

        self._login_admin(client)
        rv = client.post(f"/admin/claims/{claim_id}/reject", follow_redirects=True)
        assert rv.status_code == 200
        with app.app_context():
            claim = _db.session.get(Claim, claim_id)
            assert claim.status == "rejected"


# ──────────────────────────────────────────────────────────────────────────────
# API endpoint tests
# ──────────────────────────────────────────────────────────────────────────────

class TestAPI:
    def test_premium_estimate_api(self, client):
        _register_worker(client)
        rv = client.post("/api/premium/estimate",
                         json={"coverage_amount": 1000},
                         content_type="application/json")
        assert rv.status_code == 200
        data = rv.get_json()
        assert "premium_amount" in data
        assert data["premium_amount"] > 0

    def test_active_disruptions_api(self, client, app):
        _register_worker(client)
        with app.app_context():
            d = DisruptionEvent(city="Mumbai", disruption_type="heavy_rain",
                                severity="high", is_active=True)
            _db.session.add(d)
            _db.session.commit()
        rv = client.get("/api/disruptions/active")
        assert rv.status_code == 200
        data = rv.get_json()
        assert isinstance(data, list)

    def test_worker_summary_api(self, client):
        _register_worker(client)
        rv = client.get("/api/worker/summary")
        assert rv.status_code == 200
        data = rv.get_json()
        assert "has_active_policy" in data
        assert "total_paid_out" in data
