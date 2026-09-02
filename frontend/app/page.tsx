import Link from 'next/link'
import { ArrowRight, Shield, BarChart3, Users, Zap, Globe, Lock } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* ── Hero Section ─────────────────────────────── */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background image with overlay */}
        <div className="absolute inset-0">
          <img
            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRBeSjN8T9iP5IErhaJlOz6vc1EdxHL1N5JVdV2GPQRc1raGDLPVEe4m2g&s"
            alt="Hexagon LABS Background"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-black/50" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40" />
        </div>

        {/* Nav */}
        <nav className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-5 lg:px-12">
          <div className="flex items-center gap-3">
            <img src="/logo-full.png" alt="TheHexagon Labs" className="h-8 w-auto" />
          </div>
          <Link
            href="/login"
            className="rounded-lg border border-white/20 bg-white/5 backdrop-blur-md px-5 py-2 text-sm font-medium hover:bg-white/15 transition-all duration-300"
          >
            Sign In
          </Link>
        </nav>

        {/* Hero content */}
        <div className="relative z-10 mx-auto max-w-7xl px-6 py-32 lg:px-12">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 backdrop-blur-md px-4 py-1.5 text-xs font-medium text-gray-300">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              Trusted by AI annotation teams worldwide
            </div>

            <h1 className="text-5xl font-extrabold leading-tight tracking-tight lg:text-7xl">
              Command Centre for{' '}
              <span className="bg-gradient-to-r from-white via-gray-300 to-gray-500 bg-clip-text text-transparent">
                AI Workers
              </span>
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-gray-400 max-w-xl">
              Manage hundreds of data annotators across 9 platforms from one place.
              Real-time tracking, role-based access control, automated alerts, and
              full audit trails — replacing spreadsheets forever.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/login"
                className="group flex items-center gap-2 rounded-lg bg-white px-7 py-3.5 text-sm font-semibold text-black shadow-lg shadow-white/10 hover:shadow-white/25 hover:bg-gray-100 transition-all duration-300"
              >
                Get Started
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href="#features"
                className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 backdrop-blur-md px-7 py-3.5 text-sm font-medium hover:bg-white/10 transition-all duration-300"
              >
                Explore Features
              </a>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-3 gap-8">
              <div>
                <p className="text-4xl font-bold text-white">9</p>
                <p className="mt-1 text-sm text-gray-500">AI Platforms</p>
              </div>
              <div>
                <p className="text-4xl font-bold text-white">4</p>
                <p className="mt-1 text-sm text-gray-500">Role Tiers</p>
              </div>
              <div>
                <p className="text-4xl font-bold text-white">100%</p>
                <p className="mt-1 text-sm text-gray-500">RLS Protected</p>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
          <div className="h-8 w-5 rounded-full border-2 border-white/30 flex items-start justify-center p-1">
            <div className="h-1.5 w-1 rounded-full bg-white/60 animate-pulse" />
          </div>
        </div>
      </section>

      {/* ── Features Section ─────────────────────────────── */}
      <section id="features" className="relative py-28 px-6 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-20">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 mb-4">
              Platform Capabilities
            </p>
            <h2 className="text-3xl font-bold lg:text-5xl">
              Everything you need to manage{' '}
              <span className="text-gray-400">AI operations</span>
            </h2>
            <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
              Built for teams who manage large-scale annotation workforces across multiple platforms.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: <BarChart3 className="h-6 w-6" />,
                title: 'Signal Grid',
                desc: 'Live worker tracker with dynamic JSONB task columns that adapt per platform. Track status, warnings, and progress at a glance.',
              },
              {
                icon: <Users className="h-6 w-6" />,
                title: 'Field Roster',
                desc: 'Complete worker registry with geo-work test tracking, account types, and platform assignments.',
              },
              {
                icon: <Shield className="h-6 w-6" />,
                title: 'Role-Based Access',
                desc: '4-tier role system — Admin, Manager, Supervisor, Worker — with row-level security enforced at the database.',
              },
              {
                icon: <Globe className="h-6 w-6" />,
                title: '9 Platforms',
                desc: 'Oneforma, Telus, Data Annotation, Outlier, Mercor AI, Remotasks, Appen, Clickworker, and Scale AI — all in one dashboard.',
              },
              {
                icon: <Lock className="h-6 w-6" />,
                title: 'Audit Trails',
                desc: 'Every task status change is logged with user and timestamp. Full history for compliance and accountability.',
              },
              {
                icon: <Zap className="h-6 w-6" />,
                title: 'Automated Alerts',
                desc: 'Slack notifications on warning escalations and daily platform summaries via Edge Functions.',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-7 hover:border-white/[0.15] hover:bg-white/[0.04] transition-all duration-500"
              >
                <div className="mb-5 inline-flex rounded-xl bg-white p-3 shadow-lg shadow-white/5">
                  <span className="text-black">{feature.icon}</span>
                </div>
                <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-gray-500">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Platforms Section ────────────────────────────── */}
      <section className="py-20 px-6 lg:px-12 border-t border-white/[0.04]">
        <div className="mx-auto max-w-7xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 mb-4">
            Integrations
          </p>
          <h2 className="text-2xl font-bold lg:text-3xl mb-14">
            Supported Platforms
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {[
              { name: 'Oneforma', icon: '🟣' },
              { name: 'Telus', icon: '🔵' },
              { name: 'Data Annotation', icon: '🟢' },
              { name: 'Outlier', icon: '🟠' },
              { name: 'Mercor AI', icon: '🩷' },
              { name: 'Remotasks', icon: '🟡' },
              { name: 'Appen', icon: '🔷' },
              { name: 'Clickworker', icon: '🔶' },
              { name: 'Scale AI', icon: '⚫' },
            ].map((p) => (
              <div
                key={p.name}
                className="flex items-center gap-2.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-5 py-2.5 text-sm font-medium hover:border-white/[0.15] hover:bg-white/[0.06] transition-all duration-300"
              >
                <span className="text-lg">{p.icon}</span>
                <span className="text-gray-300">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ──────────────────────────────────── */}
      <section className="py-28 px-6 lg:px-12">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold lg:text-5xl">
            Ready to take control?
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            Stop managing AI workers through spreadsheets. Get started with Hexagon LABS today.
          </p>
          <div className="mt-10">
            <Link
              href="/login"
              className="group inline-flex items-center gap-2 rounded-lg bg-white px-8 py-4 text-base font-semibold text-black shadow-lg shadow-white/10 hover:shadow-white/25 hover:bg-gray-100 transition-all duration-300"
            >
              Sign In with Google
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="border-t border-white/[0.04] py-8 px-6 lg:px-12">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo-full.png" alt="TheHexagon Labs" className="h-6 w-auto opacity-80" />
          </div>
          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} The Hexagon LABS. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
