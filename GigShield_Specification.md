AI-Powered Parametric Income Insurance for Gig Delivery Workers
Guidewire DEVTrails 2026

---

## 1. PROBLEM STATEMENT
----------------------------------------------------------------

India has over 10 million platform-based gig delivery workers operating across
food delivery (Zomato, Swiggy), e-commerce (Amazon, Flipkart), and quick
commerce (Zepto, Blinkit, Dunzo). These workers are the backbone of India's
digital economy, yet they operate with zero financial safety net.

External disruptions — heavy rain, floods, extreme heat, severe air pollution,
local curfews, and sudden zone closures — can reduce a worker's income by
20-30% in a single week. When these events occur, the worker bears the full
financial loss with no recourse. No insurance. No compensation. No support.

GigShield solves this by providing automated, parametric income insurance
that pays out instantly when a verified disruption occurs — without the worker
ever having to file a claim manually.

---

## 2. PRODUCT OVERVIEW
----------------------------------------------------------------

GigShield is a parametric insurance platform built for gig delivery workers.
It monitors real-time environmental and social disruption data, and when a
trigger threshold is crossed, it automatically validates, approves, and
processes a payout to the affected worker.

The key distinction from traditional insurance:
- No manual claim filing required
- No assessors or investigators
- No waiting period
- Payout is triggered by objective, verifiable external data

Coverage is strictly limited to income loss caused by external disruptions.
Health, life, accidents, and vehicle repairs are explicitly excluded.

Pricing is structured on a weekly basis to match the earnings cycle of gig
workers, who are paid weekly by their platforms.

---

## 3. PERSONAS & USER ROLES
----------------------------------------------------------------

### 3.1 Gig Worker (Primary End User)
- Delivery partners on Zomato, Swiggy, Zepto, Blinkit, Amazon, Flipkart
- Earns weekly, operates in specific city zones
- Needs simple onboarding, zero paperwork, instant payouts
- Low digital literacy assumed — UI must be extremely simple

### 3.2 Dark Store / Fleet Manager (Reporting Layer)
- Manages a cluster of delivery workers operating out of a dark store or warehouse hub
- Can view the status of workers under their supervision
- Reports disruptions affecting their zone to the system
- Can flag anomalies or escalate claims on behalf of workers
- Acts as a ground-level verification layer for disruption events

### 3.3 Insurance Admin / Higher-Up (Operations Layer)
- Monitors overall platform activity, claim volumes, and payout rates
- Reviews escalated claims that automation could not resolve
- Manually approves or rejects edge-case insurance claims
- Accesses loss ratio reports and disruption analytics
- Can configure trigger thresholds and coverage tiers

### 3.4 Developer / Platform Admin (System Layer)
- Full access to system analytics and infrastructure metrics
- Resolves discrepancies in insurance claim data
- Monitors ML model performance and fraud detection accuracy
- Manages API health (weather, AQI, payment gateway)
- Reviews system logs and flags data inconsistencies

---

## 4. COVERAGE SCOPE
----------------------------------------------------------------

### What GigShield Covers:
- Income lost during verified external disruption events
- Partial income loss (e.g., 3 hours lost during a 2-hour rain event)
- Weekly coverage tied to the worker's average weekly earnings baseline

### What GigShield Does NOT Cover:
- Health or medical expenses
- Life insurance
- Vehicle damage or repair
- Accidents on the job
- Any event caused by the worker's own actions

---

## 5. PARAMETRIC TRIGGERS
----------------------------------------------------------------

Claims are initiated automatically when real-time data from external APIs
crosses pre-defined thresholds. No human intervention required.

**Trigger 1 — Heavy Rainfall**
- **Condition:** Rainfall exceeds threshold mm/hr in worker's registered zone
- **Data Source:** OpenWeatherMap API or IMD API
- **Impact:** Deliveries halted, worker cannot operate safely
- **Payout:** Proportional to hours lost during the event window

**Trigger 2 — Extreme Heat**
- **Condition:** Temperature exceeds 42 degrees Celsius in worker's zone
- **Data Source:** Weather API
- **Impact:** Worker cannot safely operate outdoors
- **Payout:** Proportional to hours lost

**Trigger 3 — Severe Air Quality**
- **Condition:** AQI exceeds 300 (Severe category) in worker's zone
- **Data Source:** AQI API (CPCB data or OpenAQ)
- **Impact:** Unsafe outdoor working conditions
- **Payout:** Proportional to hours lost

**Trigger 4 — Flooding / Natural Disaster**
- **Condition:** Official flood alert declared for worker's registered zone
- **Data Source:** Government disaster alert API or mock feed
- **Impact:** Zone inaccessible, deliveries impossible
- **Payout:** Full coverage for the affected period

**Trigger 5 — Curfew / Local Strike / Zone Closure**
- **Condition:** Official curfew or verified local strike in worker's zone
- **Data Source:** Mock feed / manual flag by Dark Store Manager
- **Impact:** Worker cannot access pickup or drop locations
- **Payout:** Proportional to hours lost

