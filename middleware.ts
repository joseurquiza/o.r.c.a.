import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const PUBLIC_PATH_PREFIXES = [
  "/auth",
  "/store",
  "/api/auth",
  "/api/extension/download",
  "/api/cron",
  "/api/remote-agents", // remote-agents endpoints authenticate via per-agent secret, not session
  "/api/gmail/callback",
  "/_next",
  "/favicon",
  "/public",
]

function isPublic(pathname: string): boolean {
  if (pathname === "/auth/login" || pathname === "/auth/logout" || pathname === "/auth/callback") return true
  return PUBLIC_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname === p)
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always create the response first so we can pass cookies through.
  let response = NextResponse.next({ request: { headers: request.headers } })

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
          response = NextResponse.next({ request: { headers: request.headers } })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )

  // IMPORTANT: this call refreshes the session cookie if needed.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !isPublic(pathname)) {
    const loginUrl = new URL("/auth/login", request.url)
    loginUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
}
