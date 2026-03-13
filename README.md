# GuideWire Cloud — Parametric Income Protection for Delivery Partners

External disruption triggers instant payouts with no forms and no manual claims.

## Features

| Feature | Description |
|---|---|
| **Worker Onboarding & Profile** | Registration, login, profile with city/vehicle/zone |
| **Weekly Policy Purchase** | Choose coverage (₹500–₹5,000/week) with instant premium estimate |
| **AI-based Dynamic Premium** | Risk score combining weather, location, vehicle type & claim history |
| **Automated Disruption Detection** | OpenWeatherMap + TomTom APIs (mock fallback for dev) |
| **Fraud Detection** | Claim-frequency, payout-ratio, multi-claim & profile-completeness signals |
| **Instant Mock Payouts** | Auto-approved claims trigger instant payout records (unique tx ref) |
| **Worker Dashboard** | Active policy, recent claims, payout history |
| **Admin Dashboard** | KPIs, disruption scanner, claim management, fraud flags |

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Run the app (development)
python run.py
```

Visit `http://localhost:5000`.

**Default admin credentials:** `admin@guidewire.app` / `Admin@1234`

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `SECRET_KEY` | `dev-secret-key-...` | Flask session secret |
| `DATABASE_URL` | `sqlite:///guidewire.db` | SQLAlchemy DB URL |
| `OPENWEATHER_API_KEY` | `mock_weather_key` | OpenWeatherMap API key |
| `TOMTOM_API_KEY` | `mock_traffic_key` | TomTom Traffic API key |

When API keys are set to mock values the app uses built-in demo disruption data.

## Project Structure

```
app/
├── models.py              # SQLAlchemy models (User, Policy, Claim, Payout, …)
├── routes/
│   ├── auth.py            # Register / login / logout
│   ├── worker.py          # Worker dashboard, profile, policy purchase
│   ├── admin.py           # Admin dashboard, claim management, disruption scanner
│   └── api.py             # JSON API endpoints
├── services/
│   ├── premium.py         # AI-based risk score & premium calculation
│   ├── disruption.py      # Weather & traffic disruption detection
│   ├── fraud.py           # Fraud scoring & claim evaluation
│   ├── payout.py          # Instant mock payout processing
│   └── claims.py          # Auto-claim generation on disruption
├── templates/             # Jinja2 HTML templates
└── static/                # CSS & JS assets
config.py                  # App configuration
run.py                     # Entry point
tests/test_app.py          # 30 pytest tests
```

## Running Tests

```bash
pytest tests/ -v
```

