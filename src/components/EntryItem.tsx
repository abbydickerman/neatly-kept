'use client';

import type { Entry, TaskAction, JournalPage } from '@/types/models';
import { SignifierBadge } from './SignifierBadge';
import { TaskActions } from './TaskActions';
import { TaskMigrationDialog } from './TaskMigrationDialog';
import { useState } from 'react';

interface EntryItemProps {
  entry: Entry;
  availablePages?: JournalPage[];
  onTaskAction?: (entryId: string, action: TaskAction) => void;
  onMigrate?: (entryId: string, targetPageId: string) => void;
}

/**
 * Displays a single entry with type-specific signifiers (Requirement 4.2, 4.3).
 * For tasks, shows valid state transition actions (Requirements 3.1-3.6).
 */
export function EntryItem({ entry, availablePages = [], onTaskAction, onMigrate }: EntryItemProps) {
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);

  function handleTaskAction(action: TaskAction) {
    if (action === 'migrate') {
      setShowMigrationDialog(true);
    } else {
      onTaskAction?.(entry.id, action);
    }
  }

  function handleMigrate(targetPageId: string) {
    onMigrate?.(entry.id, targetPageId);
    setShowMigrationDialog(false);
  }

  const isComplete = entry.state === 'complete';
  const isCancelled = entry.state === 'cancelled';
  const isMigrated = entry.state === 'migrated';

  return (
    <div className="flex items-start gap-2 py-2 px-3 rounded-md hover:bg-gray-50 group">
      {/* Signifiers displayed left of entry text (Requirement 4.3) */}
      <div className="flex items-center gap-0.5 flex-shrink-0 pt-0.5">
        {entry.signifiers.map((signifier) => (
          <SignifierBadge key={signifier.id} signifier={signifier} />
        ))}
      </div>

      {/* Entry content */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm ${
            isComplete
              ? 'line-through text-gray-400'
              : isCancelled
                ? 'line-through text-red-400'
                : isMigrated
                  ? 'text-gray-400 italic'
                  : 'text-gray-900'
          }`}
        >
          {entry.text}
        </p>

        {/* Date display */}
        {entry.date && (
          <p className="text-xs text-gray-500 mt-0.5">
            {new Date(entry.date).toLocaleDateString()}
          </p>
        )}

        {/* Task actions (only for task entries) */}
        {entry.type === 'task' && entry.state && (
          <div className="mt-1">
            <TaskActions currentState={entry.state} onAction={handleTaskAction} />
          </div>
        )}
      </div>

      {/* Migration Dialog */}
      {showMigrationDialog && (
        <TaskMigrationDialog
          isOpen={showMigrationDialog}
          availablePages={availablePages}
          currentPageId={entry.pageId}
          onMigrate={handleMigrate}
          onCancel={() => setShowMigrationDialog(false)}
        />
      )}
    </div>
  );
}
