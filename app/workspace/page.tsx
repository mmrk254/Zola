"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  Building2,
  ChevronRight,
  ClipboardPlus,
  LogIn,
  ShieldCheck,
  UserPlus
} from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";

const PATHS = [
  { step: "01", title: "Hospital joins", text: "A facility registers and is approved onto the network." },
  { step: "02", title: "Admin provisions staff", text: "Hospital admins create accounts for clinicians and coordination staff." },
  { step: "03", title: "Staff sign in", text: "Each member signs in with their facility role and begins referrals." }
];

export default function WorkspacePage() {
  const router = useRouter();

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/dashboard");
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
        <h1>Where your facility runs referrals.</h1>
        <p>
          Sign in if your hospital is already on Zola, or register to request access. Once approved, your admin can
          provision staff accounts for nurses, clinicians, and coordination teams.
        </p>
      </section>

      <section className="workspace-hub-cards">
        <Link href="/login" className="hub-card hub-card-primary">
          <span className="hub-card-icon">
            <LogIn size={20} />
          </span>
          <div>
            <h2>Hospital sign in</h2>
            <p>For staff with an existing account at a participating facility.</p>
          </div>
          <ArrowRight size={18} className="hub-card-arrow" />
        </Link>

        <Link href="/register" className="hub-card">
          <span className="hub-card-icon teal">
            <Building2 size={20} />
          </span>
          <div>
            <h2>Register a hospital</h2>
            <p>Request network access for your facility. Approval is handled by the platform team.</p>
          </div>
          <ArrowRight size={18} className="hub-card-arrow" />
        </Link>

        <Link href="/login?next=/referrals/new" className="hub-card">
          <span className="hub-card-icon amber">
            <ClipboardPlus size={20} />
          </span>
          <div>
            <h2>Create a referral</h2>
            <p>Clinicians sign in and go straight to the referral form.</p>
          </div>
          <ArrowRight size={18} className="hub-card-arrow" />
        </Link>
      </section>

      <section className="workspace-hub-steps">
        <div className="workspace-hub-steps-head">
          <ShieldCheck size={18} />
          <h2>How hospital access works</h2>
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
      </section>

      <section className="workspace-hub-admin">
        <div>
          <h3>Already inside the workspace?</h3>
          <p>Go to your operations dashboard to manage referrals, inbox, and staff.</p>
        </div>
        <Link href="/login?next=/dashboard" className="button">
          Open dashboard <ChevronRight size={16} />
        </Link>
      </section>
    </main>
  );
}
