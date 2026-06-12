'use client';

import { useState, useEffect, useCallback } from 'react';
import type { LayoutTemplate, LayoutCategory } from '@/types/layout-plan';
import { useLayoutSelectionStore } from '@/store/layout-selection-store';
import { LayoutTemplateCard } from '@/components/LayoutTemplateCard';

const CATEGORY_FILTERS: { value: LayoutCategory | ''; label: string }[] = [
  { value: '', label: 'All Layouts' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

/**
 * Displays all available layout templates organized by category,
 * with search and filter controls. Users can activate a template
 * to set it as their active weekly or monthly layout.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.5
 */
export function LayoutTemplateGallery() {
  const [templates, setTemplates] = useState<LayoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<LayoutCategory | ''>('');
  const [activatingId, setActivatingId] = useState<string | null>(null);

  const { activeWeeklyTemplateId, activeMonthlyTemplateId, activateTemplate } =
    useLayoutSelectionStore();

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (categoryFilter) {
        params.set('category', categoryFilter);
      }
      if (searchTerm.trim()) {
        params.set('search', searchTerm.trim());
      }

      const response = await fetch(`/api/layout-templates?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch layout templates');
      }

      const data: LayoutTemplate[] = await response.json();
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, searchTerm]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleSelectTemplate = async (template: LayoutTemplate) => {
    setActivatingId(template.id);
    setError(null);

    try {
      await activateTemplate(template.id, template.category);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate template');
    } finally {
      setActivatingId(null);
    }
  };

  const isTemplateActive = (template: LayoutTemplate): boolean => {
    if (template.category === 'weekly') {
      return template.id === activeWeeklyTemplateId;
    }
    return template.id === activeMonthlyTemplateId;
  };

  // Group templates by category for organized display
  const weeklyTemplates = templates.filter((t) => t.category === 'weekly');
  const monthlyTemplates = templates.filter((t) => t.category === 'monthly');

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Layout Pick</h2>
          <p className="mt-1 text-sm text-gray-500">
            Browse and activate layout templates for your weekly and monthly spreads
          </p>
        </div>
        {/* Decorative gradient accent */}
        <div className="hidden sm:block w-12 h-12 rounded-2xl bg-gradient-to-br from-[#4EDBA1] via-[#F5C872] to-[#F5A6C8] opacity-80 shadow-lg shadow-[#4EDBA1]/20" />
      </div>

      {/* Search and filter controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        {/* Search input */}
        <div className="flex-1 relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search templates by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search layout templates"
            className="w-full rounded-xl border border-gray-200 bg-white/80 pl-10 pr-4 py-2.5 text-sm placeholder-gray-400 focus:border-[#4EDBA1] focus:outline-none focus:ring-2 focus:ring-[#4EDBA1]/20 transition-all"
          />
        </div>

        {/* Category filter */}
        <div className="flex gap-1 rounded-xl bg-gray-100/80 p-1">
          {CATEGORY_FILTERS.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategoryFilter(cat.value as LayoutCategory | '')}
              aria-label={`Filter by ${cat.label}`}
              aria-pressed={categoryFilter === cat.value}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition-all duration-200
                ${categoryFilter === cat.value
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-100 bg-red-50/50 p-4 text-sm text-red-700 flex items-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 5v3M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-10 h-10 rounded-full border-2 border-[#4EDBA1]/30 border-t-[#4EDBA1] animate-spin" />
          <p className="mt-4 text-sm text-gray-400">Loading templates...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && templates.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F5A6C8]/10 to-[#F5C872]/10 flex items-center justify-center mb-4">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="4" y="4" width="10" height="10" rx="3" stroke="#F5A6C8" strokeWidth="1.5" />
              <rect x="18" y="4" width="10" height="10" rx="3" stroke="#F5C872" strokeWidth="1.5" />
              <rect x="4" y="18" width="24" height="10" rx="3" stroke="#4EDBA1" strokeWidth="1.5" />
            </svg>
          </div>
          <p className="text-sm text-gray-500">No templates found matching your criteria.</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setCategoryFilter('');
            }}
            className="mt-3 text-sm font-medium text-[#D4749A] hover:text-[#C0607D] transition-colors"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Template grid — organized by category */}
      {!loading && templates.length > 0 && (
        <div className="space-y-8">
          {/* Weekly templates section */}
          {weeklyTemplates.length > 0 && (categoryFilter === '' || categoryFilter === 'weekly') && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-[#F5A6C8]" />
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  Weekly Layouts
                </h3>
                <span className="text-xs text-gray-400">({weeklyTemplates.length})</span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {weeklyTemplates.map((template) => (
                  <LayoutTemplateCard
                    key={template.id}
                    template={template}
                    isActive={isTemplateActive(template)}
                    onSelect={() => handleSelectTemplate(template)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Monthly templates section */}
          {monthlyTemplates.length > 0 && (categoryFilter === '' || categoryFilter === 'monthly') && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-[#F5C872]" />
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  Monthly Layouts
                </h3>
                <span className="text-xs text-gray-400">({monthlyTemplates.length})</span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {monthlyTemplates.map((template) => (
                  <LayoutTemplateCard
                    key={template.id}
                    template={template}
                    isActive={isTemplateActive(template)}
                    onSelect={() => handleSelectTemplate(template)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Activating overlay */}
      {activatingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-sm">
          <div className="rounded-2xl bg-white p-6 shadow-xl flex items-center gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-[#4EDBA1]/30 border-t-[#4EDBA1] animate-spin" />
            <span className="text-sm text-gray-600">Activating template...</span>
          </div>
        </div>
      )}
    </div>
  );
}
