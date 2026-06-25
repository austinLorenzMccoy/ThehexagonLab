<p align="center">
  <img src="https://img.shields.io/badge/🤖_AI-Hexagon LABS-blueviolet?style=for-the-badge&labelColor=1a1a2e" alt="AI Hexagon LABS" height="40"/>
</p>

<h1 align="center">AI Hexagon LABS</h1>

<p align="center">
  <strong>Signal Grid · Field Roster · Command Centre</strong><br/>
  <em>An enterprise-grade operations platform for managing AI data workers across 9 annotation platforms.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=next.js&logoColor=white" alt="Next.js 16"/>
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React 19"/>
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Tailwind_CSS-4.2-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS"/>
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?style=flat-square&logo=supabase&logoColor=white" alt="Supabase"/>
  <img src="https://img.shields.io/badge/Deno-Edge_Functions-000000?style=flat-square&logo=deno&logoColor=white" alt="Deno"/>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/tests-222_passing-brightgreen?style=flat-square" alt="222 tests passing"/>
  <img src="https://img.shields.io/badge/coverage-100%25_statements-brightgreen?style=flat-square" alt="100% statement coverage"/>
  <img src="https://img.shields.io/badge/coverage-100%25_functions-brightgreen?style=flat-square" alt="100% function coverage"/>
  <img src="https://img.shields.io/badge/coverage-100%25_lines-brightgreen?style=flat-square" alt="100% line coverage"/>
  <img src="https://img.shields.io/badge/coverage-96%25_branches-green?style=flat-square" alt="96% branch coverage"/>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="MIT License"/>
  <img src="https://img.shields.io/badge/pnpm-9.12-F69220?style=flat-square&logo=pnpm&logoColor=white" alt="pnpm"/>
  <img src="https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js 20+"/>
  <img src="https://img.shields.io/badge/platforms-9_supported-purple?style=flat-square" alt="9 Platforms"/>
</p>

---

## 🎯 What is Hexagon LABS?

Hexagon LABS replaces sprawling Excel spreadsheets with a **live, role-controlled web application** for managing AI data workers across 9 major annotation platforms. It provides real-time tracking, role-based access control, automated notifications, and full audit trails.

### The Problem
AI annotation teams manage hundreds of workers across platforms like **Oneforma**, **Telus**, **Data Annotation**, **Outlier**, **Scale AI**, and more — all through disconnected spreadsheets with no access control, no audit trails, and no automation.

### The Solution
A unified platform with:
- 🔐 **Row-Level Security** — Data isolation enforced at the database level
- 📊 **Live Dashboards** — Real-time platform stats and warning indicators
- 🎭 **4-Tier Role System** — Admin → Manager → Supervisor → Worker
- 📋 **Dynamic Task Tracking** — JSONB-based task columns that adapt per platform
- 🔔 **Automated Alerts** — Slack notifications on warning escalations
- 📤 **CSV Export** — Role-gated data export for reporting
- 📝 **Full Audit Trail** — Every status change is logged with user + timestamp

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER CLIENT                          │
│  Next.js 16 · React 19 · Tailwind CSS 4 · shadcn/ui          │
│  └─ AuthContext → Supabase JS Client (@supabase/ssr)          │
└───────────┬─────────────────────────────────────┬──────────────┘
            │ Auth + Queries (anon key)           │ API Calls
            ▼                                     ▼
