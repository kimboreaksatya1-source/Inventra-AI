"use client";

import { useEffect, useState } from "react";
import { DemoWelcome } from "./demo-welcome";

const KEY = "inventra.demo.welcomed";

/**
 * Shows <DemoWelcome/> once per browser for the shared demo account.
 * Mounted from <AppShell/>, which passes `isDemo` from the server session.
 * Renders nothing for Google users and after the flag is set.
 */
export function DemoWelcomeGate({ isDemo }: { isDemo: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isDemo) return;
    try {
      if (localStorage.getItem(KEY) !== "1") setOpen(true);
    } catch {
      // Storage blocked (private mode, etc.) — show it this session anyway.
      setOpen(true);
    }
  }, [isDemo]);

  if (!isDemo || !open) return null;

  return (
    <DemoWelcome
      onEnter={() => {
        try {
          localStorage.setItem(KEY, "1");
        } catch {
          /* ignore — worst case it shows again next visit */
        }
        setOpen(false);
      }}
    />
  );
}
