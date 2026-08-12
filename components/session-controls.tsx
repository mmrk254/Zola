"use client";

import { LogOut } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";

const IDLE_TIMEOUT_MS = 10 * 60 * 1000;

export function SessionControls({ collapsed = false }: { collapsed?: boolean }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef(Date.now());
  const signingOutRef = useRef(false);
  const [signingOut, setSigningOut] = useState(false);

  const signOut = useCallback(async () => {
    if (signingOutRef.current) return;

    signingOutRef.current = true;
    setSigningOut(true);

    try {
      await supabase?.auth.signOut();
    } finally {
      window.location.assign("/login");
    }
  }, []);

  useEffect(() => {
    const resetTimer = () => {
      if (signingOutRef.current) return;

      lastActivityRef.current = Date.now();
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => void signOut(), IDLE_TIMEOUT_MS);
    };

    const checkIdleTime = () => {
      if (Date.now() - lastActivityRef.current >= IDLE_TIMEOUT_MS) {
        void signOut();
      } else {
        resetTimer();
      }
    };

    const activityEvents: Array<keyof DocumentEventMap> = [
      "pointerdown",
      "pointermove",
      "keydown",
      "scroll",
      "touchstart"
    ];

    activityEvents.forEach((eventName) => document.addEventListener(eventName, resetTimer, { passive: true }));
    window.addEventListener("focus", checkIdleTime);
    document.addEventListener("visibilitychange", checkIdleTime);
    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      activityEvents.forEach((eventName) => document.removeEventListener(eventName, resetTimer));
      window.removeEventListener("focus", checkIdleTime);
      document.removeEventListener("visibilitychange", checkIdleTime);
    };
  }, [signOut]);

  return (
    <button className="side-sign-out" type="button" onClick={() => void signOut()} disabled={signingOut} title="Sign out">
      <LogOut size={15} />
      {!collapsed && (signingOut ? "Signing out..." : "Sign out")}
    </button>
  );
}
