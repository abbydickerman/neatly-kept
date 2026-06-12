'use client';

import { useEffect, useState, useCallback } from 'react';
import { SessionProvider } from 'next-auth/react';
import { Sidebar } from '@/components/Sidebar';
import { ViewSwitcher } from '@/components/ViewSwitcher';
import { LayoutTemplateGallery } from '@/components/LayoutTemplateGallery';
import { PlanGallery } from '@/components/PlanGallery';
import { WeeklyLayoutView } from '@/components/WeeklyLayoutView';
import { DailyView } from '@/components/DailyView';
import { useNavigationStore } from '@/store/navigation-store';
import { useLayoutSelectionStore } from '@/store/layout-selection-store';
import { usePlanActivationStore } from '@/store/plan-activation-store';
import type { LayoutTemplate, InjectedWidget } from '@/types/layout-plan';
import type { Entry, EntryType } from '@/types/models';

/**
 * Monthly Layout View — Calendar grid with entries per day.
 */
function MonthlyLayoutViewPlaceholder() {
  const { currentDate, navigateMonth } = useNavigationStore();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [filter, setFilter] = useState<'all' | 'events'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('monthly-filter') as 'all' | 'events') || 'all';
    }
    return 'all';
  });

  function handleFilterChange(newFilter: 'all' | 'events') {
    setFilter(newFilter);
    localStorage.setItem('monthly-filter', newFilter);
  }
  const [addingToDay, setAddingToDay] = useState<number | null>(null);
  const [newEventText, setNewEventText] = useState('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  useEffect(() => {
    async function fetchEntries() {
      const startStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const endStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
      try {
        const res = await fetch(`/api/entries?dateStart=${startStr}&dateEnd=${endStr}`);
        if (res.ok) {
          const data = await res.json();
          setEntries(Array.isArray(data) ? data.map((raw: Record<string, unknown>) => ({
            ...raw,
            date: raw.date ? new Date(raw.date as string + 'T00:00:00') : undefined,
          })) as Entry[] : []);
        }
      } catch { /* ignore */ }
    }
    fetchEntries();
  }, [year, month, daysInMonth]);

  function getEntriesForDay(day: number): Entry[] {
    const filtered = entries.filter(e => {
      if (!e.date) return false;
      const d = e.date instanceof Date ? e.date : new Date(e.date as unknown as string);
      return d.getDate() === day && d.getMonth() === month;
    });
    if (filter === 'events') return filtered.filter(e => e.type === 'event');
    return filtered;
  }

  async function addEvent(day: number) {
    if (!newEventText.trim()) return;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // Optimistically add
    const optimistic: Entry = {
      id: `local-${Date.now()}`,
      userId: '',
      pageId: '22ee0788-7c5e-4cb6-96e9-5c8b03547822',
      type: 'event',
      text: newEventText.trim(),
      signifiers: [],
      date: new Date(year, month, day),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setEntries(prev => [...prev, optimistic]);
    setNewEventText('');
    setAddingToDay(null);

    try {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'event', text: optimistic.text, pageId: optimistic.pageId, date: dateStr }),
      });
      if (res.ok) {
        const saved = await res.json();
        setEntries(prev => prev.map(e => e.id === optimistic.id ? { ...saved, date: new Date(saved.date + 'T00:00:00') } as Entry : e));
      }
    } catch { /* keep optimistic */ }
  }

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="relative w-full h-full bg-[#fefefe] rounded-2xl overflow-hidden border border-gray-100 shadow-sm flex flex-col">
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #d4d4d4 0.8px, transparent 0.8px)', backgroundSize: '20px 20px', opacity: 0.3 }} />

      {/* Header with filter tabs */}
      <div className="relative flex items-center justify-between px-6 py-3 border-b border-gray-100">
        <button onClick={() => navigateMonth('prev')} className="text-gray-400 hover:text-gray-600 p-1" aria-label="Previous month">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="text-center">
          <h2 className="font-handwriting text-2xl text-gray-800">{monthName}</h2>
          {/* Filter tabs */}
          <div className="flex gap-1 mt-1 bg-gray-100/60 rounded-lg p-0.5 w-fit mx-auto">
            <button
              onClick={() => handleFilterChange('all')}
              className={`px-3 py-1 text-[10px] font-medium rounded-md transition-all ${filter === 'all' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
            >
              All
            </button>
            <button
              onClick={() => handleFilterChange('events')}
              className={`px-3 py-1 text-[10px] font-medium rounded-md transition-all ${filter === 'events' ? 'bg-white text-[#F5A6C8] shadow-sm' : 'text-gray-500'}`}
            >
              Events Only
            </button>
          </div>
        </div>
        <button onClick={() => navigateMonth('next')} className="text-gray-400 hover:text-gray-600 p-1" aria-label="Next month">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="relative grid grid-cols-7 border-b border-gray-100">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d} className="py-2 text-center text-xs font-bold uppercase text-gray-400 tracking-wider">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="relative flex-1 grid grid-cols-7 auto-rows-fr overflow-y-auto">
        {cells.map((day, idx) => {
          if (day === null) return <div key={idx} className="border-b border-r border-gray-50 bg-gray-50/30" />;

          const dayEntries = getEntriesForDay(day);
          const isTodayCell = isCurrentMonth && today.getDate() === day;
          const isAdding = addingToDay === day;

          return (
            <div
              key={idx}
              className={`border-b border-r border-gray-50 p-1.5 min-h-[80px] cursor-pointer group/cell ${isTodayCell ? 'bg-[#4EDBA1]/5' : 'hover:bg-gray-50/50'} transition-colors`}
              onClick={() => { if (!isAdding) setAddingToDay(day); }}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold ${isTodayCell ? 'text-[#4EDBA1]' : 'text-gray-500'}`}>
                  {day}
                  {isTodayCell && <span className="ml-1 w-1 h-1 rounded-full bg-[#4EDBA1] inline-block" />}
                </span>
                <span className="text-[10px] text-[#F5A6C8] opacity-0 group-hover/cell:opacity-100 transition-opacity">+ event</span>
              </div>
              <div className="space-y-0.5 mt-0.5">
                {dayEntries.slice(0, 3).map((entry) => (
                  <div key={entry.id} className="flex items-center gap-1 truncate">
                    <span className={`text-[10px] font-bold ${entry.type === 'task' ? 'text-gray-600' : entry.type === 'event' ? 'text-[#F5A6C8]' : 'text-[#F5C872]'}`}>
                      {entry.type === 'task' ? '×' : entry.type === 'event' ? '○' : '–'}
                    </span>
                    <span className={`text-[10px] truncate ${entry.state === 'complete' ? 'line-through text-gray-300' : 'text-gray-600'}`}>
                      {entry.text}
                    </span>
                  </div>
                ))}
                {dayEntries.length > 3 && (
                  <span className="text-[9px] text-gray-400">+{dayEntries.length - 3} more</span>
                )}
              </div>
              {/* Add event inline */}
              {isAdding && (
                <div className="mt-1" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={newEventText}
                    onChange={(e) => setNewEventText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') addEvent(day); if (e.key === 'Escape') setAddingToDay(null); }}
                    onBlur={() => { if (!newEventText.trim()) setAddingToDay(null); }}
                    placeholder="Event name..."
                    className="w-full text-[10px] px-1.5 py-1 border border-[#F5A6C8]/40 rounded bg-white outline-none focus:border-[#F5A6C8] font-handwriting"
                    autoFocus
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Prompt shown when no layout is selected for the current view type.
 */
function NoLayoutPrompt({ onNavigateToLayoutPick }: { onNavigateToLayoutPick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <div className="w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-[#4EDBA1]/10 via-[#F5C872]/10 to-[#F5A6C8]/10 flex items-center justify-center">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <rect x="4" y="4" width="14" height="14" rx="3" stroke="#F5A6C8" strokeWidth="1.5" />
          <rect x="22" y="4" width="14" height="14" rx="3" stroke="#F5C872" strokeWidth="1.5" />
          <rect x="4" y="22" width="32" height="14" rx="3" stroke="#4EDBA1" strokeWidth="1.5" />
        </svg>
      </div>
      <h3 className="font-handwriting text-3xl text-gray-700 mb-2">No layout selected</h3>
      <p className="text-sm text-gray-400 max-w-sm mb-6">
        Pick a layout template to give your journal its visual structure. You can always switch later.
      </p>
      <button
        onClick={onNavigateToLayoutPick}
        className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-[#4EDBA1] to-[#5BA4E8] hover:from-[#3dc98e] hover:to-[#4a93d7] rounded-xl transition-all shadow-md shadow-[#4EDBA1]/20 hover:shadow-lg hover:shadow-[#4EDBA1]/30"
      >
        Browse Layouts
      </button>
    </div>
  );
}

/**
 * Renders the appropriate view within the My Stuff section based on
 * the activeView from the navigation store.
 */
function MyStuffContent() {
  const activeView = useNavigationStore((s) => s.activeView);
  const setSection = useNavigationStore((s) => s.setSection);
  const { activeWeeklyTemplateId, activeMonthlyTemplateId } = useLayoutSelectionStore();

  const handleNavigateToLayoutPick = () => setSection('layout-pick');

  if (activeView === 'daily') {
    return <DailyView />;
  }

  if (activeView === 'monthly') {
    // Show monthly placeholder (monthly view component not yet built)
    return <MonthlyLayoutViewPlaceholder />;
  }

  // Weekly view (default)
  if (!activeWeeklyTemplateId) {
    // Try to render with the first available weekly template as fallback for unauthenticated users
    return <WeeklyLayoutViewConnected templateId={activeWeeklyTemplateId ?? '__fallback__'} />;
  }

  return <WeeklyLayoutViewConnected templateId={activeWeeklyTemplateId} />;
}

/**
 * Connected weekly layout view that fetches template data, entries, and widgets
 * from the API and renders the full WeeklyLayoutView component.
 */
function WeeklyLayoutViewConnected({ templateId }: { templateId: string }) {
  const currentDate = useNavigationStore((s) => s.currentDate);
  const navigateWeek = useNavigationStore((s) => s.navigateWeek);

  const [template, setTemplate] = useState<LayoutTemplate | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [widgets, setWidgets] = useState<InjectedWidget[]>([]);
  const [loading, setLoading] = useState(true);

  // Calculate the start of the current week (Monday) — use string key for stable dependency
  const getWeekStart = useCallback((date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const weekStartDate = getWeekStart(currentDate);
  const weekStartKey = formatDate(weekStartDate); // stable string for dependency

  // Fetch template, entries, and widgets
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      try {
        // Fetch all templates (public endpoint - no auth needed)
        const templateRes = await fetch('/api/layout-templates');
        if (!templateRes.ok) throw new Error('Failed to fetch templates');
        const templates: LayoutTemplate[] = await templateRes.json();
        let tmpl = templates.find((t) => t.id === templateId) ?? null;
        // Fallback: if templateId doesn't match (e.g., unauthenticated), use first weekly template
        if (!tmpl) {
          tmpl = templates.find((t) => t.category === 'weekly') ?? null;
        }
        if (!cancelled) setTemplate(tmpl);

        // Fetch entries for the week (may fail without auth - that's ok)
        const weekEnd = new Date(weekStartDate);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const startStr = formatDate(weekStartDate);
        const endStr = formatDate(weekEnd);
        try {
          const entriesRes = await fetch(`/api/entries?dateStart=${startStr}&dateEnd=${endStr}`);
          if (entriesRes.ok) {
            const entriesData = await entriesRes.json();
            if (!cancelled) setEntries(Array.isArray(entriesData) ? entriesData.map(mapApiEntry) : []);
          }
        } catch { /* entries fetch is non-critical */ }

        // Fetch widgets (may fail without auth - that's ok)
        try {
          const widgetsRes = await fetch(`/api/plan-widget-data?date=${startStr}`);
          if (widgetsRes.ok) {
            const widgetsData = await widgetsRes.json();
            if (!cancelled) setWidgets(Array.isArray(widgetsData) ? widgetsData : []);
          }
        } catch { /* widgets fetch is non-critical */ }
      } catch (err) {
        console.error('Failed to fetch weekly view data:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [templateId, weekStartKey]);

  const handleCreateEntry = useCallback(async (date: Date, text: string, type: EntryType) => {
    // Optimistically add the entry to local state immediately
    const optimisticEntry: Entry = {
      id: `local-${Date.now()}`,
      userId: '',
      pageId: 'weekly-view',
      type,
      text,
      signifiers: [],
      date,
      state: type === 'task' ? 'incomplete' : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setEntries((prev) => [...prev, optimisticEntry]);

    // Try to persist to API (may fail without auth)
    try {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          text,
          pageId: '22ee0788-7c5e-4cb6-96e9-5c8b03547822',
          date: formatDate(date),
        }),
      });
      if (res.ok) {
        const savedEntry = await res.json();
        // Replace optimistic entry with the real one from the server
        setEntries((prev) =>
          prev.map((e) => (e.id === optimisticEntry.id ? mapApiEntry(savedEntry) : e))
        );
      }
    } catch (err) {
      console.error('Failed to persist entry:', err);
    }
  }, []);

  const handleDeleteEntry = useCallback(async (entryId: string) => {
    // Remove from local state immediately
    setEntries((prev) => prev.filter((e) => e.id !== entryId));

    // Try to delete from API
    if (!entryId.startsWith('local-')) {
      try {
        await fetch(`/api/entries/${entryId}`, { method: 'DELETE' });
      } catch (err) {
        console.error('Failed to delete entry:', err);
      }
    }
  }, []);

  const handleToggleComplete = useCallback(async (entryId: string) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== entryId || e.type !== 'task') return e;
        const newState = e.state === 'complete' ? 'incomplete' : 'complete';
        return { ...e, state: newState };
      })
    );

    // Try to persist to API
    if (!entryId.startsWith('local-')) {
      try {
        const entry = entries.find((e) => e.id === entryId);
        const newState = entry?.state === 'complete' ? 'incomplete' : 'complete';
        await fetch(`/api/entries/${entryId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state: newState }),
        });
      } catch (err) {
        console.error('Failed to toggle entry:', err);
      }
    }
  }, [entries]);

  const handleWidgetDataChange = useCallback(async (widgetId: string, date: Date, value: string) => {
    const [planId, widgetType] = widgetId.split(':');
    try {
      await fetch('/api/plan-widget-data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          widgetType,
          date: formatDate(date),
          value,
        }),
      });
    } catch (err) {
      console.error('Failed to save widget data:', err);
    }
  }, []);

  if (loading || !template) {
    return (
      <div className="relative w-full h-full bg-[#fefefe] rounded-2xl overflow-hidden border border-gray-100 shadow-sm flex items-center justify-center">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #d4d4d4 0.8px, transparent 0.8px)', backgroundSize: '20px 20px', opacity: 0.4 }} />
        <div className="animate-pulse font-handwriting text-xl text-gray-400">Loading weekly spread...</div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)]">
      <WeeklyLayoutView
        template={template}
        weekStartDate={weekStartDate}
        entries={entries}
        activeWidgets={widgets}
        onCreateEntry={handleCreateEntry}
        onDeleteEntry={handleDeleteEntry}
        onToggleComplete={handleToggleComplete}
        onWidgetDataChange={handleWidgetDataChange}
        onNavigateWeek={(direction) => navigateWeek(direction)}
      />
    </div>
  );
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function mapApiEntry(raw: Record<string, unknown>): Entry {
  // Parse the date carefully — API returns "YYYY-MM-DD" strings
  let entryDate: Date | undefined;
  if (raw.date) {
    const dateStr = raw.date as string;
    // Parse as local date (not UTC) by appending T00:00:00 without Z
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      entryDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    } else {
      entryDate = new Date(dateStr + 'T00:00:00');
    }
  }

  return {
    id: raw.id as string,
    userId: raw.userId as string ?? raw.user_id as string ?? '',
    pageId: raw.pageId as string ?? raw.page_id as string ?? '',
    type: raw.type as EntryType,
    text: raw.text as string,
    signifiers: (raw.signifiers as Entry['signifiers']) ?? [],
    date: entryDate,
    state: (raw.state as Entry['state']) ?? undefined,
    createdAt: raw.createdAt ? new Date(raw.createdAt as string) : new Date(),
    updatedAt: raw.updatedAt ? new Date(raw.updatedAt as string) : new Date(),
  };
}

/**
 * Main Layout Plan page — entry point for the layout plan system.
 *
 * Requirements: 1.1, 1.2, 1.3, 3.5, 6.5, 13.2
 */
export default function LayoutPlanPage() {
  const activeSection = useNavigationStore((s) => s.activeSection);
  const loadSelections = useLayoutSelectionStore((s) => s.loadSelections);
  const loadActivations = usePlanActivationStore((s) => s.loadActivations);

  // Load layout selections and plan activations from API on mount
  useEffect(() => {
    loadSelections().catch(() => {});
    loadActivations().catch(() => {});
  }, [loadSelections, loadActivations]);

  return (
    <SessionProvider>
    <div className="flex h-screen bg-gray-50/50 overflow-hidden">
      {/* Sidebar navigation — hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main content area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* View switcher — shown only in My Stuff */}
        {activeSection === 'my-stuff' && (
          <div className="flex-shrink-0 px-4 md:px-6 pt-4 md:pt-5 pb-2 md:pb-3">
            <ViewSwitcher />
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 overflow-y-auto px-3 md:px-6 pb-20 md:pb-6">
          {activeSection === 'my-stuff' && <MyStuffContent />}
          {activeSection === 'layout-pick' && <LayoutTemplateGallery />}
          {activeSection === 'plan-picks' && <PlanGallery />}
        </div>
      </main>

      {/* Mobile bottom tab bar */}
      <MobileTabBar />
    </div>
    </SessionProvider>
  );
}

/**
 * Mobile bottom tab bar — shown only on small screens
 */
function MobileTabBar() {
  const activeSection = useNavigationStore((s) => s.activeSection);
  const setSection = useNavigationStore((s) => s.setSection);

  const tabs: { id: 'my-stuff' | 'layout-pick' | 'plan-picks'; label: string; icon: string }[] = [
    { id: 'my-stuff', label: 'Journal', icon: '📝' },
    { id: 'layout-pick', label: 'Layouts', icon: '📐' },
    { id: 'plan-picks', label: 'Plans', icon: '⭐' },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-gray-200 z-50">
      <div className="flex justify-around py-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSection(tab.id)}
            className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-lg transition-colors ${
              activeSection === tab.id ? 'text-[#4EDBA1]' : 'text-gray-400'
            }`}
          >
            <span className="text-lg">{tab.icon}</span>
            <span className="text-[10px] font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
