"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaInstallBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }

    const dismissed = localStorage.getItem("zola_pwa_dismissed");
    if (dismissed === "1") setHidden(true);

    function onBeforeInstall(event: Event) {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    }

    function onInstalled() {
      setInstalled(true);
      setDeferred(null);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    if (choice.outcome === "dismissed") {
      localStorage.setItem("zola_pwa_dismissed", "1");
      setHidden(true);
    }
  }

  function dismiss() {
    localStorage.setItem("zola_pwa_dismissed", "1");
    setHidden(true);
    setDeferred(null);
  }

  if (installed || hidden || !deferred) return null;

  return (
    <div className="pwa-install-banner" role="region" aria-label="Install Zola app">
      <div>
        <strong>Install Zola</strong>
        <p>Add Zola to your home screen for quick access during shifts.</p>
      </div>
      <div className="pwa-install-actions">
        <button type="button" className="button compact" onClick={install}>
          <Download size={14} /> Install
        </button>
        <button type="button" className="icon-button" aria-label="Dismiss install prompt" onClick={dismiss}>
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
