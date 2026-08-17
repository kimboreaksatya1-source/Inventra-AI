"use client";

import { create } from "zustand";
import type { SectionId } from "./types";

interface AppState {
  activeSection: SectionId;
  mobileNavOpen: boolean;
  setSection: (s: SectionId) => void;
  setMobileNavOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeSection: "dashboard",
  mobileNavOpen: false,
  setSection: (s) => set({ activeSection: s, mobileNavOpen: false }),
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
}));
