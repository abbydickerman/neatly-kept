'use client';

import { useState, useCallback } from 'react';
import type { PlanWidgetDefinition, PlanWidgetDataRecord } from '@/types/layout-plan';

export interface PlanWidgetRendererProps {
  widget: PlanWidgetDefinition;
  data: PlanWidgetDataRecord | null;
  date: Date;
  onDataChange: (value: string) => void;
}

/**
 * Renders a single plan widget based on its inputType:
 * - 'free-text': a simple text input for the user to type into
 * - 'checklist': a list of checkable items with an add-item input
 */
export function PlanWidgetRenderer({ widget, data, date, onDataChange }: PlanWidgetRendererProps) {
  if (widget.inputType === 'checklist') {
    return (
      <ChecklistWidget
        label={widget.label}
        value={data?.value ?? ''}
        onChange={onDataChange}
      />
    );
  }

  return (
    <FreeTextWidget
      label={widget.label}
      value={data?.value ?? ''}
      onChange={onDataChange}
    />
  );
}

// === Free Text Widget ===

function FreeTextWidget({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [localValue, setLocalValue] = useState(value);

  const handleBlur = useCallback(() => {
    if (localValue !== value) {
      onChange(localValue);
    }
  }, [localValue, value, onChange]);

  return (
    <div className="mb-2">
      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5">
        {label}
      </label>
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        placeholder={`Enter ${label.toLowerCase()}...`}
        className="w-full text-[11px] text-gray-600 bg-white/50 border border-gray-100 rounded px-2 py-1 outline-none focus:border-[#4EDBA1]/50 focus:ring-1 focus:ring-[#4EDBA1]/20 placeholder-gray-300 font-handwriting"
      />
    </div>
  );
}

// === Checklist Widget ===

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

function parseChecklistValue(value: string): ChecklistItem[] {
  if (!value) return [];
  try {
    return JSON.parse(value) as ChecklistItem[];
  } catch {
    return [];
  }
}

function serializeChecklist(items: ChecklistItem[]): string {
  return JSON.stringify(items);
}

function ChecklistWidget({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [items, setItems] = useState<ChecklistItem[]>(() => parseChecklistValue(value));
  const [newItemText, setNewItemText] = useState('');

  const updateItems = useCallback(
    (updatedItems: ChecklistItem[]) => {
      setItems(updatedItems);
      onChange(serializeChecklist(updatedItems));
    },
    [onChange]
  );

  const toggleItem = useCallback(
    (id: string) => {
      const updatedItems = items.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      );
      updateItems(updatedItems);
    },
    [items, updateItems]
  );

  const addItem = useCallback(() => {
    if (!newItemText.trim()) return;
    const newItem: ChecklistItem = {
      id: `item-${Date.now()}`,
      text: newItemText.trim(),
      checked: false,
    };
    updateItems([...items, newItem]);
    setNewItemText('');
  }, [newItemText, items, updateItems]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addItem();
      }
    },
    [addItem]
  );

  return (
    <div className="mb-2">
      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5">
        {label}
      </label>
      <div className="space-y-0.5">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => toggleItem(item.id)}
              className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center flex-shrink-0 ${
                item.checked
                  ? 'bg-[#4EDBA1] border-[#4EDBA1]'
                  : 'border-gray-300 bg-white'
              }`}
            >
              {item.checked && (
                <span className="text-white text-[8px]">✓</span>
              )}
            </button>
            <span
              className={`text-[11px] font-handwriting ${
                item.checked ? 'line-through text-gray-300' : 'text-gray-600'
              }`}
            >
              {item.text}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 mt-1">
        <span className="text-gray-300 text-[10px]">+</span>
        <input
          type="text"
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="add item..."
          className="text-[10px] text-gray-500 bg-transparent border-none outline-none placeholder-gray-300 flex-1 font-handwriting"
        />
      </div>
    </div>
  );
}

export default PlanWidgetRenderer;
