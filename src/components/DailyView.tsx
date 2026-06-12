'use client';

import { useState, useEffect, useCallback } from 'react';
import { useNavigationStore } from '@/store/navigation-store';
import type { ComputedDailyView, InjectedWidget } from '@/types/layout-plan';
import type { Entry, EntryType } from '@/types/models';

// === Bullet symbols & colors (consistent with WeeklySpreadView) ===

const BULLET_SYMBOLS: Record<EntryType, string> = {
  task: '×',
  event: '○',
  note: '–',
};

const BULLET_COLORS: Record<EntryType, string> = {
  task: 'text-gray-700',
  event: 'text-[#F5A6C8]',
  note: 'text-[#F5C872]',
};

// === Helper functions ===

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT_DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

// === Sub-components ===

function DotGridBackground() {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: 'radial-gradient(circle, #d4d4d4 0.8px, transparent 0.8px)',
        backgroundSize: '20px 20px',
        opacity: 0.4,
      }}
    />
  );
}

function EntryRow({ entry, onToggleComplete }: { entry: Entry; onToggleComplete?: (id: string) => void }) {
  const symbol = BULLET_SYMBOLS[entry.type];
  const color = BULLET_COLORS[entry.type];
  const isComplete = entry.state === 'complete';
  const isCancelled = entry.state === 'cancelled';
  const isTask = entry.type === 'task';

  return (
    <div className={`flex items-start gap-2 py-0.5 rounded-sm transition-colors ${isComplete ? 'bg-[#4EDBA1]/10' : ''}`}>
      <button
        onClick={() => isTask && onToggleComplete?.(entry.id)}
        disabled={!isTask}
        className={`text-sm font-bold w-4 flex-shrink-0 transition-colors ${
          isComplete ? 'text-[#4EDBA1]' : color
        } ${isTask ? 'cursor-pointer hover:text-[#4EDBA1]' : 'cursor-default'}`}
        aria-label={isTask ? (isComplete ? 'Mark incomplete' : 'Mark complete') : undefined}
      >
        {isComplete ? '✓' : symbol}
      </button>
      <span
        className={`text-sm leading-relaxed ${
          isComplete
            ? 'line-through text-gray-400'
            : isCancelled
            ? 'line-through text-red-300'
            : 'text-gray-700'
        }`}
      >
        {entry.text}
      </span>
    </div>
  );
}

function InlineEntryInput({ onSubmit }: { onSubmit: (text: string, type: EntryType) => void }) {
  const [text, setText] = useState('');
  const [type, setType] = useState<EntryType>('task');

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && text.trim()) {
      onSubmit(text.trim(), type);
      setText('');
    }
  }

  return (
    <div className="flex items-center gap-1 mt-2 opacity-60 hover:opacity-100 focus-within:opacity-100 transition-opacity">
      <select
        value={type}
        onChange={(e) => setType(e.target.value as EntryType)}
        className="text-[10px] bg-transparent border-none text-gray-400 p-0 w-8"
        aria-label="Entry type"
      >
        <option value="task">×</option>
        <option value="event">○</option>
        <option value="note">–</option>
      </select>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="add entry..."
        className="text-[11px] text-gray-500 bg-transparent border-none outline-none placeholder-gray-300 flex-1"
        aria-label="New entry text"
      />
    </div>
  );
}

function PlanWidgetRenderer({
  widget,
  date,
  onDataChange,
}: {
  widget: InjectedWidget;
  date: Date;
  onDataChange: (planId: string, widgetType: string, value: string) => void;
}) {
  const [value, setValue] = useState(widget.data?.value ?? '');
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setValue(widget.data?.value ?? '');
  }, [widget.data?.value]);

  function handleChange(newValue: string) {
    setValue(newValue);
    // Debounce save
    if (saveTimeout) clearTimeout(saveTimeout);
    const timeout = setTimeout(() => {
      onDataChange(widget.planId, widget.definition.widgetType, newValue);
    }, 1000);
    setSaveTimeout(timeout);
  }

  if (widget.definition.inputType === 'checklist') {
    const items = value ? value.split('\n').filter(Boolean) : [];
    return (
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#5BA4E8]">
            {widget.definition.label}
          </span>
          <span className="text-[9px] text-gray-400">{widget.planName}</span>
        </div>
        <div className="space-y-0.5 pl-1">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-1.5 text-[11px] text-gray-600">
              <span className="w-3 h-3 border border-gray-300 rounded-sm flex-shrink-0" />
              <span>{item}</span>
            </div>
          ))}
          <input
            type="text"
            placeholder="add item..."
            className="text-[11px] text-gray-500 bg-transparent border-none outline-none placeholder-gray-300 w-full mt-0.5"
            aria-label={`Add ${widget.definition.label} item`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                const newItem = (e.target as HTMLInputElement).value.trim();
                const newValue = items.length > 0 ? value + '\n' + newItem : newItem;
                handleChange(newValue);
                (e.target as HTMLInputElement).value = '';
              }
            }}
          />
        </div>
      </div>
    );
  }

  // Free text input
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#5BA4E8]">
          {widget.definition.label}
        </span>
        <span className="text-[9px] text-gray-400">{widget.planName}</span>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={`Enter ${widget.definition.label.toLowerCase()}...`}
        className="w-full text-[12px] text-gray-700 bg-white/50 border border-gray-200 rounded px-2 py-1 outline-none focus:border-[#5BA4E8] focus:ring-1 focus:ring-[#5BA4E8]/30 transition-colors"
        aria-label={widget.definition.label}
      />
    </div>
  );
}

