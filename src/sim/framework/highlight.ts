import { create } from "zustand";

/**
 * Param ↔ equation highlighting: hovering a slider highlights every <M v=…>
 * in the prose with the same param key, and vice versa.
 */
interface HighlightState {
  hoverVar: string | null;
  setHoverVar: (key: string | null) => void;
}

export const useHighlight = create<HighlightState>((set) => ({
  hoverVar: null,
  setHoverVar: (key) => set({ hoverVar: key }),
}));
