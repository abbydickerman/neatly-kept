'use client';

import type { LayoutTemplate } from '@/types/layout-plan';

export interface LayoutTemplateCardProps {
  template: LayoutTemplate;
  isActive: boolean;
  onSelect: () => void;
}

/**
 * Displays a single layout template as a card with name, description,
 * visual structure preview, and an active indicator.
 */
export function LayoutTemplateCard({ template, isActive, onSelect }: LayoutTemplateCardProps) {
  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`${template.name}${isActive ? ' (active)' : ''}`}
      aria-pressed={isActive}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300 cursor-pointer
        ${isActive
          ? 'border-[#4EDBA1] ring-2 ring-[#4EDBA1]/30 shadow-lg shadow-[#4EDBA1]/10'
          : 'border-gray-100 hover:border-[#F5A6C8]/40 hover:shadow-md hover:shadow-[#F5A6C8]/10'
        }`}
    >
      {/* Active indicator badge */}
      {isActive && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#4EDBA1] to-[#3BC98A] px-2.5 py-1 shadow-md shadow-[#4EDBA1]/20">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M2.5 6.5L5 9L9.5 3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[10px] font-semibold text-white uppercase tracking-wide">Active</span>
        </div>
      )}

      {/* Template structure preview */}
      <div className="relative h-36 bg-gradient-to-br from-[#fafcfb] to-[#f5f9f7] p-3">
        <div className="relative h-full w-full rounded-xl overflow-hidden">
          {template.structure.areas.map((area, idx) => {
            const areaColors = [
              'bg-[#4EDBA1]/15 border-[#4EDBA1]/20',
              'bg-[#F5A6C8]/15 border-[#F5A6C8]/20',
              'bg-[#F5C872]/15 border-[#F5C872]/20',
              'bg-[#B8A9E8]/15 border-[#B8A9E8]/20',
              'bg-[#5BA4E8]/15 border-[#5BA4E8]/20',
            ];
            const colorClass = areaColors[idx % areaColors.length];
            return (
              <div
                key={area.id}
                className={`absolute rounded-md border transition-all duration-300 group-hover:scale-[1.02] ${colorClass}`}
                style={{
                  left: `${area.x}%`,
                  top: `${area.y}%`,
                  width: `${area.width}%`,
                  height: `${area.height}%`,
                }}
              >
                <span className="flex h-full items-center justify-center text-[8px] text-gray-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  {area.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Category badge overlaid on preview */}
        <span className={`absolute bottom-2 left-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider
          ${template.category === 'weekly'
            ? 'bg-[#F5A6C8]/15 text-[#D4749A]'
            : 'bg-[#F5C872]/15 text-[#C9993D]'
          }`}
        >
          {template.category}
        </span>
      </div>

      {/* Card content */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-sm font-semibold text-gray-800 group-hover:text-gray-900 transition-colors">
          {template.name}
        </h3>
        <p className="mt-1.5 flex-1 text-xs text-gray-500 leading-relaxed line-clamp-2">
          {template.description}
        </p>

        {/* Action area */}
        <div className="mt-3 pt-3 border-t border-gray-50">
          {isActive ? (
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#2A9D6E]">
              <div className="w-1.5 h-1.5 rounded-full bg-[#4EDBA1] animate-pulse" />
              Currently active
            </div>
          ) : (
            <span className="text-[11px] font-medium text-[#D4749A] group-hover:text-[#C0607D] transition-colors">
              Click to activate →
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
