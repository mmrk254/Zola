import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request: { headers: request.headers } });

  const protectedPaths = ["/dashboard", "/referrals", "/inbox", "/api/referrals", "/api/me", "/api/hospitals"];
  const isProtected = protectedPaths.some((path) => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path + "/"));

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

  // Vercel runs middleware before a page can render. Do not crash the entire
  // site while Supabase variables are being configured for a deployment.
  if (!hasValidSupabaseUrl || !supabaseAnonKey) {
    if (isProtected) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return response;
  }

  const supabase = createServerClient(
    supabaseUrl!,
    supabaseAnonKey!,
    {
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
    }
  );

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // An unavailable auth service must behave like a signed-out request rather
    // than generating a Vercel middleware 500.
  }

  if (isProtected && !user) {
    const redirectUrl = new URL("/login", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/referrals/:path*", "/inbox/:path*", "/api/referrals/:path*", "/api/me", "/api/hospitals"]
};
