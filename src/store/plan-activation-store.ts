import { create } from "zustand";

export interface PlanActivationState {
  activePlanIds: string[];
  isLoading: boolean;
  activatePlan: (planId: string) => Promise<void>;
  deactivatePlan: (planId: string) => Promise<void>;
  loadActivations: () => Promise<void>;
}

export const usePlanActivationStore = create<PlanActivationState>((set, get) => ({
  activePlanIds: [],
  isLoading: false,

  activatePlan: async (planId: string) => {
    const response = await fetch(`/api/plans/${planId}/activate`, {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error("Failed to activate plan");
    }

    const currentIds = get().activePlanIds;
    if (!currentIds.includes(planId)) {
      set({ activePlanIds: [...currentIds, planId] });
    }
  },

  deactivatePlan: async (planId: string) => {
    const response = await fetch(`/api/plans/${planId}/deactivate`, {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error("Failed to deactivate plan");
    }

    set({ activePlanIds: get().activePlanIds.filter((id) => id !== planId) });
  },

  loadActivations: async () => {
    set({ isLoading: true });
    try {
      const response = await fetch("/api/plans");
      if (!response.ok) {
        throw new Error("Failed to load plans");
      }
      const plans = await response.json();
      const activeIds = plans
        .filter((plan: { isActive: boolean }) => plan.isActive)
        .map((plan: { id: string }) => plan.id);
      set({ activePlanIds: activeIds });
    } finally {
      set({ isLoading: false });
    }
  },
}));
