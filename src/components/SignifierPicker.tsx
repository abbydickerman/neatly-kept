'use client';

import { useState } from 'react';
import type { Signifier } from '@/types/models';
import { validateSignifiers } from '@/services/entry-service';

interface SignifierPickerProps {
  currentSignifiers: Signifier[];
  onAdd: (signifier: Signifier) => void;
  onRemove: (signifierId: string) => void;
}

const AVAILABLE_PRIORITY_SIGNIFIERS: Signifier[] = [
  { id: 'sig-priority-high', symbol: '★', category: 'priority', label: 'High Priority' },
  { id: 'sig-priority-important', symbol: '!', category: 'priority', label: 'Important' },
];

const AVAILABLE_CATEGORY_SIGNIFIERS: Signifier[] = [
  { id: 'sig-cat-personal', symbol: '♦', category: 'category', label: 'Personal' },
  { id: 'sig-cat-work', symbol: '■', category: 'category', label: 'Work' },
  { id: 'sig-cat-health', symbol: '♥', category: 'category', label: 'Health' },
  { id: 'sig-cat-finance', symbol: '$', category: 'category', label: 'Finance' },
];

/**
 * Allows users to add/remove signifiers from an entry.
 * Enforces max 3 signifiers total, max 1 priority, max 2 category (Requirement 4.4).
 */
export function SignifierPicker({ currentSignifiers, onAdd, onRemove }: SignifierPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const nonTypeSignifiers = currentSignifiers.filter((s) => s.category !== 'type');
  const priorityCount = nonTypeSignifiers.filter((s) => s.category === 'priority').length;
  const categoryCount = nonTypeSignifiers.filter((s) => s.category === 'category').length;

  const canAddPriority = priorityCount < 1 && nonTypeSignifiers.length < 3;
  const canAddCategory = categoryCount < 2 && nonTypeSignifiers.length < 3;

  function handleAdd(signifier: Signifier) {
    const proposed = [...currentSignifiers, signifier];
    const result = validateSignifiers(proposed);
    if (result.valid) {
      onAdd(signifier);
    }
  }

  function isAlreadyAdded(signifierId: string): boolean {
    return currentSignifiers.some((s) => s.id === signifierId);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="text-sm text-blue-600 hover:text-blue-800 underline"
        aria-label="Add signifier"
      >
        + Signifier
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-56 bg-white border border-gray-200 rounded-md shadow-lg p-2">
          {canAddPriority && (
            <div className="mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Priority</p>
              {AVAILABLE_PRIORITY_SIGNIFIERS.map((sig) => (
                <button
                  key={sig.id}
                  type="button"
                  disabled={isAlreadyAdded(sig.id)}
                  onClick={() => {
                    handleAdd(sig);
                    setIsOpen(false);
                  }}
                  className="block w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="mr-2">{sig.symbol}</span>
                  {sig.label}
                </button>
              ))}
            </div>
          )}

          {canAddCategory && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Category</p>
              {AVAILABLE_CATEGORY_SIGNIFIERS.map((sig) => (
                <button
                  key={sig.id}
                  type="button"
                  disabled={isAlreadyAdded(sig.id)}
                  onClick={() => {
                    handleAdd(sig);
                    setIsOpen(false);
                  }}
                  className="block w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="mr-2">{sig.symbol}</span>
                  {sig.label}
                </button>
              ))}
            </div>
          )}

          {!canAddPriority && !canAddCategory && (
            <p className="text-xs text-gray-500 p-2">Maximum signifiers reached</p>
          )}
        </div>
      )}

      {/* Display removable non-type signifiers */}
      {nonTypeSignifiers.length > 0 && (
        <div className="flex gap-1 mt-1">
          {nonTypeSignifiers.map((sig) => (
            <span
              key={sig.id}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-gray-100 rounded"
            >
              {sig.symbol} {sig.label}
              <button
                type="button"
                onClick={() => onRemove(sig.id)}
                className="text-gray-400 hover:text-red-500 ml-0.5"
                aria-label={`Remove ${sig.label} signifier`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
