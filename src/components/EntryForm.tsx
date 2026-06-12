'use client';

import { useState } from 'react';
import type { EntryType, Signifier } from '@/types/models';
import { validateEntryText, validateEntryType, getDefaultSignifier } from '@/services/entry-service';
import { SignifierPicker } from './SignifierPicker';

interface EntryFormProps {
  pageId: string;
  onSubmit: (entry: {
    type: EntryType;
    text: string;
    signifiers: Signifier[];
    date?: Date;
  }) => void;
  onCancel?: () => void;
}

/**
 * Entry creation form requiring type selection (task/event/note) before save.
 * Prevents save of empty text entries with error message (Requirements 4.1, 4.5, 4.6).
 */
export function EntryForm({ pageId, onSubmit, onCancel }: EntryFormProps) {
  const [type, setType] = useState<EntryType | null>(null);
  const [text, setText] = useState('');
  const [date, setDate] = useState('');
  const [signifiers, setSignifiers] = useState<Signifier[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  function handleTypeSelect(selectedType: EntryType) {
    setType(selectedType);
    // Set the default type signifier when type is selected
    const defaultSig = getDefaultSignifier(selectedType);
    setSignifiers((prev) => {
      const withoutType = prev.filter((s) => s.category !== 'type');
      return [defaultSig, ...withoutType];
    });
  }

  function handleAddSignifier(signifier: Signifier) {
    setSignifiers((prev) => [...prev, signifier]);
  }

  function handleRemoveSignifier(signifierId: string) {
    setSignifiers((prev) => prev.filter((s) => s.id !== signifierId));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationErrors: string[] = [];

    // Validate type is selected (Requirement 4.1)
    const typeResult = validateEntryType(type);
    if (!typeResult.valid) {
      validationErrors.push(...typeResult.errors);
    }

    // Validate text is not empty (Requirement 4.5, 4.6)
    const textResult = validateEntryText(text);
    if (!textResult.valid) {
      validationErrors.push(...textResult.errors);
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    onSubmit({
      type: type!,
      text: text.trim(),
      signifiers,
      date: date ? new Date(date) : undefined,
    });

    // Reset form
    setType(null);
    setText('');
    setDate('');
    setSignifiers([]);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border border-gray-200 rounded-lg bg-white">
      <h3 className="text-lg font-semibold">New Entry</h3>

      {/* Type Selection - Required before save (Requirement 4.1) */}
      <fieldset>
        <legend className="text-sm font-medium text-gray-700 mb-2">
          Entry Type <span className="text-red-500">*</span>
        </legend>
        <div className="flex gap-2">
          {(['task', 'event', 'note'] as EntryType[]).map((entryType) => {
            const labels: Record<EntryType, { symbol: string; name: string }> = {
              task: { symbol: '•', name: 'Task' },
              event: { symbol: '○', name: 'Event' },
              note: { symbol: '–', name: 'Note' },
            };
            const { symbol, name } = labels[entryType];
            const isSelected = type === entryType;

            return (
              <button
                key={entryType}
                type="button"
                onClick={() => handleTypeSelect(entryType)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-medium transition-colors ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
                aria-pressed={isSelected}
              >
                <span className="text-lg">{symbol}</span>
                {name}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Text Input */}
      <div>
        <label htmlFor="entry-text" className="block text-sm font-medium text-gray-700 mb-1">
          Entry Text <span className="text-red-500">*</span>
        </label>
        <textarea
          id="entry-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter your text (1-500 characters)"
          maxLength={500}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
        <p className="text-xs text-gray-500 mt-1">{text.trim().length}/500 characters</p>
      </div>

      {/* Date (optional for tasks, required for events) */}
      {(type === 'event' || type === 'task') && (
        <div>
          <label htmlFor="entry-date" className="block text-sm font-medium text-gray-700 mb-1">
            Date {type === 'event' && <span className="text-red-500">*</span>}
          </label>
          <input
            id="entry-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      )}

      {/* Signifier Picker (Requirement 4.3, 4.4) */}
      {type && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Signifiers</label>
          <SignifierPicker
            currentSignifiers={signifiers}
            onAdd={handleAddSignifier}
            onRemove={handleRemoveSignifier}
          />
        </div>
      )}

      {/* Error Messages (Requirement 4.5) */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3" role="alert">
          <ul className="list-disc list-inside text-sm text-red-700">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm font-medium"
        >
          Save Entry
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-sm font-medium"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
