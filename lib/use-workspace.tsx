"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";

export type WorkspaceMembership = {
  hospital_id: string;
  hospital_name?: string;
  role: "clinician" | "hospital_staff" | "hospital_admin";
  status: "active" | "revoked";
};

type WorkspaceSession = {
  user: { id: string; email?: string | null; name?: string | null };
  networkAdmin: boolean;
  memberships: WorkspaceMembership[];
};

type WorkspaceContextValue = {
  session: WorkspaceSession | null;
  loading: boolean;
  activeHospitalId: string | null;
  setActiveHospitalId: (id: string) => void;
  actingPayload: { acting_hospital_id?: string };
  refresh: () => Promise<void>;
};

const STORAGE_KEY = "zola_active_hospital";

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<WorkspaceSession | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [activeHospitalId, setActiveHospitalIdState] = useState<string | null>(null);
  const requestVersion = useRef(0);

  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;
    if (!isSupabaseConfigured) {
      setSession(null);
      setLoading(false);
      return;
    }

    try {
      // Wait for stored-session recovery before requesting protected data.
      await supabase?.auth.getSession();
      const res = await fetch("/api/me", { cache: "no-store" });
      if (version !== requestVersion.current) return;
      if (!res.ok) {
        if (res.status === 401) { setSession(null); setActiveHospitalIdState(null); }
        return;
      }
      const data = await res.json();
      if (version !== requestVersion.current) return;
      setSession(data);

      const stored = localStorage.getItem(STORAGE_KEY);
      const membershipIds = (data.memberships ?? []).map((m: WorkspaceMembership) => m.hospital_id);
      if (stored && membershipIds.includes(stored)) {
        setActiveHospitalIdState(stored);
      } else if (membershipIds.length === 1) {
        setActiveHospitalIdState(membershipIds[0]);
        localStorage.setItem(STORAGE_KEY, membershipIds[0]);
      } else {
        setActiveHospitalIdState(null);
      }
    } catch {
      // Preserve the current workspace during temporary connection failures.
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const resume = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("online", resume);
    document.addEventListener("visibilitychange", resume);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const subscription = supabase?.auth.onAuthStateChange(event => {
      if (event === "SIGNED_OUT") { ++requestVersion.current; setSession(null); setActiveHospitalIdState(null); setLoading(false); }
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        clearTimeout(timer);
        // Run outside the auth callback lock.
        timer = setTimeout(() => void refresh(), 0);
      }
    });
    return () => {
      clearTimeout(timer);
      subscription?.data.subscription.unsubscribe();
      window.removeEventListener("online", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [refresh]);

  const setActiveHospitalId = useCallback((id: string) => {
    setActiveHospitalIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const actingPayload = useMemo(
    () => (activeHospitalId ? { acting_hospital_id: activeHospitalId } : {}),
    [activeHospitalId]
  );

  return (
    <WorkspaceContext.Provider
      value={{ session, loading, activeHospitalId, setActiveHospitalId, actingPayload, refresh }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return value;
}
