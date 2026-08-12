"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Activity, ArrowRight, Building2, LogIn, ShieldCheck } from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";

const PATHS = [
  { step: "01", title: "Register", text: "Submit your hospital for network approval." },
  { step: "02", title: "Get approved", text: "The platform team activates your admin account." },
  { step: "03", title: "Provision staff", text: "Create accounts for your referral team from the hospital dashboard." }
];

export default function WorkspacePage() {
  const router = useRouter();

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      const me = await fetch("/api/me").then((r) => r.json());
      const isAdmin =
        me.networkAdmin ||
        me.memberships?.some((m: { role: string }) => m.role === "hospital_admin");
      if (isAdmin) router.replace("/workspace/dashboard");
    });
  }, [router]);

  return (
    <main className="workspace-hub">
      <nav className="workspace-hub-nav">
        <Link href="/" className="brand">
          <Activity size={18} /> ZOLA
        </Link>
        <Link href="/" className="text-link">
          Back to site
        </Link>
      </nav>

      <section className="workspace-hub-hero">
        <p className="marketing-eyebrow">
          <span className="live-dot" /> Hospital workspace
        </p>
        <h1>Administration portal for your facility.</h1>
        <p>
          Register your hospital or sign in as an administrator. From here you manage staff accounts, facility settings,
          and oversee referrals across your hospital.
        </p>
      </section>

      <section className="workspace-hub-cards">
        <Link href="/workspace/login" className="hub-card hub-card-primary">
          <span className="hub-card-icon">
            <LogIn size={20} />
          </span>
          <div>
            <h2>Hospital sign in</h2>
            <p>For facility administrators with an approved account.</p>
          </div>
          <ArrowRight size={18} className="hub-card-arrow" />
        </Link>

        <Link href="/workspace/register" className="hub-card">
          <span className="hub-card-icon teal">
            <Building2 size={20} />
          </span>
          <div>
            <h2>Register a hospital</h2>
            <p>Request network access. Approval required before activation.</p>
          </div>
          <ArrowRight size={18} className="hub-card-arrow" />
        </Link>
      </section>

      <section className="workspace-hub-steps">
        <div className="workspace-hub-steps-head">
          <ShieldCheck size={18} />
          <h2>How it works</h2>
        </div>
        <div className="workspace-steps-grid">
          {PATHS.map((item) => (
            <article key={item.step}>
              <span className="mono">{item.step}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
        <p className="workspace-staff-note">
          Clinical staff do not sign in here. They use <Link href="/login?next=/referrals/new">Create a referral</Link> on the homepage.
        </p>
      </section>
    </main>
  );
}
