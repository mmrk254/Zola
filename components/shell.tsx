"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  Bell,
  Building2,
  ClipboardPlus,
  LayoutDashboard,
  Menu,
  X
} from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { SessionControls } from "@/components/session-controls";
import { FacilitySelector } from "@/components/facility-selector";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/referrals/new", label: "New referral", icon: ClipboardPlus },
  { href: "/inbox", label: "Hospital inbox", icon: Building2 },
];

function SideNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      <Link href="/" className="brand" onClick={onNavigate}>
        <Activity size={21} /> ZOLA
      </Link>
      <p className="side-label">OPERATIONS</p>
      <nav className="side-nav">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href + item.label}
            href={item.href}
            className={isActive(item.href) ? "active" : ""}
            onClick={onNavigate}
          >
            <item.icon size={18} /> {item.label}
          </Link>
        ))}
      </nav>
      <div className="side-footer">
        <span className={`online-dot ${isSupabaseConfigured ? "" : "offline"}`} />
        {isSupabaseConfigured ? "System operational" : "Demo data active"}
      </div>
      <SessionControls />
    </>
  );
}

export function Shell({
  children,
  title,
  action
}: {
  children: React.ReactNode;
  title: string;
  action?: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  return (
    <div className="app-shell">
      <aside className="desktop-aside">
        <SideNav />
      </aside>

      {drawerOpen && (
        <button
          className="mobile-drawer-backdrop"
          aria-label="Close navigation"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <aside className={`mobile-drawer ${drawerOpen ? "open" : ""}`} aria-hidden={!drawerOpen}>
        <button className="drawer-close" type="button" aria-label="Close menu" onClick={() => setDrawerOpen(false)}>
          <X size={20} />
        </button>
        <SideNav onNavigate={() => setDrawerOpen(false)} />
      </aside>

      <div className="workspace">
        <header>
          <div className="header-leading">
            <button
              className="icon-button mobile-menu"
              type="button"
              aria-label="Open navigation"
              onClick={() => setDrawerOpen(true)}
            >
              <Menu size={19} />
            </button>
            <div>
              <p className="eyebrow">ZOLA PLATFORM</p>
              <h1>{title}</h1>
            </div>
          </div>
          <div className="header-actions">
            <FacilitySelector />
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
