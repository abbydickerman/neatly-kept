import { describe, it, expect, beforeEach, vi } from "vitest";
import { useLayoutSelectionStore } from "./layout-selection-store";

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("layout-selection-store", () => {
  beforeEach(() => {
    // Reset store state between tests
    useLayoutSelectionStore.setState({
      activeWeeklyTemplateId: null,
      activeMonthlyTemplateId: null,
      isLoading: false,
    });
    mockFetch.mockReset();
  });

  describe("initial state", () => {
    it("should have null template IDs and not be loading", () => {
      const state = useLayoutSelectionStore.getState();
      expect(state.activeWeeklyTemplateId).toBeNull();
      expect(state.activeMonthlyTemplateId).toBeNull();
      expect(state.isLoading).toBe(false);
    });
  });

  describe("loadSelections", () => {
    it("should load weekly and monthly selections from the API", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          weekly: { templateId: "weekly-template-1" },
          monthly: { templateId: "monthly-template-1" },
        }),
      });

      await useLayoutSelectionStore.getState().loadSelections();

      expect(mockFetch).toHaveBeenCalledWith("/api/layout-selections");
      const state = useLayoutSelectionStore.getState();
      expect(state.activeWeeklyTemplateId).toBe("weekly-template-1");
      expect(state.activeMonthlyTemplateId).toBe("monthly-template-1");
      expect(state.isLoading).toBe(false);
    });

    it("should set isLoading to true while fetching", async () => {
      let resolveResponse: (value: unknown) => void;
      const responsePromise = new Promise((resolve) => {
        resolveResponse = resolve;
      });

      mockFetch.mockReturnValueOnce(responsePromise);

      const loadPromise = useLayoutSelectionStore.getState().loadSelections();

      expect(useLayoutSelectionStore.getState().isLoading).toBe(true);

      resolveResponse!({
        ok: true,
        json: async () => ({ weekly: null, monthly: null }),
      });

      await loadPromise;

      expect(useLayoutSelectionStore.getState().isLoading).toBe(false);
    });

    it("should handle null selections gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          weekly: null,
          monthly: null,
        }),
      });

      await useLayoutSelectionStore.getState().loadSelections();

      const state = useLayoutSelectionStore.getState();
      expect(state.activeWeeklyTemplateId).toBeNull();
      expect(state.activeMonthlyTemplateId).toBeNull();
    });

    it("should throw and set isLoading to false on API failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(
        useLayoutSelectionStore.getState().loadSelections()
      ).rejects.toThrow("Failed to load layout selections");

      expect(useLayoutSelectionStore.getState().isLoading).toBe(false);
    });
  });

  describe("activateTemplate", () => {
    it("should POST to the API and set activeWeeklyTemplateId for weekly category", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "selection-1",
          templateId: "weekly-template-2",
          category: "weekly",
        }),
      });

      await useLayoutSelectionStore
        .getState()
        .activateTemplate("weekly-template-2", "weekly");

      expect(mockFetch).toHaveBeenCalledWith("/api/layout-selections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: "weekly-template-2" }),
      });
      expect(useLayoutSelectionStore.getState().activeWeeklyTemplateId).toBe(
        "weekly-template-2"
      );
      expect(
        useLayoutSelectionStore.getState().activeMonthlyTemplateId
      ).toBeNull();
    });

    it("should POST to the API and set activeMonthlyTemplateId for monthly category", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "selection-2",
          templateId: "monthly-template-2",
          category: "monthly",
        }),
      });

      await useLayoutSelectionStore
        .getState()
        .activateTemplate("monthly-template-2", "monthly");

      expect(mockFetch).toHaveBeenCalledWith("/api/layout-selections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: "monthly-template-2" }),
      });
      expect(
        useLayoutSelectionStore.getState().activeMonthlyTemplateId
      ).toBe("monthly-template-2");
      expect(
        useLayoutSelectionStore.getState().activeWeeklyTemplateId
      ).toBeNull();
    });

    it("should replace the existing active template of the same category", async () => {
      // Set initial state
      useLayoutSelectionStore.setState({
        activeWeeklyTemplateId: "old-weekly-template",
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "selection-3",
          templateId: "new-weekly-template",
          category: "weekly",
        }),
      });

      await useLayoutSelectionStore
        .getState()
        .activateTemplate("new-weekly-template", "weekly");

      expect(useLayoutSelectionStore.getState().activeWeeklyTemplateId).toBe(
        "new-weekly-template"
      );
    });

    it("should throw on API failure without updating state", async () => {
      useLayoutSelectionStore.setState({
        activeWeeklyTemplateId: "existing-template",
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(
        useLayoutSelectionStore
          .getState()
          .activateTemplate("bad-template", "weekly")
      ).rejects.toThrow("Failed to activate template");

      // State should remain unchanged
      expect(useLayoutSelectionStore.getState().activeWeeklyTemplateId).toBe(
        "existing-template"
      );
    });
  });
});
