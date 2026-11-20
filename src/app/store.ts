import { create } from "zustand";

interface AppState {
  dark: boolean;
  sidebarOpen: boolean;
  toggleDark: () => void;
  setSidebarOpen: (open: boolean) => void;
}

function initialDark(): boolean {
  const stored = localStorage.getItem("physix.dark");
  if (stored !== null) return stored === "1";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export const useAppStore = create<AppState>((set) => ({
  dark: initialDark(),
  sidebarOpen: false,
  toggleDark: () =>
    set((s) => {
      localStorage.setItem("physix.dark", s.dark ? "0" : "1");
      return { dark: !s.dark };
    }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
