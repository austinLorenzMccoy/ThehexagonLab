# Hexagon LABS Handbook

Everything you need to run day-to-day workforce operations, payroll and oversight across nine annotation platforms — from your first sign-in to your first payout.

_Last updated September 2026_

## Quick start

1. Open the sign-in page and choose **Continue with Google**.
2. Nothing else happens yet — that's normal. An administrator has to assign you a role before you get real access.
3. Once your role is set, sign back in. You'll land on your Dashboard — what it shows depends entirely on your role (see below).

## Understanding roles

Hexagon LABS has five roles. Everything else in this handbook — what you can see, what you can click — comes down to which one you have.

| Role | What they can do |
| --- | --- |
| **Admin** | Everything: every workforce tool, payroll, pay slips, warnings, disputes, feedback, referrals, reports, activity/audit logs, and user & platform administration. |
| **Manager** | Their own assigned workers in Tracker, Registry and Onboarding; payroll and pay slips for their team; partner contacts; reports; and My Team. Cannot see Warnings, Disputes or Feedback. |
| **Supervisor** | Read and light-edit access to Tracker, Registry and Onboarding for assigned workers. No payroll editing, no admin tools. |
| **Worker** | A private self-service Dashboard only: log hours, view pay slips and earnings, check warning standing, send feedback, raise disputes. |
| **Referrer** | A private self-service Dashboard only: track referred workers, watch commissions add up, and request payouts. |

## Key concepts

### Tracker vs. Registry vs. Payroll vs. Pay Slips

Four pages that sound alike but each answer a different question. Once this clicks, the rest of the app follows.

| Page | Question it answers | How often it changes |
| --- | --- | --- |
| Registry — "Field Roster" | Who is employed, and since when? | Set once, when someone joins |
| Tracker — "Signal Grid" | What is their status right now? | Constantly, day to day |
| Payroll — "Ledger Room" | What tasks were done, and what do they add up to? | Per task, ongoing bookkeeping |
| Pay Slips | What is the official amount owed or paid this month? | Once per worker, per month |

### The warning system

Every worker has a warning standing shown as five dots. An admin issues a warning with a reason, and an optional comment the worker can see.

Reaching five active warnings automatically ends that worker's contract — shown directly on the worker's own Dashboard, so nobody is caught off guard.

Workers can push back with **Raise a Dispute** on their Dashboard; admins resolve disputes from **Warnings & Disputes**.

### How payments actually work

When an admin or manager clicks **Mark Paid** on a pay slip or payout request, the app first tries to send a real bank transfer through Paystack.

It only falls back to manually recording the payment if a transfer genuinely can't be attempted — Paystack isn't configured, the worker has no payout code on file, or a currency rate is unavailable.

A real transfer that fails is never silently hidden as "paid" — you'll see an error instead, never a false success.

### Platform tabs

Tracker, Registry, Onboarding, Orders and Payroll are all organized into tabs, one per annotation platform — Oneforma, Telus, and so on.

That list isn't fixed in the code. An admin adds or edits platforms from **Admin → Platforms**, including whatever custom columns that platform needs.

## Your Workspace

### Dashboard

**Who can access this:** Admin, Manager, Supervisor, Worker, Referrer

Dashboard is the one link every single person has — and the one page where what loads underneath depends entirely on who's signed in.

#### Admin, Manager & Supervisor: the Ops Overview

A read-only command view: summary cards for total workers, orders, active warnings and total payroll; four charts covering workers and payroll by platform, warning breakdown, and order status; and a per-platform grid of worker, order and payroll counts with serious/banned badges.

#### Worker: your self-service portal

- **Warning Standing** — a five-dot meter of your current warnings, with a banner if your contract has been terminated.
- Four stat cards: hours logged this month, logged earnings, expected pay slip, and total paid to date.
- **Log Hours Worked** — record a date, hours (0.25–24) and an optional note. Stays disabled until an admin sets your hourly rate.
- Your logged-hours history and **Pay Slips & Payments**, each slip linking to its file.
- **Submit Feedback** — goes to admins only, never your manager.
- **Raise a Dispute** — optionally attached to a specific pay slip.

#### Referrer: your referral portal

- Your referral code, plus stat cards for people referred, fully paid, still unpaid, and potential commission.
- **Request Payout** — disabled until every worker you referred is marked paid. That's enforced by the system, not just the button.
- Your referred workers with a status dot (pending, active, paid), a top-5 leaderboard, and your payout request history.
- The same Feedback form workers use.

> **Good to know:** If your Dashboard looks empty right after your first sign-in, you likely just need an admin to finish assigning your role and access.

