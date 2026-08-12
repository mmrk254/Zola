"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { AuthLayout } from "@/components/auth-layout";
import { supabase } from "@/lib/supabase/client";

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (!supabase) {
      setError("Supabase is not configured for sign-in.");
      setLoading(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    window.location.assign(next.startsWith("/") ? next : "/dashboard");
  }

  return (
    <AuthLayout title="Hospital sign in" subtitle="Access your facility workspace with your staff credentials.">
      {error && <div className="auth-error">{error}</div>}

      <form onSubmit={handleSubmit} className="auth-form">
        <label className="auth-field">
          <span>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@hospital.org" required />
        </label>

        <label className="auth-field">
          <span>Password</span>
          <div className="auth-password">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
            <button type="button" className="auth-eye" onClick={() => setShowPassword((v) => !v)} aria-label="Toggle password">
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>

        <button type="submit" disabled={loading} className="button auth-submit">
          {loading ? "Signing in..." : "Sign in"}
          {!loading && <ArrowRight size={16} />}
        </button>
      </form>

      <p className="auth-footnote">
        No account yet? <Link href="/register">Register your hospital</Link> or ask your hospital admin to create a staff account.
      </p>
      <p className="auth-footnote subtle">
        <Link href="/workspace">Back to workspace</Link>
      </p>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="auth-loading">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
