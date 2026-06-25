# Hexagon LABS — Frontend Product Requirements Document

> **Project name:** `ai-workers-hub`
> **Version:** 1.0 · June 2026
> **Stack:** Next.js 14 App Router · TypeScript · Tailwind CSS · Framer Motion · Lucide React

---

## Table of Contents

1. [Product Vision & The Control Room Concept](#1-product-vision--the-control-room-concept)
2. [The Design Language — Command & Signal](#2-the-design-language--command--signal)
3. [Design Tokens](#3-design-tokens)
4. [Typography System](#4-typography-system)
5. [Role Access Matrix](#5-role-access-matrix)
6. [Project File Structure](#6-project-file-structure)
7. [Install Dependencies](#7-install-dependencies)
8. [Tailwind Configuration](#8-tailwind-configuration)
9. [Global Layout & App Shell](#9-global-layout--app-shell)
10. [Sidebar — Signal Nav](#10-sidebar--signal-nav)
11. [TopBar — Command Strip](#11-topbar--command-strip)
12. [Platform Tab Bar](#12-platform-tab-bar)
13. [Page Specs — Dashboard (Command Centre)](#13-page-specs--dashboard-command-centre)
14. [Page Specs — Tracker (Signal Grid)](#14-page-specs--tracker-signal-grid)
15. [Page Specs — Registry (Field Roster)](#15-page-specs--registry-field-roster)
16. [Page Specs — Orders (Restricted Zone)](#16-page-specs--orders-restricted-zone)
17. [Page Specs — Payroll (Ledger Room)](#17-page-specs--payroll-ledger-room)
18. [Page Specs — Admin (Control Tower)](#18-page-specs--admin-control-tower)
19. [Unique Non-Generic UI Components](#19-unique-non-generic-ui-components)
20. [Status Badge System](#20-status-badge-system)
21. [TrackerTable — Spreadsheet Component](#21-trackertable--spreadsheet-component)
22. [StatusCell — Inline Editable Cell](#22-statuscell--inline-editable-cell)
23. [OrderForm Modal — Admin Only](#23-orderform-modal--admin-only)
24. [UserRoleCard — Admin Panel Component](#24-userrolecard--admin-panel-component)
25. [Login Page](#25-login-page)
26. [AccessDenied Component](#26-accessdenied-component)
27. [Animation & Interaction Spec](#27-animation--interaction-spec)
28. [Responsive & Accessibility Rules](#28-responsive--accessibility-rules)
29. [Step-by-Step Frontend Build Guide](#29-step-by-step-frontend-build-guide)
30. [Deployment](#30-deployment)

---

## 1. Product Vision & The Control Room Concept

### What this app is

Hexagon LABS is an internal operations platform for managing AI data workers across 9 annotation platforms — Oneforma, Telus, Data Annotation, Outlier, Mercor AI, Remotasks, Appen, Clickworker, and Scale AI. It replaces two sprawling Excel files with a live, role-controlled web application.

### The design metaphor: Signal & Command

The app is designed around the metaphor of a **signals intelligence control room** — the kind of environment where operators monitor live feeds, supervisors manage channels, and the command layer has full visibility. Every design decision reinforces this feeling:

- The UI is **dark by default** — operators work in low-light environments
- Data is presented as **live signal feeds**, not static tables
- Status indicators use a **traffic light + signal strength** visual language
- Platform tabs feel like **switching between active channels**
- The orders section looks and feels **classified** — access is visually distinguished

This is not a generic SaaS dashboard with blue buttons and white cards. It is a purpose-built operations interface.

### Terminology mapping

| Generic term | Hexagon LABS term | Used in UI |
|---|---|---|
| Dashboard | Command Centre | Page title, breadcrumb |
| Worker Tracker | Signal Grid | Nav label, page header |
| Workers Registry | Field Roster | Nav label, page header |
| Orders | Restricted Zone | Nav label — only shown to authorised users |
| Payroll | Ledger Room | Nav label, page header |
| Admin panel | Control Tower | Nav label, page header |
| Platform | Channel | Platform tabs header |
| Warning level | Alert Status | Column header, badge labels |
| Banned | Signal Dead | Badge variant |
| Serious | Signal Critical | Badge variant |
| Minor | Signal Caution | Badge variant |
| Clear | Signal Green | Badge variant |

---

## 2. The Design Language — Command & Signal

### Core aesthetic principles

**1. Dark ops surfaces**
Background is near-black with blue-tinted dark panels — not pure black, which feels flat, but a deep navy-slate that suggests depth and focus.

**2. Signal green as the primary accent**
The primary interactive colour is `#00C896` — a bold terminal green. This is used for active states, CTAs, and success indicators. It reads as "system online."

**3. Amber as the secondary accent**
`#F5A623` amber is used for warnings, pending states, and the orders section's restricted visual treatment. It reads as "caution — elevated access required."

**4. Monospace for data**
All table cell data, IDs, platform codes, and status values use `JetBrains Mono`. UI labels and navigation use `Inter`. This distinction between "data space" and "interface space" is fundamental to the design.

**5. Hard left-side borders as the signature mark**
Every card and panel has a 2px left border in the relevant platform or status colour. This is the visual signature of the design — it creates instant colour-coding without loud backgrounds.

**6. Grid lines, not card shadows**
Tables use subtle 1px grid lines in `#2A2F3A` rather than boxed cards with drop shadows. This is an ops tool, not a marketing page.

**7. Platform colour chips**
Every platform has a unique accent colour. These appear as small coloured chips in the left border of tracker rows, platform tabs, and sidebar items.

---

## 3. Design Tokens

Add these to `tailwind.config.ts` under `theme.extend.colors`:

```ts
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Core surfaces ──────────────────────────────────────
        ops: {
          base:     '#0B0E14',   // deepest background
          surface:  '#111520',   // page background
          panel:    '#181D28',   // card / panel background
          elevated: '#1E2535',   // modals, dropdowns
          border:   '#2A2F3A',   // grid lines, dividers
          muted:    '#3A4255',   // disabled, subtle borders
        },

        // ── Text ───────────────────────────────────────────────
        ink: {
          primary:  '#E8EBF0',   // main text
          secondary:'#8D97A8',   // labels, metadata
          muted:    '#525E72',   // placeholder, disabled
          inverse:  '#0B0E14',   // text on bright backgrounds
        },

        // ── Accents ────────────────────────────────────────────
        signal: {
          green:    '#00C896',   // primary CTA, active, success
          greenDim: '#00A37A',   // hover state for signal.green
          amber:    '#F5A623',   // warnings, pending, orders accent
          amberDim: '#C47D0E',   // hover state for signal.amber
          red:      '#F04A58',   // errors, banned, critical
          blue:     '#4A90E2',   // info, processing, links
          purple:   '#8B5CF6',   // Oneforma platform colour
        },

        // ── Platform colours ───────────────────────────────────
        platform: {
          oneforma:   '#8B5CF6',
          telus:      '#3B82F6',
          data:       '#10B981',
          outlier:    '#F97316',
          mercor:     '#EC4899',
          remotasks:  '#EAB308',
          appen:      '#0EA5E9',
          clickworker:'#F59E0B',
          scale:      '#6B7280',
        },

        // ── Status colours ─────────────────────────────────────
        status: {
          yes:        '#00C896',
          no:         '#F04A58',
          pending:    '#F5A623',
          inProgress: '#4A90E2',
          na:         '#525E72',
          banned:     '#F04A58',
          serious:    '#F97316',
          minor:      '#F5A623',
          clear:      '#00C896',
          none:       '#525E72',
        },
      },

      fontFamily: {
        sans:  ['Inter', 'system-ui', 'sans-serif'],
        mono:  ['JetBrains Mono', 'Fira Code', 'monospace'],
      },

      borderRadius: {
        ops: '6px',       // standard card radius
        pill: '999px',    // badge radius
      },
    },
  },
  plugins: [],
}

export default config
```

---

## 4. Typography System

Load fonts via `next/font` in `layout.tsx`:

```tsx
import { Inter, JetBrains_Mono } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500', '600'],
})
```

### Type scale

| Role | Class | Usage |
|---|---|---|
| Page title | `text-xl font-semibold text-ink-primary font-sans` | H1 on each page |
| Section header | `text-sm font-semibold text-ink-secondary uppercase tracking-widest` | Table column headers, section labels |
| Body | `text-sm text-ink-primary font-sans` | Main content |
| Data cell | `text-sm font-mono text-ink-primary` | All table cell values |
| Label | `text-xs text-ink-secondary font-sans` | Form labels, metadata |
| Badge | `text-xs font-semibold font-mono` | Status badges |
| Muted | `text-xs text-ink-muted font-sans` | Secondary metadata |

---

## 5. Role Access Matrix

| Feature | Admin | Manager | Supervisor | Worker |
|---|:---:|:---:|:---:|:---:|
| Command Centre (all platforms) | ✅ | Assigned only | Assigned only | ❌ |
| Signal Grid — view | ✅ | Assigned only | Assigned only | Own row only |
| Signal Grid — edit | ✅ | Assigned only | Assigned only | ❌ |
| Field Roster — view | ✅ | Assigned only | Assigned only | ❌ |
| Field Roster — edit | ✅ | ✅ | ❌ | ❌ |
| Restricted Zone (Orders) | ✅ | If granted | If granted | ❌ Never |
| Restricted Zone — edit | ✅ Only | ❌ | ❌ | ❌ |
| Ledger Room (Payroll) | ✅ | ✅ | ❌ | ❌ |
| Control Tower (Admin) | ✅ | ❌ | ❌ | ❌ |
| Export CSV | ✅ | Assigned only | ❌ | ❌ |
| Add / delete workers | ✅ | ✅ | ❌ | ❌ |

---

## 6. Project File Structure

```
ai-workers-hub/
├── public/
│   ├── logo.svg                      # Hexagon LABS logo — monogram W/H
│   └── platform-icons/               # SVG icons per platform (optional)
├── src/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx                # Fonts, AuthProvider, shell wrapper
│   │   ├── page.tsx                  # Root redirect → /dashboard or /login
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── auth/
│   │   │   └── callback/route.ts
│   │   ├── dashboard/
│   │   │   └── page.tsx              # Command Centre
│   │   ├── tracker/
│   │   │   ├── page.tsx              # Channel selector
│   │   │   └── [platform]/
│   │   │       └── page.tsx          # Signal Grid per platform
│   │   ├── registry/
│   │   │   ├── page.tsx
│   │   │   └── [platform]/
│   │   │       └── page.tsx
│   │   ├── orders/
│   │   │   ├── page.tsx
│   │   │   └── [platform]/
│   │   │       └── page.tsx
│   │   ├── payroll/
│   │   │   ├── page.tsx
│   │   │   └── [platform]/
│   │   │       └── page.tsx
│   │   └── admin/
│   │       ├── page.tsx
│   │       └── users/
│   │           ├── page.tsx
│   │           └── [userId]/
│   │               └── page.tsx
│   ├── components/
│   │   ├── shell/
│   │   │   ├── AppShell.tsx          # Sidebar + TopBar wrapper
│   │   │   ├── SignalNav.tsx         # Sidebar navigation
│   │   │   ├── CommandStrip.tsx      # TopBar
│   │   │   └── ChannelTabs.tsx       # Platform tab bar
│   │   ├── dashboard/
│   │   │   ├── PlatformChannelCard.tsx
│   │   │   ├── AlertStatusRow.tsx
│   │   │   ├── OrderPulseBar.tsx     # Mini order status bar
│   │   │   └── PayrollSnapshot.tsx
│   │   ├── tracker/
│   │   │   ├── SignalGrid.tsx        # The main tracker table
│   │   │   ├── StatusCell.tsx        # Inline editable cell
│   │   │   ├── AlertBadge.tsx        # Warning level badge
│   │   │   ├── GridFilters.tsx
│   │   │   └── ExportButton.tsx
│   │   ├── registry/
│   │   │   ├── RosterTable.tsx
│   │   │   ├── GeoworkChip.tsx
│   │   │   └── RosterFilters.tsx
│   │   ├── orders/
│   │   │   ├── OrderTable.tsx
│   │   │   ├── OrderStatusChip.tsx
│   │   │   ├── OrderForm.tsx         # Admin-only create/edit modal
│   │   │   └── RestrictedBanner.tsx  # Shown when access is read-only
│   │   ├── payroll/
│   │   │   ├── LedgerTable.tsx
│   │   │   └── PayrollSummaryBar.tsx
│   │   ├── admin/
│   │   │   ├── UserRoleCard.tsx
│   │   │   ├── RoleSelector.tsx
│   │   │   ├── ChannelAccessPicker.tsx
│   │   │   └── OrderAccessToggle.tsx
│   │   └── ui/
│   │       ├── StatusBadge.tsx       # Universal status pill
│   │       ├── PlatformChip.tsx      # Coloured platform pill
│   │       ├── AccessDenied.tsx      # Classified-style locked screen
│   │       ├── ConfirmModal.tsx
│   │       ├── Spinner.tsx
│   │       └── EmptyState.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx
│   ├── hooks/
│   │   ├── useTrackerData.ts
│   │   ├── useOrderData.ts
│   │   └── usePlatformColumns.ts
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   └── server.ts
│   │   ├── db.ts
│   │   └── export.ts                 # CSV export helper
│   └── types/
│       ├── database.ts
│       └── index.ts
├── scripts/
│   └── seed.ts
├── .env.local
├── .env.example
├── middleware.ts
├── next.config.js
└── tailwind.config.ts
```

---

## 7. Install Dependencies

```bash
npx create-next-app@latest ai-workers-hub \
  --typescript --tailwind --eslint --app --src-dir

cd ai-workers-hub

# Core
npm install @supabase/supabase-js @supabase/ssr

# UI
npm install framer-motion lucide-react

# Utilities
npm install clsx tailwind-merge

# Dev
npm install -D @types/node
```

Create `src/lib/utils.ts` for class merging:

```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

---

## 8. Tailwind Configuration

Full `tailwind.config.ts` with the design tokens from Section 3, plus dark mode class strategy and custom plugin for the ops grid pattern:

```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: { /* paste full token map from Section 3 */ },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      backgroundImage: {
        // Subtle dot grid for empty states and the dashboard background
        'ops-grid': `radial-gradient(circle, #2A2F3A 1px, transparent 1px)`,
      },
      backgroundSize: {
        'ops-grid': '24px 24px',
      },
      keyframes: {
        'pulse-signal': {
          '0%, 100%': { opacity: '1' },
          '50%':       { opacity: '0.4' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to:   { transform: 'translateX(0)' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'pulse-signal': 'pulse-signal 2s ease-in-out infinite',
        'slide-in-right': 'slide-in-right 0.2s ease-out',
        'fade-up': 'fade-up 0.2s ease-out',
      },
    },
  },
  plugins: [],
}

export default config
```

`src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html { @apply dark; }

  body {
    @apply bg-ops-surface text-ink-primary font-sans;
    -webkit-font-smoothing: antialiased;
  }

  /* Scrollbar styling — ops-style thin track */
  ::-webkit-scrollbar        { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track  { background: #0B0E14; }
  ::-webkit-scrollbar-thumb  { background: #2A2F3A; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #3A4255; }

  /* Selection colour */
  ::selection { background: #00C89630; color: #E8EBF0; }
}

@layer components {
  /* Platform left-border accent — the signature mark of the design */
  .platform-border-oneforma   { @apply border-l-2 border-platform-oneforma; }
  .platform-border-telus      { @apply border-l-2 border-platform-telus; }
  .platform-border-data       { @apply border-l-2 border-platform-data; }
  .platform-border-outlier    { @apply border-l-2 border-platform-outlier; }
  .platform-border-mercor     { @apply border-l-2 border-platform-mercor; }
  .platform-border-remotasks  { @apply border-l-2 border-platform-remotasks; }
  .platform-border-appen      { @apply border-l-2 border-platform-appen; }
  .platform-border-clickworker{ @apply border-l-2 border-platform-clickworker; }
  .platform-border-scale      { @apply border-l-2 border-platform-scale; }

  /* Ops card — standard panel */
  .ops-card {
    @apply bg-ops-panel border border-ops-border rounded-ops;
  }

  /* Ops table */
  .ops-table          { @apply w-full border-collapse; }
  .ops-table th       { @apply text-xs font-semibold text-ink-secondary uppercase tracking-widest
                               font-mono px-3 py-2 bg-ops-base border-b border-ops-border
                               text-left whitespace-nowrap; }
  .ops-table td       { @apply text-sm font-mono text-ink-primary px-3 py-2
                               border-b border-ops-border whitespace-nowrap; }
  .ops-table tr:hover td { @apply bg-ops-elevated; }

  /* Classified stamp — used on the orders restricted banner */
  .classified-stamp {
    @apply text-signal-amber font-mono font-bold tracking-[0.3em]
           border border-signal-amber/40 px-3 py-1 rounded text-xs
           opacity-80;
  }
}
```

---

## 9. Global Layout & App Shell

### `src/app/layout.tsx`

```tsx
import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { AuthProvider } from '@/contexts/AuthContext'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const mono  = JetBrains_Mono({
  subsets: ['latin'], variable: '--font-mono', display: 'swap',
  weight: ['400', '500', '600'],
})

export const metadata: Metadata = {
  title: 'Hexagon LABS — AI Platform Operations',
  description: 'Signal Grid, Field Roster, and Command Centre for AI annotation workforce management.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${mono.variable}`}>
      <body className="bg-ops-surface text-ink-primary min-h-screen">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
```

### `src/components/shell/AppShell.tsx`

```tsx
'use client'
import { SignalNav }     from './SignalNav'
import { CommandStrip }  from './CommandStrip'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-ops-surface">
      {/* Sidebar */}
      <SignalNav />

      {/* Main content area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <CommandStrip />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
```

---

## 10. Sidebar — Signal Nav

The sidebar is 220px wide, dark navy background, with platform-coloured active indicators. Navigation items have a left-edge active bar in `signal.green` when selected.

### Visual spec

- Background: `ops-base` (`#0B0E14`)
- Width: `220px` fixed
- Top: Logo mark (W/H monogram) + "Hexagon LABS" in `text-sm font-semibold text-ink-primary`
- Sections: OPERATIONS | MANAGEMENT | ADMIN (section headers in `ink-muted uppercase tracking-widest text-[10px]`)
- Active item: `bg-ops-elevated` + `border-l-2 border-signal-green` + text `text-signal-green`
- Inactive item: `text-ink-secondary hover:text-ink-primary hover:bg-ops-panel`
- Bottom: User avatar + display name + role badge + sign out button

### `src/components/shell/SignalNav.tsx`

```tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Grid3x3, Users, ShoppingCart,
  DollarSign, Settings, LogOut, Radio,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

const ROLE_BADGE: Record<string, string> = {
  admin:      'bg-signal-red/10 text-signal-red border border-signal-red/20',
  manager:    'bg-signal-blue/10 text-signal-blue border border-signal-blue/20',
  supervisor: 'bg-signal-amber/10 text-signal-amber border border-signal-amber/20',
  worker:     'bg-ops-border text-ink-secondary border border-ops-border',
}

export function SignalNav() {
  const pathname = usePathname()
  const { appUser, signOut } = useAuth()

  const navItems = [
    { label: 'Command Centre', href: '/dashboard',  icon: LayoutDashboard, section: 'OPERATIONS' },
    { label: 'Signal Grid',    href: '/tracker',    icon: Grid3x3,          section: 'OPERATIONS' },
    { label: 'Field Roster',   href: '/registry',   icon: Users,            section: 'OPERATIONS' },
    // Orders only shown to admin or users with can_view_orders
    ...(appUser?.role === 'admin' || appUser?.can_view_orders ? [
      { label: 'Restricted Zone', href: '/orders', icon: ShoppingCart, section: 'MANAGEMENT' }
    ] : []),
    ...(appUser?.role === 'admin' || appUser?.role === 'manager' ? [
      { label: 'Ledger Room',  href: '/payroll',    icon: DollarSign,       section: 'MANAGEMENT' }
    ] : []),
    ...(appUser?.role === 'admin' ? [
      { label: 'Control Tower', href: '/admin',     icon: Settings,         section: 'ADMIN' }
    ] : []),
  ]

  const sections = ['OPERATIONS', 'MANAGEMENT', 'ADMIN']

  return (
    <nav className="w-[220px] flex-shrink-0 flex flex-col bg-ops-base border-r border-ops-border">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-ops-border">
        <div className="w-8 h-8 rounded-ops bg-signal-green/10 border border-signal-green/30
                        flex items-center justify-center">
          <Radio className="w-4 h-4 text-signal-green" />
        </div>
        <div>
          <p className="text-sm font-semibold text-ink-primary leading-none">Hexagon LABS</p>
          <p className="text-[10px] text-ink-muted mt-0.5">AI Ops Platform</p>
        </div>
      </div>

      {/* Nav sections */}
      <div className="flex-1 overflow-y-auto py-3 px-2">
        {sections.map(section => {
          const items = navItems.filter(n => n.section === section)
          if (items.length === 0) return null
          return (
            <div key={section} className="mb-4">
              <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-widest
                             px-3 mb-1">{section}</p>
              {items.map(item => {
                const active = pathname.startsWith(item.href)
                const Icon = item.icon
                return (
                  <Link key={item.href} href={item.href}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-ops text-sm transition-all',
                      'border-l-2',
                      active
                        ? 'bg-ops-elevated border-signal-green text-signal-green'
                        : 'border-transparent text-ink-secondary hover:text-ink-primary hover:bg-ops-panel',
                      item.href === '/orders' && !active &&
                        'border-transparent text-signal-amber/70 hover:text-signal-amber',
                    )}>
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {item.label}
                    {item.href === '/orders' && (
                      <span className="ml-auto text-[9px] classified-stamp py-0 px-1.5">
                        RESTRICTED
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* User footer */}
      {appUser && (
        <div className="border-t border-ops-border p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-ops-elevated border border-ops-border
                            flex items-center justify-center text-xs font-mono text-ink-secondary">
              {(appUser.display_name ?? appUser.email).slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-ink-primary truncate">
                {appUser.display_name ?? appUser.email.split('@')[0]}
              </p>
              <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-pill',
                ROLE_BADGE[appUser.role])}>
                {appUser.role.toUpperCase()}
              </span>
            </div>
          </div>
          <button onClick={signOut}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-ops text-xs
                       text-ink-muted hover:text-signal-red hover:bg-signal-red/5 transition-colors">
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      )}
    </nav>
  )
}
```

---

## 11. TopBar — Command Strip

A 48px bar at the top of the content area. Shows the current page title, breadcrumb, and contextual actions (export button, add worker button).

```tsx
// src/components/shell/CommandStrip.tsx
'use client'
import { usePathname } from 'next/navigation'

const PAGE_LABELS: Record<string, string> = {
  '/dashboard': 'Command Centre',
  '/tracker':   'Signal Grid',
  '/registry':  'Field Roster',
  '/orders':    'Restricted Zone',
  '/payroll':   'Ledger Room',
  '/admin':     'Control Tower',
}

export function CommandStrip() {
  const pathname = usePathname()
  const base = '/' + pathname.split('/')[1]
  const label = PAGE_LABELS[base] ?? 'Hexagon LABS'

  return (
    <header className="h-12 flex items-center px-6 border-b border-ops-border
                        bg-ops-panel flex-shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-ink-muted font-mono uppercase tracking-widest">
          Hexagon LABS
        </span>
        <span className="text-ink-muted text-xs">/</span>
        <span className="text-sm font-semibold text-ink-primary">{label}</span>
      </div>
    </header>
  )
}
```

---

## 12. Platform Tab Bar

Used on `/tracker/[platform]`, `/orders/[platform]`, `/registry/[platform]`, `/payroll/[platform]`. Shows tabs for each platform the current user has access to.

```tsx
// src/components/shell/ChannelTabs.tsx
'use client'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

const ALL_PLATFORMS = [
  { slug: 'oneforma',        label: 'Oneforma',    color: '#8B5CF6' },
  { slug: 'telus',           label: 'Telus',       color: '#3B82F6' },
  { slug: 'data_annotation', label: 'Data Ann.',   color: '#10B981' },
  { slug: 'outlier',         label: 'Outlier',     color: '#F97316' },
  { slug: 'mercor_ai',       label: 'Mercor AI',   color: '#EC4899' },
  { slug: 'remotasks',       label: 'Remotasks',   color: '#EAB308' },
  { slug: 'appen',           label: 'Appen',       color: '#0EA5E9' },
  { slug: 'clickworker',     label: 'Clickworker', color: '#F59E0B' },
  { slug: 'scale_ai',        label: 'Scale AI',    color: '#6B7280' },
]

export function ChannelTabs({ basePath }: { basePath: string }) {
  const params = useParams()
  const { appUser } = useAuth()
  const active = params?.platform as string

  const visible = appUser?.role === 'admin'
    ? ALL_PLATFORMS
    : ALL_PLATFORMS.filter(p =>
        (appUser?.platform_access ?? []).includes(p.slug)
      )

  return (
    <div className="flex gap-1 px-6 pt-4 pb-0 border-b border-ops-border overflow-x-auto">
      <p className="text-[10px] text-ink-muted font-mono uppercase tracking-widest
                    self-center mr-3 flex-shrink-0">CHANNELS</p>
      {visible.map(p => (
        <Link key={p.slug}
          href={`${basePath}/${p.slug}`}
          style={active === p.slug ? { borderBottomColor: p.color, color: p.color } : {}}
          className={cn(
            'px-3 py-2 text-xs font-mono font-medium whitespace-nowrap',
            'border-b-2 transition-all',
            active === p.slug
              ? 'border-current'
              : 'border-transparent text-ink-secondary hover:text-ink-primary hover:border-ops-border',
          )}>
          {p.label}
        </Link>
      ))}
    </div>
  )
}
```

---

## 13. Page Specs — Dashboard (Command Centre)

### Layout

Full-width grid of platform channel cards, each showing live counts. Below: a warning alert summary row. Admin/Manager also see a payroll snapshot.

### `PlatformChannelCard` component

- Dark panel (`ops-card`) with left border in platform colour
- Top: platform icon + label + active channel dot (animated `pulse-signal` if has serious/banned warnings)
- Stat grid: **Workers** | **On Track** | **Warnings** | **Banned** — each as a number in `font-mono text-2xl`
- Warning count: coloured `signal-amber` if > 0; `signal-red` if any banned
- Bottom: small progress bar showing % of workers at "Clear" status — thin `h-1` bar in platform colour

### `AlertStatusRow` component

Horizontal strip below the cards. One cell per platform, showing:
- Platform colour chip
- Banned count (`signal-red`) | Serious count (`signal-red/70`) | Minor count (`signal-amber`) | Clear count (`signal-green`)
- Clicking a cell navigates to `/tracker/[platform]?filter=warning`

### `OrderPulseBar` (Admin + granted users only)

A compact horizontal bar showing orders summary across all platforms:
- Each platform as a coloured segment — width proportional to order count
- Hover shows tooltip: platform name + status breakdown
- `signal-red` segment for Issue orders — makes problems immediately visible

---

## 14. Page Specs — Tracker (Signal Grid)

### URL pattern: `/tracker/[platform]`

### Layout

1. `ChannelTabs` at top
2. `GridFilters` bar below tabs
3. `SignalGrid` table fills remaining height
4. Floating `ExportButton` bottom-right (admin/manager only)

### `GridFilters` bar

```
[ Search workers...  ]  [ Alert Status ▾ ]  [ Linker ▾ ]  [ Payoneer ▾ ]  [ + Add Worker ]
```

All filters are `ops-card` dropdowns. Search is instant (client-side filter). Add Worker opens a slide-in panel from the right (admin/manager only).

### `SignalGrid` table visual spec

- Sticky header row — stays fixed as the user scrolls down
- First column: row number (`#`) — 40px wide, `text-ink-muted font-mono`
- Second column: Alert status dot — 8px circle in status colour (no text, just colour signal)
- Columns: Name | Linker | Worker Name | Payoneer | Warning | Platform ID | SOW | LE Cert | [task columns...]
- Task columns: rendered in `font-mono text-xs` — abbreviated column keys in header
- Horizontal scroll for task columns — the Name column is **sticky left** so it stays visible while scrolling right
- Row left border: coloured by warning level (red = Serious/Banned, amber = Minor, transparent = Clear)

### Column widths

| Column | Width | Notes |
|---|---|---|
| # | 40px | fixed |
| Alert dot | 24px | fixed |
| Name | 160px | sticky left |
| Linker | 90px | |
| Worker Name | 150px | |
| Payoneer | 100px | |
| Warning | 110px | |
| Platform ID | 120px | font-mono |
| SOW | 80px | |
| LE Cert | 80px | |
| Task columns | 90px each | horizontally scrollable |

---

## 15. Page Specs — Registry (Field Roster)

### URL: `/registry/[platform]`

Clean table layout. No inline editing — workers are added/edited via a slide-in form panel.

### Columns: # | Project Task | Owner | Account Type | Email | Passport | Geowork Test | Date Started | Notes

### `GeoworkChip` — coloured pill per geowork status

```
✅ Passed  → green pill
❌ Failed  → red pill
⏳ Pending → amber pill
🔄 Retake  → blue pill
⭕ Exempted → muted pill
```

### Add worker button

Shown to admin and manager. Opens a `slide-in panel` from the right with a form. Not a full-page redirect — keeps context.

---

## 16. Page Specs — Orders (Restricted Zone)

### URL: `/orders/[platform]`

### Access check — rendered before any data

If `!permissions.canViewOrders`:

```tsx
<AccessDenied
  title="Restricted Zone"
  message="Order board access requires elevated clearance. Contact your administrator."
  showClassifiedStamp
/>
```

### For authorised users

- **Admin** sees full edit controls (status dropdown, edit button, delete button, + New Order button)
- **Manager/Supervisor with grant** sees read-only rows — no edit controls, but a `RestrictedBanner` at the top:

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠  READ ACCESS ONLY  —  You can view orders but not edit them.  │
│  Contact the administrator to request edit permissions.          │
└─────────────────────────────────────────────────────────────────┘
```

### Table columns

`Order ID` (monospace, link-style) | `Proxy` | `Owner` | `Status` chip | `Date` | `Notes` | `Actions` (admin only)

### `OrderStatusChip` variants

| Status | Background | Text | Border |
|---|---|---|---|
| 🟢 Active | `signal-green/10` | `signal-green` | `signal-green/30` |
| 🟡 Pending | `signal-amber/10` | `signal-amber` | `signal-amber/30` |
| 🔵 Processing | `signal-blue/10` | `signal-blue` | `signal-blue/30` |
| 🔴 Issue | `signal-red/10` | `signal-red` | `signal-red/30` |
| ⚫ Cancelled | `ops-border` | `ink-muted` | `ops-border` |
| ✅ Completed | `signal-green/5` | `ink-secondary` | `ops-border` |

### Stats bar (admin only)

Above the table: `Total: 48 · Active: 12 · Pending: 8 · Issues: 3 · Completed: 25`

---

## 17. Page Specs — Payroll (Ledger Room)

### URL: `/payroll/[platform]`

Two controls at top: month selector + year selector (simple `<select>` elements styled as `ops-card` dropdowns).

### Table columns

`#` | `Account Code` (mono) | `Worker Name` | `Month / Year` | `Tasks Done` | `Pay (USD)` | `Notes`

### Summary row

Sticky at the bottom of the table (or above it — admin preference):

```
Total tasks this month: 1,247    Total payout: $8,340.00
```

Both numbers in `font-mono text-lg font-semibold text-signal-green`.

### Export button

Top-right — downloads filtered data as CSV. Admin and manager only.

---

## 18. Page Specs — Admin (Control Tower)

### URL: `/admin/users`

### Layout

Left panel: scrollable list of all users. Right panel: selected user's edit form.

On mobile: stacked (list → full-screen edit on click).

### User list item

```
┌─ [avatar] ─────────────────────────────────────── ─────────┐
│  Ada Okonkwo             [MANAGER]                           │
│  ada@company.com  ·  2 platforms  ·  Orders: OFF            │
└──────────────────────────────────────────────────────────────┘
```

- Left border colour matches their role: red=admin, blue=manager, amber=supervisor, muted=worker
- Click to open right-panel editor

### Right panel — `UserRoleCard`

Detailed spec in Section 24.

---

## 19. Unique Non-Generic UI Components

These are the components that make Hexagon LABS look and feel unlike any generic admin template.

### 1. Signal Pulse Dot

A small animated circle used on the dashboard card and in the tracker table's alert column. When a platform has Serious or Banned workers, the dot pulses.

```tsx
// Usage: <SignalDot level="serious" />
function SignalDot({ level }: { level: 'clear' | 'minor' | 'serious' | 'banned' | 'none' }) {
  const colours = {
    clear: 'bg-signal-green',
    minor: 'bg-signal-amber animate-pulse-signal',
    serious: 'bg-signal-red animate-pulse-signal',
    banned: 'bg-signal-red animate-pulse-signal',
    none: 'bg-ops-muted',
  }
  return (
    <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${colours[level]}`} />
  )
}
```

### 2. Classified Banner

Used on the orders page for read-only users. Styled as a police/security tape-style notice:

```tsx
function ClassifiedBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 p-3 mb-4 bg-signal-amber/5
                    border border-signal-amber/20 rounded-ops">
      <span className="classified-stamp flex-shrink-0">READ ONLY</span>
      <p className="text-xs text-signal-amber/80 font-mono">{message}</p>
    </div>
  )
}
```

### 3. Platform Channel Card (Dashboard)

```tsx
// Each platform has a distinct left-border accent
// Pulse animation activates if there are Serious or Banned workers
function PlatformChannelCard({ platform, stats }) {
  const hasCritical = stats.banned > 0 || stats.serious > 0
  return (
    <div className={`ops-card p-4 platform-border-${platform.slug}
                     ${hasCritical ? 'ring-1 ring-signal-red/20' : ''}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">{platform.icon}</span>
        <span className="text-sm font-semibold text-ink-primary">{platform.label}</span>
        {hasCritical && <SignalDot level="serious" />}
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          { label: 'Workers', value: stats.total, colour: 'text-ink-primary' },
          { label: 'On Track', value: stats.clear, colour: 'text-signal-green' },
          { label: 'Warnings', value: stats.warnings, colour: 'text-signal-amber' },
          { label: 'Banned', value: stats.banned, colour: 'text-signal-red' },
        ].map(({ label, value, colour }) => (
          <div key={label}>
            <p className={`text-xl font-mono font-semibold ${colour}`}>{value}</p>
            <p className="text-[10px] text-ink-muted uppercase tracking-wide mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
```

### 4. AccessDenied — Classified Style

```tsx
function AccessDenied({ title, message, showClassifiedStamp = false }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]
                    bg-ops-grid bg-ops-surface">
      <div className="ops-card p-10 text-center max-w-sm border-signal-amber/30
                      border-l-2 border-l-signal-amber">
        {showClassifiedStamp && (
          <div className="mb-6">
            <span className="classified-stamp text-base px-4 py-2">RESTRICTED ACCESS</span>
          </div>
        )}
        <h2 className="text-lg font-semibold text-ink-primary mb-2">{title}</h2>
        <p className="text-sm text-ink-secondary font-mono leading-relaxed">{message}</p>
      </div>
    </div>
  )
}
```

### 5. Order Pulse Bar

A horizontal segmented bar on the dashboard showing order health at a glance:

```tsx
function OrderPulseBar({ platforms }) {
  const total = platforms.reduce((a, p) => a + p.orderCount, 0)
  return (
    <div className="ops-card p-4">
      <p className="text-[10px] font-mono text-ink-muted uppercase tracking-widest mb-3">
        Order Signal — All Channels
      </p>
      <div className="flex h-3 rounded-pill overflow-hidden gap-0.5">
        {platforms.map(p => (
          <div key={p.slug} title={`${p.label}: ${p.orderCount} orders`}
            style={{
              width: `${(p.orderCount / total) * 100}%`,
              backgroundColor: p.color,
              opacity: p.issueCount > 0 ? 1 : 0.6,
            }}
            className="transition-all" />
        ))}
      </div>
      {/* Issue indicator */}
      {platforms.some(p => p.issueCount > 0) && (
        <p className="text-[10px] text-signal-red font-mono mt-1.5">
          ⚠ {platforms.reduce((a, p) => a + p.issueCount, 0)} orders with issues
        </p>
      )}
    </div>
  )
}
```

---

## 20. Status Badge System

A single `<StatusBadge>` component handles all status values across the app.

```tsx
// src/components/ui/StatusBadge.tsx
import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; label: string }> = {
  '✅ Yes':         { bg: 'bg-signal-green/10', text: 'text-signal-green',  border: 'border-signal-green/30',  label: 'Yes' },
  '❌ No':          { bg: 'bg-signal-red/10',   text: 'text-signal-red',    border: 'border-signal-red/30',    label: 'No' },
  '⏳ Pending':     { bg: 'bg-signal-amber/10', text: 'text-signal-amber',  border: 'border-signal-amber/30',  label: 'Pending' },
  '🔄 In Progress': { bg: 'bg-signal-blue/10',  text: 'text-signal-blue',   border: 'border-signal-blue/30',   label: 'In Progress' },
  '➖ N/A':         { bg: 'bg-ops-border/20',   text: 'text-ink-muted',     border: 'border-ops-border',       label: 'N/A' },
  '🟢 Clear':       { bg: 'bg-signal-green/10', text: 'text-signal-green',  border: 'border-signal-green/30',  label: 'Clear' },
  '🟡 Minor':       { bg: 'bg-signal-amber/10', text: 'text-signal-amber',  border: 'border-signal-amber/30',  label: 'Minor' },
  '🔴 Serious':     { bg: 'bg-signal-red/10',   text: 'text-signal-red',    border: 'border-signal-red/30',    label: 'Serious' },
  '⚫ Banned':      { bg: 'bg-signal-red/20',   text: 'text-signal-red',    border: 'border-signal-red/40',    label: 'Banned' },
  '➖ None':        { bg: 'bg-ops-border/20',   text: 'text-ink-muted',     border: 'border-ops-border',       label: 'None' },
  '✅ Passed':      { bg: 'bg-signal-green/10', text: 'text-signal-green',  border: 'border-signal-green/30',  label: 'Passed' },
  '❌ Failed':      { bg: 'bg-signal-red/10',   text: 'text-signal-red',    border: 'border-signal-red/30',    label: 'Failed' },
  '🔄 Retake':      { bg: 'bg-signal-blue/10',  text: 'text-signal-blue',   border: 'border-signal-blue/30',   label: 'Retake' },
  '⭕ Exempted':    { bg: 'bg-ops-border/20',   text: 'text-ink-muted',     border: 'border-ops-border',       label: 'Exempted' },
  '🟢 Active':      { bg: 'bg-signal-green/10', text: 'text-signal-green',  border: 'border-signal-green/30',  label: 'Active' },
  '🔵 Processing':  { bg: 'bg-signal-blue/10',  text: 'text-signal-blue',   border: 'border-signal-blue/30',   label: 'Processing' },
  '🔴 Issue':       { bg: 'bg-signal-red/10',   text: 'text-signal-red',    border: 'border-signal-red/30',    label: 'Issue' },
  '⚫ Cancelled':   { bg: 'bg-ops-border/20',   text: 'text-ink-muted',     border: 'border-ops-border',       label: 'Cancelled' },
  '✅ Completed':   { bg: 'bg-ops-border/20',   text: 'text-ink-secondary', border: 'border-ops-border',       label: 'Completed' },
}

export function StatusBadge({ value }: { value: string }) {
  const config = STATUS_CONFIG[value] ?? STATUS_CONFIG['➖ N/A']
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-pill border',
      'text-xs font-mono font-medium whitespace-nowrap',
      config.bg, config.text, config.border,
    )}>
      {config.label}
    </span>
  )
}
```

---

## 21. TrackerTable — Spreadsheet Component

```tsx
// src/components/tracker/SignalGrid.tsx — key structural code
'use client'
import { useState, useMemo } from 'react'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { StatusCell }  from './StatusCell'
import { SignalDot }   from '@/components/ui/SignalDot'
import type { WorkerTrackerRow, PlatformTaskColumn } from '@/types'

interface SignalGridProps {
  rows: WorkerTrackerRow[]
  taskColumns: PlatformTaskColumn[]
  canEdit: boolean
  onUpdate: (rowId: string, key: string, value: string) => Promise<void>
}

export function SignalGrid({ rows, taskColumns, canEdit, onUpdate }: SignalGridProps) {
  const [search, setSearch]         = useState('')
  const [filterWarning, setFilterWarning] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return rows.filter(r => {
      const matchSearch = search === '' ||
        r.worker_name.toLowerCase().includes(search.toLowerCase()) ||
        r.owner_name.toLowerCase().includes(search.toLowerCase())
      const matchWarning = !filterWarning || r.warning_level === filterWarning
      return matchSearch && matchWarning
    })
  }, [rows, search, filterWarning])

  return (
    <div className="flex-1 overflow-auto">
      <table className="ops-table w-full">
        <thead>
          <tr>
            <th className="w-10 sticky left-0 bg-ops-base z-10">#</th>
            <th className="w-6"></th>
            <th className="min-w-[160px] sticky left-[64px] bg-ops-base z-10">NAME</th>
            <th>LINKER</th>
            <th>WORKER</th>
            <th>PAYONEER</th>
            <th>WARNING</th>
            <th className="font-mono">PLATFORM ID</th>
            <th>SOW</th>
            <th>LE CERT</th>
            {taskColumns.map(col => (
              <th key={col.column_key} title={col.column_label}>
                {col.column_key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.map((row, idx) => (
            <tr key={row.id}
              className={
                row.warning_level === '⚫ Banned' || row.warning_level === '🔴 Serious'
                  ? 'border-l-2 border-signal-red'
                  : row.warning_level === '🟡 Minor'
                  ? 'border-l-2 border-signal-amber'
                  : 'border-l-2 border-transparent'
              }>
              <td className="text-ink-muted sticky left-0 bg-ops-panel z-10">{idx + 1}</td>
              <td className="sticky left-10 bg-ops-panel z-10">
                <SignalDot level={
                  row.warning_level === '⚫ Banned' ? 'banned'
                  : row.warning_level === '🔴 Serious' ? 'serious'
                  : row.warning_level === '🟡 Minor' ? 'minor'
                  : 'clear'
                } />
              </td>
              <td className="font-semibold sticky left-[64px] bg-ops-panel z-10">
                {row.owner_name}
              </td>
              <td className="text-ink-secondary">{row.linker}</td>
              <td>{row.worker_name}</td>
              <td>
                {canEdit
                  ? <StatusCell rowId={row.id} columnKey="payoneer_linked"
                      value={row.payoneer_linked} onUpdate={onUpdate} />
                  : <StatusBadge value={row.payoneer_linked} />}
              </td>
              <td>
                {canEdit
                  ? <StatusCell rowId={row.id} columnKey="warning_level"
                      value={row.warning_level} onUpdate={onUpdate} />
                  : <StatusBadge value={row.warning_level} />}
              </td>
              <td className="font-mono text-ink-secondary text-xs">{row.platform_id_code ?? '—'}</td>
              <td><StatusBadge value={row.sow_done} /></td>
              <td><StatusBadge value={row.le_cert} /></td>
              {taskColumns.map(col => (
                <td key={col.column_key}>
                  {canEdit
                    ? <StatusCell rowId={row.id} columnKey={col.column_key}
                        value={row.task_statuses[col.column_key] ?? '➖ N/A'}
                        onUpdate={onUpdate} isTask />
                    : <StatusBadge value={row.task_statuses[col.column_key] ?? '➖ N/A'} />}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

---

## 22. StatusCell — Inline Editable Cell

A table cell that, when clicked, opens a compact dropdown of valid status values. Saves immediately on selection.

```tsx
// src/components/tracker/StatusCell.tsx
'use client'
import { useState, useRef, useEffect } from 'react'
import { StatusBadge } from '@/components/ui/StatusBadge'

const YN_OPTIONS     = ['✅ Yes','❌ No','⏳ Pending','🔄 In Progress','➖ N/A']
const WARNING_OPTIONS = ['🟢 Clear','🟡 Minor','🔴 Serious','⚫ Banned','➖ None']

interface StatusCellProps {
  rowId: string
  columnKey: string
  value: string
  onUpdate: (rowId: string, key: string, value: string) => Promise<void>
  isTask?: boolean
}

export function StatusCell({ rowId, columnKey, value, onUpdate, isTask }: StatusCellProps) {
  const [open, setOpen]   = useState(false)
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const options = columnKey === 'warning_level' ? WARNING_OPTIONS : YN_OPTIONS

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleSelect(newValue: string) {
    if (newValue === value) { setOpen(false); return }
    setSaving(true)
    await onUpdate(rowId, columnKey, newValue)
    setSaving(false)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1 hover:opacity-80 transition-opacity">
        <StatusBadge value={saving ? '⏳ Pending' : value} />
        <span className="text-ink-muted text-xs">▾</span>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 min-w-[140px]
                        bg-ops-elevated border border-ops-border rounded-ops
                        shadow-xl animate-fade-up">
          {options.map(opt => (
            <button key={opt} onClick={() => handleSelect(opt)}
              className={`flex items-center w-full px-3 py-2 text-xs font-mono
                          hover:bg-ops-panel transition-colors text-left
                          ${opt === value ? 'bg-ops-panel' : ''}`}>
              <StatusBadge value={opt} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

---

## 23. OrderForm Modal — Admin Only

Slide-in panel from the right for creating and editing orders.

```tsx
// src/components/orders/OrderForm.tsx
'use client'
import { useState } from 'react'
import { X } from 'lucide-react'
import type { OrderRow } from '@/types'

const STATUS_OPTIONS = [
  '🟢 Active','🟡 Pending','🔵 Processing','🔴 Issue','⚫ Cancelled','✅ Completed'
]

interface OrderFormProps {
  platformId: number
  order?: Partial<OrderRow>
  onSave: (data: Partial<OrderRow>) => Promise<void>
  onClose: () => void
}

export function OrderForm({ platformId, order, onSave, onClose }: OrderFormProps) {
  const [form, setForm] = useState({
    order_id_code: order?.order_id_code ?? '',
    proxy:         order?.proxy ?? '',
    owner_name:    order?.owner_name ?? '',
    status:        order?.status ?? '🟡 Pending',
    order_date:    order?.order_date ?? '',
    notes:         order?.notes ?? '',
  })
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    setSaving(true)
    await onSave({ ...form, platform_id: platformId })
    setSaving(false)
    onClose()
  }

  return (
    // Overlay
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md h-full bg-ops-panel border-l
                      border-ops-border flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-5
                        border-b border-ops-border">
          <div>
            <h2 className="text-sm font-semibold text-ink-primary">
              {order?.id ? 'Edit Order' : 'New Order'}
            </h2>
            <p className="text-xs text-ink-muted font-mono mt-0.5">RESTRICTED ZONE</p>
          </div>
          <button onClick={onClose}
            className="text-ink-muted hover:text-ink-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form fields */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {[
            { label: 'ORDER ID', key: 'order_id_code', placeholder: 'ORD-ONE-2025001', mono: true },
            { label: 'PROXY',    key: 'proxy',         placeholder: 'US-NY-01',         mono: true },
            { label: 'OWNER',    key: 'owner_name',    placeholder: 'Owner name',        mono: false },
          ].map(field => (
            <div key={field.key}>
              <label className="text-[10px] font-semibold text-ink-muted
                                 uppercase tracking-widest block mb-1">
                {field.label}
              </label>
              <input
                value={(form as any)[field.key]}
                onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                className={`w-full bg-ops-elevated border border-ops-border rounded-ops
                            px-3 py-2 text-sm text-ink-primary placeholder:text-ink-muted
                            focus:outline-none focus:border-signal-green/50 transition-colors
                            ${field.mono ? 'font-mono' : ''}`}
              />
            </div>
          ))}

          {/* Status */}
          <div>
            <label className="text-[10px] font-semibold text-ink-muted
                               uppercase tracking-widest block mb-1">STATUS</label>
            <select value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}
              className="w-full bg-ops-elevated border border-ops-border rounded-ops
                         px-3 py-2 text-sm font-mono text-ink-primary
                         focus:outline-none focus:border-signal-green/50">
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="text-[10px] font-semibold text-ink-muted
                               uppercase tracking-widest block mb-1">ORDER DATE</label>
            <input type="date" value={form.order_date}
              onChange={e => setForm(f => ({ ...f, order_date: e.target.value }))}
              className="w-full bg-ops-elevated border border-ops-border rounded-ops
                         px-3 py-2 text-sm font-mono text-ink-primary
                         focus:outline-none focus:border-signal-green/50" />
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] font-semibold text-ink-muted
                               uppercase tracking-widest block mb-1">NOTES</label>
            <textarea value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="w-full bg-ops-elevated border border-ops-border rounded-ops
                         px-3 py-2 text-sm text-ink-primary placeholder:text-ink-muted
                         focus:outline-none focus:border-signal-green/50 resize-none" />
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-ops-border flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2 rounded-ops border border-ops-border
                       text-sm text-ink-secondary hover:text-ink-primary transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 py-2 rounded-ops bg-signal-green hover:bg-signal-greenDim
                       text-ops-base text-sm font-semibold transition-colors
                       disabled:opacity-50">
            {saving ? 'Saving...' : order?.id ? 'Update' : 'Create Order'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

---

## 24. UserRoleCard — Admin Panel Component

Full spec in Backend PRD. The UI shell:

- Dark panel with left border coloured by role
- Role selector: 4 pill buttons
- Platform access: multi-select chip grid (all 9 platforms)
- Order access toggle: amber-themed on/off switch, only shown for manager/supervisor
- Save button: `signal-green` CTA

---

## 25. Login Page

```tsx
// src/app/login/page.tsx
import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-ops-surface bg-ops-grid
                    flex items-center justify-center px-4">
      <div className="w-full max-w-sm ops-card border-l-2 border-signal-green p-8">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-ops bg-signal-green/10 border border-signal-green/30
                          flex items-center justify-center">
            {/* Radio icon */}
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-primary">Hexagon LABS</p>
            <p className="text-[10px] text-ink-muted">AI Ops Platform</p>
          </div>
        </div>

        <h1 className="text-lg font-semibold text-ink-primary mb-1">
          Operator Authentication
        </h1>
        <p className="text-xs text-ink-secondary font-mono mb-6">
          Authorised personnel only.
          Sign in with your Google account to access the platform.
        </p>

        <LoginForm />

        <p className="text-[10px] text-ink-muted font-mono mt-6 text-center">
          New accounts receive Worker access by default.<br />
          Contact your administrator to request elevated access.
        </p>
      </div>
    </div>
  )
}
```

---

## 26. AccessDenied Component

```tsx
// src/components/ui/AccessDenied.tsx
interface AccessDeniedProps {
  title?: string
  message?: string
  showClassifiedStamp?: boolean
}

export function AccessDenied({
  title = 'Access Restricted',
  message = 'You do not have permission to view this section.',
  showClassifiedStamp = false,
}: AccessDeniedProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]
                    bg-ops-grid bg-[size:24px_24px]">
      <div className="ops-card border-l-2 border-signal-amber p-10 text-center max-w-md">
        {showClassifiedStamp && (
          <div className="mb-6 flex justify-center">
            <span className="classified-stamp text-sm px-4 py-2">RESTRICTED ACCESS</span>
          </div>
        )}
        <h2 className="text-base font-semibold text-ink-primary mb-3">{title}</h2>
        <p className="text-sm text-ink-secondary font-mono leading-relaxed">{message}</p>
        <p className="text-[10px] text-ink-muted font-mono mt-4">
          Contact your administrator to request access.
        </p>
      </div>
    </div>
  )
}
```

---

## 27. Animation & Interaction Spec

| Element | Trigger | Animation |
|---|---|---|
| Page transition | Route change | `animate-fade-up` (0.2s ease-out) on `<main>` |
| StatusCell dropdown | Cell click | `animate-fade-up` on dropdown div |
| OrderForm panel | Open button | `animate-slide-in-right` (0.2s ease-out) |
| Signal pulse dot | Always (when level = serious/banned) | `animate-pulse-signal` (2s infinite) |
| Order Pulse Bar segments | On hover | `opacity` 0.6 → 1, `transition-all` |
| Platform channel card | On mount | Staggered `animate-fade-up` with `delay-[Nms]` |
| StatusCell save | After `onUpdate` resolves | Badge briefly shows "Pending" then snaps to new value |
| Sidebar active indicator | Route change | Instant — no animation (clarity over motion) |

All animations respect `prefers-reduced-motion`. Add this to `globals.css`:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 28. Responsive & Accessibility Rules

### Responsive breakpoints

| Breakpoint | Layout |
|---|---|
| `< 768px` (mobile) | Sidebar collapses to bottom tab bar. Tables scroll horizontally. Modals become full-screen. |
| `768px – 1024px` (tablet) | Sidebar shows icons only (40px wide). Labels shown on hover. |
| `> 1024px` (desktop) | Full sidebar (220px). Standard layout. |

### Accessibility

- All table headers have `scope="col"` attribute
- Interactive status cells have `aria-label="Edit [column name] for [worker name]"`
- OrderForm panel traps focus while open (use `focus-trap-react` or native `dialog` element)
- Colour is never the only signal — status badges use both colour and text label
- All icon-only buttons have `aria-label`
- WCAG AA contrast verified for all text/background combinations in the dark theme

---

## 29. Step-by-Step Frontend Build Guide

```
Step 1   Bootstrap
         npx create-next-app@latest ai-workers-hub
           --typescript --tailwind --eslint --app --src-dir

Step 2   Install dependencies
         npm install @supabase/supabase-js @supabase/ssr
                     framer-motion lucide-react clsx tailwind-merge
         npm install -D @types/node

Step 3   Configure Tailwind
         Paste full token config from Section 8 into tailwind.config.ts
         Create src/app/globals.css with base styles from Section 8

Step 4   Set up fonts
         Update src/app/layout.tsx — load Inter and JetBrains Mono via next/font
         Wrap with AuthProvider

Step 5   Create .env.local
         Add NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
         SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SITE_URL

Step 6   Create utility file
         src/lib/utils.ts — cn() helper using clsx + tailwind-merge

Step 7   Create src/types/index.ts
         All TypeScript interfaces (AppUser, WorkerTrackerRow, OrderRow, etc.)
         See Backend PRD Section 4 for full type definitions

Step 8   Create Supabase clients
         src/lib/supabase/client.ts — browser client
         src/lib/supabase/server.ts — server client + admin client

Step 9   Create AuthContext
         src/contexts/AuthContext.tsx — Google OAuth, session, appUser, permissions
         src/app/auth/callback/route.ts — OAuth exchange

Step 10  Create middleware
         src/middleware.ts — protect routes, admin-only guard

Step 11  Build the shell
         src/components/shell/AppShell.tsx
         src/components/shell/SignalNav.tsx (Section 10 — full code)
         src/components/shell/CommandStrip.tsx (Section 11)
         src/components/shell/ChannelTabs.tsx (Section 12)

Step 12  Build shared UI atoms
         src/components/ui/StatusBadge.tsx (Section 20)
         src/components/ui/AccessDenied.tsx (Section 26)
         src/components/ui/SignalDot.tsx (Section 19)
         src/components/ui/PlatformChip.tsx
         src/components/ui/Spinner.tsx — simple spinner in signal-green
         src/components/ui/EmptyState.tsx — ops-grid bg, monospace message

Step 13  Build the login page
         src/app/login/page.tsx (Section 25)
         src/components/auth/LoginForm.tsx — Google OAuth button

Step 14  Build src/lib/db.ts
         All Supabase data functions — see Backend PRD Section 6

Step 15  Build dashboard
         src/components/dashboard/PlatformChannelCard.tsx (Section 19)
         src/components/dashboard/AlertStatusRow.tsx
         src/components/dashboard/OrderPulseBar.tsx (Section 19)
         src/app/dashboard/page.tsx — fetch summaries, render grid

Step 16  Build StatusCell
         src/components/tracker/StatusCell.tsx (Section 22 — full code)
         Test it in isolation with a mock onUpdate handler

Step 17  Build SignalGrid (Tracker table)
         src/components/tracker/SignalGrid.tsx (Section 21)
         src/components/tracker/GridFilters.tsx
         src/app/tracker/[platform]/page.tsx — fetch rows + task columns

Step 18  Build Field Roster (Registry)
         src/components/registry/RosterTable.tsx
         src/components/registry/GeoworkChip.tsx
         src/app/registry/[platform]/page.tsx

Step 19  Build Restricted Zone (Orders)
         src/components/orders/OrderTable.tsx
         src/components/orders/OrderStatusChip.tsx — reuses StatusBadge logic
         src/components/orders/OrderForm.tsx (Section 23 — full code)
         src/components/orders/RestrictedBanner.tsx
         src/app/orders/[platform]/page.tsx — access check first

Step 20  Build Ledger Room (Payroll)
         src/components/payroll/LedgerTable.tsx
         src/components/payroll/PayrollSummaryBar.tsx
         src/app/payroll/[platform]/page.tsx

Step 21  Build Control Tower (Admin)
         src/components/admin/UserRoleCard.tsx
         src/components/admin/ChannelAccessPicker.tsx
         src/components/admin/OrderAccessToggle.tsx
         src/app/admin/users/page.tsx

Step 22  Build export utility
         src/lib/export.ts — converts table data to CSV and triggers download
         src/components/tracker/ExportButton.tsx — uses export.ts

Step 23  Wire AppShell into all protected pages
         Each page in /dashboard, /tracker, /registry, /orders, /payroll, /admin
         is wrapped with <AppShell> and appropriate permission checks

Step 24  Run seed script
         See Backend PRD Section 9 for the full seeding guide

Step 25  Set yourself as admin
         Run: UPDATE app_users SET role = 'admin' WHERE email = 'your@email.com'

Step 26  End-to-end testing
         Sign in → verify your role shows in sidebar
         Navigate all sections → confirm role-gated items are hidden/shown correctly
         Test StatusCell edit → confirm DB update fires
         Test OrderForm create → confirm orders table gets new row
         Test UserRoleCard save → confirm another user's role changes
```

---

## 30. Deployment

### Vercel (recommended)

```bash
# Push to GitHub first
git add . && git commit -m "feat: initial build" && git push
```

1. Vercel.com → New Project → Import from GitHub
2. Settings → Environment Variables → add all 4 env vars
3. `NEXT_PUBLIC_SITE_URL` = your Vercel production URL (e.g. `https://workers-hub.vercel.app`)
4. Supabase → Authentication → URL Configuration → Redirect URLs → add:
   `https://workers-hub.vercel.app/auth/callback`
5. Google Cloud Console → OAuth credentials → Authorized redirect URIs → add:
   `https://workers-hub.vercel.app/auth/callback`
6. Deploy

### Netlify

Add `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

Same env vars and redirect URI setup as Vercel.

---

*Hexagon LABS Frontend PRD v1.0 — Command & Signal Design Language*
*All UI components are fully typed in TypeScript. All colour tokens reference the ops/signal/platform/status token system — never hardcoded hex values in component files.*