┌──────────────────────┐            ┌─────────────────────────────┐
│   SUPABASE (BaaS)    │            │    NEXT.JS SERVER           │
│                      │            │                             │
│  ┌────────────────┐  │            │  middleware.ts (auth guard)  │
│  │  Auth Service   │  │            │  /api/admin/users (RBAC)    │
│  │  Google OAuth   │  │            │  /api/export/[table] (CSV)  │
│  └────────────────┘  │            │  /api/tracker/task (JSONB)   │
│                      │            └─────────────────────────────┘
│  ┌────────────────┐  │
│  │  PostgreSQL 15  │  │      ┌──────────────────────────────────┐
│  │  8 Tables       │  │      │   SUPABASE EDGE FUNCTIONS        │
│  │  3 Views        │  │◄─────│                                  │
│  │  8 Functions    │  │      │  notify-warning  (Slack alert)   │
│  │  6 Triggers     │  │      │  daily-summary   (cron digest)   │
│  │  Full RLS       │  │      └──────────────────────────────────┘
│  └────────────────┘  │
└──────────────────────┘
```

---

## 📂 Project Structure

```
AI-Hexagon LABS/
│
├── 📁 frontend/                        Next.js 16 application
│   ├── app/                            App Router
│   │   ├── page.tsx                    Login (Google OAuth)
│   │   ├── auth/callback/route.ts      OAuth code exchange
│   │   ├── dashboard/                  📊 Command Centre
│   │   ├── tracker/                    📡 Signal Grid
│   │   ├── registry/                   📋 Field Roster
│   │   ├── orders/                     🔒 Restricted Zone
│   │   ├── payroll/                    💰 Ledger Room
│   │   ├── admin/                      🏢 Control Tower
│   │   └── api/                        Server API routes
│   ├── lib/
│   │   ├── auth-context.tsx            AuthProvider + useAuth hook
│   │   ├── db.ts                       Unified database access layer
│   │   └── supabase/                   Client factories
│   ├── types/                          Domain models + permissions
│   ├── middleware.ts                   Auth + role route protection
│   ├── __tests__/                      142 unit/integration tests
│   └── vitest.config.ts               Test configuration
│
├── 📁 backend/                         Backend services
│   ├── supabase/
│   │   ├── migrations/                 Full PostgreSQL schema + RLS
│   │   └── functions/                  Deno Edge Functions
│   ├── scripts/
│   │   ├── seed.ts                     Excel → database seeder
│   │   ├── seed-helpers.ts             Parsing utilities (testable)
│   │   ├── generateMockExcel.ts        Mock data generator
│   │   └── mock-helpers.ts             Generation utilities (testable)
│   ├── __tests__/                      80 unit tests
│   └── vitest.config.ts               Test configuration
│
├── 📁 doc/                             Product requirement documents
│   ├── Hexagon LABS_Backend_PRD.md
│   └── Hexagon LABS_Frontend_PRD.md
│
├── .gitignore
└── README.md                           ← You are here
```

---

## ⚡ Tech Stack

<table>
<tr>
  <td><strong>Layer</strong></td>
  <td><strong>Technology</strong></td>
  <td><strong>Version</strong></td>
</tr>
<tr>
  <td>🖥️ Frontend</td>
  <td>Next.js (App Router) + React + TypeScript</td>
  <td>16 / 19 / 5.7</td>
</tr>
<tr>
  <td>🎨 Styling</td>
  <td>Tailwind CSS + shadcn/ui + Lucide Icons</td>
  <td>4.2</td>
</tr>
<tr>
  <td>🔐 Auth</td>
  <td>Supabase Auth (Google OAuth 2.0)</td>
  <td>SSR</td>
</tr>
<tr>
  <td>🗄️ Database</td>
  <td>Supabase (PostgreSQL 15+) with Row-Level Security</td>
  <td>2.x</td>
</tr>
<tr>
  <td>🔌 API</td>
  <td>Next.js App Router API Routes</td>
  <td>—</td>
</tr>
<tr>
  <td>⚡ Edge</td>
  <td>Supabase Edge Functions (Deno runtime)</td>
  <td>Deno</td>
</tr>
<tr>
  <td>🔔 Alerts</td>
  <td>Slack Webhooks (optional)</td>
  <td>—</td>
</tr>
<tr>
  <td>📊 Seeding</td>
  <td>xlsx + tsx (Excel parsing)</td>
  <td>0.18</td>
</tr>
<tr>
  <td>🧪 Testing</td>
  <td>Vitest + Testing Library + v8 coverage</td>
  <td>4.x</td>
</tr>
<tr>
  <td>📦 Package Mgr</td>
  <td>pnpm (frontend) / npm (backend)</td>
  <td>9.12</td>
</tr>
</table>

---

## 🗃️ Database Schema

### Core Tables

| Table | Purpose | Row-Level Security |
|:------|:--------|:-------------------|
| `platforms` | 9 AI platform definitions | Read-only for authenticated |
| `app_users` | User profiles + role + platform assignments | Self-read; admin full |
| `platform_task_columns` | Dynamic task column defs per platform | Read-only for authenticated |
| `worker_tracker` | Main tracker with JSONB task statuses | Role + platform filtered |
| `task_status_history` | Audit log of all status changes | Admin/manager + own |
| `workers_registry` | Worker registration records | Role + platform filtered |
| `orders` | Platform orders | Admin always; others via flag |
| `payroll` | Monthly payroll records | Admin + manager only |

### Materialized Views

| View | Description |
|:-----|:------------|
| `warning_summary` | Per-platform warning level counts |
| `order_summary` | Per-platform order status breakdown |
| `platform_stats` | Combined dashboard stats (workers, warnings, orders, payroll) |

### Supported Platforms

| Platform | Slug | Icon | Color | Task Columns |
|:---------|:-----|:----:|:------|:-------------|
| Oneforma | `oneforma` | 🟣 | `#8B5CF6` | 18 |
| Telus | `telus` | 🔵 | `#3B82F6` | 11 |
| Data Annotation | `data_annotation` | 🟢 | `#10B981` | 10 |
| Outlier | `outlier` | 🟠 | `#F97316` | 10 |
| Mercor AI | `mercor_ai` | 🩷 | `#EC4899` | 9 |
| Remotasks | `remotasks` | 🟡 | `#EAB308` | 9 |
| Appen | `appen` | 🔷 | `#0EA5E9` | 9 |
| Clickworker | `clickworker` | 🔶 | `#F59E0B` | 8 |
| Scale AI | `scale_ai` | ⚫ | `#6B7280` | 8 |