*Note: All triggers are zone-specific. A trigger in one part of the city does not affect workers registered in a different zone.*

---

## 6. WEEKLY PREMIUM MODEL
----------------------------------------------------------------

### Why Weekly?
Gig workers are paid on a weekly cycle by their platforms. A monthly premium
model would be misaligned with their cash flow. Weekly pricing ensures
affordability and removes the barrier of a large upfront payment.

### How Premiums Are Calculated:
The premium is calculated dynamically using a Linear Regression ML model
trained on the following features:
- Worker's registered delivery zone (historical disruption frequency)
- Platform type (food vs grocery vs e-commerce)
- Worker's average weekly earnings (sets the coverage amount)
- Historical claim frequency of the worker
- Upcoming week's weather forecast risk score
- Zone-level flood / heat / AQI risk index

### Premium Tiers (Indicative):

**Tier 1 — Basic**
- Weekly Premium: Low
- Coverage: Up to 50% of average weekly earnings
- Best for: Workers in low-risk zones

**Tier 2 — Standard**
- Weekly Premium: Medium
- Coverage: Up to 75% of average weekly earnings
- Best for: Workers in moderate-risk zones

**Tier 3 — Premium**
- Weekly Premium: High
- Coverage: Up to 100% of average weekly earnings
- Best for: Workers in high-risk zones (coastal, flood-prone)

*Workers can manually upgrade or downgrade their tier at any time from their dashboard before the weekly policy renews.*

### Sick Leave Note:
GigShield does not cover sick leave. Sick leave is the responsibility of
the gig platform (Zomato, Swiggy, etc.) or the worker's own savings.
GigShield exclusively covers external, environmental, and social disruptions
that are objectively verifiable — not personal health events.

---

## 7. ML MODEL — PREMIUM CALCULATION
----------------------------------------------------------------

**Model Type:** Linear Regression (no LLMs, no heavy deep learning)
**Why Linear Regression:**
- Lightweight, fast, low infrastructure cost
- Interpretable — easy to explain to regulators and judges
- Sufficient for the structured tabular data we are working with
- Does not require GPU or expensive compute

