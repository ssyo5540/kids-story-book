"use client";

import { useCallback, useEffect, useState } from "react";
import { isIOS, isStandalone } from "@/lib/player/capabilities";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
  });
}

export type InstallState =
  | { kind: "installed" }
  | { kind: "prompt" }
  | { kind: "ios-manual" }
  | { kind: "unsupported" };

export function useInstall() {
  const [state, setState] = useState<InstallState>({ kind: "unsupported" });
  useEffect(() => {
    const compute = () => {
      if (isStandalone()) return setState({ kind: "installed" });
      if (deferred) return setState({ kind: "prompt" });
      if (isIOS()) return setState({ kind: "ios-manual" });
      setState({ kind: "unsupported" });
    };
    compute();
    const on = () => compute();
    window.addEventListener("beforeinstallprompt", on);
    window.addEventListener("appinstalled", on);
    const t = setInterval(compute, 2000);
    return () => {
      window.removeEventListener("beforeinstallprompt", on);
      window.removeEventListener("appinstalled", on);
      clearInterval(t);
    };
  }, []);
  const prompt = useCallback(async () => {
    if (!deferred) return false;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null;
    return outcome === "accepted";
  }, []);
  return { state, prompt };
}
