"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useWorkspace } from "@/lib/use-workspace";

export function NotificationPermission() {
  const { session } = useWorkspace();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!session || typeof Notification === "undefined") return;
    setVisible(Notification.permission === "default");
  }, [session]);

  if (!visible) return null;
  return <div className="permission-banner"><Bell size={16} /><span>Allow notifications to receive new referral alerts on this device.</span><button type="button" onClick={async () => { try { await Notification.requestPermission(); } catch {} setVisible(false); }}>Allow notifications</button><button type="button" onClick={() => setVisible(false)}>Not now</button></div>;
}
