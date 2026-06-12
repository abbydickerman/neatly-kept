'use client';

import type { Plan } from '@/types/layout-plan';

export interface PlanCardProps {
  plan: Plan;
  isActive: boolean;
  onToggle: () => void;
}

/**
 * Plan Card component.
 * Displays a single plan with name, description, list of widgets it provides,
 * and an activation toggle.
 *
 * Requirements: 7.1, 7.3, 7.4
 */
export function PlanCard({ plan, isActive, onToggle }: PlanCardProps) {
  const widgetLabels = plan.widgetDefinitions.map((w) => w.label);

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-lg border bg-white shadow-sm transition-all hover:shadow-md ${
        isActive
          ? 'border-blue-400 ring-2 ring-blue-100'
          : 'border-gray-200'
      }`}
    >
      {/* Header with active indicator */}
      <div className="flex items-center justify-between px-4 pt-4">
        <div className="flex items-center gap-2">
          {isActive && (
            <span className="inline-flex h-2 w-2 rounded-full bg-blue-500" aria-label="Active" />
          )}
          <h3 className="text-sm font-semibold text-gray-900">{plan.name}</h3>
        </div>
        {isActive && (
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
            Active
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4 pt-2">
        <p className="text-xs text-gray-600 line-clamp-2">{plan.description}</p>

        {/* Widget preview */}
        <div className="mt-3">
          <p className="text-xs font-medium text-gray-500 mb-1">
            Adds:
          </p>
          <div className="flex flex-wrap gap-1">
            {widgetLabels.map((label) => (
              <span
                key={label}
                className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Toggle button */}
        <button
          onClick={onToggle}
          className={`mt-4 w-full rounded-md px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            isActive
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-400'
              : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
          }`}
          aria-label={isActive ? `Deactivate ${plan.name}` : `Activate ${plan.name}`}
        >
          {isActive ? 'Deactivate' : 'Activate'}
        </button>
      </div>
    </article>
  );
}

export default PlanCard;
