# Worker Recovery & Workforce Management Platform
## Product Requirements Document (PRD)

**Document Version:** 1.0  
**Date:** September 1, 2026  
**Status:** Customer Request – Initial Requirements Capture  
**Prepared for:** Internal Product & Engineering Teams  

---

## 1. Executive Summary

This document captures and organizes the customer’s requirements for a comprehensive **Worker Recovery System**. The platform will manage remote workers (primarily focused on data annotation / “outlier” style work), handle payroll via Paystack, enforce performance discipline through a warning system, support timesheet logging, enable disputes and feedback, and include a full referral tracking & payout module.

The system aims to provide:
- Transparency for workers on expected and actual earnings
- Managerial oversight with controlled access rights
- Motivation and accountability through gamification-ready features
- Clean data collection across workers, referrers, and partners

---

## 2. Goals & Objectives

| Goal | Description |
|------|-------------|
| **Payroll Transparency** | Workers can see expected pay mid-month and receive confirmed payments at month-end via Paystack |
| **Performance Accountability** | Formal warning system that escalates to automatic contract termination |
| **Operational Visibility** | Role-based dashboards for Workers, Managers, Referrers, and Admins |
| **Dispute Resolution** | Structured process for workers to challenge pay slips |
| **Referral Motivation** | Dedicated portal that tracks referrals, earnings generated, and gated payouts |
| **Data Asset Building** | Centralized storage of worker, referrer, and partner contact data |

---

## 3. User Roles & Access Levels

| Role | Key Capabilities | Restrictions |
|------|------------------|--------------|
| **Worker** | View profile, timesheets, pay slips, earnings history, submit feedback, raise disputes, log hours | Cannot see other workers’ data; cannot see manager feedback |
| **Manager / Supervisor** | View assigned workers’ profiles, issue/revoke warnings, write comments, review disputes, revoke access | Cannot see worker feedback submitted about managers |
| **Referrer** | View list of referred workers, their status & earnings contribution, request payout (gated) | Cannot request payout until all referred workers are fully paid |
| **Admin / Super Admin** | Full system access, upload pay slips, view all feedback, manage roles, override warnings, process payouts | — |
| **Partner / Upstream Client** | Not given a full dashboard in v1 | Contact data stored for future outreach |

---

## 4. Core Features

### 4.1 Worker Profile & Dashboard

Every worker has a personal dashboard that displays:

- Work history and performance metrics (e.g., formats completed, quality indicators)
- Daily and cumulative earnings (calculated from logged hours × rate)
- Current warning status (visual indicator – yellow dots progressing to red)
- Upcoming / uploaded pay slip
- Account balance and payment history
- Ability to log timesheet hours after each work session
- Feedback submission form
- Dispute submission form

**Daily Ritual Expectation**  
Workers are expected to check their profile at the beginning and/or end of each work day.

### 4.2 Timesheet Logging

- Workers log hours worked after completing tasks.
- Platform calculates and displays daily earnings in real time (example: $17/hour rate → worker sees $17 for one hour of work).
- Note: Actual company cost may differ (e.g., 10% of rate), but the worker-facing view shows the full rate for transparency and motivation.
- Logged hours serve as a secondary reference. Primary payment source remains the official pay slip.
- Significant discrepancies between logged hours and pay slip can trigger review or dispute.

### 4.3 Pay Slip & Payment Flow

1. **Mid-month (approx. 10th–15th)**  
   Backend uploads official pay slips. Workers can view expected amount for the upcoming month-end payment.

2. **Month-end (e.g., 30th)**  
   Actual payment is processed via **Paystack** and credited to the worker’s account balance / bank account.

3. Workers can track both expected and actual payments inside their dashboard.

### 4.4 Warning & Performance System

- Managers can issue warnings directly from a worker’s profile.
- Visual representation: progressive yellow dots (or similar indicators).
- **Rule:** Accumulation of **five (5) warnings** automatically triggers contract termination.
- Managers can also **revoke** previously issued warnings.
- Managers can leave comments visible to the worker.

### 4.5 Feedback System

- Workers can submit feedback about managers, the work process, or the platform.
- **Access Control:** Only Admins can view this feedback. Managers must not be able to see or influence feedback about themselves.

### 4.6 Dispute System

- Workers can raise a dispute against a pay slip (e.g., “hours worked exceed the amount shown”).
- Disputes are routed to the relevant Manager or Admin for review and resolution.
- Resolution actions and notes should be recorded against the dispute.

### 4.7 Manager Dashboard

Managers see a filtered view of workers (assigned team, specific format/type, or all workers depending on configuration).

Visible information per worker:
- Profile summary
- Current warning count / status
- Open disputes
- Comments history
- High-level activity indicators (not raw work content)

Managers **cannot** see worker-submitted feedback.

### 4.8 Referral System

Dedicated portal for individuals who refer workers to the platform.

**Referrer Dashboard shows:**
- Number of people referred
- Status of each referred worker’s account
- Earnings / revenue generated by each referred worker
- Total potential commission
- Ranking of top-performing referrals

**Payout Gating Rule**  
A referrer can only request payout when **all** referred workers have received their payments (all status indicators green).  
If any referred worker is still unpaid, the “Request Payout” button remains disabled.  
This incentivizes referrers to follow up with unpaid workers.

### 4.9 Data Collection & Partner Records

- All workers, referrers, and partners should have complete records: name, email, phone number, country, etc.
- Partners / upstream clients do **not** receive full dashboards in the initial version.
- Contact data can initially be managed via Excel import and later fully internalized.
- Goal: Build a valuable, reusable contact database for future communications and expansions.

---

## 5. Suggested Gamification & Scaling Ideas

To increase engagement and retention, consider adding:

- **Achievement Badges** – Perfect attendance, zero warnings for X months, high quality streaks, top earner of the month.
- **Leaderboards** – Weekly/monthly top performers (opt-in or anonymized).
- **Streak Counters** – Consecutive days of logging timesheets or clean performance.
- **Referral Tiers** – Bronze / Silver / Gold levels based on number of successful referrals or total earnings generated.
- **Early Pay Access** – High-performing workers with zero warnings can request early partial payouts.
- **Quality Score Visibility** – Simple visual score that influences future task assignment priority.
- **Manager Recognition** – Public (or team-visible) recognition for managers with lowest warning rates or highest team earnings.

---

## 6. Non-Functional Requirements

- **Role-based access control** must be strictly enforced.
- Payment integration with **Paystack** for reliable, automated payouts.
- Audit trail for warnings, disputes, pay slip uploads, and payout requests.
- Mobile-friendly interface (workers and referrers will primarily access via phone).
- Secure storage of personal and financial data.
- Ability to bulk-import contact lists (Excel/CSV).

---

## 7. Out of Scope (v1)

- Full self-service portal for upstream partners/clients
- Automated quality scoring of actual work output (manual or external for now)
- Real-time task assignment engine
- Advanced analytics / BI dashboards beyond role-specific views

---

## 8. Success Metrics (Suggested)

- % of workers who view pay slip before month-end
- Average time to resolve disputes
- Number of warnings issued vs. terminations
- Referral conversion & payout request volume
- Worker retention rate month-over-month
- Completeness of contact data records

---

## 9. Next Steps

1. Validate and refine this PRD with stakeholders.
2. Create user stories and acceptance criteria for each feature.
3. Design wireframes for Worker, Manager, and Referrer dashboards.
4. Define Paystack integration scope and sandbox testing plan.
5. Prioritize MVP feature set for first release.

---

*This document is a structured capture of the original customer request. All requirements should be confirmed and prioritized before development begins.*
