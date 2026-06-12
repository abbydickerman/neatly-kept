"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  GalleryTemplate,
  TemplateCategory,
  TemplateFilters,
} from "@/types/models";

const CATEGORIES: { value: TemplateCategory | ""; label: string }[] = [
  { value: "", label: "All Categories" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "tracker", label: "Tracker" },
  { value: "creative", label: "Creative" },
  { value: "planning", label: "Planning" },
  { value: "other", label: "Other" },
];

const SORT_OPTIONS: { value: "popular" | "newest" | "name"; label: string }[] =
  [
    { value: "popular", label: "Most Popular" },
    { value: "newest", label: "Newest" },
    { value: "name", label: "Name (A-Z)" },
  ];

export interface TemplateGalleryBrowserProps {
  /** Optional callback when a template is successfully used (layout created). */
  onTemplateUsed?: (layoutId: string) => void;
}

export function TemplateGalleryBrowser({
  onTemplateUsed,
}: TemplateGalleryBrowserProps) {
  const [templates, setTemplates] = useState<GalleryTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingTemplateId, setUsingTemplateId] = useState<string | null>(null);

  // Filter state
  const [filters, setFilters] = useState<TemplateFilters>({
    category: undefined,
    search: "",
    sortBy: "popular",
  });

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters.category) {
        params.set("category", filters.category);
      }
      if (filters.search) {
        params.set("search", filters.search);
      }
      if (filters.sortBy) {
        params.set("sort", filters.sortBy);
      }

      const response = await fetch(`/api/templates?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch templates");
      }

      const data: GalleryTemplate[] = await response.json();
      setTemplates(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleUseTemplate = async (templateId: string) => {
    setUsingTemplateId(templateId);
    setError(null);

    try {
      // Fetch the full template details
      const templateResponse = await fetch(`/api/templates/${templateId}`);
      if (!templateResponse.ok) {
        throw new Error("Failed to fetch template details");
      }

      const template: GalleryTemplate = await templateResponse.json();

      // Create a new layout in the user's account from the template
      const layoutResponse = await fetch("/api/layouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: template.name,
          contentAreas: template.contentAreas,
        }),
      });

      if (!layoutResponse.ok) {
        const errorData = await layoutResponse.json();
        throw new Error(errorData.error || "Failed to create layout from template");
      }

      const layout = await layoutResponse.json();
      onTemplateUsed?.(layout.id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to use template"
      );
    } finally {
      setUsingTemplateId(null);
    }
  };

  const handleCategoryChange = (category: string) => {
    setFilters((prev) => ({
      ...prev,
      category: category ? (category as TemplateCategory) : undefined,
    }));
  };

  const handleSearchChange = (search: string) => {
    setFilters((prev) => ({ ...prev, search }));
  };

  const handleSortChange = (sortBy: "popular" | "newest" | "name") => {
    setFilters((prev) => ({ ...prev, sortBy }));
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Template Gallery</h2>
        <p className="mt-1 text-sm text-gray-600">
          Browse and use community templates to get started quickly
        </p>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        {/* Search */}
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search templates..."
            value={filters.search ?? ""}
            onChange={(e) => handleSearchChange(e.target.value)}
            aria-label="Search templates"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Category Filter */}
        <select
          value={filters.category ?? ""}
          onChange={(e) => handleCategoryChange(e.target.value)}
          aria-label="Filter by category"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={filters.sortBy ?? "popular"}
          onChange={(e) =>
            handleSortChange(e.target.value as "popular" | "newest" | "name")
          }
          aria-label="Sort templates"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Error State */}
      {error && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-sm text-gray-500">Loading templates...</div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && templates.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-gray-500">
            No templates found matching your criteria.
          </p>
          <button
            onClick={() =>
              setFilters({ category: undefined, search: "", sortBy: "popular" })
            }
            className="mt-2 text-sm text-blue-600 hover:text-blue-800"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Template Grid */}
      {!loading && templates.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onUse={handleUseTemplate}
              isUsing={usingTemplateId === template.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface TemplateCardProps {
  template: GalleryTemplate;
  onUse: (templateId: string) => void;
  isUsing: boolean;
}

function TemplateCard({ template, onUse, isUsing }: TemplateCardProps) {
  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Preview */}
      <div className="relative h-40 bg-gray-100">
        {template.previewImageUrl ? (
          <img
            src={template.previewImageUrl}
            alt={`Preview of ${template.name}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <TemplatePreviewPlaceholder template={template} />
        )}
        {template.isFeatured && (
          <span className="absolute top-2 right-2 rounded-full bg-yellow-400 px-2 py-0.5 text-xs font-medium text-yellow-900">
            Featured
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-sm font-semibold text-gray-900">
          {template.name}
        </h3>
        <p className="mt-1 flex-1 text-xs text-gray-600 line-clamp-2">
          {template.description}
        </p>

        {/* Meta */}
        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
          <span>by {template.authorName}</span>
          <span>{template.usageCount.toLocaleString()} uses</span>
        </div>

        {/* Category badge */}
        <div className="mt-2">
          <span className="inline-block rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 capitalize">
            {template.category}
          </span>
        </div>

        {/* Use Template Button */}
        <button
          onClick={() => onUse(template.id)}
          disabled={isUsing}
          className="mt-3 w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isUsing ? "Creating layout..." : "Use Template"}
        </button>
      </div>
    </article>
  );
}

/** Renders a simple visual representation of the template's content areas. */
function TemplatePreviewPlaceholder({
  template,
}: {
  template: GalleryTemplate;
}) {
  return (
    <div
      className="relative h-full w-full p-2"
      aria-label={`Layout preview for ${template.name}`}
    >
      {template.contentAreas.map((area) => (
        <div
          key={area.id}
          className="absolute rounded border border-gray-300 bg-white/80"
          style={{
            left: `${area.x}%`,
            top: `${area.y}%`,
            width: `${area.width}%`,
            height: `${area.height}%`,
          }}
        >
          <span className="flex h-full items-center justify-center text-[9px] text-gray-400">
            {area.type}
          </span>
        </div>
      ))}
    </div>
  );
}