### Database Functions & Triggers

```
PostgreSQL Functions & Triggers
├── handle_new_user()           → Auto-creates app_users row on first sign-in
├── update_updated_at_column()  → Auto-timestamps on UPDATE
├── handle_task_status_update() → Logs task status change history
├── notify_warning_escalation() → Calls Edge Function via pg_net
├── validate_task_statuses()    → Enforces valid JSONB status values
├── get_my_role()               → RLS helper: returns current user's role
├── get_my_platforms()          → RLS helper: returns assigned platform IDs
└── can_i_view_orders()         → RLS helper: checks order visibility flag
```

---

## 🔐 Role Access Matrix

| Feature | 👑 Admin | 📋 Manager | 👁️ Supervisor | 👷 Worker |
|:--------|:--------:|:----------:|:-------------:|:---------:|
| Dashboard (all platforms) | ✅ | Assigned | Assigned | ❌ |
| Tracker — view | ✅ | Assigned | Assigned | Own row |
| Tracker — edit statuses | ✅ | Assigned | Assigned | ❌ |
| Registry — view/edit | ✅ | Assigned | View only | ❌ |
| Orders — view | ✅ | If granted | If granted | ❌ |
| Orders — edit | ✅ | ❌ | ❌ | ❌ |
| Payroll | ✅ | ✅ | ❌ | ❌ |
| Admin Panel | ✅ | ❌ | ❌ | ❌ |
| CSV Export | ✅ | Assigned | ❌ | ❌ |

---

## 🔌 API Routes

| Method | Endpoint | Auth | Description |
|:------:|:---------|:----:|:------------|
| `GET` | `/api/admin/users` | Admin | List all users with roles |
| `PATCH` | `/api/admin/users` | Admin | Update user role / platform access / order flag |
| `GET` | `/api/export/[table]?platform=[slug]` | Admin/Manager | Download table as CSV |
| `PATCH` | `/api/tracker/task` | Authenticated | Update a single JSONB task status key |
| `GET` | `/auth/callback` | Public | OAuth code exchange + session redirect |

