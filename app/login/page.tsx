"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Activity, ArrowRight, LockKeyhole } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@zola.local");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (!supabase) {
      setError("Supabase is not configured for sign-in. Add the environment variables first.");
      setLoading(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    window.location.assign("/dashboard");
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <Activity size={18} /> ZOLA
        </div>

        <div className="login-heading">
          <div className="login-icon">
            <LockKeyhole size={18} />
          </div>
          <div>
            <div className="login-kicker">Secure access</div>
            <h1>Sign in</h1>
          </div>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>

          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>

          <button type="submit" disabled={loading} className="button login-submit">
            {loading ? "Signing in..." : "Continue"}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        <p className="login-note">Need a workspace account? Ask a hospital admin to create one for your facility.</p>

        <div className="login-back">
          <Link href="/">Back to homepage</Link>
        </div>
      </div>
    </main>
  );
}
