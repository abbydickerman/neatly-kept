'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type {
  Entry,
  CalendarConfig,
  CalendarPeriod,
  CalendarPeriodType,
  EntryType,
  LayoutDensity,
  WeekDay,
} from '@/types/models';
import {
  createDailyPeriod,
  createWeeklyPeriod,
  createMonthlyPeriod,
  getNextPeriod,
  getPreviousPeriod,
} from '@/services/calendar-service';
import {
  BUILT_IN_COLOR_THEMES,
  clampSizingValue,
  filterEntriesByVisibility,
} from '@/services/calendar-config-service';
import type { CalendarService } from '@/types/services';

// === Week day number mapping ===
const WEEK_DAY_TO_NUMBER: Record<WeekDay, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

// === Color theme CSS classes ===
const COLOR_THEME_STYLES: Record<string, { bg: string; text: string; border: string; header: string; marker: string }> = {
  default: { bg: 'bg-white', text: 'text-gray-900', border: 'border-gray-200', header: 'bg-gray-50 text-gray-700', marker: 'bg-blue-500' },
  ocean: { bg: 'bg-blue-50', text: 'text-blue-900', border: 'border-blue-200', header: 'bg-blue-100 text-blue-800', marker: 'bg-blue-600' },
  forest: { bg: 'bg-green-50', text: 'text-green-900', border: 'border-green-200', header: 'bg-green-100 text-green-800', marker: 'bg-green-600' },
  sunset: { bg: 'bg-orange-50', text: 'text-orange-900', border: 'border-orange-200', header: 'bg-orange-100 text-orange-800', marker: 'bg-orange-600' },
  lavender: { bg: 'bg-purple-50', text: 'text-purple-900', border: 'border-purple-200', header: 'bg-purple-100 text-purple-800', marker: 'bg-purple-600' },
};

// === Layout density spacing ===
const DENSITY_STYLES: Record<LayoutDensity, { padding: string; gap: string; text: string }> = {
  compact: { padding: 'p-1', gap: 'gap-0.5', text: 'text-xs' },
  standard: { padding: 'p-2', gap: 'gap-1', text: 'text-sm' },
  expanded: { padding: 'p-4', gap: 'gap-2', text: 'text-base' },
};

// === Entry type signifiers ===
const ENTRY_TYPE_SYMBOLS: Record<EntryType, string> = {
  task: '•',
  event: '○',
  note: '–',
};

// === Props ===
export interface CalendarViewProps {
  calendarService: CalendarService;
  /** Optional callback when config changes */
  onConfigChange?: (config: CalendarConfig) => void;
  /** Polling interval in ms for auto-refresh. Set to 0 to disable. Default: 2000 */
  refreshIntervalMs?: number;
}

