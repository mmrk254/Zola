import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SESSION_COOKIE_OPTIONS, safeNextPath } from "@/lib/supabase/session-options";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const path = request.nextUrl.pathname;
  const entryPage = ["/", "/login", "/workspace", "/workspace/login"].includes(path);
  const isApi = path.startsWith("/api/");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  // Redirects must carry token rotations and cookie removals back to the device too.
  const finish = (result = response) => {
    if (result !== response) response.cookies.getAll().forEach(cookie => result.cookies.set(cookie));
    result.headers.set("Cache-Control", "private, no-store, max-age=0");
    return result;
  };
  const unavailable = () => finish(isApi
    ? NextResponse.json({ error: "Connection unavailable. Please retry." }, { status: 503, headers: { "Retry-After": "5" } })
    : new NextResponse('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="5"><title>Reconnecting to Zola</title></head><body style="font:16px system-ui;max-width:440px;margin:15vh auto;padding:24px"><h1>Reconnecting to Zola</h1><p>We could not verify your session right now. This page will retry automatically.</p><p>You do not need to sign in again for a temporary connection problem.</p><button onclick="location.reload()">Try again</button></body></html>', { status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Retry-After": "5" } }));
  if (!url || !/^https?:\/\//.test(url) || !key) return entryPage ? finish() : unavailable();

  const supabase = createServerClient(url, key, {
    cookieOptions: SESSION_COOKIE_OPTIONS,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        // Rebuild after mutating request cookies so downstream server code sees the refreshed session.
        const previous = response.cookies.getAll();
        response = NextResponse.next({ request });
        previous.forEach(cookie => response.cookies.set(cookie));
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  let user;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error && (error.name === "AuthRetryableFetchError" || error.status === 429 || (error.status ?? 0) >= 500)) return unavailable();
    user = data.user;
  } catch {
    return unavailable();
  }
  if (user && entryPage) {
    const destination = safeNextPath(request.nextUrl.searchParams.get("next"), path.startsWith("/workspace") ? "/workspace/dashboard" : "/home");
    return finish(NextResponse.redirect(new URL(destination, request.url)));
  }
  if (!user && !entryPage) {
    if (isApi) return finish(NextResponse.json({ error: "Authentication required." }, { status: 401 }));
    const login = new URL(path.startsWith("/workspace/") ? "/workspace/login" : "/login", request.url);
    login.searchParams.set("next", path + request.nextUrl.search);
    return finish(NextResponse.redirect(login));
  }
  return finish();
}

export const config = {
  matcher: ["/", "/login", "/workspace", "/workspace/login", "/home/:path*", "/dashboard/:path*", "/referrals/:path*", "/inbox/:path*", "/notifications/:path*", "/workspace/dashboard/:path*", "/workspace/staff/:path*", "/workspace/settings/:path*", "/workspace/reports/:path*", "/workspace/capacity/:path*", "/workspace/ambulances/:path*", "/workspace/notifications/:path*", "/api/referrals/:path*", "/api/hospitals/:path*", "/api/staff/:path*", "/api/me"],
};
