import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req: request, res })

  // Refresh the session
  const { data: { session } } = await supabase.auth.getSession()

  // URLS that don't require authentication
  const publicUrls = ['/', '/login', '/signup', '/auth/callback']
  const isPublicUrl = publicUrls.includes(request.nextUrl.pathname)

  if (!session && !isPublicUrl) {
    // Redirect to login if accessing protected route without session
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('from', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  if (session && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
    // Redirect to dashboard if accessing auth pages with session
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}