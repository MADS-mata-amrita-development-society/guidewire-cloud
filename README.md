# Aegis 
>AI-Powered Income Insurance for Gig Workers

## Introduction
Aegis (Zeus' shield in Greek mythology) is an AI powered insurance ecosystem built for the modern quick commerce revolution. 

With the prevalent boom of fast moving platforms like Swiggy, Zomato, Blinkit, Zepto, etc, that ensure delivery of almost any desired product, from groceries to technology, there has also been a huge increase in the gig-based job market primarily consisting of delivery drivers for said platforms. These drivers work daily wages and earn based on the number of deliveries they do. Making it a very fragile source of income. If at any point they are forced to skip working days due to any natural disaster or political strike/curfew, they are left with no salary for the missed deliveries because there is no safety net in effect, yet.

Aegis is here to solve that problem exactly. This repository is the codebase for the PWA (Progressive Web Application) that we are building for everyone that will use this app (Gig workers, QCommerce company managers and Aegis admins).

Rather than targeting individual drivers, we have planned to take a B2B approach, partnering with the gig companies, while ensuring no additional effort is required from our clients. We plan to fully handle the insurance tier management, claims and payouts autonomously from our end.

---

## 1. Requirements

### Personas
We identified three key personas to meet all the users' requirements:
* **Gig Delivery Driver (End User):** Faces long hours, no fixed income, and no safety net during disruptions like rain or strikes. They need a simple interface to apply for claims, manage tiers, and track claim history.
* **Q-Commerce Manager (B2B Client):** They need better retention and consistent delivery performance. They get a monitoring dashboard with an overview of everything. This includes geographic overviews (e.g., "50 riders in Zone A are grounded due to heavy flooding in Sarjapur") and see metrics like churn rate, with no administrative overhead from their side.
* **Aegis Admin:** Responsible for managing different clients, tweaking insurance modules, monitoring company analytics, reviewing AI fraud flagging, and manually overriding the AI model's parameters if needed.


### Application Workflow:
1. We partner with a gig platform (B2B), automatically covering their drivers based on our personalized AI baseline premium.
2. If a disruption occurs (heavy rain, strike), the driver logs into the Aegis app.
3. The system checks external APIs against various parameters and features. If found valid, the claim is auto-approved by our AI.
4. If the AI flags an anomaly, it gets sent to the Aegis Admin dashboard for manual resolution.
5. The B2B client views the live per-user and overall claim tracker on their dashboard to monitor the safety of their partners.

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

---

## 3. Web vs. Mobile Platform
We chose to build Aegis as a **Progressive Web Application (PWA)**. 
Gig workers often use budget smartphones where downloading and updating heavy native mobile apps is a hassle. A PWA gives them a user-friendly application they can access from anywhere, right on their home screen, without taking up massive storage. Simultaneously, our B2B clients and Aegis Admins need complex, data-heavy web dashboards. A unified PWA approach allows us to serve the mobile delivery driver and the desktop admin from the same ecosystem.

---

## 4. AI/ML Integration
AI is the main part of the claim approval system. We are integrating it in a few key ways:
* **Premium Calculation:** We use deep learning models to deal with region-dependent information, trained on relevant features like location risk, weather forecasts, and historical claim frequency to calculate the baseline premium.
* **Fraud Detection:** Our fraud detection engine is an anomaly detection model that catches false insurance claims. It generates reports from the AI system directly to the Admin dashboard, preventing system abuse.

---

## 5. Tech Stack
* **Frontend:** React.js (for PWA and Web Dashboards).
* **Database:** PostgreSQL database on a self-hosted Supabase instance (for data privacy, since we are dealing with financial information and need relational structures).
* **AI/ML Engine:** Python for anomaly detection training and deep learning models.
* **External APIs:** OpenWeather API (for natural disaster triggers) and Payment Gateways.

---


**Pitch Video**: https://youtu.be/zgT5l1EeISU
