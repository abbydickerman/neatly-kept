'use client';

import React from 'react';
import { useNavigationStore } from '@/store/navigation-store';
import type { NavigationState } from '@/store/navigation-store';

type ViewType = NavigationState['activeView'];

const VIEW_OPTIONS: { value: ViewType; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

function formatDateRangeLabel(date: Date, view: ViewType): string {
  switch (view) {
    case 'daily':
      return date.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    case 'weekly': {
      const startOfWeek = new Date(date);
      const day = startOfWeek.getDay();
      // Adjust to Monday as start of week
      const diff = day === 0 ? -6 : 1 - day;
      startOfWeek.setDate(startOfWeek.getDate() + diff);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      const startStr = startOfWeek.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
      const endStr = endOfWeek.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      return `${startStr} – ${endStr}`;
    }
    case 'monthly':
      return date.toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      });
  }
}

export function ViewSwitcher() {
  const { activeView, currentDate, setView, navigateDay, navigateWeek, navigateMonth } =
    useNavigationStore();

  const handlePrev = () => {
    switch (activeView) {
      case 'daily':
        navigateDay('prev');
        break;
      case 'weekly':
        navigateWeek('prev');
        break;
      case 'monthly':
        navigateMonth('prev');
        break;
    }
  };

  const handleNext = () => {
    switch (activeView) {
      case 'daily':
        navigateDay('next');
        break;
      case 'weekly':
        navigateWeek('next');
        break;
      case 'monthly':
        navigateMonth('next');
        break;
    }
  };

  return (
    <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-2">
      {/* View tabs */}
      <div className="flex gap-1" role="tablist" aria-label="View switcher">
        {VIEW_OPTIONS.map((option) => (
          <button
            key={option.value}
            role="tab"
            aria-selected={activeView === option.value}
            onClick={() => setView(option.value)}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              activeView === option.value
                ? 'bg-blue-500 text-white'
                : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Date navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={handlePrev}
          aria-label={`Previous ${activeView}`}
          className="px-2 py-1 rounded text-gray-600 hover:bg-gray-200 transition-colors"
        >
          ←
        </button>
        <span className="text-sm font-medium text-gray-700 min-w-[180px] text-center">
          {formatDateRangeLabel(currentDate, activeView)}
        </span>
        <button
          onClick={handleNext}
          aria-label={`Next ${activeView}`}
          className="px-2 py-1 rounded text-gray-600 hover:bg-gray-200 transition-colors"
        >
          →
        </button>
      </div>
    </div>
  );
}

export default ViewSwitcher;
