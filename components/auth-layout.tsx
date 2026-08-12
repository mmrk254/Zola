"use client";

import Link from "next/link";
import { Activity, Building2, Stethoscope } from "lucide-react";

export function AuthLayout({
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
  return (
    <main className="auth-shell">
      <section className="auth-visual">
        <Link href="/" className="auth-visual-brand">
          <Activity size={18} /> ZOLA
        </Link>
        <div className="auth-visual-copy">
          <p>
            {variant === "register"
              ? "Join the network of hospitals coordinating critical care beds across Kenya."
              : "Every referral tracked. Every handover accountable. Built for the teams who move patients when minutes matter."}
          </p>
        </div>
        <div className="auth-visual-art" aria-hidden="true">
          <div className="auth-orb auth-orb-a" />
          <div className="auth-orb auth-orb-b" />
          <div className="auth-device">
            <div className="auth-device-top">
              <Building2 size={22} />
              <span>Referral pathway</span>
            </div>
            <div className="auth-device-line active" />
            <div className="auth-device-line" />
            <div className="auth-device-line short" />
            <div className="auth-device-badge">
              <Stethoscope size={14} /> ICU · HDU · NICU
            </div>
          </div>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-panel-inner">
          <div className="auth-panel-head">
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}
