"use client";

import Link from "next/link";
import { Bell, Check, RadioTower } from "lucide-react";
import { Shell } from "@/components/shell";
import { StatusBadge } from "@/components/status-badge";
import { useNotifications } from "@/components/notification-bell";

export default function NotificationsPage() {
  const { items, unread, readSet, markAllRead, markRead } = useNotifications();

  return (
    <Shell
      title="Notifications"
      action={
        unread.length > 0 ? (
          <button className="button compact ghost" type="button" onClick={markAllRead}>
            <Check size={14} /> Mark all read
          </button>
        ) : undefined
      }
    >
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>All notifications</h2>
            <p>Referrals that need attention, across every stage of the case.</p>
          </div>
        </div>

        {items.length === 0 ? (
          <p className="empty-state">
            <Bell size={28} style={{ display: "block", margin: "0 auto 12px", opacity: 0.4 }} />
            Nothing needs your attention right now.
          </p>
        ) : (
          <div className="inbox-list">
            {items.map((n) => (
              <article key={n.id} className={`inbox-item ${readSet.has(n.id) ? "" : "unread"}`}>
                <div>
                  <Link href={`/referrals/${n.referralId}`} className="ref-link" onClick={() => markRead(n.id)}>
                    {n.reference}
                  </Link>
                  <p>{n.message}</p>
                  <small>
                    <RadioTower size={11} style={{ verticalAlign: "-1px", marginRight: 4 }} />
                    {n.created_at}
                  </small>
                </div>
                <div className="inbox-actions">
                  <StatusBadge status={n.status} />
                  {!readSet.has(n.id) && (
                    <button className="button ghost compact" type="button" onClick={() => markRead(n.id)}>
                      Mark read
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </Shell>
  );
}
