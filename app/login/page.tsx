"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { StaffAuthLayout } from "@/components/staff-auth-layout";
import { supabase } from "@/lib/supabase/client";

function StaffLoginForm() {
  const searchParams = useSearchParams();

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

    const requestedNext = searchParams.get("next");
    if (requestedNext?.startsWith("/")) {
      window.location.assign(requestedNext);
      return;
    }

    const me = await fetch("/api/me").then((res) => (res.ok ? res.json() : null));
    const isHospitalAdmin =
      me?.networkAdmin ||
      me?.memberships?.some((m: { role: string; status: string }) => m.role === "hospital_admin" && m.status === "active");

    window.location.assign(isHospitalAdmin ? "/workspace/dashboard" : "/dashboard");
  }

  return (
    <StaffAuthLayout
      title="Staff sign in"
      subtitle="Sign in with the credentials your hospital admin gave you to create and manage referrals."
    >
      {error && <div className="auth-error">{error}</div>}

      <form onSubmit={handleSubmit} className="auth-form">
        <label className="auth-field has-icon">
          <span>Email</span>
          <Mail size={15} className="auth-field-icon" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@hospital.org"
            required
          />
        </label>

        <label className="auth-field has-icon">
          <span>Password</span>
          <div className="auth-password">
            <Lock size={15} className="auth-field-icon" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
            <button
              type="button"
              className="auth-eye"
              onClick={() => setShowPassword((v) => !v)}
              aria-label="Toggle password"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>

        <button type="submit" disabled={loading} className="button auth-submit staff-submit">
          {loading ? "Signing in..." : "Continue to referrals"}
          {!loading && <ArrowRight size={16} />}
        </button>
      </form>

      <p className="auth-footnote">
        Hospital administrator? <Link href="/workspace">Open the hospital workspace</Link>
      </p>
    </StaffAuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="auth-loading">Loading...</div>}>
      <StaffLoginForm />
    </Suspense>
  );
}