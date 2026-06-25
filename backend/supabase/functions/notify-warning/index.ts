import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SLACK_WEBHOOK_URL    = Deno.env.get('SLACK_WEBHOOK_URL')

serve(async (req) => {
  try {
    const { tracker_row_id, worker_name, owner_name, warning_level, platform_id } =
      await req.json()

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const { data: platform } = await supabase
      .from('platforms').select('label, icon').eq('id', platform_id).single()

    const platformLabel = platform ? `${platform.icon} ${platform.label}` : 'Unknown'
    const isBanned  = warning_level === '⚫ Banned'
    const severity  = isBanned ? 'BANNED' : 'SERIOUS WARNING'
    const emoji     = isBanned ? '🚨' : '⚠️'

    const message =
      `${emoji} *${severity}* — ${platformLabel}\n` +
      `Worker: *${worker_name}*\n` +
      `Owner: ${owner_name}\n` +
      `Status: ${warning_level}\n` +
      `Tracker ID: \`${tracker_row_id}\``

    console.log(`[Warning Escalation] ${message}`)

    if (SLACK_WEBHOOK_URL) {
      await fetch(SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message }),
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }, status: 200,
    })
  } catch (error) {
    console.error('notify-warning error:', error)
    return new Response(JSON.stringify({ error: String(error) }), {
      headers: { 'Content-Type': 'application/json' }, status: 500,
    })
  }
})
