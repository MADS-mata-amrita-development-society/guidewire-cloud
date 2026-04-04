# Aegis 
>AI-Ready Income Insurance for Gig Workers

## Introduction
Aegis (Zeus' shield in Greek mythology) is an AI-ready insurance ecosystem built for the modern quick commerce revolution. 

With the prevalent boom of fast moving platforms like Swiggy, Zomato, Blinkit, Zepto, etc, that ensure delivery of almost any desired product, from groceries to technology, there has also been a huge increase in the gig-based job market primarily consisting of delivery drivers for said platforms. These drivers work daily wages and earn based on the number of deliveries they do. Making it a very fragile source of income. If at any point they are forced to skip working days due to any natural disaster or political strike/curfew, they are left with no salary for the missed deliveries because there is no safety net in effect, yet.

Aegis is here to solve that problem exactly. This repository is the codebase for the PWA (Progressive Web Application) that we are building for everyone that will use this app (Gig workers, QCommerce company managers and Aegis admins).

Rather than targeting individual drivers, we have planned to take a B2B approach, partnering with the gig companies, while ensuring no additional effort is required from our clients. We plan to fully handle the insurance tier management, claims and payouts autonomously from our end.

---

## What’s Built (MVP)

The current app is a working, multi-portal PWA with a complete claim → review → payout loop:

* **Driver Portal:** file claims, view claim history, manage tier, and track wallet payouts.
* **Manager Portal:** company-scoped dashboards for drivers, claims, and payout impact.
* **Admin Portal:** claim review queue to approve/reject claims, plus wallet operations.

The MVP is designed to be **automation-ready**: it ships with secure data boundaries, auditable actions, and atomic ledger updates, so AI-assisted verification can be added without rewriting the foundations.

---

## 1. Requirements

### Personas
We identified three key personas to meet all the users' requirements:
* **Gig Delivery Driver (End User):** Faces long hours, no fixed income, and no safety net during disruptions like rain or strikes. They need a simple interface to apply for claims, manage tiers, and track claim history.
* **Q-Commerce Manager (B2B Client):** They need better retention and consistent delivery performance. They get a monitoring dashboard with an overview of everything. This includes geographic overviews (e.g., "50 riders in Zone A are grounded due to heavy flooding in Sarjapur") and see metrics like churn rate, with no administrative overhead from their side.
* **Aegis Admin:** Responsible for managing different clients, tweaking insurance modules, monitoring company analytics, reviewing AI fraud flagging, and manually overriding the AI model's parameters if needed.


### Application Workflow:
1. We partner with a gig platform (B2B), covering their drivers and providing role-based access (Driver / Manager / Admin).
2. If a disruption occurs (heavy rain, strike), the driver logs into the Aegis app and files a claim.
3. **MVP:** every claim enters a review queue as `pending`.
4. An Aegis Admin approves/rejects the claim. On approval, the system credits the driver wallet and logs the payout transaction atomically.
5. The B2B client views company-scoped drivers/claims/payout stats in the Manager Portal.

> [!NOTE]
> Automated verification (parametric triggers + risk scoring) is part of the roadmap. The current shipped PWA focuses on correctness, auditability, and secure data boundaries.

---

## 2. Weekly Premium Model

The pricing structure is aligned with weekly gig-worker pay cycles. We propose three tiers available via the worker dashboard:
* **Basic Tier (Starting):** The entry-level tier covering up to 50% of average earnings. While designed for low-risk zones, workers can earn a free upgrade to higher tiers based on consistent performance.
* **Standard Tier:** Covers up to 75% of average earnings. Best for moderate-risk zones with occasional disruptions.
* **Premium Tier:** Covers up to 100% of average earnings. Designed for high-risk zones with frequent disruptions.

> [!NOTE]
> Workers can also manually adjust their tier at any time before the weekly policy renews.

**Parametric Triggers:**
Once the plan is activated, the user will be able to claim insurance for their missed salary in times of:
* **Natural Disasters:** Such as heavy rain or flooding, verified via Weather APIs.
* **Political Strikes/Curfews:** Verified via localized data and news APIs.
Because these triggers are parameter-based (data-driven), we don't need manual adjusters to verify most claims.

> [!NOTE]
> In the current MVP, claims are routed to Admin for manual review. The triggers above describe the automation path we’re building toward.

---

## 3. Web vs. Mobile Platform
We chose to build Aegis as a **Progressive Web Application (PWA)**. 
Gig workers often use budget smartphones where downloading and updating heavy native mobile apps is a hassle. A PWA gives them a user-friendly application they can access from anywhere, right on their home screen, without taking up massive storage. Simultaneously, our B2B clients and Aegis Admins need complex, data-heavy web dashboards. A unified PWA approach allows us to serve the mobile delivery driver and the desktop admin from the same ecosystem.

---

## Architecture Wins

* **Single app, three portals:** one codebase, deployed as role-based portals via subdomains (`driver.*`, `manager.*`, `admin.*`).
* **Database-enforced multi-tenancy:** Row Level Security constrains access for drivers (self), managers (company), admins (global).
* **Atomic financial operations:** claim approval triggers wallet crediting + transaction logging in one DB transaction.
* **Failure-safe payouts:** ledger integrity does not depend on multi-step client logic (survives disconnects mid-action).
* **PWA with privacy-minded caching:** service worker caches only explicit static assets (avoids caching auth-sensitive pages).

## Key Features

* **Driver claims:** file a claim quickly, track its status, and review history.
* **Admin review queue:** approve/reject with recorded outcomes and payout amounts.
* **Wallet ledger:** balance + transaction history for transparent accounting.
* **Company dashboards:** managers see drivers/claims scoped to their company.
* **Consistent UI system:** shared components across portals for speed and uniformity.

---

## 4. AI/ML Integration
AI is the long-term differentiator for scaling verification and pricing. Our implementation plan focuses on:
* **Premium Calculation (Roadmap):** region-dependent premium estimation using risk features (location, disruption frequency, historic claims).
* **Risk Scoring (Roadmap):** anomaly detection to route suspicious claims to manual review and speed up low-risk approvals.
* **Auditability (Roadmap):** store decision factors, model versioning, and admin override rationale.

---

## Future Plans

* **Parametric verification:** ingest weather/news/civic disruption data to validate claims against objective triggers.
* **Decision automation (human-in-the-loop):** auto-approve low-risk claims with clear thresholds; route high-risk claims to Admin.
* **Partner integrations:** roster sync + earnings baselines to reduce self-reporting and strengthen pricing fairness.
* **Payout rails:** integrate payment gateways/bank transfers to move from in-app ledger to real settlements.
* **Operational readiness:** audit exports, monitoring/alerting, and explainability for every automated decision.

---

## 5. Tech Stack
* **Frontend:** React.js (for PWA and Web Dashboards).
* **Database:** PostgreSQL database on a self-hosted Supabase instance (for data privacy, since we are dealing with financial information and need relational structures).
* **AI/ML Engine:** Python for anomaly detection training and deep learning models.
* **External APIs:** OpenWeather API (for natural disaster triggers) and Payment Gateways.

---

## 6. (Roadmap) Fraud Prevention & Trust System

Given the rise of coordinated attacks using GPS spoofing, Aegis is designed to move beyond single-point location verification and adopt a **multi-signal trust architecture** to ensure system integrity.

* **Sensor Fusion & Behavioral Validation:**  
We plan to validate claims using device-level motion data such as **gyroscope and accelerometer readings**, cross-checked against GPS movement for consistency (e.g., real movement should show acceleration, turns, and vibration patterns). Mismatches can be flagged as anomalous.

* **Cross-Verification (GPS vs Network Reality):**  
GPS coordinates can be cross-checked against **IP region, WiFi signals, and other network indicators**. If a user claims to be in a disruption zone but their network origin indicates otherwise, the claim can be marked higher risk.

* **Cluster & Event-Based Fraud Detection:**  
We plan to detect coordinated fraud attempts (e.g., multiple users triggering the same event simultaneously with similar patterns). Such clusters can be flagged, and claims can be throttled or escalated for manual review via the Admin dashboard.

* **Secure Device Validation:**  
To reduce spoofed environments, we plan to add progressive device checks where feasible:
  - restricted access for rooted/jailbroken devices (where detectable)
  - tighter rules for developer-mode / suspicious environments
  - emulator-based access detection (where feasible)

* **Dynamic Risk-Based Payout Control:**  
We plan to introduce a **risk scoring system**. High-risk claims or zones can trigger delayed payouts and additional verification, protecting the liquidity pool from mass-drain attacks.

* **Lightweight Proof-of-Presence (Triggered Verification):**  
In cases where a claim is flagged as suspicious, the system can request a quick proof-of-presence check. One option is a real-time selfie while holding up a randomly generated code on paper to reduce replay attacks and add a human verification layer.

* **Safeguards (Roadmap):**
We plan to enforce tier-based payout limits and flag abnormal claim frequency / multi-location claiming patterns for review.

>[!NOTE]
>If a user is flagged for any of these activities, the user can be brought up for manual review to consider adverse circumstances.

---

**Pitch Video**: https://youtu.be/zgT5l1EeISU

---