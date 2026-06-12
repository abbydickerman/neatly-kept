import { describe, it, expect, beforeEach, vi } from "vitest";
import { usePlanActivationStore } from "./plan-activation-store";

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("plan-activation-store", () => {
  beforeEach(() => {
    // Reset store state between tests
    usePlanActivationStore.setState({
      activePlanIds: [],
      isLoading: false,
    });
    mockFetch.mockReset();
  });

  describe("loadActivations", () => {
    it("should load active plan IDs from the API", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: "plan-1", name: "Diet Plan", isActive: true },
          { id: "plan-2", name: "Exercise Plan", isActive: false },
          { id: "plan-3", name: "Habit Tracker", isActive: true },
        ],
      });

      await usePlanActivationStore.getState().loadActivations();

      expect(mockFetch).toHaveBeenCalledWith("/api/plans");
      expect(usePlanActivationStore.getState().activePlanIds).toEqual([
        "plan-1",
        "plan-3",
      ]);
      expect(usePlanActivationStore.getState().isLoading).toBe(false);
    });

    it("should set isLoading during load", async () => {
      let resolvePromise: (value: unknown) => void;
      const pending = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValueOnce(pending);

      const loadPromise = usePlanActivationStore.getState().loadActivations();
      expect(usePlanActivationStore.getState().isLoading).toBe(true);

      resolvePromise!({
        ok: true,
        json: async () => [],
      });

      await loadPromise;
      expect(usePlanActivationStore.getState().isLoading).toBe(false);
    });

    it("should set isLoading to false on error", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });

      await expect(
        usePlanActivationStore.getState().loadActivations()
      ).rejects.toThrow("Failed to load plans");

      expect(usePlanActivationStore.getState().isLoading).toBe(false);
    });

    it("should handle empty plans list", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await usePlanActivationStore.getState().loadActivations();

      expect(usePlanActivationStore.getState().activePlanIds).toEqual([]);
    });
  });

  describe("activatePlan", () => {
    it("should call the activate API and add plan ID to state", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "activation-1", planId: "plan-1", isActive: true }),
      });

      await usePlanActivationStore.getState().activatePlan("plan-1");

      expect(mockFetch).toHaveBeenCalledWith("/api/plans/plan-1/activate", {
        method: "POST",
      });
      expect(usePlanActivationStore.getState().activePlanIds).toContain("plan-1");
    });

    it("should not duplicate plan ID if already active", async () => {
      usePlanActivationStore.setState({ activePlanIds: ["plan-1"] });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "activation-1", planId: "plan-1", isActive: true }),
      });

      await usePlanActivationStore.getState().activatePlan("plan-1");

      expect(usePlanActivationStore.getState().activePlanIds).toEqual(["plan-1"]);
    });

    it("should throw on API failure", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });

      await expect(
        usePlanActivationStore.getState().activatePlan("plan-1")
      ).rejects.toThrow("Failed to activate plan");

      expect(usePlanActivationStore.getState().activePlanIds).toEqual([]);
    });

    it("should allow multiple plans to be active simultaneously", async () => {
      usePlanActivationStore.setState({ activePlanIds: ["plan-1"] });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "activation-2", planId: "plan-2", isActive: true }),
      });

      await usePlanActivationStore.getState().activatePlan("plan-2");

      expect(usePlanActivationStore.getState().activePlanIds).toEqual([
        "plan-1",
        "plan-2",
      ]);
    });
  });

  describe("deactivatePlan", () => {
    it("should call the deactivate API and remove plan ID from state", async () => {
      usePlanActivationStore.setState({ activePlanIds: ["plan-1", "plan-2"] });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await usePlanActivationStore.getState().deactivatePlan("plan-1");

      expect(mockFetch).toHaveBeenCalledWith("/api/plans/plan-1/deactivate", {
        method: "POST",
      });
      expect(usePlanActivationStore.getState().activePlanIds).toEqual(["plan-2"]);
    });

    it("should throw on API failure", async () => {
      usePlanActivationStore.setState({ activePlanIds: ["plan-1"] });

      mockFetch.mockResolvedValueOnce({ ok: false });

      await expect(
        usePlanActivationStore.getState().deactivatePlan("plan-1")
      ).rejects.toThrow("Failed to deactivate plan");

      // State should remain unchanged on failure
      expect(usePlanActivationStore.getState().activePlanIds).toEqual(["plan-1"]);
    });

    it("should handle deactivating a plan that is not in state gracefully", async () => {
      usePlanActivationStore.setState({ activePlanIds: ["plan-1"] });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await usePlanActivationStore.getState().deactivatePlan("plan-99");

      expect(usePlanActivationStore.getState().activePlanIds).toEqual(["plan-1"]);
    });
  });
});
