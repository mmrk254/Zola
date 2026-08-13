"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Check, RadioTower } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useWorkspace } from "@/lib/use-workspace";
import { demoReferrals } from "@/lib/demo-data";
import { Referral, ReferralStatus } from "@/lib/types";

// Statuses worth surfacing as a notification, and the message shown for each.
// Kept intentionally small for the MVP: anything that needs a clinician or
// admin to look at the case again.
const NOTIFY_STATUSES: Partial<Record<ReferralStatus, string>> = {
  searching: "Broadcast to hospitals — awaiting a response",
  hospital_accepted: "Hospital accepted — confirm with next of kin",
  family_confirmed: "Family confirmed — arrange ambulance",
  ambulance_arranged: "Ambulance arranged — update when en route",
  patient_en_route: "Patient en route — awaiting arrival",
  patient_received: "Patient received — ready to close the case"
};

const READ_KEY = "zola_notifications_read";

function loadReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}

export function useNotifications() {
  const { activeHospitalId } = useWorkspace();
  const [referrals, setReferrals] = useState<Referral[]>(demoReferrals);
  const [readSet, setReadSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    setReadSet(loadReadIds());
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const params = activeHospitalId ? `?hospital_id=${activeHospitalId}` : "";
    fetch(`/api/referrals${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.referrals) setReferrals(data.referrals);
      })
      .catch(() => {});
  }, [activeHospitalId]);

  const items = useMemo(
    () =>
      referrals
        .filter((r) => NOTIFY_STATUSES[r.status])
        .map((r) => ({
          id: `${r.id}:${r.status}`,
          referralId: r.id,
          reference: r.reference,
          message: NOTIFY_STATUSES[r.status]!,
          status: r.status,
          created_at: r.created_at
        })),
    [referrals]
  );

  function markAllRead() {
    const next = new Set(readSet);
    items.forEach((n) => next.add(n.id));
    setReadSet(next);
    localStorage.setItem(READ_KEY, JSON.stringify([...next]));
  }

  function markRead(id: string) {
    const next = new Set(readSet);
    next.add(id);
    setReadSet(next);
    localStorage.setItem(READ_KEY, JSON.stringify([...next]));
  }

  const unread = items.filter((n) => !readSet.has(n.id));

  return { items, unread, readSet, markAllRead, markRead };
}

export function NotificationBell() {
  const { items, unread, readSet, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="notif-wrap" ref={wrapRef}>
      <button className="icon-button" aria-label="Notifications" type="button" onClick={() => setOpen((v) => !v)}>
        <Bell size={17} />
        {unread.length > 0 && <span className="notif-dot">{unread.length > 9 ? "9+" : unread.length}</span>}
      </button>
      {open && (
        <div className="notif-dropdown">
          <div className="notif-dropdown-head">
            <b>Notifications</b>
            {unread.length > 0 && (
              <button type="button" className="notif-mark-read" onClick={markAllRead}>
                <Check size={13} /> Mark all read
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="empty-state" style={{ padding: "28px 12px" }}>
              <RadioTower size={20} style={{ display: "block", margin: "0 auto 8px", opacity: 0.4 }} />
              Nothing needs your attention.
            </p>
          ) : (
            <div className="notif-list">
              {items.map((n) => (
                <Link
                  href={`/referrals/${n.referralId}`}
                  key={n.id}
                  className={`notif-item ${readSet.has(n.id) ? "" : "unread"}`}
                  onClick={() => setOpen(false)}
                >
                  <span className={`status ${n.status}`}>{n.reference}</span>
                  <p>{n.message}</p>
                </Link>
              ))}
            </div>
          )}
          <Link href="/notifications" className="notif-view-all" onClick={() => setOpen(false)}>
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
