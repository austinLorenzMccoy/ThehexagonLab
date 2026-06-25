import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED     = ['/dashboard','/tracker','/registry','/orders','/payroll','/admin']
const ADMIN_ONLY    = ['/admin']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  if (!user && PROTECTED.some(p => pathname.startsWith(p))) {
    const url = new URL('/', request.url) // Note: LoginPage is at root '/' in this project, not '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  if (user && ADMIN_ONLY.some(p => pathname.startsWith(p))) {
    const { data: appUser } = await supabase
      .from('app_users').select('role').eq('id', user.id).single()
    if (!appUser || appUser.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard?error=access_denied', request.url))
    }
  }

  if (user && pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
