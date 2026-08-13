"use client";

import Link from "next/link";
import { Activity, ArrowLeft, ShieldCheck } from "lucide-react";

const VARIANT_CONTENT: Record<
  "login" | "register",
  { image: string; quote: string; tag: string; eyebrow: string }
> = {
  login: {
    image:
      "https://images.unsplash.com/photo-1755995083683-50d08cd83d09?auto=format&fit=crop&w=1400&q=80",
    quote: "Every referral tracked. Every handover accountable.",
    tag: "ADMIN PORTAL",
    eyebrow: "Hospital administration"
  },
  register: {
    image:
      "https://images.unsplash.com/photo-1516841273335-e39b37888115?auto=format&fit=crop&w=1400&q=80",
    quote: "Bring your hospital onto a network built for critical care.",
    tag: "JOIN THE NETWORK",
    eyebrow: "Hospital registration"
  }
};

export function HospitalAuthLayout({
  children,
  title,
  subtitle,
  variant = "login"
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  variant?: "login" | "register";
}) {
  const content = VARIANT_CONTENT[variant];

  return (
    <main className="auth-page">
      <div className="auth-page-back">
        <Link href="/workspace" className="text-link auth-back-link">
          <ArrowLeft size={15} /> Back
        </Link>
      </div>

      <section className="auth-card">
        <div className="portal-form-col">
          <Link href="/workspace" className="portal-brand">
            <Activity size={17} /> ZOLA
          </Link>
          <div className="portal-head">
            <p className="portal-eyebrow">
              <span /> {content.eyebrow}
            </p>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          {children}
        </div>

        <div className="portal-visual tone-navy" aria-hidden="true">
          <img src={content.image} alt="" className="portal-photo" />
          <div className="portal-visual-scrim">
            <span className="portal-visual-badge">
              <span /> Network status: live
            </span>
            <div className="portal-visual-copy">
              <p>{content.quote}</p>
              <span className="mono">
                <ShieldCheck size={12} style={{ display: "inline", marginRight: 6, verticalAlign: -2 }} />
                {content.tag}
              </span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}