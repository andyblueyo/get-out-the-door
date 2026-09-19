import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // With Fluid compute, never hoist this client into a module-level variable.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options))
          // Cache headers: responses that set auth cookies must not be CDN-cached,
          // or one user's session can be served to another.
          Object.entries(headers).forEach(([k, v]) =>
            supabaseResponse.headers.set(k, v))
        },
      },
    }
  )

  // Do NOT put code between createServerClient and getClaims().
  // Removing getClaims() causes users to be randomly logged out.
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims

  // '/' is public: app/page.tsx shows the landing page when signed out.
  if (!user &&
      request.nextUrl.pathname !== '/' &&
      !request.nextUrl.pathname.startsWith('/login') &&
      !request.nextUrl.pathname.startsWith('/signup') &&
      !request.nextUrl.pathname.startsWith('/auth')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Return supabaseResponse as-is. If you build a new response, pass { request }
  // and copy the cookies across, or sessions will break.
  return supabaseResponse
}
