"use client";

import Link from "next/link";
import { Activity, Building2, Stethoscope } from "lucide-react";

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
  return (
    <main className="auth-shell">
      <section className="auth-visual hospital-auth-visual">
        <Link href="/workspace" className="auth-visual-brand">
          <Activity size={18} /> ZOLA
        </Link>
        <div className="auth-visual-copy">
          <p>
            {variant === "register"
              ? "Bring your hospital onto the Zola network. Manage staff, capacity, and facility settings from one place."
              : "Hospital administration portal. Provision staff, monitor referrals, and manage your facility on the network."}
          </p>
        </div>
        <div className="auth-visual-art" aria-hidden="true">
          <div className="auth-orb auth-orb-a" />
          <div className="auth-orb auth-orb-b" />
          <div className="auth-device">
            <div className="auth-device-top">
              <Building2 size={22} />
              <span>Hospital workspace</span>
            </div>
            <div className="auth-device-line active" />
            <div className="auth-device-line" />
            <div className="auth-device-line short" />
            <div className="auth-device-badge">
              <Stethoscope size={14} /> Admin portal
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
