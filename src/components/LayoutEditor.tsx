'use client';

import React, { useState, useCallback, useRef } from 'react';
import type { Layout, ContentArea, ContentAreaType } from '@/types';
import { validateLayout, validateLayoutName, isLayoutNameUnique } from '@/lib/validators';

const CONTENT_AREA_TYPES: ContentAreaType[] = ['text', 'checklist', 'image', 'blank'];
const MAX_CONTENT_AREAS = 20;
const MIN_SIZE_PERCENT = 5;
const MAX_SIZE_PERCENT = 100;

interface LayoutEditorProps {
  /** Layout being edited, or undefined for creating a new layout */
  layout?: Layout;
  /** All existing layouts for the user (used for name uniqueness check) */
  existingLayouts: Layout[];
  /** Called when the user saves the layout */
  onSave: (layout: Omit<Layout, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  /** Called when the user deletes the layout */
  onDelete?: (layoutId: string) => Promise<void>;
  /** Called when the user cancels editing */
  onCancel: () => void;
  /** The current user's ID */
  userId: string;
}

interface DragState {
  areaId: string;
  type: 'move' | 'resize';
  startX: number;
  startY: number;
  originalArea: ContentArea;
}

function generateId(): string {
  return crypto.randomUUID();
}

function clampSize(value: number): number {
  return Math.max(MIN_SIZE_PERCENT, Math.min(MAX_SIZE_PERCENT, value));
}

function clampPosition(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function LayoutEditor({
  layout,
  existingLayouts,
  onSave,
  onDelete,
  onCancel,
  userId,
}: LayoutEditorProps) {
  const [name, setName] = useState(layout?.name ?? '');
  const [contentAreas, setContentAreas] = useState<ContentArea[]>(
    layout?.contentAreas ?? [
      { id: generateId(), type: 'text', x: 0, y: 0, width: 50, height: 50 },
    ]
  );
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState | null>(null);

  const isEditing = !!layout;

  // --- Content Area CRUD ---

  const addContentArea = useCallback(() => {
    if (contentAreas.length >= MAX_CONTENT_AREAS) {
      setErrors([`Cannot add more than ${MAX_CONTENT_AREAS} content areas`]);
      return;
    }
    const newArea: ContentArea = {
      id: generateId(),
      type: 'blank',
      x: 10,
      y: 10,
      width: 30,
      height: 30,
    };
    setContentAreas((prev) => [...prev, newArea]);
    setSelectedAreaId(newArea.id);
    setErrors([]);
  }, [contentAreas.length]);

  const removeContentArea = useCallback(
    (areaId: string) => {
      setContentAreas((prev) => prev.filter((a) => a.id !== areaId));
      if (selectedAreaId === areaId) {
        setSelectedAreaId(null);
      }
    },
    [selectedAreaId]
  );

  const updateContentArea = useCallback(
    (areaId: string, changes: Partial<ContentArea>) => {
      setContentAreas((prev) =>
        prev.map((area) => {
          if (area.id !== areaId) return area;
          const updated = { ...area, ...changes };
          // Enforce size constraints
          if (changes.width !== undefined) {
            updated.width = clampSize(changes.width);
          }
          if (changes.height !== undefined) {
            updated.height = clampSize(changes.height);
          }
          // Enforce position constraints
          if (changes.x !== undefined) {
            updated.x = clampPosition(changes.x);
          }
          if (changes.y !== undefined) {
            updated.y = clampPosition(changes.y);
          }
          return updated;
        })
      );
    },
    []
  );

  // --- Drag and Drop ---

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, areaId: string, type: 'move' | 'resize') => {
      e.preventDefault();
      e.stopPropagation();
      const area = contentAreas.find((a) => a.id === areaId);
      if (!area) return;

      setSelectedAreaId(areaId);
      dragStateRef.current = {
        areaId,
        type,
        startX: e.clientX,
        startY: e.clientY,
        originalArea: { ...area },
      };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const dragState = dragStateRef.current;
        if (!dragState || !canvasRef.current) return;

        const canvasRect = canvasRef.current.getBoundingClientRect();
        const deltaXPercent =
          ((moveEvent.clientX - dragState.startX) / canvasRect.width) * 100;
        const deltaYPercent =
          ((moveEvent.clientY - dragState.startY) / canvasRect.height) * 100;

        if (dragState.type === 'move') {
          updateContentArea(dragState.areaId, {
            x: clampPosition(dragState.originalArea.x + deltaXPercent),
            y: clampPosition(dragState.originalArea.y + deltaYPercent),
          });
        } else {
          // resize
          updateContentArea(dragState.areaId, {
            width: clampSize(dragState.originalArea.width + deltaXPercent),
            height: clampSize(dragState.originalArea.height + deltaYPercent),
          });
        }
      };

      const handleMouseUp = () => {
        dragStateRef.current = null;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [contentAreas, updateContentArea]
  );

  // --- Save ---

  const handleSave = useCallback(async () => {
    const validationErrors: string[] = [];

    // Validate name
    const nameResult = validateLayoutName(name);
    if (!nameResult.valid) {
      validationErrors.push(...nameResult.errors);
    }

    // Check name uniqueness
    if (nameResult.valid) {
      const uniqueResult = isLayoutNameUnique(
        name,
        existingLayouts,
        layout?.id
      );
      if (!uniqueResult.valid) {
        validationErrors.push(...uniqueResult.errors);
      }
    }

    // Validate layout structure
    const layoutToValidate: Layout = {
      id: layout?.id ?? 'temp',
      userId,
      name: name.trim(),
      isBuiltIn: false,
      contentAreas,
      createdAt: layout?.createdAt ?? new Date(),
      updatedAt: new Date(),
    };

    const layoutResult = validateLayout(layoutToValidate);
    if (!layoutResult.valid) {
      validationErrors.push(...layoutResult.errors);
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    setSaving(true);

    try {
      await onSave({
        userId,
        name: name.trim(),
        isBuiltIn: false,
        contentAreas,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to save layout';
      setErrors([message]);
    } finally {
      setSaving(false);
    }
  }, [name, contentAreas, existingLayouts, layout, onSave, userId]);

  // --- Delete ---

  const handleDelete = useCallback(async () => {
    if (!layout || !onDelete) return;
    try {
      await onDelete(layout.id);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to delete layout';
      setErrors([message]);
    }
    setShowDeleteConfirm(false);
  }, [layout, onDelete]);

  // --- Render ---

  const selectedArea = contentAreas.find((a) => a.id === selectedAreaId);

  return (
    <div className="flex flex-col gap-4 p-4 h-full" data-testid="layout-editor">
      {/* Header with name input */}
      <div className="flex items-center gap-3">
        <label htmlFor="layout-name" className="text-sm font-medium text-gray-700">
          Layout Name:
        </label>
        <input
          id="layout-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter layout name"
          maxLength={50}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          aria-label="Layout name"
        />
      </div>

      {/* Error display */}
      {errors.length > 0 && (
        <div
          className="bg-red-50 border border-red-200 rounded-md p-3"
          role="alert"
          aria-live="polite"
        >
          <ul className="list-disc list-inside text-sm text-red-700">
            {errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={addContentArea}
          disabled={contentAreas.length >= MAX_CONTENT_AREAS}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          aria-label="Add content area"
        >
          + Add Area
        </button>
        <span className="text-xs text-gray-500">
          {contentAreas.length} / {MAX_CONTENT_AREAS} areas
        </span>

        {selectedArea && (
          <div className="flex items-center gap-2 ml-4 border-l pl-4">
            <label htmlFor="area-type" className="text-xs text-gray-600">
              Type:
            </label>
            <select
              id="area-type"
              value={selectedArea.type}
              onChange={(e) =>
                updateContentArea(selectedArea.id, {
                  type: e.target.value as ContentAreaType,
                })
              }
              className="px-2 py-1 text-xs border border-gray-300 rounded"
              aria-label="Content area type"
            >
              {CONTENT_AREA_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            <button
              onClick={() => removeContentArea(selectedArea.id)}
              className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
              aria-label="Remove selected content area"
            >
              Remove
            </button>
          </div>
        )}
      </div>

      {/* Canvas - drag and drop area */}
      <div
        ref={canvasRef}
        className="relative flex-1 min-h-[400px] border-2 border-dashed border-gray-300 rounded-lg bg-white overflow-hidden"
        onClick={() => setSelectedAreaId(null)}
        data-testid="layout-canvas"
        role="application"
        aria-label="Layout editor canvas. Drag content areas to reposition, drag corners to resize."
      >
        {contentAreas.map((area) => (
          <ContentAreaBlock
            key={area.id}
            area={area}
            isSelected={area.id === selectedAreaId}
            onMouseDown={(e, type) => handleMouseDown(e, area.id, type)}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedAreaId(area.id);
            }}
          />
        ))}
      </div>

      {/* Selected area properties panel */}
      {selectedArea && (
        <div className="border border-gray-200 rounded-md p-3 bg-gray-50">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Area Properties
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label htmlFor="area-x" className="text-xs text-gray-500">
                X (%)
              </label>
              <input
                id="area-x"
                type="number"
                min={0}
                max={100}
                value={Math.round(selectedArea.x)}
                onChange={(e) =>
                  updateContentArea(selectedArea.id, {
                    x: clampPosition(Number(e.target.value)),
                  })
                }
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              />
            </div>
            <div>
              <label htmlFor="area-y" className="text-xs text-gray-500">
                Y (%)
              </label>
              <input
                id="area-y"
                type="number"
                min={0}
                max={100}
                value={Math.round(selectedArea.y)}
                onChange={(e) =>
                  updateContentArea(selectedArea.id, {
                    y: clampPosition(Number(e.target.value)),
                  })
                }
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              />
            </div>
            <div>
              <label htmlFor="area-width" className="text-xs text-gray-500">
                Width (%)
              </label>
              <input
                id="area-width"
                type="number"
                min={MIN_SIZE_PERCENT}
                max={MAX_SIZE_PERCENT}
                value={Math.round(selectedArea.width)}
                onChange={(e) =>
                  updateContentArea(selectedArea.id, {
                    width: clampSize(Number(e.target.value)),
                  })
                }
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              />
            </div>
            <div>
              <label htmlFor="area-height" className="text-xs text-gray-500">
                Height (%)
              </label>
              <input
                id="area-height"
                type="number"
                min={MIN_SIZE_PERCENT}
                max={MAX_SIZE_PERCENT}
                value={Math.round(selectedArea.height)}
                onChange={(e) =>
                  updateContentArea(selectedArea.id, {
                    height: clampSize(Number(e.target.value)),
                  })
                }
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              />
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            aria-label="Save layout"
          >
            {saving ? 'Saving...' : 'Save Layout'}
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            aria-label="Cancel editing"
          >
            Cancel
          </button>
        </div>

        {isEditing && onDelete && (
          <div>
            {showDeleteConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-700">
                  Delete this layout? Pages using it will be preserved.
                </span>
                <button
                  onClick={handleDelete}
                  className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                  aria-label="Confirm delete layout"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  aria-label="Cancel delete"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                aria-label="Delete layout"
              >
                Delete Layout
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Content Area Block (visual representation on canvas) ---

interface ContentAreaBlockProps {
  area: ContentArea;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent, type: 'move' | 'resize') => void;
  onClick: (e: React.MouseEvent) => void;
}

const TYPE_COLORS: Record<ContentAreaType, string> = {
  text: 'bg-blue-100 border-blue-400',
  checklist: 'bg-green-100 border-green-400',
  image: 'bg-purple-100 border-purple-400',
  blank: 'bg-gray-100 border-gray-400',
};

const TYPE_LABELS: Record<ContentAreaType, string> = {
  text: 'Text',
  checklist: 'Checklist',
  image: 'Image',
  blank: 'Blank',
};

function ContentAreaBlock({
  area,
  isSelected,
  onMouseDown,
  onClick,
}: ContentAreaBlockProps) {
  return (
    <div
      className={`absolute border-2 rounded cursor-move select-none flex items-center justify-center transition-shadow ${
        TYPE_COLORS[area.type]
      } ${isSelected ? 'ring-2 ring-blue-500 shadow-lg z-10' : 'z-0'}`}
      style={{
        left: `${area.x}%`,
        top: `${area.y}%`,
        width: `${area.width}%`,
        height: `${area.height}%`,
      }}
      onMouseDown={(e) => onMouseDown(e, 'move')}
      onClick={onClick}
      role="button"
      aria-label={`${TYPE_LABELS[area.type]} content area at position ${Math.round(area.x)}%, ${Math.round(area.y)}% with size ${Math.round(area.width)}% x ${Math.round(area.height)}%`}
      tabIndex={0}
      data-testid={`content-area-${area.id}`}
    >
      <span className="text-xs font-medium text-gray-600 pointer-events-none">
        {TYPE_LABELS[area.type]}
      </span>

      {/* Resize handle */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-gray-400 opacity-50 hover:opacity-100 rounded-tl"
        onMouseDown={(e) => {
          e.stopPropagation();
          onMouseDown(e, 'resize');
        }}
        aria-label="Resize handle"
        data-testid={`resize-handle-${area.id}`}
      />
    </div>
  );
}

export default LayoutEditor;