## Workforce Operations

### Tracker — "Signal Grid"

**Who can access this:** Admin, Manager, Supervisor

Your day-to-day operations board — one row per worker, one tab per platform, updated constantly as work happens.

- Switch between platform tabs across the top.
- Add Worker inline, or Import a CSV/Excel file in bulk.
- Search, filter by manager, or click a warning pill (Clear / Minor / Serious / Banned / None) to filter instantly, with live counts.
- Click almost any cell to edit it in place — name, manager, warning level, Payoneer linked, SOW done, LE cert, and every platform-specific task column. Changes save the moment you click away.
- Open the pencil icon for fields with no inline cell: email, platform password, platform ID code, notes.
- Click a worker's name to open their full cross-platform Worker Profile.
- Trash icon deletes a row, with a confirmation first.
- Export the current view to CSV.

> **Good to know:** There's no explicit "Save" button for inline edits — the moment you click elsewhere, it's saved. Double-check a cell before moving on.

### Registry — "Field Roster"

**Who can access this:** Admin, Manager, Supervisor

The employment record — set once when someone joins. For tracking their day-to-day status, use Tracker instead.

- Add Worker: project/task, owner name, account type (Full-Time, Part-Time, Contractor, Intern, Freelance), email, start date, notes.
- Admins can tick "Also create a login account for this person," which opens a Paystack payout-code form right away.
- Geowork Test column tracks a platform's geography-based eligibility test: Passed, Failed, Pending, Retake, or Exempted.
- A "Linked" badge shows whether a record already has a login account attached.
- Edit or delete any row from its row icons.

### Onboarding — "Recruit Desk"

**Who can access this:** Admin, Manager, Supervisor

Tracks applicants through your hiring pipeline, per platform, before they become full Registry and Tracker workers.

- Fields per applicant: name, email, a masked platform-account password (an eye icon reveals it), phone, country, referred by, and date applied.
- Status pills — Pending, Accepted, Rejected, In Review, Withdrawn — with live counts. Moving to a final status stamps the resolution date automatically.
- Summary cards show how many applicants sit in each stage.

> **Good to know:** That password field is the applicant's password for the annotation platform itself (their Oneforma login, say) — it has nothing to do with signing in to Hexagon LABS. Adding, editing or deleting applicants needs a permission an admin grants; without it, the pipeline is read-only.

### Worker Profile

**Who can access this:** Admin, Manager, Supervisor

A read-only, full-picture page for one person — open it by clicking their name anywhere in Tracker.

- Basic info at a glance.
- Complete payroll history.
- A history of every status change made to them in Tracker.
- Every Registry record they appear in — handy when someone works across more than one platform.

### Orders — "Restricted Zone"

**Who can access this:** Admin, Manager, Supervisor

Order tracking per platform — visible to managers and supervisors only when an admin has specifically switched it on for them.

- Order ID, owner, proxy, status (Active, Pending, Processing, Issue, Cancelled, Completed), date and notes.
- Filter by status, with live counts.
- Creating, editing and deleting all need an admin-granted permission — otherwise the page is view-only or not visible at all.

## Money & Payments

### Payroll — "Ledger Room"

**Who can access this:** Admin, Manager, Supervisor

Raw, per-task bookkeeping of what was done and what it's worth — the working material behind a pay slip, not the official statement itself.

- Add Record: worker name, account code, month/year, tasks done, pay in USD, and notes.
- Summary cards total records, tasks done, and pay.
- Filter by year and month, or export everything to CSV.

> **Good to know:** Supervisors can view Payroll but can't add, edit or delete records — that's admin and manager only.

### Pay Slips

**Who can access this:** Admin, Manager

The official month-end statement a worker actually sees and gets paid against — separate from the day-to-day Payroll ledger.

- Issue a slip: worker, optional platform, period (month/year), expected amount and currency, an optional file upload, and notes.
- Admins get a Revenue Split Calculator — enter a gross amount to see the Client/Company/Referral/Worker split, then one click drops the worker's share into Expected Amount. This split is confidential and never shown to the worker.
- Mark Paid tries a real Paystack transfer first, and only records the payment manually if a transfer genuinely couldn't be attempted — never as a way to paper over a failed one.
- Undo reverses the paid record locally; it can't reverse money that has actually already been sent.
- Editing or deleting a slip only works before it's been paid or is mid-processing.

### Referrals & Payouts

**Who can access this:** Admin

Where referral relationships, commissions and payout requests get managed.

