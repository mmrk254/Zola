"use client";

import Link from "next/link";
import { Activity, ArrowLeft, Stethoscope } from "lucide-react";

const STAFF_AUTH_IMAGE =
  "https://images.unsplash.com/photo-1648224395277-052c8108efa3?auto=format&fit=crop&w=1400&q=80";

export function StaffAuthLayout({
  children,
  title,
  subtitle
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <main className="auth-page">
      <div className="auth-page-back">
        <Link href="/" className="text-link auth-back-link">
          <ArrowLeft size={15} /> Back
        </Link>
      </div>

      <section className="auth-card">
        <div className="portal-form-col">
          <Link href="/" className="portal-brand">
            <Activity size={17} /> ZOLA
          </Link>
          <div className="portal-head">
            <p className="portal-eyebrow">
              <span /> Clinical staff sign-in
            </p>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          {children}
        </div>

        <div className="portal-visual tone-teal" aria-hidden="true">
          <img src={STAFF_AUTH_IMAGE} alt="" className="portal-photo" />
          <div className="portal-visual-scrim">
            <span className="portal-visual-badge">
              <span /> Network status: live
            </span>
            <div className="portal-visual-copy">
              <p>Critical care referrals, coordinated in real time.</p>
              <span className="mono">
                <Stethoscope size={12} style={{ display: "inline", marginRight: 6, verticalAlign: -2 }} />
                ICU &middot; HDU &middot; NICU
              </span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}