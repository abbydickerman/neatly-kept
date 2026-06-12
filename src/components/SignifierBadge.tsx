'use client';

import type { Signifier } from '@/types/models';

interface SignifierBadgeProps {
  signifier: Signifier;
}

/**
 * Displays a single signifier symbol with appropriate styling based on category.
 * Rendered to the left of entry text per requirement 4.3.
 */
export function SignifierBadge({ signifier }: SignifierBadgeProps) {
  const categoryStyles: Record<string, string> = {
    type: 'text-gray-700',
    priority: 'text-red-600 font-bold',
    category: 'text-blue-600',
  };

  return (
    <span
      className={`inline-flex items-center justify-center w-5 h-5 text-sm ${categoryStyles[signifier.category] ?? 'text-gray-700'}`}
      title={signifier.label}
      aria-label={signifier.label}
    >
      {signifier.symbol}
    </span>
  );
}
