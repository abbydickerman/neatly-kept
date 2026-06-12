'use client';

import { useState, useCallback, useMemo } from 'react';
import type { Collection, CollectionEntry, Entry, Layout, EntryType } from '@/types/models';
import { validateCollectionName, COLLECTION_TEMPLATES } from '@/services/collection-service';

// === Types ===

export interface CollectionEntryDisplay {
  entry: Entry;
  addedAt: Date;
  sourcePageName: string;
}

export interface CollectionViewProps {
  /** All collections for the current user */
  collections: Collection[];
  /** Available layouts for assignment */
  layouts: Layout[];
  /** The currently selected collection (if any) */
  selectedCollection?: Collection;
  /** Entries linked to the selected collection, sorted by addedAt */
  collectionEntries: CollectionEntryDisplay[];
  /** Available entries that can be added to the collection */
  availableEntries: Entry[];
  /** Callback when user creates a new collection */
  onCreateCollection: (name: string, layoutId: string, templateType?: 'habit-tracker' | 'reading-list' | 'goal-tracking') => Promise<void>;
  /** Callback when user selects a collection to view */
  onSelectCollection: (collectionId: string) => void;
  /** Callback when user adds an entry to the selected collection */
  onAddEntry: (entryId: string) => Promise<void>;
  /** Callback when user removes an entry from the selected collection */
  onRemoveEntry: (entryId: string) => Promise<void>;
  /** Callback when user deletes a collection */
  onDeleteCollection: (collectionId: string) => Promise<void>;
}

// === Signifier display helpers ===

const ENTRY_TYPE_SIGNIFIERS: Record<EntryType, { symbol: string; label: string }> = {
  task: { symbol: '•', label: 'Task' },
  event: { symbol: '○', label: 'Event' },
  note: { symbol: '–', label: 'Note' },
};

// === Sub-components ===

interface CreateCollectionFormProps {
  layouts: Layout[];
  onSubmit: (name: string, layoutId: string, templateType?: 'habit-tracker' | 'reading-list' | 'goal-tracking') => Promise<void>;
}

