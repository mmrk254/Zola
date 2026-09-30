// Long-lived device cookies; refresh-token rotation still controls session validity.
export const SESSION_COOKIE_OPTIONS = {
  path: "/",
  sameSite: "lax" as const,
  maxAge: 400 * 24 * 60 * 60,
};

export function safeNextPath(value: string | null, fallback = "/home") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\r\n]/.test(value)) return fallback;
  const pathname = value.split(/[?#]/)[0];
  if (["/", "/login", "/workspace", "/workspace/login"].includes(pathname.replace(/\/$/, "") || "/")) return fallback;
  return value;
}