---

## 🧪 Testing

<table>
<tr>
  <th></th>
  <th>Backend</th>
  <th>Frontend</th>
  <th>Total</th>
</tr>
<tr>
  <td><strong>Test Files</strong></td>
  <td align="center">2</td>
  <td align="center">10</td>
  <td align="center"><strong>12</strong></td>
</tr>
<tr>
  <td><strong>Tests</strong></td>
  <td align="center">80</td>
  <td align="center">142</td>
  <td align="center"><strong>222</strong></td>
</tr>
<tr>
  <td><strong>Statements</strong></td>
  <td align="center">100%</td>
  <td align="center">100%</td>
  <td align="center">✅ 100%</td>
</tr>
<tr>
  <td><strong>Functions</strong></td>
  <td align="center">100%</td>
  <td align="center">100%</td>
  <td align="center">✅ 100%</td>
</tr>
<tr>
  <td><strong>Lines</strong></td>
  <td align="center">100%</td>
  <td align="center">100%</td>
  <td align="center">✅ 100%</td>
</tr>
<tr>
  <td><strong>Branches</strong></td>
  <td align="center">100%</td>
  <td align="center">96%</td>
  <td align="center">✅ ~98%</td>
</tr>
</table>

```bash
# Run all tests
cd backend  && npm test
cd frontend && pnpm test

# With coverage reports
cd backend  && npm run test:coverage
cd frontend && pnpm test:coverage
```

### Frontend Test Coverage Map

| Test File | Tests | Module Under Test |
|:----------|:-----:|:------------------|
| `types.test.ts` | 12 | `getPermissions()` — all 4 roles × all permission flags |
| `supabase-client.test.ts` | 2 | Browser Supabase client factory |
| `supabase-server.test.ts` | 5 | Server client + admin client + cookie adapter |
| `db.test.ts` | 46 | All 18 `db.ts` functions — success, error, filter paths |
| `auth-context.test.tsx` | 22 | AuthProvider lifecycle, OAuth, hasAccess, hasRole |
| `middleware.test.ts` | 17 | Route protection, admin gating, cookie delegation |
| `api-admin-users.test.ts` | 14 | GET/PATCH admin users API |
| `api-export.test.ts` | 12 | CSV export — auth, validation, data formatting |
| `api-tracker-task.test.ts` | 8 | Tracker task JSONB merge API |
| `auth-callback.test.ts` | 4 | OAuth callback code exchange |

### Backend Test Coverage Map

