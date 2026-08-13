"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardPlus,
  LayoutDashboard,
  Menu,
  X
} from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { SessionControls } from "@/components/session-controls";
import { FacilitySelector } from "@/components/facility-selector";
import { NotificationBell } from "@/components/notification-bell";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/referrals/new", label: "New referral", icon: ClipboardPlus },
  { href: "/inbox", label: "Hospital inbox", icon: Building2 }
];

function SideNav({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      <Link href="/" className="brand" onClick={onNavigate} title="Zola home">
        <Activity size={18} /> {!collapsed && "ZOLA"}
      </Link>
      {!collapsed && <p className="side-label">OPERATIONS</p>}
      <nav className="side-nav">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={isActive(item.href) ? "active" : ""}
            onClick={onNavigate}
            title={item.label}
          >
            <item.icon size={17} /> {!collapsed && item.label}
          </Link>
        ))}
      </nav>
      <div className="side-footer">
        <span className={`online-dot ${isSupabaseConfigured ? "" : "offline"}`} />
        {!collapsed && (isSupabaseConfigured ? "Operational" : "Demo")}
      </div>
      <SessionControls collapsed={collapsed} />
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
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("zola_sidebar_collapsed");
    if (stored === "1") setCollapsed(true);
  }, []);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  function toggleCollapsed() {
    setCollapsed((value) => {
      const next = !value;
      localStorage.setItem("zola_sidebar_collapsed", next ? "1" : "0");
      return next;
    });
  }

  return (
    <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""} ${drawerOpen ? "drawer-open" : ""}`}>
      <aside className="desktop-aside">
        <SideNav collapsed={collapsed} />
      </aside>

      <button
        className="mobile-drawer-backdrop"
        aria-label="Close navigation"
        onClick={() => setDrawerOpen(false)}
        tabIndex={drawerOpen ? 0 : -1}
      />

      <aside className="mobile-drawer" aria-hidden={!drawerOpen}>
        <button className="drawer-close" type="button" aria-label="Close menu" onClick={() => setDrawerOpen(false)}>
          <X size={18} />
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
              <Menu size={17} />
            </button>
            <button
              className="icon-button desktop-toggle"
              type="button"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={toggleCollapsed}
            >
              {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
            </button>
            <div>
              <p className="eyebrow">ZOLA PLATFORM</p>
              <h1>{title}</h1>
            </div>
          </div>
          <div className="header-actions">
            <FacilitySelector />
            <NotificationBell />
            {action}
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
