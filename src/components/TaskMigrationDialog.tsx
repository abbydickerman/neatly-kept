'use client';

import { useState } from 'react';
import type { JournalPage } from '@/types/models';

interface TaskMigrationDialogProps {
  isOpen: boolean;
  availablePages: JournalPage[];
  currentPageId: string;
  onMigrate: (targetPageId: string) => void;
  onCancel: () => void;
}

/**
 * Prompts the user to select a target page for task migration (Requirement 3.3).
 * If no valid target is selected, the task remains in its current state (Requirement 3.7).
 */
export function TaskMigrationDialog({
  isOpen,
  availablePages,
  currentPageId,
  onMigrate,
  onCancel,
}: TaskMigrationDialogProps) {
  const [selectedPageId, setSelectedPageId] = useState<string>('');

  // Filter out the current page from available targets
  const targetPages = availablePages.filter((page) => page.id !== currentPageId);

  if (!isOpen) return null;

  function handleMigrate() {
    if (!selectedPageId) return;
    onMigrate(selectedPageId);
    setSelectedPageId('');
  }

  function handleCancel() {
    setSelectedPageId('');
    onCancel();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="migration-dialog-title"
    >
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <h2 id="migration-dialog-title" className="text-lg font-semibold mb-4">
          Migrate Task
        </h2>

        <p className="text-sm text-gray-600 mb-4">
          Select a target page to migrate this task to. The task will be copied to the
          selected page with an incomplete state, and the original will be marked as migrated.
        </p>

        {targetPages.length === 0 ? (
          <p className="text-sm text-gray-500 italic mb-4">
            No other pages available for migration.
          </p>
        ) : (
          <div className="mb-4">
            <label htmlFor="target-page" className="block text-sm font-medium text-gray-700 mb-2">
              Target Page
            </label>
            <select
              id="target-page"
              value={selectedPageId}
              onChange={(e) => setSelectedPageId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a page...</option>
              {targetPages.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleMigrate}
            disabled={!selectedPageId}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Migrate
          </button>
        </div>
      </div>
    </div>
  );
}