| Test File | Tests | Module Under Test |
|:----------|:-----:|:------------------|
| `seed-helpers.test.ts` | 48 | `norm()`, `cell()`, `header()`, `batchArray()`, 4 sheet parsers |
| `mock-helpers.test.ts` | 32 | Workbook generation, constants, round-trip integration |

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version | Install |
|:-----|:--------|:--------|
| Node.js | 20+ | [nodejs.org](https://nodejs.org/) |
| pnpm | 9+ | `npm install -g pnpm` |
| Supabase CLI | Latest | `npm install -g supabase` |
| Supabase Project | — | [supabase.com](https://supabase.com/) |

### 1️⃣ Clone & Install

```bash
git clone https://github.com/austinLorenzMccoy/TheHexagonLabs.git
cd TheHexagonLabs

# Frontend
cd frontend && pnpm install && cp .env.example .env.local && cd ..

# Backend
cd backend && npm install && cp .env.example .env.local && cd ..
```

### 2️⃣ Configure Environment

Edit both `.env.local` files:

```env
# Required in both frontend/ and backend/
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Frontend only
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3️⃣ Set Up the Database

**Option A — Supabase Dashboard (Cloud):**
1. Go to **Supabase → SQL Editor**
2. Paste and run `backend/supabase/migrations/20260612000000_init.sql`
3. Update the `ALTER DATABASE` statements with your real URL and service role key

**Option B — Supabase CLI (Local):**
```bash
cd backend
supabase link --project-ref <your-ref>
supabase db push
```

### 4️⃣ Enable Google OAuth

1. **Supabase Dashboard** → Authentication → Providers → Google → Enable
2. **Google Cloud Console** → Create OAuth 2.0 Client ID
3. Add redirect URIs:
   ```
   https://<project-ref>.supabase.co/auth/v1/callback
   http://localhost:3000/auth/callback
   ```
4. Paste Client ID + Secret into Supabase

### 5️⃣ Start Development Server

```bash
cd frontend
pnpm dev
```

Open **http://localhost:3000** → Sign in with Google → You'll be created as a `worker` role.

### 6️⃣ Promote Yourself to Admin

```sql
-- Run in Supabase SQL Editor
UPDATE public.app_users
  SET role = 'admin',
      platform_access = null,
      can_view_orders = true
  WHERE email = 'your.email@gmail.com';
```

---

## 🌱 Seeding the Database

### From Real Excel Files

```bash
cp /path/to/AI_JobBoard_Worker_Tracker.xlsx backend/data/
cp /path/to/AI_Platform_Workers_Hub.xlsx    backend/data/

cd backend && npm run seed
```

### From Mock Data

```bash
cd backend
npm run generate-mock-excel    # Creates realistic test spreadsheets
npm run seed                   # Seeds them into the database
```

---

## 🚢 Deployment

### Vercel + Supabase (Recommended)

1. **Push to GitHub** (already done!)
2. **Vercel** → New Project → Import → Set root directory to `frontend`
3. **Add environment variables** (all from `.env.example`)
4. **Supabase** → Auth → URL Configuration → add:
   ```
   https://your-app.vercel.app/auth/callback
   ```
5. **Google Cloud** → OAuth credentials → add same redirect URI
6. **Deploy** 🚀

### Edge Functions

```bash
cd backend
supabase functions deploy notify-warning
supabase functions deploy daily-summary

supabase secrets set \
  SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

---

## 🔧 Key Design Decisions

| Decision | Rationale |
|:---------|:----------|
| **RLS at database layer** | Even if application code has bugs, data isolation is enforced at the DB level |
| **task_statuses as JSONB** | Each platform has different task columns; JSONB avoids dozens of nullable columns |
| **Orders: Admin-only default** | `can_view_orders` flag lets admin grant visibility per user. RLS enforces this |
| **Service role key only in API routes** | Admin client is only in server-side code. Browser uses anon key only |
| **Edge Functions for notifications** | Heavy async work doesn't block the DB trigger cycle |
| **Extracted helper modules** | Pure parsing logic separated from I/O for 100% testable code |

---

## 🐛 Troubleshooting

| Symptom | Cause | Fix |
|:--------|:------|:----|
| `app_users` row not created after sign-in | `on_auth_user_created` trigger missing | Re-run the migration SQL |
| Orders return empty for admin | Role is still `worker` | Run the admin promotion SQL |
| `get_my_role()` returns null | User missing from `app_users` | Check trigger; insert manually |
| Manager sees all platforms | `platform_access` is null | Set specific slugs via admin API |
| Worker sees all rows | `worker_id` not linked | Set `worker_id` in `app_users` |
| Task history not recording | History trigger missing | Re-run Section 9 of migration |
| Edge Function not firing | `pg_net` not configured | Test with `SELECT net.http_post(...)` |
| Seed fails with constraint error | Invalid status string from Excel | Check `norm()` fallback values |
| Auth callback loop | Redirect URI mismatch | Ensure exact URL in Google + Supabase |
| TypeScript errors on DB queries | Types out of sync | Run `supabase gen types typescript ...` |

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <strong>Hexagon LABS v1.0</strong><br/>
  <sub>
    Full Supabase implementation · PostgreSQL schema with RLS · 8 DB functions & triggers · 2 Edge Functions · Google OAuth · 3 API routes · Excel seeder · 222 tests · Real-time subscriptions
  </sub>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Made_with-❤️_and_☕-red?style=flat-square" alt="Made with love"/>
</p>
