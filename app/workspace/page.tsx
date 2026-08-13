"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, LogIn, ShieldCheck } from "lucide-react";
import { ZolaLogo } from "@/components/zola-logo";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1755995083683-50d08cd83d09?auto=format&fit=crop&w=1600&q=80";

const STEPS = [
  {
    title: "Register your hospital",
    text: "Create your facility profile and set an administrator password in a couple of minutes."
  },
  {
    title: "Sign in as an administrator",
    text: "Open the hospital dashboard with your admin credentials to manage your facility."
  },
  {
    title: "Add your staff",
    text: "Create accounts for clinicians and coordination staff so they can create and receive referrals."
  }
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
    <main className="hub-shell">
      <nav className="hub-nav">
        <Link href="/" className="brand">
          <ZolaLogo size={18} />
        </Link>
        <Link href="/" className="text-link">
          Back to site
        </Link>
      </nav>

      <section className="hub-hero">
        <img src={HERO_IMAGE} alt="" className="hub-hero-photo" />
        <div className="hub-hero-scrim" />
        <div className="hub-hero-body">
          <span className="hub-hero-pill">
            <span /> Hospital workspace
          </span>
          <h1>Administration portal for your facility.</h1>
          <p>
            Register your hospital or sign in as an administrator. From here you manage staff accounts, facility
            settings, and oversee referrals across your hospital.
          </p>
        </div>
      </section>

      <section className="hub-portals">
        <Link href="/workspace/login" className="hub-portal hub-portal-primary">
          <div className="hub-portal-top">
            <span className="hub-portal-icon teal">
              <LogIn size={19} />
            </span>
            <span className="hub-portal-index">01</span>
          </div>
          <h2>Hospital sign in</h2>
          <p>For facility administrators with an approved account.</p>
          <span className="hub-portal-cta">
            Continue <ArrowRight size={15} />
          </span>
        </Link>

        <Link href="/workspace/register" className="hub-portal">
          <div className="hub-portal-top">
            <span className="hub-portal-icon">
              <Building2 size={19} />
            </span>
            <span className="hub-portal-index">02</span>
          </div>
          <h2>Register a hospital</h2>
          <p>Create your facility account and administrator password.</p>
          <span className="hub-portal-cta">
            Continue <ArrowRight size={15} />
          </span>
        </Link>
      </section>

      <section className="hub-timeline">
        <div className="hub-timeline-head">
          <ShieldCheck size={18} />
          <h2>How it works</h2>
        </div>
        <ol className="hub-timeline-list">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <span className="hub-timeline-node">{String(index + 1).padStart(2, "0")}</span>
              <div className="hub-timeline-copy">
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <p className="hub-note">
        Clinical staff do not sign in here. They use <Link href="/login?next=/referrals/new">Create a referral</Link> on
        the homepage.
      </p>
    </main>
  );
}