export function CalendarView({ calendarService, onConfigChange, refreshIntervalMs = 2000 }: CalendarViewProps) {
  // === State ===
  const [periodType, setPeriodType] = useState<CalendarPeriodType>('weekly');
  const [currentPeriod, setCurrentPeriod] = useState<CalendarPeriod>(() =>
    createWeeklyPeriod(new Date())
  );
  const [entries, setEntries] = useState<Entry[]>([]);
  const [config, setConfig] = useState<CalendarConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Resizable area state
  const [contentWidthPercent, setContentWidthPercent] = useState(50);
  const resizeRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);

  // === Load config on mount ===
  useEffect(() => {
    let cancelled = false;
    async function loadConfig() {
      const cfg = await calendarService.getCalendarConfig();
      if (!cancelled) {
        setConfig(cfg);
        if (cfg.customSizing?.areas?.[0]) {
          setContentWidthPercent(cfg.customSizing.areas[0].widthPercent);
        }
      }
    }
    loadConfig();
    return () => { cancelled = true; };
  }, [calendarService]);

  // === Create period based on type and config ===
  const createPeriodForType = useCallback(
    (type: CalendarPeriodType, date: Date): CalendarPeriod => {
      const weekStartDay = config?.weekStartDay
        ? WEEK_DAY_TO_NUMBER[config.weekStartDay]
        : 1;
      switch (type) {
        case 'daily':
          return createDailyPeriod(date);
        case 'weekly':
          return createWeeklyPeriod(date, weekStartDay);
        case 'monthly':
          return createMonthlyPeriod(date);
      }
    },
    [config?.weekStartDay]
  );

  // === Update period when type or config changes ===
  useEffect(() => {
    if (config) {
      const newPeriod = createPeriodForType(periodType, currentPeriod.startDate);
      setCurrentPeriod(newPeriod);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodType, config?.weekStartDay]);

  // === Load entries when period changes ===
  useEffect(() => {
    let cancelled = false;
    async function loadEntries() {
      setLoading(true);
      const result = await calendarService.getEntriesForPeriod(currentPeriod);
      if (!cancelled) {
        setEntries(result);
        setLoading(false);
      }
    }
    loadEntries();
    return () => { cancelled = true; };
  }, [calendarService, currentPeriod]);

  // === Refresh entries periodically (within 2 seconds of addition) ===
  useEffect(() => {
    if (refreshIntervalMs <= 0) return;
    const interval = setInterval(async () => {
      const result = await calendarService.getEntriesForPeriod(currentPeriod);
      setEntries(result);
    }, refreshIntervalMs);
    return () => clearInterval(interval);
  }, [calendarService, currentPeriod, refreshIntervalMs]);

  // === Navigation handlers ===
  const handlePrevious = () => {
    setCurrentPeriod(getPreviousPeriod(currentPeriod));
  };

  const handleNext = () => {
    setCurrentPeriod(getNextPeriod(currentPeriod));
  };

  const handlePeriodTypeChange = (type: CalendarPeriodType) => {
    setPeriodType(type);
    const newPeriod = createPeriodForType(type, currentPeriod.startDate);
    setCurrentPeriod(newPeriod);
  };

  // === Config update handler ===
  const updateConfig = async (changes: Partial<CalendarConfig>) => {
    const updated = await calendarService.updateCalendarConfig(changes);
    setConfig(updated);
    onConfigChange?.(updated);
  };

  // === Resize handler ===
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;

    const startX = e.clientX;
    const startWidth = contentWidthPercent;
    const container = resizeRef.current?.parentElement;
    if (!container) return;
    const containerWidth = container.getBoundingClientRect().width;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizing.current) return;
      const deltaX = moveEvent.clientX - startX;
      const deltaPercent = (deltaX / containerWidth) * 100;
      const newWidth = clampSizingValue(startWidth + deltaPercent);
      setContentWidthPercent(newWidth);
    };

    const handleMouseUp = async () => {
      isResizing.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      // Persist sizing
      await updateConfig({
        customSizing: {
          areas: [{ id: 'calendar-main', widthPercent: contentWidthPercent, heightPercent: 100 }],
        },
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // === Derived values ===
  const themeStyles = COLOR_THEME_STYLES[config?.colorTheme ?? 'default'] ?? COLOR_THEME_STYLES.default;
  const densityStyles = DENSITY_STYLES[config?.layoutDensity ?? 'standard'];
  const visibleTypes = config?.visibleEntryTypes ?? ['task', 'event', 'note'];
  const filteredEntries = filterEntriesByVisibility(entries, visibleTypes);

  // === Format period label ===
  const formatPeriodLabel = (): string => {
    const start = currentPeriod.startDate;
    const end = currentPeriod.endDate;
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    switch (periodType) {
      case 'daily':
        return start.toLocaleDateString(undefined, { weekday: 'long', ...opts });
      case 'weekly':
        return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, opts)}`;
      case 'monthly':
        return start.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    }
  };

  // === Group entries by date ===
  const groupEntriesByDate = (): Map<string, Entry[]> => {
    const groups = new Map<string, Entry[]>();
    for (const entry of filteredEntries) {
      if (!entry.date) continue;
      const dateKey = new Date(entry.date).toLocaleDateString();
      const existing = groups.get(dateKey) ?? [];
      existing.push(entry);
      groups.set(dateKey, existing);
    }
    return groups;
  };

  // === Render ===
  if (!config) {
    return (
      <div className="flex items-center justify-center h-64" role="status" aria-label="Loading calendar">
        <span className="text-gray-500">Loading calendar...</span>
      </div>
    );
  }

  const groupedEntries = groupEntriesByDate();

  return (
    <div
      className={`flex flex-col h-full ${themeStyles.bg} ${themeStyles.text} rounded-lg border ${themeStyles.border}`}
      data-testid="calendar-view"
      data-color-theme={config.colorTheme}
      data-layout-density={config.layoutDensity}
    >
      {/* Header: Period type switcher + navigation */}
      <div className={`flex items-center justify-between ${themeStyles.header} ${densityStyles.padding} rounded-t-lg border-b ${themeStyles.border}`}>
        {/* Period type tabs */}
        <div className="flex gap-1" role="tablist" aria-label="Calendar view period">
          {(['daily', 'weekly', 'monthly'] as CalendarPeriodType[]).map((type) => (
            <button
              key={type}
              role="tab"
              aria-selected={periodType === type}
              onClick={() => handlePeriodTypeChange(type)}
              className={`px-3 py-1 rounded text-sm capitalize transition-colors ${
                periodType === type
                  ? `${themeStyles.marker} text-white`
                  : 'hover:bg-black/5'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevious}
            aria-label={`Previous ${periodType}`}
            className="px-2 py-1 rounded hover:bg-black/5 transition-colors"
          >
            ←
          </button>
          <span className="text-sm font-medium min-w-[180px] text-center">
            {formatPeriodLabel()}
          </span>
          <button
            onClick={handleNext}
            aria-label={`Next ${periodType}`}
            className="px-2 py-1 rounded hover:bg-black/5 transition-colors"
          >
            →
          </button>
        </div>

        {/* Settings toggle */}
        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          aria-label="Calendar settings"
          aria-expanded={settingsOpen}
          className="px-2 py-1 rounded hover:bg-black/5 transition-colors"
        >
          ⚙
        </button>
      </div>

      {/* Settings panel */}
      {settingsOpen && (
        <CalendarSettings
          config={config}
          onUpdateConfig={updateConfig}
          themeStyles={themeStyles}
          densityStyles={densityStyles}
        />
      )}

      {/* Main content area with resizable split */}
      <div className="flex flex-1 overflow-hidden" ref={resizeRef}>
        {/* Calendar entries area */}
        <div
          className={`overflow-auto ${densityStyles.padding}`}
          style={{ width: `${contentWidthPercent}%` }}
          data-testid="calendar-content-area"
        >
          {loading ? (
            <div className="flex items-center justify-center h-32" role="status">
              <span className="text-gray-400">Loading entries...</span>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center h-32 text-gray-400"
              data-testid="calendar-empty-state"
              role="status"
            >
              <span className="text-2xl mb-2">📅</span>
              <span className={densityStyles.text}>No entries for this period</span>
            </div>
          ) : (
            <div className={`flex flex-col ${densityStyles.gap}`}>
              {Array.from(groupedEntries.entries()).map(([dateKey, dateEntries]) => (
                <div key={dateKey} className={`border-b ${themeStyles.border} pb-2`}>
                  <h3 className={`font-medium ${densityStyles.text} mb-1`}>{dateKey}</h3>
                  <ul className={`flex flex-col ${densityStyles.gap}`} role="list">
                    {dateEntries.map((entry) => (
                      <li
                        key={entry.id}
                        className={`flex items-start ${densityStyles.gap} ${densityStyles.text}`}
                        data-entry-type={entry.type}
                      >
                        <span className={`inline-block w-4 h-4 rounded-full ${themeStyles.marker} text-white text-center text-xs leading-4 flex-shrink-0`}>
                          {ENTRY_TYPE_SYMBOLS[entry.type]}
                        </span>
                        <span className="flex-1">{entry.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resize handle */}
        <div
          className={`w-1 cursor-col-resize hover:bg-blue-400 transition-colors ${themeStyles.border} border-l border-r flex-shrink-0`}
          onMouseDown={handleResizeStart}
          role="separator"
          aria-orientation="vertical"
          aria-valuenow={contentWidthPercent}
          aria-valuemin={10}
          aria-valuemax={90}
          aria-label="Resize calendar content area"
          data-testid="calendar-resize-handle"
        />

        {/* Secondary area */}
        <div
          className={`overflow-auto ${densityStyles.padding} flex-1`}
          style={{ width: `${100 - contentWidthPercent}%` }}
          data-testid="calendar-secondary-area"
        >
          <div className={`text-gray-400 ${densityStyles.text} text-center mt-4`}>
            Additional content area
          </div>
        </div>
      </div>
    </div>
  );
}

// === Settings Panel Component ===

interface CalendarSettingsProps {
  config: CalendarConfig;
  onUpdateConfig: (changes: Partial<CalendarConfig>) => Promise<void>;
  themeStyles: { bg: string; text: string; border: string; header: string; marker: string };
  densityStyles: { padding: string; gap: string; text: string };
}

function CalendarSettings({ config, onUpdateConfig, themeStyles, densityStyles }: CalendarSettingsProps) {
  const weekDays: WeekDay[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const entryTypes: EntryType[] = ['task', 'event', 'note'];
  const densities: LayoutDensity[] = ['compact', 'standard', 'expanded'];

  return (
    <div
      className={`border-b ${themeStyles.border} ${densityStyles.padding} ${themeStyles.bg}`}
      data-testid="calendar-settings"
      role="region"
      aria-label="Calendar settings"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Color Theme */}
        <div>
          <label className={`block font-medium ${densityStyles.text} mb-1`}>Color Theme</label>
          <select
            value={config.colorTheme}
            onChange={(e) => onUpdateConfig({ colorTheme: e.target.value })}
            className="w-full border rounded px-2 py-1 text-sm bg-white text-gray-900"
            aria-label="Color theme"
          >
            {BUILT_IN_COLOR_THEMES.map((theme) => (
              <option key={theme} value={theme}>
                {theme.charAt(0).toUpperCase() + theme.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Layout Density */}
        <div>
          <label className={`block font-medium ${densityStyles.text} mb-1`}>Layout Density</label>
          <select
            value={config.layoutDensity}
            onChange={(e) => onUpdateConfig({ layoutDensity: e.target.value as LayoutDensity })}
            className="w-full border rounded px-2 py-1 text-sm bg-white text-gray-900"
            aria-label="Layout density"
          >
            {densities.map((d) => (
              <option key={d} value={d}>
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Week Start Day */}
        <div>
          <label className={`block font-medium ${densityStyles.text} mb-1`}>Week Starts On</label>
          <select
            value={config.weekStartDay}
            onChange={(e) => onUpdateConfig({ weekStartDay: e.target.value as WeekDay })}
            className="w-full border rounded px-2 py-1 text-sm bg-white text-gray-900"
            aria-label="Week start day"
          >
            {weekDays.map((day) => (
              <option key={day} value={day}>
                {day.charAt(0).toUpperCase() + day.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Entry Type Visibility */}
        <div>
          <label className={`block font-medium ${densityStyles.text} mb-1`}>Visible Entry Types</label>
          <div className="flex flex-col gap-1">
            {entryTypes.map((type) => (
              <label key={type} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.visibleEntryTypes.includes(type)}
                  onChange={(e) => {
                    const newTypes = e.target.checked
                      ? [...config.visibleEntryTypes, type]
                      : config.visibleEntryTypes.filter((t) => t !== type);
                    onUpdateConfig({ visibleEntryTypes: newTypes });
                  }}
                  aria-label={`Show ${type}s`}
                />
                <span className="capitalize">{type}s</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CalendarView;
