# 🔌 Backend Wiring Guide

> **When your client has approved and paid**, follow this step-by-step guide to connect the live Supabase backend and disable demo mode.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Step 1 — Create the Supabase Project](#step-1--create-the-supabase-project)
- [Step 2 — Run the Database Migration](#step-2--run-the-database-migration)
- [Step 3 — Enable Google OAuth](#step-3--enable-google-oauth)
- [Step 4 — Set Environment Variables](#step-4--set-environment-variables)
- [Step 5 — Redeploy on Vercel](#step-5--redeploy-on-vercel)
- [Step 6 — Seed Initial Data](#step-6--seed-initial-data)
- [Step 7 — Promote the Admin User](#step-7--promote-the-admin-user)
- [Step 8 — Deploy Edge Functions](#step-8--deploy-edge-functions)
- [Step 9 — Post-Launch Verification](#step-9--post-launch-verification)
- [How Demo Mode Works](#how-demo-mode-works)
- [Rollback to Demo Mode](#rollback-to-demo-mode)

---

## Prerequisites

Before starting, ensure you have:

| Requirement | Details |
|:------------|:--------|
| **Supabase account** | [supabase.com](https://supabase.com) — free tier works |
| **Google Cloud project** | For OAuth credentials |
| **Vercel project** | Already deployed (currently in demo mode) |
| **Node.js 20+** | For running seed scripts |
| **Supabase CLI** | `npm install -g supabase` |

---

## Step 1 — Create the Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Choose your organization, name it (e.g., `workers-hub-prod`)
4. Set a strong database password (save it!)
5. Select a region close to your users
6. Wait for provisioning (~2 minutes)

**Save these values** from **Project Settings → API**:

```
Project URL:        https://xxxxxxxxxxxx.supabase.co
Anon (public) key:  eyJhbGc...
Service role key:   eyJhbGc...
```

> ⚠️ **The service role key bypasses RLS** — never expose it in client-side code.

---

## Step 2 — Run the Database Migration

The full schema lives in a single migration file. It creates all tables, RLS policies, functions, triggers, and views.

### Option A — SQL Editor (Recommended for first time)

1. Go to **Supabase Dashboard → SQL Editor**
2. Open the file: `backend/supabase/migrations/20260612000000_init.sql`
3. Copy the entire contents and paste into the SQL Editor
4. Click **Run**
5. Verify: go to **Table Editor** — you should see 8 tables

### Option B — Supabase CLI

```bash
cd backend
supabase link --project-ref <your-project-ref>
supabase db push
```

### Verify the migration

Run this query in the SQL Editor to confirm everything was created:

```sql
-- Should return 8 rows
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Should return 8 rows  
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
ORDER BY routine_name;
```

Expected tables:
- `app_users`, `orders`, `payroll`, `platform_task_columns`, `platforms`, `task_status_history`, `worker_tracker`, `workers_registry`

---

## Step 3 — Enable Google OAuth

### 3a. Google Cloud Console

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create or select a project
3. Navigate to **APIs & Services → Credentials**
4. Click **Create Credentials → OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Add **Authorized redirect URIs**:
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
7. Save the **Client ID** and **Client Secret**

### 3b. Supabase Dashboard

1. Go to **Authentication → Providers → Google**
2. Toggle **Enable**
3. Paste the Client ID and Client Secret from Google
4. Save

### 3c. Add Vercel redirect URI

After you know your Vercel deployment URL, also add to Google OAuth:
```
https://your-app.vercel.app/auth/callback
```

---

## Step 4 — Set Environment Variables

### On Vercel

Go to **Vercel → Project → Settings → Environment Variables** and set:

| Variable | Value | Environments |
|:---------|:------|:-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...anon-key` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...service-key` | Production, Preview, Development |
| `NEXT_PUBLIC_SITE_URL` | `https://your-app.vercel.app` | Production |

> **🎯 Setting `NEXT_PUBLIC_SUPABASE_URL` to a real Supabase URL automatically disables demo mode.** No code changes needed.

### For local development

```bash
# frontend/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

```bash
# backend/.env.local
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## Step 5 — Redeploy on Vercel

After setting the environment variables:

1. Go to **Vercel → Deployments**
2. Find the latest deployment → click **⋮** → **Redeploy**
3. Check "Use existing build cache" = **OFF** (to pick up new env vars)
4. Click **Redeploy**

The app will now:
- ✅ Show the Google sign-in button (instead of demo auto-login)
- ✅ Connect to your real Supabase database
- ✅ Enforce RLS and role-based access
- ✅ Run middleware auth checks

---

## Step 6 — Seed Initial Data

### Option A — From real Excel spreadsheets

If the client has existing Excel files with worker data:

```bash
cd backend

# Copy the Excel files into the data directory
cp /path/to/AI_JobBoard_Worker_Tracker.xlsx data/
cp /path/to/AI_Platform_Workers_Hub.xlsx data/

# Run the seeder
npm run seed
```

The seeder reads the specific sheet names and column headers from the Excel files and maps them to the database schema.

### Option B — Generate mock data for testing

```bash
cd backend
npm run generate-mock-excel   # Creates realistic test spreadsheets
npm run seed                  # Seeds them into the database
```

### Verify the seed

```sql
-- Check row counts
SELECT 'platforms' AS t, count(*) FROM platforms
UNION ALL SELECT 'worker_tracker', count(*) FROM worker_tracker
UNION ALL SELECT 'workers_registry', count(*) FROM workers_registry
UNION ALL SELECT 'orders', count(*) FROM orders
UNION ALL SELECT 'payroll', count(*) FROM payroll;
```

---

## Step 7 — Promote the Admin User

After the first user signs in via Google, they'll be created as a `worker` role. Promote them to admin:

```sql
-- Replace with the actual email of the admin user
UPDATE public.app_users
SET role = 'admin',
    platform_access = NULL,        -- NULL = access all platforms
    can_view_orders = true
WHERE email = 'admin@yourcompany.com';
```

Verify:
```sql
SELECT id, email, role, can_view_orders 
FROM app_users 
WHERE email = 'admin@yourcompany.com';
```

The admin can then manage all other users from the **Control Tower** (`/admin`) page in the UI.

---

## Step 8 — Deploy Edge Functions

Edge Functions handle async notifications (Slack alerts, daily digests).

```bash
cd backend

# Link to your project
supabase link --project-ref <your-project-ref>

# Deploy both functions
supabase functions deploy notify-warning
supabase functions deploy daily-summary

# Set secrets for Slack integration (optional)
supabase secrets set \
  SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T.../B.../xxx \
  NOTIFICATION_EMAIL=ops@yourcompany.com
```

### Configure the daily summary schedule

In Supabase Dashboard → **Database → Extensions** → enable `pg_cron`, then:

```sql
SELECT cron.schedule(
  'daily-platform-summary',
  '0 8 * * 1-5',  -- 8 AM UTC, weekdays only
  $$SELECT net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/daily-summary',
    headers := '{"Authorization": "Bearer <service-role-key>"}'::jsonb
  )$$
);
```

---

## Step 9 — Post-Launch Verification

Run through this checklist after going live:

### Authentication
- [ ] Google sign-in works and redirects to `/dashboard`
- [ ] New users get auto-created in `app_users` with `worker` role
- [ ] Admin promotion SQL works
- [ ] Signing out redirects to login page

### Role-Based Access
- [ ] Admin can see all pages (dashboard, tracker, registry, orders, payroll, admin)
- [ ] Manager can only see assigned platforms
- [ ] Worker can only see their own dashboard
- [ ] Non-admin users get redirected from `/admin`

### Data Operations
- [ ] Tracker rows load for each platform
- [ ] Task status updates persist (JSONB merge)
- [ ] Task status history is recorded automatically
- [ ] CSV export downloads correct data

### API Routes
- [ ] `GET /api/admin/users` returns user list (admin only)
- [ ] `PATCH /api/admin/users` updates roles (admin only)
- [ ] `GET /api/export/worker_tracker?platform=oneforma` downloads CSV
- [ ] `PATCH /api/tracker/task` updates task statuses

### Edge Functions (if deployed)
- [ ] Warning escalation triggers Slack notification
- [ ] Daily summary runs on schedule

---

## How Demo Mode Works

The app includes a built-in demo mode for client previews:

```
lib/demo.ts          → isDemoMode() checks if NEXT_PUBLIC_SUPABASE_URL is real
lib/auth-context.tsx → Provides fake admin user when in demo mode
middleware.ts        → Skips auth checks when env vars are missing
app/page.tsx         → Auto-redirects to dashboard in demo mode
```

**Demo mode activates automatically when:**
- `NEXT_PUBLIC_SUPABASE_URL` is not set, OR
- `NEXT_PUBLIC_SUPABASE_URL` contains `placeholder`

**Demo mode deactivates automatically when:**
- `NEXT_PUBLIC_SUPABASE_URL` is set to a real Supabase project URL

**No code changes are needed** — it's entirely controlled by environment variables.

---

## Rollback to Demo Mode

If you ever need to go back to demo mode (e.g., for a sales demo):

1. Go to **Vercel → Settings → Environment Variables**
2. Delete or clear `NEXT_PUBLIC_SUPABASE_URL`
3. Redeploy

The app will instantly revert to demo mode with the fake admin user and mock data.

---

## Quick Reference: File Changes for Backend Wiring

These are the files involved in the demo ↔ production switch. **You don't need to edit any of them** — the switch is automatic via env vars:

| File | Demo Mode Behavior | Production Behavior |
|:-----|:-------------------|:--------------------|
| `lib/demo.ts` | Returns `true` | Returns `false` |
| `lib/auth-context.tsx` | Fake admin user, no Supabase calls | Real Supabase auth |
| `lib/supabase/client.ts` | Placeholder URL (never called) | Real Supabase client |
| `middleware.ts` | Skips auth, passes through | Full auth + role checks |
| `app/page.tsx` | Auto-redirect to dashboard | Google sign-in button |

---

*Last updated: June 2026*
