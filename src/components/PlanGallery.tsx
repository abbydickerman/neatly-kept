'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Plan } from '@/types/layout-plan';
import { usePlanActivationStore } from '@/store/plan-activation-store';
import { PlanCard } from './PlanCard';

/**
 * Plan Gallery component.
 * Displays all available plans with name, description, widget preview, and
 * active/inactive indicator. Provides toggle buttons for activation/deactivation.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */
export function PlanGallery() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingPlanId, setTogglingPlanId] = useState<string | null>(null);

  const { activePlanIds, activatePlan, deactivatePlan, loadActivations } =
    usePlanActivationStore();

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/plans');
      if (!response.ok) {
        throw new Error('Failed to fetch plans');
      }
      const data = await response.json();
      setPlans(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
    loadActivations();
  }, [fetchPlans, loadActivations]);

  const handleToggle = async (planId: string) => {
    setTogglingPlanId(planId);
    setError(null);

    try {
      const isCurrentlyActive = activePlanIds.includes(planId);
      if (isCurrentlyActive) {
        await deactivatePlan(planId);
      } else {
        await activatePlan(planId);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update plan status'
      );
    } finally {
      setTogglingPlanId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Plan Picks</h2>
        <p className="mt-1 text-sm text-gray-600">
          Browse and activate plan add-ons to enhance your journal with structured content
        </p>
      </div>

      {/* Error State */}
      {error && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-sm text-gray-500">Loading plans...</div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && plans.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-gray-500">No plans available.</p>
        </div>
      )}

      {/* Plans Grid */}
      {!loading && plans.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isActive={activePlanIds.includes(plan.id)}
              onToggle={() => handleToggle(plan.id)}
            />
          ))}
        </div>
      )}

      {/* Active plans summary */}
      {!loading && activePlanIds.length > 0 && (
        <div className="rounded-md border border-blue-100 bg-blue-50 p-3 text-sm text-blue-700">
          <span className="font-medium">{activePlanIds.length}</span>{' '}
          {activePlanIds.length === 1 ? 'plan' : 'plans'} currently active
        </div>
      )}
    </div>
  );
}

export default PlanGallery;