**Input Features:**
- zone_risk_score (historical disruption frequency per zone)
- platform_type (encoded: food=1, grocery=2, ecommerce=3)
- avg_weekly_earnings (worker's declared + platform-verified earnings)
- claim_history_score (number of past claims, normalized)
- weather_forecast_risk (predicted risk score for upcoming week)
- aqi_forecast_risk (predicted AQI risk for upcoming week)

**Output:**
- weekly_premium (in INR)
- recommended_tier (1, 2, or 3)

**Training Data:**
- Synthetic dataset generated based on Indian city weather patterns, historical AQI data, and gig worker income estimates
- Model retrained periodically as real claim data accumulates

**Hosting:** Model served via a lightweight REST API endpoint
*No LLMs used anywhere in the system. All intelligence is rule-based or ML model-based to keep infrastructure costs minimal.*

---

## 8. FRAUD DETECTION
----------------------------------------------------------------

Fraud detection is rule-based and ML-assisted. No LLMs involved.

**Rule-Based Checks (run first, fast):**
- Duplicate claim check: same worker, same event, same time window
- Zone mismatch: worker's GPS location during disruption vs registered zone
- Timing mismatch: claim filed outside the disruption event window
- Frequency check: worker filing unusually high number of claims compared to zone average

**ML-Based Anomaly Detection (run second):**
- Model: Isolation Forest or simple statistical outlier detection
- Flags claims that deviate significantly from historical patterns
- Features: claim frequency, payout amount, zone, time of day, weather severity at time of claim

**Escalation Flow:**
- Low risk score: auto-approved, instant payout
- Medium risk score: flagged for Insurance Admin review
- High risk score: rejected automatically, worker notified with reason
- Edge cases: escalated to Insurance Admin for manual resolution

**Dark Store Manager Role in Fraud Detection:**
- Can confirm or deny that a disruption actually affected their zone
- Acts as a human verification layer for social disruption events (curfews, strikes) that may not have an API data source

---

## 9. SYSTEM ARCHITECTURE
----------------------------------------------------------------

**Frontend:**
- Web App: React / Next.js
- Mobile App: React Native (shared component logic with web)
- Separate views for Worker, Dark Store Manager, Insurance Admin, and Developer roles

**Backend:**
- REST API server (tech to be finalized — Python FastAPI recommended for easy ML model integration)
- Handles user auth, policy management, claim processing, payout initiation

**ML Services:**
- Premium Calculation Service (Linear Regression model)
- Fraud Detection Service (rule engine + anomaly detection)
- Both served as internal microservices or simple API endpoints

**Database:**
- Workers, policies, claims, payouts, zone data
- Relational DB recommended (PostgreSQL)

**External APIs:**
- Weather API (OpenWeatherMap free tier or mock)
- AQI API (OpenAQ or mock)
- Payment Gateway (Razorpay test mode / Stripe sandbox / UPI mock)
- Social disruption feed (mock or manual input by manager)

**Trigger Engine:**
- Cron job or event-driven service that polls external APIs
- Compares live data against trigger thresholds per zone
- Fires claim initiation events when thresholds are crossed

---

## 10. DASHBOARDS
----------------------------------------------------------------

**10.1 Worker Dashboard (Web + Mobile)**
- Active policy status and current tier
- Weekly premium amount and next renewal date
- Earnings protected this week
- Active disruption alerts in their zone
- Claim history and payout history
- Manual tier upgrade / downgrade option
- Payment method management (UPI, bank account)
- One-tap manual claim option (for edge cases not auto-triggered)

**10.2 Dark Store / Fleet Manager Dashboard (Web)**
- List of workers registered under their dark store
- Real-time disruption status for their zone
- Ability to manually flag a social disruption (curfew, strike) and report it to the system
- Worker claim status overview
- Escalation panel for workers facing issues with their claims

**10.3 Insurance Admin / Higher-Up Dashboard (Web)**
- Platform-wide claim volume and payout metrics
- Loss ratio by zone, platform type, and tier
- Escalated claims queue for manual review and resolution
- Ability to approve or reject flagged claims
- Disruption event log with trigger details
- Predictive analytics: next week's likely claim volume based on weather forecasts
- Worker tier distribution and revenue overview

**10.4 Developer / Platform Admin Dashboard (Web)**
- Full system analytics and infrastructure health
- API status monitoring (weather, AQI, payment gateway)
- ML model performance metrics (accuracy, drift detection)
- Fraud detection hit rate and false positive rate
- Database discrepancy resolver (manual data correction tool)
- System logs and error tracking
- Ability to retrain or update ML models

---

## 11. CLAIM FLOW — END TO END
----------------------------------------------------------------

**Step 1: Trigger Detection**
Trigger engine polls weather/AQI/social APIs every X minutes. Detects threshold breach in a specific zone.

**Step 2: Affected Workers Identified**
System queries all workers with active policies in the affected zone.

**Step 3: Fraud Check**
Rule-based checks run first (duplicate, zone match, timing). ML anomaly detection runs second. Risk score assigned to each potential claim.

**Step 4: Auto-Approval or Escalation**
Low risk: claim auto-approved, move to payout.
Medium risk: sent to Insurance Admin queue.
High risk: auto-rejected, worker notified.

**Step 5: Payout Processing**
Approved claims sent to mock payment gateway. Worker receives payout via UPI/bank transfer simulation. Worker notified via app and SMS (simulated).

**Step 6: Claim Logged**
Full claim record stored: trigger data, fraud score, approval method, payout amount, timestamp. Available in all relevant dashboards.

---

## 12. TECH STACK SUMMARY
----------------------------------------------------------------

| Layer | Technology |
| --- | --- |
| Web Frontend | React / Next.js |
| Mobile Frontend | React Native |
| Backend API | Python FastAPI (recommended) or Node.js |
| ML Models | scikit-learn (Linear Regression, Isolation Forest) |
| Database | PostgreSQL |
| Weather API | OpenWeatherMap (free tier) or mock |
| AQI API | OpenAQ or mock |
| Payment Gateway | Razorpay test mode / Stripe sandbox / UPI mock |
| Hosting | TBD (AWS free tier / Vercel / Railway) |
| Auth | JWT-based authentication |

*No LLMs used. All AI/ML is lightweight, rule-based, or classical ML to minimize infrastructure cost.*

---

## 13. PHASE ROADMAP
----------------------------------------------------------------

**Phase 1 — Ideation and Foundation (March 4-20)**
- Problem definition and persona finalization
- Weekly premium model design
- Parametric trigger definition
- Tech stack decision
- Figma prototype (worker onboarding + dashboard screens)
- README and 2-minute strategy video
*Deadline: March 20, End of Day*

**Phase 2 — Automation and Protection (March 21 - April 4)**
- Worker registration and onboarding flow
- Insurance policy creation and management
- Dynamic premium calculation (Linear Regression model live)
- Claims management system
- 3-5 automated disruption triggers via APIs
- Basic fraud detection (rule-based)
- 2-minute demo video
*Deadline: April 4*

**Phase 3 — Scale and Optimise (April 5-17)**
- Advanced fraud detection (ML anomaly detection)
- Simulated instant payout system (mock gateway)
- Full worker and admin dashboards
- Dark store manager reporting flow
- Developer analytics dashboard
- Final 5-minute demo video
- Final pitch deck (PDF)
*Deadline: April 17*

---

## 14. WHAT WE ARE NOT BUILDING
----------------------------------------------------------------

To keep scope manageable and costs low:
- No LLMs or generative AI anywhere in the system
- No real payment processing (mock/sandbox only)
- No real platform API integration (Zomato/Swiggy APIs are simulated)
- No health, life, accident, or vehicle insurance features
- No monthly pricing model (weekly only, by design)

---
*Built for Guidewire DEVTrails 2026*