import { create } from "zustand";
import type { LayoutCategory } from "@/types/layout-plan";

export interface LayoutSelectionState {
  activeWeeklyTemplateId: string | null;
  activeMonthlyTemplateId: string | null;
  isLoading: boolean;
  activateTemplate: (templateId: string, category: LayoutCategory) => Promise<void>;
  loadSelections: () => Promise<void>;
}

export const useLayoutSelectionStore = create<LayoutSelectionState>((set) => ({
  activeWeeklyTemplateId: null,
  activeMonthlyTemplateId: null,
  isLoading: false,

  activateTemplate: async (templateId: string, category: LayoutCategory) => {
    const response = await fetch("/api/layout-selections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId }),
    });

    if (!response.ok) {
      throw new Error("Failed to activate template");
    }

    if (category === "weekly") {
      set({ activeWeeklyTemplateId: templateId });
    } else {
      set({ activeMonthlyTemplateId: templateId });
    }
  },

  loadSelections: async () => {
    set({ isLoading: true });
    try {
      const response = await fetch("/api/layout-selections");
      if (!response.ok) {
        throw new Error("Failed to load layout selections");
      }
      const data = await response.json();
      set({
        activeWeeklyTemplateId: data.weekly?.templateId ?? null,
        activeMonthlyTemplateId: data.monthly?.templateId ?? null,
      });
    } finally {
      set({ isLoading: false });
    }
  },
}));
