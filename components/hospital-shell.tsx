"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BedDouble,
  Bell,
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardPlus,
  CreditCard,
  FileBarChart2,
  Inbox,
  LayoutDashboard,
  Menu,
  Plus,
  Truck,
  Users,
  X
} from "lucide-react";
import { ZolaLogo } from "@/components/zola-logo";
import { SessionControls } from "@/components/session-controls";
import { FacilitySelector } from "@/components/facility-selector";
import { NotificationBell } from "@/components/notification-bell";
import { useWorkspace } from "@/lib/use-workspace";

const NAV = [
  { href: "/workspace/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/referrals/new", label: "New referral", icon: ClipboardPlus },
  { href: "/inbox", label: "Referral inbox", icon: Inbox },
  { href: "/workspace/notifications", label: "Notifications", icon: Bell },
  { href: "/workspace/capacity", label: "Bed & capacity", icon: BedDouble },
  { href: "/workspace/payments", label: "Payments", icon: CreditCard },
  { href: "/workspace/ambulances", label: "Ambulances", icon: Truck },
  { href: "/workspace/staff", label: "Staff accounts", icon: Users },
  { href: "/workspace/reports", label: "Reports", icon: FileBarChart2 },
  { href: "/workspace/settings", label: "Facility settings", icon: Building2 }
];

function Nav({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  return (
    <>
      <Link href="/workspace" className="brand" onClick={onNavigate}>
        <ZolaLogo size={18} showText={!collapsed} />
      </Link>
      {!collapsed && <p className="side-label">HOSPITAL</p>}
      <nav className="side-nav">
        {NAV.map((item) => (
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
        <Building2 size={14} />
        {!collapsed && "Hospital workspace"}
      </div>
      <SessionControls collapsed={collapsed} redirectTo="/workspace/login" />
    </>
  );
}

export function HospitalShell({
  children,
  title,
  action
}: {
  children: React.ReactNode;
  title: string;
  action?: React.ReactNode;
}) {
  const { session } = useWorkspace();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("zola_hospital_sidebar");
    if (stored === "1") setCollapsed(true);
  }, []);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const isAdmin =
    session?.networkAdmin ||
    session?.memberships.some((m) => m.role === "hospital_admin" && m.status === "active");

  if (session && !isAdmin) {
    return (
      <main className="workspace-hub" style={{ paddingTop: 80 }}>
        <div className="notice warn">This area is for hospital administrators only.</div>
        <Link href="/login" className="button">Go to staff sign in</Link>
      </main>
    );
  }

  return (
    <div className={`app-shell hospital-shell ${collapsed ? "sidebar-collapsed" : ""} ${drawerOpen ? "drawer-open" : ""}`}>
      <aside className="desktop-aside hospital-aside">
        <Nav collapsed={collapsed} />
      </aside>

      <button
        className="mobile-drawer-backdrop"
        aria-label="Close"
        onClick={() => setDrawerOpen(false)}
        tabIndex={drawerOpen ? 0 : -1}
      />

      <aside className="mobile-drawer" aria-hidden={!drawerOpen}>
        <button className="drawer-close" type="button" onClick={() => setDrawerOpen(false)}>
          <X size={18} />
        </button>
        <Nav onNavigate={() => setDrawerOpen(false)} />
      </aside>

      <div className="workspace">
        <header>
          <div className="header-leading">
            <button className="icon-button mobile-menu" type="button" aria-label="Menu" onClick={() => setDrawerOpen(true)}>
              <Menu size={17} />
            </button>
            <button
              className="icon-button desktop-toggle"
              type="button"
              aria-label="Toggle sidebar"
              onClick={() => {
                setCollapsed((v) => {
                  const n = !v;
                  localStorage.setItem("zola_hospital_sidebar", n ? "1" : "0");
                  return n;
                });
              }}
            >
              {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
            </button>
            <div>
              <p className="eyebrow">HOSPITAL WORKSPACE</p>
              <h1>{title}</h1>
            </div>
          </div>
          <div className="header-actions">
            <Link href="/referrals/new" className="button compact mobile-new-referral">
              <Plus size={15} /> New referral
            </Link>
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
