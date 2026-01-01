import type { NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"

const serverClients = new Map()

function getServerClient(request: NextRequest) {
  const key = request.url
  if (!serverClients.has(key)) {
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
          },
        },
      },
    )
    serverClients.set(key, supabase)
  }
  return serverClients.get(key)
}

export async function proxy(request: NextRequest) {
  const supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = getServerClient(request)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (request.nextUrl.pathname.startsWith("/protected") && !user) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
