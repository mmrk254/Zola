"use client";
import { useEffect } from "react";
import { useWorkspace } from "@/lib/use-workspace";

function decodeKey(value: string) { const padding = "=".repeat((4 - value.length % 4) % 4); const raw = atob((value + padding).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from([...raw].map((char) => char.charCodeAt(0))); }

export function PushSubscription() {
  const { activeHospitalId } = useWorkspace();
  useEffect(() => {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!activeHospitalId || !publicKey || typeof Notification === "undefined" || Notification.permission !== "granted" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.ready.then(async (registration) => {
      const subscription = await registration.pushManager.getSubscription() ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeKey(publicKey) });
      await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hospital_id: activeHospitalId, subscription }) });
    }).catch(() => {});
  }, [activeHospitalId]);
  return null;
}
