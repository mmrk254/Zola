"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Bell, ClipboardPlus, LayoutDashboard, Building2, Settings } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export function Shell({
  children,
  title,
  action
}: {
  children: React.ReactNode;
  title: string;
  action?: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href;

  return (
    <div className="app-shell">
      <aside>
        <Link href="/" className="brand">
          <Activity size={21} /> ZOLA
        </Link>
        <p className="side-label">OPERATIONS</p>
        <nav className="side-nav">
          <Link href="/dashboard" className={isActive("/dashboard") ? "active" : ""}>
            <LayoutDashboard size={18} /> Dashboard
          </Link>
          <Link href="/referrals/new" className={isActive("/referrals/new") ? "active" : ""}>
            <ClipboardPlus size={18} /> New referral
          </Link>
          <Link href="/dashboard">
            <Building2 size={18} /> Hospital inbox
          </Link>
          <Link href="/dashboard">
            <Settings size={18} /> Administration
          </Link>
        </nav>
        <div className="side-footer">
          <span className={`online-dot ${isSupabaseConfigured ? "" : "offline"}`} />
          {isSupabaseConfigured ? "System operational" : "Demo data active"}
        </div>
      </aside>
      <div className="workspace">
        <header>
          <div>
            <p className="eyebrow">ZOLA PLATFORM</p>
            <h1>{title}</h1>
          </div>
          <div className="header-actions">
            <button className="icon-button" aria-label="Notifications">
              <Bell size={19} />
            </button>
            {action}
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
