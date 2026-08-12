"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/client";

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

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setSession(null);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/me");
      if (!res.ok) {
        setSession(null);
        return;
      }
      const data = await res.json();
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
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
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
