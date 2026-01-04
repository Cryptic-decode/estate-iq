import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/app'

  // If there is no code, just bounce to signin.
  if (!code) {
    const redirectUrl = new URL('/signin', request.url)
    redirectUrl.searchParams.set('error', 'missing_code')
    return NextResponse.redirect(redirectUrl)
  }

  let response = NextResponse.redirect(new URL(next, request.url))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Attach Supabase auth cookies to the redirect response
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    const redirectUrl = new URL('/signin', request.url)
    redirectUrl.searchParams.set('error', 'auth_callback_failed')
    return NextResponse.redirect(redirectUrl)
  }

  return response
}


