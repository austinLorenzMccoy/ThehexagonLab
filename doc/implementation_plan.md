# Hexagon LABS Backend Implementation Plan

Implement the backend system for Hexagon LABS based on the Backend PRD. The implementation will be housed in a new `backend` directory, containing the Supabase configuration, SQL schemas/migrations, Deno edge functions, and an Excel seeding script. Additionally, a Next.js integration layer (API routes, Supabase client/server files, middleware, database layer, and contexts) will be created inside the `backend` folder and optionally integrated directly with the `frontend` folder.

---

## User Review Required

> [!IMPORTANT]
> **Supabase CLI & Local Database Settings:** 
> The triggers and cron jobs in the database schema rely on settings like `app.supabase_url` and `app.service_role_key` (Block 9 of the PRD). In a production or staged deployment, these variables must be populated with active project credentials. For the local implementation, we will use mock placeholders in the SQL files and explain how to update them.
>
> **Next.js frontend integration:**
> Since the frontend project has path aliases mapping `@/*` to `./*` directly (not `./src/*`), all paths from the PRD are adapted to match the root-level layout of the `frontend` folder (e.g., `lib/db.ts` instead of `src/lib/db.ts`).

---

## Open Questions

> [!NOTE]
> 1. Do you want the Next.js integration files (such as API routes, database helpers, and contexts) copied directly into the `frontend/` directory so they are immediately available for page implementation, or should they only exist within the `backend/nextjs-integration/` folder for now?
> 2. Are the Excel files (`AI_JobBoard_Worker_Tracker.xlsx` and `AI_Platform_Workers_Hub.xlsx`) available locally on your system to copy into the backend's `data/` folder, or should we set up the seed script so it is ready for you to run once you put the files there?

---

## Proposed Changes

### 1. Backend Folder Structure (Supabase, CLI, Seeding, and Integration)

We will initialize a Node.js project in a new `backend/` folder to manage the Supabase migrations, edge functions, and the seed script.

#### [NEW] [package.json](file:///Users/a/Documents/AI-Hexagon LABS/backend/package.json)
Initialize a package.json to declare seeding and CLI run scripts, with dependencies like `xlsx`, `tsx`, `dotenv`, and `@supabase/supabase-js`.

#### [NEW] [tsconfig.json](file:///Users/a/Documents/AI-Hexagon LABS/backend/tsconfig.json)
Define TypeScript compilation and modules for running the script.

#### [NEW] [config.toml](file:///Users/a/Documents/AI-Hexagon LABS/backend/supabase/config.toml)
Initialize the Supabase CLI configuration file.

#### [NEW] [20260612000000_init_schema.sql](file:///Users/a/Documents/AI-Hexagon LABS/backend/supabase/migrations/20260612000000_init_schema.sql)
A combined initial SQL migration containing:
- Extensions (`uuid-ossp`, `pgcrypto`, `pg_cron`, `pg_net`)
- Table definitions (`platforms`, `app_users`, `platform_task_columns`, `worker_tracker`, `task_status_history`, `workers_registry`, `orders`, `payroll`)
- RLS Policies and security helper functions (`get_my_role`, `get_my_platforms`, `can_i_view_orders`, `get_my_worker_id`)
- Database Functions & Triggers (updated timestamp triggers, user creation triggers, status updates history logging, warning escalation net hooks, task validation checks, and daily cron job registration)
- Dashboard Views (`warning_summary`, `order_summary`, `platform_stats`)
- Real-time subscription flags for the tracker and orders tables.

#### [NEW] [index.ts (notify-warning)](file:///Users/a/Documents/AI-Hexagon LABS/backend/supabase/functions/notify-warning/index.ts)
Deno edge function to send slack messages/alerts when a warning level escalates.

#### [NEW] [index.ts (daily-summary)](file:///Users/a/Documents/AI-Hexagon LABS/backend/supabase/functions/daily-summary/index.ts)
Deno edge function running via cron to publish daily dashboard statistics.

#### [NEW] [seed.ts](file:///Users/a/Documents/AI-Hexagon LABS/backend/scripts/seed.ts)
Excel parsing script using `xlsx` to extract data from `AI_JobBoard_Worker_Tracker.xlsx` and `AI_Platform_Workers_Hub.xlsx`, normalize fields, and batch insert them into the Supabase database.

---

### 2. Next.js Integration Layer (Adapted for Frontend Layout)

These files will be written inside `backend/nextjs-integration/` to matches the backend PRD's frontend integrations, and copied to `frontend/` as well.

#### [NEW] [index.ts](file:///Users/a/Documents/AI-Hexagon LABS/backend/nextjs-integration/types/index.ts)
Declare all TypeScript interfaces, database row types, and the `getPermissions` helper.

#### [NEW] [client.ts](file:///Users/a/Documents/AI-Hexagon LABS/backend/nextjs-integration/lib/supabase/client.ts)
Initialize browser Supabase client using `@supabase/ssr`.

#### [NEW] [server.ts](file:///Users/a/Documents/AI-Hexagon LABS/backend/nextjs-integration/lib/supabase/server.ts)
Initialize server Supabase client (cookie-based) and the server-side admin client.

#### [NEW] [AuthContext.tsx](file:///Users/a/Documents/AI-Hexagon LABS/backend/nextjs-integration/contexts/AuthContext.tsx)
Context to manage user auth state, permissions, Google OAuth login flow, and sync with `app_users`.

#### [NEW] [middleware.ts](file:///Users/a/Documents/AI-Hexagon LABS/backend/nextjs-integration/middleware.ts)
Route and role protection middleware utilizing cookie checks.

#### [NEW] [db.ts](file:///Users/a/Documents/AI-Hexagon LABS/backend/nextjs-integration/lib/db.ts)
Data access layer mapping all UI actions to database queries (fetching platforms, stats, columns, updating worker fields, inserting/deleting tracker/registry rows, creating orders, and syncing payroll).

#### [NEW] [route.ts (admin users)](file:///Users/a/Documents/AI-Hexagon LABS/backend/nextjs-integration/app/api/admin/users/route.ts)
Admin-only endpoint to get and update app user roles and platform access.

#### [NEW] [route.ts (export)](file:///Users/a/Documents/AI-Hexagon LABS/backend/nextjs-integration/app/api/export/%5Btable%5D/route.ts)
Role-gated API endpoint to download tracker/registry/payroll data as CSV.

#### [NEW] [route.ts (tracker task)](file:///Users/a/Documents/AI-Hexagon LABS/backend/nextjs-integration/app/api/tracker/task/route.ts)
Endpoint for updating JSONB task_statuses.

---

## Verification Plan

### Automated Tests
- Validate TypeScript compilation of both `backend/scripts/seed.ts` and the `nextjs-integration` files.
- Compile check on frontend: Once dependencies are installed, run `npm run build` or `pnpm run build` on the Next.js project to make sure types check.

### Manual Verification
- Provide SQL files that can be run directly in Supabase SQL Editor.
- Provide step-by-step instructions on setting up Supabase CLI and importing the migrations.
- Test seeding script structure with console logging to verify Excel headers validation mapping.