function CreateCollectionForm({ layouts, onSubmit }: CreateCollectionFormProps) {
  const [name, setName] = useState('');
  const [layoutId, setLayoutId] = useState(layouts[0]?.id ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = validateCollectionName(name);
    if (!validation.valid) {
      setError(validation.errors[0]);
      return;
    }

    if (!layoutId) {
      setError('Please select a layout');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(name.trim(), layoutId);
      setName('');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create collection');
    } finally {
      setIsSubmitting(false);
    }
  }, [name, layoutId, onSubmit]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 p-4">
      <h3 className="text-lg font-semibold">Create New Collection</h3>

      <div>
        <label htmlFor="collection-name" className="block text-sm font-medium text-gray-700">
          Name (1-100 characters)
        </label>
        <input
          id="collection-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          placeholder="Enter collection name"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          aria-describedby={error ? 'collection-name-error' : undefined}
          aria-invalid={!!error}
        />
        {error && (
          <p id="collection-name-error" className="mt-1 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="collection-layout" className="block text-sm font-medium text-gray-700">
          Layout
        </label>
        <select
          id="collection-layout"
          value={layoutId}
          onChange={(e) => setLayoutId(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {layouts.map((layout) => (
            <option key={layout.id} value={layout.id}>
              {layout.name}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isSubmitting ? 'Creating...' : 'Create Collection'}
      </button>
    </form>
  );
}

interface CollectionTemplatesProps {
  layouts: Layout[];
  onCreateFromTemplate: (name: string, layoutId: string, templateType: 'habit-tracker' | 'reading-list' | 'goal-tracking') => Promise<void>;
}

function CollectionTemplates({ layouts, onCreateFromTemplate }: CollectionTemplatesProps) {
  const [creatingTemplate, setCreatingTemplate] = useState<string | null>(null);

  const handleUseTemplate = useCallback(async (template: typeof COLLECTION_TEMPLATES[number]) => {
    if (layouts.length === 0) return;
    setCreatingTemplate(template.templateType);
    try {
      await onCreateFromTemplate(template.name, layouts[0].id, template.templateType);
    } finally {
      setCreatingTemplate(null);
    }
  }, [layouts, onCreateFromTemplate]);

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">Collection Templates</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {COLLECTION_TEMPLATES.map((template) => (
          <div
            key={template.templateType}
            className="rounded-lg border border-gray-200 p-4"
          >
            <h4 className="font-medium">{template.name}</h4>
            <p className="mt-1 text-sm text-gray-500">
              {template.templateType === 'habit-tracker' && 'Track daily habits and routines'}
              {template.templateType === 'reading-list' && 'Organize books and reading goals'}
              {template.templateType === 'goal-tracking' && 'Set and monitor your goals'}
            </p>
            <button
              onClick={() => handleUseTemplate(template)}
              disabled={creatingTemplate === template.templateType || layouts.length === 0}
              className="mt-3 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {creatingTemplate === template.templateType ? 'Creating...' : 'Use Template'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

interface CollectionEntryListProps {
  entries: CollectionEntryDisplay[];
  onRemoveEntry: (entryId: string) => Promise<void>;
}

function CollectionEntryList({ entries, onRemoveEntry }: CollectionEntryListProps) {
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleRemove = useCallback(async (entryId: string) => {
    setRemovingId(entryId);
    try {
      await onRemoveEntry(entryId);
    } finally {
      setRemovingId(null);
    }
  }, [onRemoveEntry]);

  if (entries.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-gray-500">
        No entries in this collection yet. Add entries to get started.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-gray-100" role="list" aria-label="Collection entries">
      {entries.map(({ entry, addedAt, sourcePageName }) => {
        const signifier = ENTRY_TYPE_SIGNIFIERS[entry.type];
        return (
          <li key={entry.id} className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3 min-w-0">
              <span
                className="flex-shrink-0 text-lg"
                aria-label={signifier.label}
                title={signifier.label}
              >
                {signifier.symbol}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">
                  {entry.text}
                </p>
                <p className="text-xs text-gray-500">
                  From: {sourcePageName} · Added: {addedAt.toLocaleDateString()}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleRemove(entry.id)}
              disabled={removingId === entry.id}
              className="ml-3 flex-shrink-0 rounded-md px-2 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
              aria-label={`Remove "${entry.text}" from collection`}
            >
              {removingId === entry.id ? 'Removing...' : 'Remove'}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

interface AddEntryToCollectionProps {
  availableEntries: Entry[];
  onAddEntry: (entryId: string) => Promise<void>;
}

function AddEntryToCollection({ availableEntries, onAddEntry }: AddEntryToCollectionProps) {
  const [selectedEntryId, setSelectedEntryId] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = useCallback(async () => {
    if (!selectedEntryId) return;
    setIsAdding(true);
    setError(null);
    try {
      await onAddEntry(selectedEntryId);
      setSelectedEntryId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add entry');
    } finally {
      setIsAdding(false);
    }
  }, [selectedEntryId, onAddEntry]);

  if (availableEntries.length === 0) {
    return (
      <p className="text-sm text-gray-500">No available entries to add.</p>
    );
  }

  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <label htmlFor="add-entry-select" className="block text-sm font-medium text-gray-700">
          Add Entry
        </label>
        <select
          id="add-entry-select"
          value={selectedEntryId}
          onChange={(e) => setSelectedEntryId(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Select an entry...</option>
          {availableEntries.map((entry) => {
            const signifier = ENTRY_TYPE_SIGNIFIERS[entry.type];
            return (
              <option key={entry.id} value={entry.id}>
                {signifier.symbol} {entry.text.slice(0, 60)}{entry.text.length > 60 ? '...' : ''}
              </option>
            );
          })}
        </select>
      </div>
      <button
        onClick={handleAdd}
        disabled={!selectedEntryId || isAdding}
        className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isAdding ? 'Adding...' : 'Add'}
      </button>
      {error && (
        <p className="text-sm text-red-600" role="alert">{error}</p>
      )}
    </div>
  );
}

// === Main Component ===

export default function CollectionView({
  collections,
  layouts,
  selectedCollection,
  collectionEntries,
  availableEntries,
  onCreateCollection,
  onSelectCollection,
  onAddEntry,
  onRemoveEntry,
  onDeleteCollection,
}: CollectionViewProps) {
  const [isDeletingCollection, setIsDeletingCollection] = useState(false);

  const handleDeleteCollection = useCallback(async () => {
    if (!selectedCollection) return;
    setIsDeletingCollection(true);
    try {
      await onDeleteCollection(selectedCollection.id);
    } finally {
      setIsDeletingCollection(false);
    }
  }, [selectedCollection, onDeleteCollection]);

  const templateCollections = useMemo(
    () => collections.filter((c) => c.isTemplate),
    [collections]
  );

  const userCollections = useMemo(
    () => collections.filter((c) => !c.isTemplate),
    [collections]
  );

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <h2 className="text-2xl font-bold">Collections</h2>

      {/* Collection List */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Your Collections</h3>
        {collections.length === 0 ? (
          <p className="text-sm text-gray-500">
            No collections yet. Create one below or use a template.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {userCollections.map((collection) => (
              <button
                key={collection.id}
                onClick={() => onSelectCollection(collection.id)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  selectedCollection?.id === collection.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                aria-pressed={selectedCollection?.id === collection.id}
              >
                <p className="font-medium">{collection.name}</p>
                <p className="text-xs text-gray-500">
                  Created: {collection.createdAt.toLocaleDateString()}
                </p>
              </button>
            ))}
            {templateCollections.map((collection) => (
              <button
                key={collection.id}
                onClick={() => onSelectCollection(collection.id)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  selectedCollection?.id === collection.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-green-200 hover:border-green-300 hover:bg-green-50'
                }`}
                aria-pressed={selectedCollection?.id === collection.id}
              >
                <p className="font-medium">{collection.name}</p>
                <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                  Template
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected Collection Detail */}
      {selectedCollection && (
        <div className="space-y-4 rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{selectedCollection.name}</h3>
            <button
              onClick={handleDeleteCollection}
              disabled={isDeletingCollection}
              className="rounded-md px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {isDeletingCollection ? 'Deleting...' : 'Delete Collection'}
            </button>
          </div>

          {/* Add Entry */}
          <AddEntryToCollection
            availableEntries={availableEntries}
            onAddEntry={onAddEntry}
          />

          {/* Entry List */}
          <CollectionEntryList
            entries={collectionEntries}
            onRemoveEntry={onRemoveEntry}
          />
        </div>
      )}

      {/* Create Collection Form */}
      <CreateCollectionForm
        layouts={layouts}
        onSubmit={onCreateCollection}
      />

      {/* Pre-built Templates */}
      <CollectionTemplates
        layouts={layouts}
        onCreateFromTemplate={onCreateCollection}
      />
    </div>
  );
}