function MiniCalendar({ date }: { date: Date }) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const currentDay = date.getDate();

  const days: (number | null)[] = [];
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  for (let i = 0; i < startOffset; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  return (
    <div>
      <h3 className="font-handwriting text-lg text-gray-700 mb-2">{MONTH_NAMES[month]}</h3>
      <div className="grid grid-cols-7 gap-0.5 text-[9px]">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <div key={i} className="w-5 h-4 flex items-center justify-center font-bold text-gray-500">
            {d}
          </div>
        ))}
        {days.map((day, i) => (
          <div
            key={i}
            className={`w-5 h-5 flex items-center justify-center rounded-sm ${
              day === currentDay
                ? 'bg-[#4EDBA1] text-white font-bold'
                : day
                ? 'text-gray-600'
                : ''
            }`}
          >
            {day ?? ''}
          </div>
        ))}
      </div>
    </div>
  );
}

function NoLayoutPrompt({ onNavigateToLayoutPick }: { onNavigateToLayoutPick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-16 h-16 mb-4 rounded-full bg-[#F5C872]/20 flex items-center justify-center">
        <span className="text-2xl">📐</span>
      </div>
      <h3 className="font-handwriting text-2xl text-gray-700 mb-2">No weekly layout selected</h3>
      <p className="text-sm text-gray-500 mb-4 max-w-xs">
        Pick a weekly layout to see your daily column here. Your plan widgets and monthly context are
        still shown below.
      </p>
      <button
        onClick={onNavigateToLayoutPick}
        className="px-4 py-2 text-sm font-medium text-white bg-[#5BA4E8] hover:bg-[#4a93d7] rounded-lg transition-colors shadow-sm"
        aria-label="Go to Layout Pick"
      >
        Browse Layouts
      </button>
    </div>
  );
}

// === Time Blocks ===

interface TimeBlock {
  id: string;
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
  label: string;
  color: string;
  entryIds: string[]; // IDs of entries assigned to this block
}

const BLOCK_COLORS = [
  { name: 'Mint', value: '#4EDBA1' },
  { name: 'Pink', value: '#F5A6C8' },
  { name: 'Gold', value: '#F5C872' },
  { name: 'Blue', value: '#5BA4E8' },
  { name: 'Purple', value: '#B8A9E8' },
];

function TimeBlocksSection({ date, entries }: { date: Date; entries: Entry[] }) {
  const storageKey = `timeblocks-${formatDateString(date)}`;
  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newStart, setNewStart] = useState('09:00');
  const [newEnd, setNewEnd] = useState('10:00');
  const [newColor, setNewColor] = useState(BLOCK_COLORS[0].value);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  // Load blocks from localStorage on date change
  useEffect(() => {
    setLoaded(false);
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setBlocks(JSON.parse(stored));
      } else {
        setBlocks([]);
      }
    } catch {
      setBlocks([]);
    }
    setLoaded(true);
  }, [storageKey]);

  // Save blocks to localStorage whenever they change (only after initial load)
  useEffect(() => {
    if (loaded) {
      localStorage.setItem(storageKey, JSON.stringify(blocks));
    }
  }, [blocks, storageKey, loaded]);

  function addBlock() {
    if (!newLabel.trim()) return;
    const block: TimeBlock = {
      id: `tb-${Date.now()}`,
      startTime: newStart,
      endTime: newEnd,
      label: newLabel.trim(),
      color: newColor,
      entryIds: [],
    };
    setBlocks((prev) => [...prev, block].sort((a, b) => a.startTime.localeCompare(b.startTime)));
    setNewLabel('');
    setNewStart('09:00');
    setNewEnd('10:00');
    setShowForm(false);
  }

  function deleteBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    if (selectedBlockId === id) setSelectedBlockId(null);
  }

  function toggleEntryInBlock(blockId: string, entryId: string) {
    setBlocks((prev) => prev.map((b) => {
      if (b.id !== blockId) return b;
      const has = b.entryIds.includes(entryId);
      return { ...b, entryIds: has ? b.entryIds.filter(id => id !== entryId) : [...b.entryIds, entryId] };
    }));
  }

  function timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  function formatTime(time: string): string {
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'pm' : 'am';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${m}${ampm}`;
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-handwriting text-lg text-gray-700">time blocks</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs text-[#5BA4E8] hover:text-[#4a93d7] font-medium transition-colors"
        >
          {showForm ? 'cancel' : '+ add block'}
        </button>
      </div>

      {/* Add block form */}
      {showForm && (
        <div className="mb-3 p-3 rounded-xl border border-gray-200 bg-white/80 space-y-2">
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Block name (e.g., Deep Work)"
            className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:border-[#5BA4E8] font-handwriting"
            onKeyDown={(e) => { if (e.key === 'Enter') addBlock(); }}
          />
          <div className="flex gap-2 items-center">
            <input
              type="time"
              value={newStart}
              onChange={(e) => setNewStart(e.target.value)}
              className="text-xs px-2 py-1 border border-gray-200 rounded-lg"
            />
            <span className="text-xs text-gray-400">to</span>
            <input
              type="time"
              value={newEnd}
              onChange={(e) => setNewEnd(e.target.value)}
              className="text-xs px-2 py-1 border border-gray-200 rounded-lg"
            />
          </div>
          <div className="flex gap-1.5 items-center">
            {BLOCK_COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => setNewColor(c.value)}
                className={`w-5 h-5 rounded-full transition-transform ${newColor === c.value ? 'scale-125 ring-2 ring-offset-1 ring-gray-300' : 'hover:scale-110'}`}
                style={{ backgroundColor: c.value }}
                aria-label={c.name}
              />
            ))}
          </div>
          <button
            onClick={addBlock}
            disabled={!newLabel.trim()}
            className="w-full text-xs font-medium py-1.5 rounded-lg bg-[#5BA4E8] text-white hover:bg-[#4a93d7] disabled:opacity-40 transition-colors"
          >
            Add Block
          </button>
        </div>
      )}

      {/* Time blocks display */}
      {blocks.length > 0 ? (
        <div className="space-y-2">
          {blocks.map((block) => {
            const startMin = timeToMinutes(block.startTime);
            const endMin = timeToMinutes(block.endTime);
            const durationMin = Math.max(endMin - startMin, 15);
            const heightPx = Math.max(32, Math.min(durationMin * 0.7, 100));
            const isSelected = selectedBlockId === block.id;
            const assignedEntries = entries.filter(e => block.entryIds.includes(e.id));

            return (
              <div key={block.id} className="rounded-lg overflow-hidden">
                {/* Block header — click to select */}
                <div
                  onClick={() => setSelectedBlockId(isSelected ? null : block.id)}
                  className={`cursor-pointer group/block flex items-stretch gap-2 transition-all ${isSelected ? 'ring-2 ring-offset-1' : 'hover:bg-gray-50/50'}`}
                  style={{ minHeight: `${heightPx}px`, ['--tw-ring-color' as string]: block.color }}
                >
                  {/* Color bar */}
                  <div className="w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: block.color }} />
                  {/* Content */}
                  <div className="flex-1 py-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 font-handwriting">{block.label}</span>
                      <span
                        onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }}
                        className="opacity-0 group-hover/block:opacity-100 text-red-300 hover:text-red-500 text-xs transition-opacity cursor-pointer"
                      >
                        ×
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">{formatTime(block.startTime)} – {formatTime(block.endTime)}</span>
                    {/* Assigned entries */}
                    {assignedEntries.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {assignedEntries.map(entry => (
                          <div key={entry.id} className="flex items-center gap-1 text-xs text-gray-600">
                            <span className="text-[10px]">{entry.type === 'task' ? '×' : entry.type === 'event' ? '○' : '–'}</span>
                            <span className="truncate font-handwriting">{entry.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Entry assignment panel — separate from the block click target */}
                {isSelected && (
                  <div className="ml-3 mt-1 mb-2 p-2 rounded-lg bg-gray-50 border border-gray-200">
                    <p className="text-xs font-medium text-gray-500 mb-1.5">Click to assign entries:</p>
                    <div className="space-y-0.5 max-h-40 overflow-y-auto">
                      {entries.filter(e => e.type === 'task' || e.type === 'event').map(entry => {
                        const isAssigned = block.entryIds.includes(entry.id);
                        return (
                          <div
                            key={entry.id}
                            onClick={() => toggleEntryInBlock(block.id, entry.id)}
                            className={`w-full text-left flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer text-xs transition-colors ${
                              isAssigned ? 'bg-green-100 text-green-700 border border-green-200' : 'hover:bg-gray-100 text-gray-600'
                            }`}
                          >
                            {isAssigned ? (
                              <span className="text-green-500 text-sm">✓</span>
                            ) : (
                              <span className="text-gray-300 text-sm">○</span>
                            )}
                            <span className="font-handwriting truncate flex-1">{entry.text}</span>
                          </div>
                        );
                      })}
                      {entries.filter(e => e.type === 'task' || e.type === 'event').length === 0 && (
                        <p className="text-[10px] text-gray-400 italic">No entries to assign</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : !showForm ? (
        <p className="text-xs text-gray-300 italic font-handwriting">
          no time blocks yet
        </p>
      ) : null}
    </div>
  );
}

// === Main DailyView Component ===

export function DailyView() {
  const { currentDate, navigateDay, setSection } = useNavigationStore();
  const [dailyView, setDailyView] = useState<ComputedDailyView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dailyTab, setDailyTab] = useState<'entries' | 'timeblocks'>('entries');

  const fetchDailyView = useCallback(async (date: Date) => {
    setIsLoading(true);
    setError(null);
    try {
      const dateStr = formatDateString(date);
      const res = await fetch(`/api/daily-view?date=${dateStr}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch daily view: ${res.statusText}`);
      }
      const data = await res.json();
      setDailyView(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDailyView(currentDate);
  }, [currentDate, fetchDailyView]);

  const handleCreateEntry = useCallback(
    async (text: string, type: EntryType) => {
      const dateStr = formatDateString(currentDate);
      try {
        await fetch('/api/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            text,
            pageId: 'daily-view', // Daily view entries use a special page marker
            date: dateStr,
          }),
        });
        // Refresh the daily view
        fetchDailyView(currentDate);
      } catch (err) {
        console.error('Failed to create entry:', err);
      }
    },
    [currentDate, fetchDailyView]
  );

  const handleWidgetDataChange = useCallback(
    async (planId: string, widgetType: string, value: string) => {
      const dateStr = formatDateString(currentDate);
      try {
        await fetch('/api/plan-widget-data', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planId,
            widgetType,
            date: dateStr,
            value,
          }),
        });
      } catch (err) {
        console.error('Failed to save widget data:', err);
      }
    },
    [currentDate]
  );

  const handleToggleComplete = useCallback(
    async (entryId: string) => {
      // Update locally in the dailyView state
      if (dailyView) {
        const updatedEntries = dailyView.entries.map((e: Entry) => {
          if (e.id !== entryId || e.type !== 'task') return e;
          return { ...e, state: e.state === 'complete' ? 'incomplete' : 'complete' };
        });
        setDailyView({ ...dailyView, entries: updatedEntries as Entry[] });
      }

      // Persist to API
      try {
        const entry = dailyView?.entries.find((e: Entry) => e.id === entryId);
        const newState = entry?.state === 'complete' ? 'incomplete' : 'complete';
        await fetch(`/api/entries/${entryId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state: newState }),
        });
      } catch (err) {
        console.error('Failed to toggle entry:', err);
      }
    },
    [dailyView]
  );

  const handleNavigateToLayoutPick = useCallback(() => {
    setSection('layout-pick');
  }, [setSection]);

  // Loading state
  if (isLoading) {
    return (
      <div className="relative w-full h-full bg-[#fefefe] rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
        <DotGridBackground />
        <div className="relative flex items-center justify-center h-full">
          <div className="animate-pulse text-gray-400 font-handwriting text-xl">Loading...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="relative w-full h-full bg-[#fefefe] rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
        <DotGridBackground />
        <div className="relative flex flex-col items-center justify-center h-full gap-3">
          <span className="text-red-400 text-sm">{error}</span>
          <button
            onClick={() => fetchDailyView(currentDate)}
            className="text-xs text-[#5BA4E8] hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const dayName = DAY_NAMES[currentDate.getDay()];
  const shortDayName = SHORT_DAY_NAMES[currentDate.getDay()];
  const dateNum = currentDate.getDate();
  const monthName = MONTH_NAMES[currentDate.getMonth()];
  const isTodayDate = isToday(currentDate);

  return (
    <div className="relative w-full h-full bg-[#fefefe] rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
      {/* Dot grid background */}
      <DotGridBackground />

      {/* Main content */}
      <div className="relative h-full flex flex-col overflow-y-auto p-6">
        {/* Header with navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigateDay('prev')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
            aria-label="Previous day"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="text-center">
            <h2 className="font-handwriting text-4xl text-gray-800 leading-none">{dayName}</h2>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="text-sm text-gray-500">{monthName} {dateNum}, {currentDate.getFullYear()}</span>
              {isTodayDate && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-white bg-[#4EDBA1] px-1.5 py-0.5 rounded">
                  Today
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => navigateDay('next')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
            aria-label="Next day"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Sub-tabs: Entries vs Time Blocks */}
        <div className="flex gap-1 mb-4 bg-gray-100/60 rounded-xl p-1 w-fit">
          <button
            onClick={() => setDailyTab('entries')}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${
              dailyTab === 'entries' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Entries
          </button>
          <button
            onClick={() => setDailyTab('timeblocks')}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${
              dailyTab === 'timeblocks' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Time Blocks
          </button>
        </div>

        {/* Content grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_180px] gap-4">
          {/* Main content - switches based on tab */}
          <div className="space-y-6 overflow-y-auto">
            {dailyTab === 'timeblocks' ? (
              <TimeBlocksSection date={currentDate} entries={dailyView?.entries ?? []} />
            ) : (
            <>
            {/* Day column section */}
            <div>
              {/* Day column header - washi tape style */}
              <div className="inline-block px-3 py-0.5 rounded-sm mb-3 bg-[#4EDBA1]/20">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600">
                  {shortDayName} {dateNum}
                </span>
              </div>

              {/* No layout prompt */}
              {dailyView && !dailyView.hasWeeklyLayout && (
                <NoLayoutPrompt onNavigateToLayoutPick={handleNavigateToLayoutPick} />
              )}

              {/* Day column info */}
              {dailyView?.dayColumn && (
                <div className="mb-3">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                    {dailyView.dayColumn.label}
                  </span>
                </div>
              )}

              {/* Entries */}
              <div className="space-y-0.5">
                {dailyView?.entries.map((entry: Entry) => (
                  <EntryRow key={entry.id} entry={entry} onToggleComplete={handleToggleComplete} />
                ))}
              </div>

              {/* New entry input */}
              <InlineEntryInput onSubmit={handleCreateEntry} />
            </div>

            {/* Plan widgets section */}
            {dailyView && dailyView.dailyWidgets.length > 0 && (
              <div>
                <div className="border-t border-gray-100 pt-4 mb-3">
                  <h3 className="font-handwriting text-lg text-gray-700 mb-3">plans</h3>
                </div>
                <div className="space-y-1">
                  {dailyView.dailyWidgets.map((widget: InjectedWidget, idx: number) => (
                    <PlanWidgetRenderer
                      key={`${widget.planId}-${widget.definition.widgetType}-${idx}`}
                      widget={widget}
                      date={currentDate}
                      onDataChange={handleWidgetDataChange}
                    />
                  ))}
                </div>
              </div>
            )}
            </>
            )}
          </div>

          {/* Right: Monthly context sidebar — hidden on mobile */}
          <div className="hidden md:block space-y-6 pl-4 border-l border-gray-100 overflow-y-auto">
            {/* Mini calendar */}
            <MiniCalendar date={currentDate} />

            {/* Monthly goals widgets */}
            {dailyView?.monthlyContext.monthlyGoalsWidgets &&
              dailyView.monthlyContext.monthlyGoalsWidgets.length > 0 && (
                <div>
                  <h3 className="font-handwriting text-lg text-gray-700 mb-2">monthly goals</h3>
                  <div className="space-y-2">
                    {dailyView.monthlyContext.monthlyGoalsWidgets.map(
                      (widget: InjectedWidget, idx: number) => (
                        <PlanWidgetRenderer
                          key={`monthly-${widget.planId}-${widget.definition.widgetType}-${idx}`}
                          widget={widget}
                          date={currentDate}
                          onDataChange={handleWidgetDataChange}
                        />
                      )
                    )}
                  </div>
                </div>
              )}

            {/* Monthly template info */}
            {dailyView?.monthlyContext.monthlyTemplate && (
              <div className="text-[10px] text-gray-400">
                <span className="uppercase tracking-wider">Monthly layout:</span>
                <span className="block text-gray-500 mt-0.5">
                  {dailyView.monthlyContext.monthlyTemplate.name}
                </span>
              </div>
            )}

            {/* No monthly layout indicator */}
            {dailyView && !dailyView.hasMonthlyLayout && (
              <div className="text-[10px] text-gray-400 italic">
                No monthly layout selected
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DailyView;
