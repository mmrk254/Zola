"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, ArrowRight, LockKeyhole } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
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

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f7f3eb", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(23,34,48,0.12)", borderRadius: 18, padding: 28, boxShadow: "0 30px 60px rgba(17,24,39,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          <Activity size={18} /> ZOLA
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <div style={{ display: "grid", placeItems: "center", width: 36, height: 36, borderRadius: 10, background: "rgba(15,141,138,0.12)", color: "#0f8d8a" }}>
            <LockKeyhole size={18} />
          </div>
          <div>
            <div style={{ fontSize: 10, letterSpacing: "0.12em", color: "#5f6d7f", textTransform: "uppercase", fontWeight: 700 }}>Secure access</div>
            <h1 style={{ margin: 0, fontSize: 28, fontFamily: "Fraunces, Georgia, serif" }}>Sign in</h1>
          </div>
        </div>

        {error && (
          <div style={{ background: "#FBEEF0", color: "#9c2f3e", border: "1px solid #f0cdd2", borderRadius: 8, padding: "10px 12px", fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
          <label style={{ display: "grid", gap: 7, color: "#57503f", fontSize: 12, fontWeight: 700 }}>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: "100%", border: "1px solid #D8CFBC", borderRadius: 8, padding: "11px 12px", background: "#fffdf9" }} />
          </label>

          <label style={{ display: "grid", gap: 7, color: "#57503f", fontSize: 12, fontWeight: 700 }}>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: "100%", border: "1px solid #D8CFBC", borderRadius: 8, padding: "11px 12px", background: "#fffdf9" }} />
          </label>

          <button type="submit" disabled={loading} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, border: 0, borderRadius: 10, background: "#172230", color: "#fff", padding: "12px 16px", fontWeight: 700, cursor: "pointer" }}>
            {loading ? "Signing in..." : "Continue"}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        <p style={{ marginTop: 18, color: "#5f6d7f", fontSize: 13 }}>
          Need a workspace account? Ask a hospital admin to create one for your facility.
        </p>

        <div style={{ marginTop: 18 }}>
          <Link href="/" style={{ color: "#0f8d8a", fontWeight: 700 }}>Back to homepage</Link>
        </div>
      </div>
    </main>
  );
}
