"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { HospitalAuthLayout } from "@/components/hospital-auth-layout";
import { supabase } from "@/lib/supabase/client";

export default function WorkspaceLoginPage() {
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

    window.location.assign("/workspace/dashboard");
  }

  return (
    <HospitalAuthLayout title="Hospital sign in" subtitle="Administrator access to your facility workspace.">
      {error && <div className="auth-error">{error}</div>}

      <form onSubmit={handleSubmit} className="auth-form">
        <label className="auth-field">
          <span>Admin email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@hospital.org" required />
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
          {loading ? "Signing in..." : "Open hospital dashboard"}
          {!loading && <ArrowRight size={16} />}
        </button>
      </form>

      <p className="auth-footnote">
        New facility? <Link href="/workspace/register">Register your hospital</Link>
      </p>
      <p className="auth-footnote subtle">
        <Link href="/workspace">Back to workspace</Link>
      </p>
    </HospitalAuthLayout>
  );
}
