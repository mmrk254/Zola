"use client";

import { LogOut } from "lucide-react";
import { useCallback, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export function SessionControls({
  collapsed = false,
  redirectTo = "/login"
}: {
  collapsed?: boolean;
  redirectTo?: string;
}) {
  const [signingOut, setSigningOut] = useState(false);

  const signOut = useCallback(async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await supabase?.auth.signOut();
    } finally {
      window.location.assign(redirectTo);
    }
  }, [redirectTo, signingOut]);

  return (
    <button className="side-sign-out" type="button" onClick={() => void signOut()} disabled={signingOut} title="Sign out">
      <LogOut size={15} />
      {!collapsed && (signingOut ? "Signing out..." : "Sign out")}
    </button>
  );
}
