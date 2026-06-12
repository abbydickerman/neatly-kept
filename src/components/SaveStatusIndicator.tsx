'use client';

import { useEffect, useState } from 'react';
import type { SaveStatus } from '@/types/persistence';
import type { SaveOperation } from '@/types/persistence';

export interface SaveStatusIndicatorProps {
  /** Current save queue status */
  status: SaveStatus;
  /** Whether there are unsaved changes */
  hasUnsavedChanges: boolean;
  /** List of pending operations for displaying retry info */
  pendingOperations: SaveOperation[];
  /** Called when the user requests to retry a failed operation */
  onRetry?: (operationId: string) => void;
}

/**
 * Displays the current persistence state to the user.
 * - Shows unsaved changes indicator when pending operations exist (Requirement 8.6)
 * - Shows save failure notification with retry information (Requirement 8.4)
 * - Shows persistent warning when all retries exhausted (Requirement 8.5)
 */
export function SaveStatusIndicator({
  status,
  hasUnsavedChanges,
  pendingOperations,
  onRetry,
}: SaveStatusIndicatorProps) {
  const [dismissedWarning, setDismissedWarning] = useState(false);

  // Reset dismissed state when status changes away from failed
  useEffect(() => {
    if (status !== 'failed') {
      setDismissedWarning(false);
    }
  }, [status]);

  if (!hasUnsavedChanges && status === 'idle') {
    return null;
  }

  // Persistent warning when all retries are exhausted (Requirement 8.5)
  if (status === 'failed' && !dismissedWarning) {
    const failedOps = pendingOperations.filter(
      (op) => op.attempts >= op.maxAttempts
    );

    return (
      <div
        role="alert"
        aria-live="assertive"
        className="fixed bottom-4 right-4 max-w-sm bg-red-50 border border-red-300 rounded-lg p-4 shadow-lg z-50"
      >
        <div className="flex items-start gap-3">
          <span className="text-red-500 text-xl flex-shrink-0" aria-hidden="true">
            ⚠
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">
              Changes could not be saved
            </p>
            <p className="text-xs text-red-600 mt-1">
              {failedOps.length} operation{failedOps.length !== 1 ? 's' : ''} failed after
              all retry attempts. Your changes are retained in memory.
            </p>
            {onRetry && failedOps.length > 0 && (
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => onRetry(failedOps[0].id)}
                  className="text-xs font-medium text-red-700 underline hover:text-red-900"
                >
                  Retry
                </button>
                <button
                  type="button"
                  onClick={() => setDismissedWarning(true)}
                  className="text-xs font-medium text-red-700 underline hover:text-red-900"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Save failure notification with retry info (Requirement 8.4)
  if (status === 'retrying') {
    const retryingOps = pendingOperations.filter((op) => op.attempts > 0);
    const currentOp = retryingOps[0];

    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-4 right-4 max-w-sm bg-amber-50 border border-amber-300 rounded-lg p-4 shadow-lg z-50"
      >
        <div className="flex items-start gap-3">
          <span className="text-amber-500 text-xl flex-shrink-0 animate-pulse" aria-hidden="true">
            ↻
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">
              Save failed — retrying
            </p>
            {currentOp && (
              <p className="text-xs text-amber-600 mt-1">
                Attempt {currentOp.attempts} of {currentOp.maxAttempts}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Unsaved changes indicator (Requirement 8.6)
  if (hasUnsavedChanges) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-4 right-4 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 shadow-md z-50"
      >
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"
            aria-hidden="true"
          />
          <span className="text-xs font-medium text-blue-700">Saving...</span>
        </div>
      </div>
    );
  }

  return null;
}
