'use client';

import { useState } from 'react';
import type { Entry, EntryType, Signifier, TaskAction, JournalPage } from '@/types/models';
import { EntryForm } from './EntryForm';
import { EntryItem } from './EntryItem';

interface EntryListProps {
  entries: Entry[];
  pageId: string;
  availablePages?: JournalPage[];
  onCreateEntry: (entry: { type: EntryType; text: string; signifiers: Signifier[]; date?: Date }) => void;
  onTaskAction?: (entryId: string, action: TaskAction) => void;
  onMigrate?: (entryId: string, targetPageId: string) => void;
}

/**
 * Displays a list of entries for a journal page with the ability to create new entries.
 * Combines EntryForm and EntryItem components.
 */
export function EntryList({
  entries,
  pageId,
  availablePages = [],
  onCreateEntry,
  onTaskAction,
  onMigrate,
}: EntryListProps) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-2">
      {/* Entry list */}
      {entries.length === 0 && !showForm && (
        <p className="text-sm text-gray-500 italic py-4 text-center">
          No entries yet. Create your first entry below.
        </p>
      )}

      <div className="divide-y divide-gray-100">
        {entries.map((entry) => (
          <EntryItem
            key={entry.id}
            entry={entry}
            availablePages={availablePages}
            onTaskAction={onTaskAction}
            onMigrate={onMigrate}
          />
        ))}
      </div>

      {/* Add entry button / form */}
      {showForm ? (
        <EntryForm
          pageId={pageId}
          onSubmit={(entry) => {
            onCreateEntry(entry);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="w-full py-2 text-sm text-gray-600 border border-dashed border-gray-300 rounded-md hover:border-gray-400 hover:text-gray-700 transition-colors"
        >
          + Add Entry
        </button>
      )}
    </div>
  );
}
