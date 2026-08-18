import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request: { headers: request.headers } });

  const protectedPaths = [
    "/home",
    "/dashboard",
    "/referrals",
    "/inbox",
    "/notifications",
    "/workspace/dashboard",
    "/workspace/staff",
    "/workspace/settings",
    "/workspace/reports",
    "/workspace/capacity",
    "/workspace/ambulances",
    "/workspace/notifications",
    "/api/referrals",
    "/api/me",
    "/api/hospitals",
    "/api/staff"
  ];
  const isProtected = protectedPaths.some(
    (path) => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path + "/")
  );

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const hasValidSupabaseUrl = (() => {
    if (!supabaseUrl) return false;
    try {
      const parsed = new URL(supabaseUrl);
      return parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch {
      return false;
    }
  })();

  if (!hasValidSupabaseUrl || !supabaseAnonKey) {
    if (isProtected) {
      const isHospital = request.nextUrl.pathname.startsWith("/workspace/");
      return NextResponse.redirect(new URL(isHospital ? "/workspace/login" : "/login", request.url));
    }
    return response;
  }

  const supabase = createServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set({ name, value, ...options });
          response.cookies.set({ name, value, ...options });
        });
      }
    }
  });

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // ignore
  }

  if (isProtected && !user) {
    const isHospital = request.nextUrl.pathname.startsWith("/workspace/");
    const loginPath = isHospital ? "/workspace/login" : "/login";
    const redirectUrl = new URL(loginPath, request.url);
    if (!isHospital && (request.nextUrl.pathname.startsWith("/referrals") || request.nextUrl.pathname.startsWith("/home"))) {
      redirectUrl.searchParams.set("next", request.nextUrl.pathname);
    }
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/home/:path*",
    "/dashboard/:path*",
    "/referrals/:path*",
    "/inbox/:path*",
    "/notifications/:path*",
    "/workspace/dashboard/:path*",
    "/workspace/staff/:path*",
    "/workspace/settings/:path*",
    "/workspace/reports/:path*",
    "/workspace/capacity/:path*",
    "/workspace/ambulances/:path*",
    "/workspace/notifications/:path*",
    "/api/referrals/:path*",
    "/api/me",
    "/api/hospitals/:path*",
    "/api/staff"
  ]
};
