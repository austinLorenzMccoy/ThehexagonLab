import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SLACK_WEBHOOK_URL    = Deno.env.get('SLACK_WEBHOOK_URL')

serve(async (_req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const { data: stats, error } = await supabase
      .from('platform_stats').select('*').order('total_workers', { ascending: false })

    if (error || !stats) {
      return new Response(JSON.stringify({ error: error?.message ?? 'No data' }), { status: 500 })
    }

    const today = new Date().toLocaleDateString('en-GB', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })

    let summary = `📊 *Hexagon LABS Daily Summary — ${today}*\n\n`

    for (const p of stats) {
      const hasIssues = p.banned_count > 0 || p.serious_count > 0 || p.issue_orders > 0
      summary += `${hasIssues ? '🔴' : '🟢'} *${p.icon} ${p.platform_label}*\n`
      summary += `  Workers: ${p.total_workers} · Clear: ${p.clear_count} · `
      summary += `Warnings: ${p.minor_count + p.serious_count} · Banned: ${p.banned_count}\n`
      if (p.total_orders > 0) summary += `  Orders: ${p.total_orders} · Issues: ${p.issue_orders}\n`
      summary += '\n'
    }

    const totBanned  = stats.reduce((a, p) => a + p.banned_count, 0)
    const totIssues  = stats.reduce((a, p) => a + p.issue_orders, 0)
    const totWorkers = stats.reduce((a, p) => a + p.total_workers, 0)
    summary += `*Totals:* ${totWorkers} workers · ${totBanned} banned · ${totIssues} order issues`

    console.log(summary)

    if (SLACK_WEBHOOK_URL) {
      await fetch(SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: summary }),
      })
    }

    return new Response(JSON.stringify({ success: true, platforms: stats.length }), {
      headers: { 'Content-Type': 'application/json' }, status: 200,
    })
  } catch (error) {
    console.error('daily-summary error:', error)
    return new Response(JSON.stringify({ error: String(error) }), {
      headers: { 'Content-Type': 'application/json' }, status: 500,
    })
  }
})
