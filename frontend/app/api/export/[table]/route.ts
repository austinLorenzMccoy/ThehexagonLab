import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/export/[table]?platform=[slug] — Download a table as CSV (admin & manager only)
export async function GET(
  request: NextRequest,
  { params }: { params: { table: string } }
) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const { data: appUser } = await supabase
    .from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || !['admin', 'manager'].includes((appUser as any).role)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const platform = searchParams.get('platform')
  const { table } = params

  const ALLOWED = ['worker_tracker', 'workers_registry', 'payroll']
  if (!ALLOWED.includes(table)) {
    return NextResponse.json({ error: 'Invalid table' }, { status: 400 })
  }

  let query
  if (platform) {
    query = supabase
      .from(table as 'worker_tracker' | 'workers_registry' | 'payroll')
      .select('*, platforms!inner(slug)')
      .eq('platforms.slug', platform) as any
  } else {
    query = supabase.from(table as any).select('*')
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!data?.length) {
    return new NextResponse('', {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${table}.csv"`,
      },
    })
  }

  const headers = Object.keys(data[0]).filter(k => k !== 'platforms')
  const csvRows = [
    headers.join(','),
    ...data.map((row: any) =>
      headers.map(h => {
        const val = row[h]
        if (val == null) return ''
        if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`
        return `"${String(val).replace(/"/g, '""')}"`
      }).join(',')
    ),
  ]

  return new NextResponse(csvRows.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${table}_${platform ?? 'all'}.csv"`,
    },
  })
}