- Add a referral by picking the referrer and entering the referred person's details.
- Each referral shows a calculated commission, plus an admin-only percentage override (leave blank to use the platform default) — confidential; the referrer only ever sees the resulting dollar figure.
- Approve, Mark Paid, or Reject each payout request. Mark Paid follows the same real-transfer-first logic as Pay Slips.

> **Good to know:** A referrer can't request a payout until every worker they referred is marked paid — enforced by the system itself, not just a greyed-out button.

## Oversight & Support

### Warnings & Disputes

**Who can access this:** Admin

Where formal warnings are issued and worker disputes get resolved. Managers don't have access to this page.

- Left panel: every worker with a five-dot warning meter and their open-dispute count — click a worker to open their case.
- Issue a warning with a reason and an optional comment the worker will see.
- Revoke an existing warning if it was issued in error.
- Work through that worker's disputes: mark them open, in review, resolved or rejected, with optional resolution notes.

### Feedback

**Who can access this:** Admin

A private inbox of everything workers and referrers have submitted through their Dashboards.

- Filter by category: about a manager, work process, platform, or other.

> **Good to know:** Intentionally admin-only, enforced at the database level — a manager can never see feedback, including feedback about themselves.

### Partner Contacts

**Who can access this:** Admin, Manager, Supervisor

A CRM-style address book for people who aren't employees in the system yet — clients, partners, and prospective referrers.

- Add a contact, or bulk-import a list.
- Filter by contact type.
- Admins can also spin up a login account for a Referrer-type contact, opening the same Paystack payout-code flow as Registry.

> **Good to know:** Workers are never added here — they always belong in Registry. Editing and deleting contacts needs a permission an admin grants.

### Reports

**Who can access this:** Admin, Manager, Supervisor

An auto-generated, read-only monthly payroll summary grouped by platform.

- Pick a month and year to see totals per platform and a grand total.
- Export the whole report as a real Excel (.xlsx) file.

### My Team

**Who can access this:** Manager

A manager-only view of just the workers assigned to you — nobody else's.

- Summary cards: team size, serious-plus-banned count, and tasks currently in progress.
- Your roster with warning badges and per-task status.
- A recent-activity feed scoped to your team only.

### Activity & Audit

**Who can access this:** Admin

Two separate read-only logs, admin-only, each with a "load more" list and a count selector.

- **Activity:** every change made in Tracker — old value, new value, who made it, on which worker, and when.
- **Audit:** everything else admin-related — role changes, activating or deactivating users, creates/updates/deletes, logins and imports — filterable by action type, with a raw details column.

## Administration

### Admin — "Control Tower"

**Who can access this:** Admin

Where an admin manages everyone's access and the platforms themselves.

#### Users & Roles

- A quick-reference card explaining exactly what each role can do — the same summary this handbook opens with.
- The live user list: change anyone's role, and pick which platforms they can see.
- Turn on "Can view orders" for a manager or supervisor who needs it.
- For a worker: set their hourly rate (required before they can log hours) and, if needed, a revenue-split override.
- For a referrer: set a default commission percentage override.
- For workers and referrers: add or update a Paystack payout code — you can only replace or clear it, since the real value is never shown back once saved — and create a Paystack recipient straight from bank details.
- Deactivate, reactivate, or permanently delete a user. Deletion asks you to confirm twice, and you can't deactivate or delete your own account.

#### Platforms

Add a new annotation platform, or edit an existing one's custom task columns, without needing a code change. This is what powers the platform tabs seen everywhere else in the app.

## Frequently asked questions

**I just signed in and my Dashboard is empty, or I can't see anything.**
That's expected the first time. An admin has to assign your role after your first sign-in before you get real access — check back once they have.

**The "Log at $0/hr" button on my Dashboard is disabled.**
An admin needs to set your hourly rate first, in Admin → Users & Roles.

**My Request Payout button is disabled.**
Every worker you referred needs to be marked paid before a payout request is allowed — check the status dots next to each referred worker.

**I edited a cell in Tracker but there was no Save button — did it work?**
Yes. Most Tracker and table cells save automatically the moment you click away. Refresh the page if you want to double-check.

**Why can't I find Warnings, Disputes or Feedback in my nav?**
They're admin-only by design, even for managers, so workers can raise concerns without their manager seeing them.

**Why does the same "Dashboard" link show something completely different for a coworker?**
Dashboard is role-aware — admins, managers and supervisors see an operations overview, while workers and referrers each get their own private self-service portal.

---

Hexagon LABS Handbook — last updated September 2026. See something out of date? Ask an admin, or check the in-app reference card at **Admin → Users & Roles**.
