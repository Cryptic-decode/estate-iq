import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Middleware: Cookie refresh only
 *
 * This middleware ONLY refreshes Supabase auth cookies to ensure Server Components
 * and Server Actions see the latest session. It does NOT handle auth checks or redirects.
 *
 * Auth protection and redirects are handled by Server Components (e.g., app/app/layout.tsx)
 * to avoid race conditions and "bounce" issues.
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Update the request headers so downstream Server Components see refreshed cookies
          const cookieMap = new Map(request.cookies.getAll().map((c) => [c.name, c.value]))
          cookiesToSet.forEach(({ name, value }) => {
            cookieMap.set(name, value)
          })

          const newHeaders = new Headers(request.headers)
          newHeaders.set(
            'cookie',
            Array.from(cookieMap.entries())
              .map(([name, value]) => `${name}=${value}`)
              .join('; ')
          )

          supabaseResponse = NextResponse.next({
            request: {
              headers: newHeaders,
            },
          })

          // Set cookies on the response
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Call getUser() to trigger cookie refresh if needed
  // We don't use the result - Server Components handle auth checks
  await supabase.auth.getUser()

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

