"use client";

import Link from "next/link";
import { Activity } from "lucide-react";

const STAFF_AUTH_IMAGE =
  "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80";

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
    <main className="staff-auth-shell">
      <section className="staff-auth-form">
        <Link href="/" className="staff-auth-brand">
          <Activity size={17} /> ZOLA
        </Link>
        <div className="staff-auth-head">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        {children}
      </section>
      <section className="staff-auth-visual" aria-hidden="true">
        <img src={STAFF_AUTH_IMAGE} alt="" className="staff-auth-photo" />
        <div className="staff-auth-visual-overlay">
          <p>Critical care referrals, coordinated in real time.</p>
          <span>ICU · HDU · NICU</span>
        </div>
      </section>
    </main>
  );
}
