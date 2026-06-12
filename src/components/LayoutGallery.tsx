'use client';

import { useMemo } from 'react';
import type { Layout, ContentArea } from '@/types/models';
import { getBuiltInLayouts } from '@/services/layout-service';

export interface LayoutGalleryProps {
  /** Optional custom layouts to display alongside built-in layouts */
  customLayouts?: Layout[];
  /** Called when a layout is selected. Receives the chosen layout. */
  onSelect: (layout: Layout) => void;
  /** Called when the gallery is dismissed without selecting a layout. */
  onDismiss: () => void;
}

/**
 * Renders a visual preview of a layout's content areas.
 * Each content area is drawn as a colored rectangle positioned
 * according to its percentage-based coordinates.
 */
function LayoutPreview({ contentAreas }: { contentAreas: ContentArea[] }) {
  const typeColors: Record<string, string> = {
    text: 'bg-blue-200',
    checklist: 'bg-green-200',
    image: 'bg-purple-200',
    blank: 'bg-gray-100',
  };

  return (
    <div
      className="relative w-full aspect-[3/4] border border-gray-300 rounded bg-white overflow-hidden"
      aria-hidden="true"
    >
      {contentAreas.map((area) => (
        <div
          key={area.id}
          className={`absolute border border-gray-400/50 rounded-sm ${typeColors[area.type] || 'bg-gray-100'}`}
          style={{
            left: `${area.x}%`,
            top: `${area.y}%`,
            width: `${area.width}%`,
            height: `${area.height}%`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Layout Gallery component.
 * Displays all available layouts (built-in + custom) with name and visual preview.
 * Allows the user to select a layout for a new JournalPage or dismiss the gallery.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */
export function LayoutGallery({ customLayouts, onSelect, onDismiss }: LayoutGalleryProps) {
  const layouts = useMemo(() => {
    const builtIn = getBuiltInLayouts();
    return [...builtIn, ...(customLayouts || [])];
  }, [customLayouts]);

  if (layouts.length === 0) {
    return (
      <div className="flex items-center justify-center p-8" role="status" aria-label="Loading layouts">
        <span className="text-gray-500">Loading layouts…</span>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label="Layout Gallery"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Choose a Layout</h2>
          <button
            onClick={onDismiss}
            className="text-gray-500 hover:text-gray-700 p-1 rounded"
            aria-label="Close gallery"
          >
            ✕
          </button>
        </div>

        {/* Gallery grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {layouts.map((layout) => (
              <button
                key={layout.id}
                onClick={() => onSelect(layout)}
                className="flex flex-col items-center p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label={`Select ${layout.name} layout`}
              >
                <LayoutPreview contentAreas={layout.contentAreas} />
                <span className="mt-2 text-sm font-medium text-gray-700 text-center truncate w-full">
                  {layout.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 flex justify-end">
          <button
            onClick={onDismiss}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default LayoutGallery;
