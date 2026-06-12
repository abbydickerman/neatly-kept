'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Entry, EntryType } from '@/types/models';
import type {
  LayoutTemplate,
  InjectionZone,
  InjectedWidget,
} from '@/types/layout-plan';
import { PlanWidgetRenderer } from '@/components/PlanWidgetRenderer';

// === Props ===

export interface WeeklyLayoutViewProps {
  template: LayoutTemplate;
  weekStartDate: Date;
  entries: Entry[];
  activeWidgets: InjectedWidget[];
  onCreateEntry: (date: Date, text: string, type: EntryType) => void;
  onDeleteEntry?: (entryId: string) => void;
  onToggleComplete?: (entryId: string) => void;
  onWidgetDataChange: (widgetId: string, date: Date, value: string) => void;
  onNavigateWeek: (direction: 'prev' | 'next') => void;
}

// === Constants ===

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT_DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const PASTEL_HEADERS: Record<number, string> = {
  1: 'bg-[#F5A6C8]/25', // Monday - pink
  2: 'bg-[#4EDBA1]/25', // Tuesday - mint
  3: 'bg-[#5BA4E8]/25', // Wednesday - blue
  4: 'bg-[#F5C872]/25', // Thursday - gold
  5: 'bg-[#B8A9E8]/25', // Friday - purple
  6: 'bg-[#F5A6C8]/20', // Saturday - pink
  0: 'bg-[#4EDBA1]/20', // Sunday - mint
};

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

// === Helpers ===

function getDateForDayOfWeek(weekStartDate: Date, dayOfWeek: number): Date {
  const startDay = weekStartDate.getDay();
  let offset = dayOfWeek - startDay;
  if (offset < 0) offset += 7;
  const date = new Date(weekStartDate);
  date.setDate(date.getDate() + offset);
  return date;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getMonthName(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long' }).toLowerCase();
}

function formatWeekRange(weekStartDate: Date): string {
  const end = new Date(weekStartDate);
  end.setDate(end.getDate() + 6);
  const startMonth = weekStartDate.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  if (startMonth === endMonth) {
    return `${startMonth} ${weekStartDate.getDate()}–${end.getDate()}`;
  }
  return `${startMonth} ${weekStartDate.getDate()} – ${endMonth} ${end.getDate()}`;
}

// === Sub-components ===

function DotGridBackground() {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: 'radial-gradient(circle, #d4d4d4 0.8px, transparent 0.8px)',
        backgroundSize: '20px 20px',
        opacity: 0.35,
      }}
    />
  );
}

function MiniCalendar({ weekStartDate }: { weekStartDate: Date }) {
  const year = weekStartDate.getFullYear();
  const monthIndex = weekStartDate.getMonth();
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getMonth() === monthIndex && today.getFullYear() === year;

  const days: (number | null)[] = [];
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  for (let i = 0; i < startOffset; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  return (
    <div className="mb-4">
      <h3 className="font-handwriting text-base text-gray-600 mb-1.5">
        {getMonthName(weekStartDate)}
      </h3>
      <div className="grid grid-cols-7 gap-0.5 text-xs">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <div key={i} className="w-4 h-3 flex items-center justify-center font-bold text-gray-400">
            {d}
          </div>
        ))}
        {days.map((day, i) => (
          <div
            key={i}
            className={`w-4 h-4 flex items-center justify-center rounded-sm ${
              day === today.getDate() && isCurrentMonth
                ? 'bg-[#4EDBA1] text-white font-bold'
                : day
                ? 'text-gray-500'
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

function WeatherTracker() {
  const dayLetters = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const weatherColors = [
    'bg-[#4EDBA1]/30',
    'bg-[#F5A6C8]/30',
    'bg-[#5BA4E8]/30',
    'bg-[#F5C872]/30',
    'bg-[#B8A9E8]/30',
    'bg-[#4EDBA1]/30',
    'bg-[#F5A6C8]/30',
  ];

  return (
    <div>
      <h3 className="font-handwriting text-base text-gray-600 mb-1.5">weather</h3>
      <div className="grid grid-cols-7 gap-1">
        {dayLetters.map((d, i) => (
          <div
            key={i}
            className={`w-6 h-6 rounded-sm ${weatherColors[i]} flex items-center justify-center`}
          >
            <span className="text-xs font-bold text-gray-500">{d}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HabitTracker({ weekStartDate }: { weekStartDate: Date }) {
  const storageKey = `habits-${weekStartDate.getFullYear()}-W${getWeekNumber(weekStartDate)}`;
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const dotColors = ['bg-[#4EDBA1]', 'bg-[#F5A6C8]', 'bg-[#F5C872]', 'bg-[#5BA4E8]', 'bg-[#B8A9E8]'];

  const [habits, setHabits] = useState<string[]>([]);
  const [habitData, setHabitData] = useState<Record<string, boolean[]>>({});
  const [newHabit, setNewHabit] = useState('');

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setHabits(parsed.habits || []);
        setHabitData(parsed.data || {});
      } else {
        // Default habits for first use
        const defaults = ['Exercise', 'Read', 'Water', 'Sleep 8h'];
        setHabits(defaults);
        setHabitData(Object.fromEntries(defaults.map(h => [h, Array(7).fill(false)])));
      }
    } catch {
      setHabits(['Exercise', 'Read', 'Water']);
      setHabitData({});
    }
  }, [storageKey]);

  // Save to localStorage
  useEffect(() => {
    if (habits.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify({ habits, data: habitData }));
    }
  }, [habits, habitData, storageKey]);

  function toggleDay(habit: string, dayIdx: number) {
    setHabitData(prev => {
      const current = prev[habit] ?? Array(7).fill(false);
      const updated = [...current];
      updated[dayIdx] = !updated[dayIdx];
      return { ...prev, [habit]: updated };
    });
  }

  function addHabit() {
    if (!newHabit.trim() || habits.includes(newHabit.trim())) return;
    const name = newHabit.trim();
    setHabits(prev => [...prev, name]);
    setHabitData(prev => ({ ...prev, [name]: Array(7).fill(false) }));
    setNewHabit('');
  }

  function removeHabit(habit: string) {
    setHabits(prev => prev.filter(h => h !== habit));
    setHabitData(prev => {
      const copy = { ...prev };
      delete copy[habit];
      return copy;
    });
  }

  return (
    <div className="mb-4">
      <h3 className="font-handwriting text-base text-gray-600 mb-1.5">habits</h3>
      <div className="space-y-1">
        <div className="flex gap-0.5 pl-14">
          {dayLabels.map((d, i) => (
            <div key={i} className="w-5 h-3 flex items-center justify-center text-xs font-bold text-gray-400">
              {d}
            </div>
          ))}
        </div>
        {habits.map((habit, hIdx) => (
          <div key={habit} className="flex items-center gap-0.5 group/habit">
            <span className="text-xs text-gray-500 w-14 truncate">{habit}</span>
            {(habitData[habit] ?? Array(7).fill(false)).map((done, dIdx) => (
              <button
                key={dIdx}
                onClick={() => toggleDay(habit, dIdx)}
                className={`w-5 h-5 rounded-sm border flex items-center justify-center transition-colors ${
                  done
                    ? `${dotColors[hIdx % dotColors.length]} border-transparent`
                    : 'border-gray-200 bg-white/50 hover:border-gray-300'
                }`}
                aria-label={`${habit} ${dayLabels[dIdx]} ${done ? 'done' : 'not done'}`}
              >
                {done && <span className="text-white text-xs">●</span>}
              </button>
            ))}
            <button
              onClick={() => removeHabit(habit)}
              className="opacity-0 group-hover/habit:opacity-100 text-red-300 hover:text-red-500 text-xs ml-0.5 transition-opacity"
              aria-label={`Remove ${habit}`}
            >
              ×
            </button>
          </div>
        ))}
        {/* Add habit input */}
        <div className="flex items-center gap-0.5 mt-1">
          <input
            type="text"
            value={newHabit}
            onChange={(e) => setNewHabit(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addHabit(); }}
            placeholder="+ habit"
            className="text-xs text-gray-500 bg-transparent border-none outline-none placeholder-gray-300 w-14 font-handwriting"
          />
        </div>
      </div>
    </div>
  );
}

function MoodTracker({ weekStartDate }: { weekStartDate: Date }) {
  const storageKey = `mood-${weekStartDate.getFullYear()}-W${getWeekNumber(weekStartDate)}`;
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const moodOptions = ['😊', '😌', '😤', '😢', '🥳', '😴', '🤒'];
  const moodColors: Record<string, string> = {
    '😊': 'bg-[#4EDBA1]/25',
    '😌': 'bg-[#5BA4E8]/25',
    '😤': 'bg-[#F5A6C8]/25',
    '😢': 'bg-[#B8A9E8]/25',
    '🥳': 'bg-[#F5C872]/25',
    '😴': 'bg-gray-200/40',
    '🤒': 'bg-red-100/40',
    '': 'bg-white',
  };

  const [moods, setMoods] = useState<string[]>(Array(7).fill(''));
  const [selectingDay, setSelectingDay] = useState<number | null>(null);

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setMoods(JSON.parse(stored));
      } else {
        setMoods(Array(7).fill(''));
      }
    } catch {
      setMoods(Array(7).fill(''));
    }
  }, [storageKey]);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(moods));
  }, [moods, storageKey]);

  function selectMood(dayIdx: number, mood: string) {
    setMoods(prev => {
      const updated = [...prev];
      updated[dayIdx] = prev[dayIdx] === mood ? '' : mood;
      return updated;
    });
    setSelectingDay(null);
  }

  return (
    <div className="mb-4">
      <h3 className="font-handwriting text-base text-gray-600 mb-1.5">mood</h3>
      <div className="grid grid-cols-7 gap-1">
        {dayLabels.map((d, i) => (
          <div key={`label-${i}`} className="text-xs font-bold text-gray-400 text-center">
            {d}
          </div>
        ))}
        {moods.map((mood, i) => (
          <div key={i} className="relative">
            <button
              onClick={() => setSelectingDay(selectingDay === i ? null : i)}
              className={`w-6 h-6 rounded-md ${moodColors[mood] || 'bg-white'} border border-gray-200/50 flex items-center justify-center text-sm transition-transform hover:scale-110`}
              aria-label={`${dayLabels[i]} mood: ${mood || 'none set'}`}
            >
              {mood || <span className="text-gray-300 text-xs">+</span>}
            </button>
            {/* Mood picker popup */}
            {selectingDay === i && (
              <div className="absolute top-7 left-1/2 -translate-x-1/2 z-20 bg-white border border-gray-200 rounded-lg shadow-lg p-1.5 flex gap-1 flex-wrap w-24">
                {moodOptions.map((m) => (
                  <button
                    key={m}
                    onClick={() => selectMood(i, m)}
                    className={`w-6 h-6 rounded-md flex items-center justify-center text-sm hover:scale-125 transition-transform ${mood === m ? 'ring-2 ring-[#4EDBA1]' : ''}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function NotesSection() {
  return (
    <div>
      <h3 className="font-handwriting text-base text-gray-600 mb-1.5">notes</h3>
      <div className="space-y-1">
        <p className="text-sm text-gray-500 italic font-handwriting">
          jot your thoughts here...
        </p>
      </div>
    </div>
  );
}

function EntryRow({ entry, onDelete, onToggleComplete }: { entry: Entry; onDelete?: (id: string) => void; onToggleComplete?: (id: string) => void }) {
  const symbol = BULLET_SYMBOLS[entry.type];
  const color = BULLET_COLORS[entry.type];
  const isComplete = entry.state === 'complete';
  const isCancelled = entry.state === 'cancelled';
  const isTask = entry.type === 'task';

  return (
    <div className={`flex items-start gap-1.5 py-0.5 group/entry rounded-sm transition-colors ${isComplete ? 'bg-[#4EDBA1]/10' : ''}`}>
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
        className={`text-sm leading-relaxed font-handwriting flex-1 ${
          isComplete
            ? 'line-through text-gray-400'
            : isCancelled
            ? 'line-through text-red-300'
            : 'text-gray-700'
        }`}
      >
        {entry.text}
      </span>
      {onDelete && (
        <button
          onClick={() => onDelete(entry.id)}
          className="opacity-0 group-hover/entry:opacity-100 text-red-300 hover:text-red-500 text-xs transition-opacity flex-shrink-0"
          aria-label={`Delete "${entry.text}"`}
        >
          ×
        </button>
      )}
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
    <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
      <select
        value={type}
        onChange={(e) => setType(e.target.value as EntryType)}
        className="text-xs bg-transparent border-none text-gray-400 p-0 w-6"
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
        className="text-sm text-gray-500 bg-transparent border-none outline-none placeholder-gray-300 flex-1 font-handwriting"
        aria-label="New entry text"
      />
    </div>
  );
}

// === Day Column for the spread ===

interface DayBlockProps {
  dayOfWeek: number;
  date: Date;
  entries: Entry[];
  widgets: InjectedWidget[];
  injectionZone: InjectionZone | undefined;
  onCreateEntry: (text: string, type: EntryType) => void;
  onDeleteEntry?: (id: string) => void;
  onToggleComplete?: (id: string) => void;
  onWidgetDataChange: (widgetId: string, value: string) => void;
}

function DayBlock({
  dayOfWeek,
  date,
  entries,
  widgets,
  injectionZone,
  onCreateEntry,
  onDeleteEntry,
  onToggleComplete,
  onWidgetDataChange,
}: DayBlockProps) {
  const isToday = isSameDay(date, new Date());

  return (
    <div className="group mb-3">
      {/* Washi tape header */}
      <div className={`inline-flex items-baseline gap-1.5 px-2.5 py-0.5 rounded-sm mb-1 ${PASTEL_HEADERS[dayOfWeek]}`}>
        <span className="text-sm font-bold uppercase tracking-wider text-gray-600">
          {SHORT_DAY_NAMES[dayOfWeek]}
        </span>
        <span
          className={`text-base font-handwriting ${
            isToday ? 'text-[#4EDBA1] font-bold' : 'text-gray-500'
          }`}
        >
          {date.getDate()}
        </span>
        {isToday && <span className="w-1.5 h-1.5 rounded-full bg-[#4EDBA1] inline-block" />}
      </div>

      {/* Content */}
      <div className="pl-1 min-h-[32px]">
        {/* Widgets at top position */}
        {injectionZone?.position === 'top' && widgets.length > 0 && (
          <div className="mb-1 border-l-2 border-[#4EDBA1]/30 pl-2">
            {widgets.map((w) => (
              <PlanWidgetRenderer
                key={`${w.planId}-${w.definition.widgetType}`}
                widget={w.definition}
                data={w.data}
                date={date}
                onDataChange={(value) =>
                  onWidgetDataChange(`${w.planId}:${w.definition.widgetType}`, value)
                }
              />
            ))}
          </div>
        )}

        {entries.map((entry) => (
          <EntryRow key={entry.id} entry={entry} onDelete={onDeleteEntry} onToggleComplete={onToggleComplete} />
        ))}

        <InlineEntryInput onSubmit={onCreateEntry} />

        {/* Widgets at after-entries or default position */}
        {(injectionZone?.position === 'after-entries' || !injectionZone?.position) &&
          widgets.length > 0 && (
            <div className="mt-1 border-l-2 border-[#4EDBA1]/30 pl-2">
              {widgets.map((w) => (
                <PlanWidgetRenderer
                  key={`${w.planId}-${w.definition.widgetType}`}
                  widget={w.definition}
                  data={w.data}
                  date={date}
                  onDataChange={(value) =>
                    onWidgetDataChange(`${w.planId}:${w.definition.widgetType}`, value)
                  }
                />
              ))}
            </div>
          )}

        {/* Widgets at bottom position */}
        {injectionZone?.position === 'bottom' && widgets.length > 0 && (
          <div className="mt-1 border-l-2 border-[#4EDBA1]/30 pl-2">
            {widgets.map((w) => (
              <PlanWidgetRenderer
                key={`${w.planId}-${w.definition.widgetType}`}
                widget={w.definition}
                data={w.data}
                date={date}
                onDataChange={(value) =>
                  onWidgetDataChange(`${w.planId}:${w.definition.widgetType}`, value)
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// === Weekend Combined Block ===

interface WeekendBlockProps {
  saturdayDate: Date;
  sundayDate: Date;
  saturdayEntries: Entry[];
  sundayEntries: Entry[];
  widgets: InjectedWidget[];
  injectionZone: InjectionZone | undefined;
  onCreateEntry: (date: Date, text: string, type: EntryType) => void;
  onWidgetDataChange: (widgetId: string, value: string) => void;
}

function WeekendBlock({
  saturdayDate,
  sundayDate,
  saturdayEntries,
  sundayEntries,
  widgets,
  injectionZone,
  onCreateEntry,
  onWidgetDataChange,
}: WeekendBlockProps) {
  const isTodaySat = isSameDay(saturdayDate, new Date());
  const isTodaySun = isSameDay(sundayDate, new Date());

  return (
    <div className="group mb-3">
      {/* Washi tape header */}
      <div className="inline-flex items-baseline gap-1.5 px-2.5 py-0.5 rounded-sm mb-1 bg-[#B8A9E8]/25">
        <span className="text-sm font-bold uppercase tracking-wider text-gray-600">
          Weekend
        </span>
        <span
          className={`text-base font-handwriting ${
            isTodaySat || isTodaySun ? 'text-[#4EDBA1] font-bold' : 'text-gray-500'
          }`}
        >
          {saturdayDate.getDate()}–{sundayDate.getDate()}
        </span>
        {(isTodaySat || isTodaySun) && (
          <span className="w-1.5 h-1.5 rounded-full bg-[#4EDBA1] inline-block" />
        )}
      </div>

      {/* Content */}
      <div className="pl-1 min-h-[32px]">
        {injectionZone?.position === 'top' && widgets.length > 0 && (
          <div className="mb-1 border-l-2 border-[#4EDBA1]/30 pl-2">
            {widgets.map((w) => (
              <PlanWidgetRenderer
                key={`${w.planId}-${w.definition.widgetType}`}
                widget={w.definition}
                data={w.data}
                date={saturdayDate}
                onDataChange={(value) =>
                  onWidgetDataChange(`${w.planId}:${w.definition.widgetType}`, value)
                }
              />
            ))}
          </div>
        )}

        {/* Saturday entries */}
        {saturdayEntries.map((entry) => (
          <EntryRow key={entry.id} entry={entry} />
        ))}
        {/* Sunday entries */}
        {sundayEntries.map((entry) => (
          <EntryRow key={entry.id} entry={entry} />
        ))}

        <InlineEntryInput
          onSubmit={(text, type) => {
            // Default weekend entries to Saturday
            onCreateEntry(saturdayDate, text, type);
          }}
        />

        {(injectionZone?.position === 'after-entries' || !injectionZone?.position) &&
          widgets.length > 0 && (
            <div className="mt-1 border-l-2 border-[#4EDBA1]/30 pl-2">
              {widgets.map((w) => (
                <PlanWidgetRenderer
                  key={`${w.planId}-${w.definition.widgetType}`}
                  widget={w.definition}
                  data={w.data}
                  date={saturdayDate}
                  onDataChange={(value) =>
                    onWidgetDataChange(`${w.planId}:${w.definition.widgetType}`, value)
                  }
                />
              ))}
            </div>
          )}
      </div>
    </div>
  );
}

// === Main Component — Template Router ===

export function WeeklyLayoutView(props: WeeklyLayoutViewProps) {
  const templateName = props.template.name.toLowerCase();

  // Route to the appropriate render based on template
  if (templateName.includes("abby")) {
    return <AbbyLayoutRender {...props} />;
  }
  if (templateName.includes("minimal")) {
    return <MinimalLayoutRender {...props} />;
  }
  // Default: Classic grid render
  return <ClassicLayoutRender {...props} />;
}

// === Classic Weekly Layout — Clean even grid ===

function ClassicLayoutRender({
  template,
  weekStartDate,
  entries,
  activeWidgets,
  onCreateEntry,
  onDeleteEntry,
  onToggleComplete,
  onWidgetDataChange,
  onNavigateWeek,
}: WeeklyLayoutViewProps) {
  const weekNumber = getWeekNumber(weekStartDate);
  const allDays = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun

  const weekDates = useMemo(() => {
    const dates: Record<number, Date> = {};
    for (let dow = 0; dow <= 6; dow++) {
      dates[dow] = getDateForDayOfWeek(weekStartDate, dow);
    }
    return dates;
  }, [weekStartDate]);

  const entriesByDate = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const entry of entries) {
      if (entry.date) {
        const dateKey = `${entry.date.getFullYear()}-${entry.date.getMonth()}-${entry.date.getDate()}`;
        const existing = map.get(dateKey) ?? [];
        existing.push(entry);
        map.set(dateKey, existing);
      }
    }
    return map;
  }, [entries]);

  function getEntriesForDate(date: Date): Entry[] {
    const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return entriesByDate.get(dateKey) ?? [];
  }

  return (
    <div className="relative w-full h-full bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 bg-gray-50/50">
        <button onClick={() => onNavigateWeek('prev')} className="text-gray-400 hover:text-gray-600 p-1" aria-label="Previous week">←</button>
        <div className="text-center">
          <span className="text-sm font-semibold text-gray-700">Week {weekNumber}</span>
          <span className="text-xs text-gray-400 ml-2">{formatWeekRange(weekStartDate)}</span>
        </div>
        <button onClick={() => onNavigateWeek('next')} className="text-gray-400 hover:text-gray-600 p-1" aria-label="Next week">→</button>
      </div>

      {/* 7-column grid */}
      <div className="grid grid-cols-7 h-[calc(100%-48px)] divide-x divide-gray-100">
        {allDays.map((dow) => {
          const date = weekDates[dow];
          const dayEntries = getEntriesForDate(date);
          const isToday2 = isSameDay(date, new Date());

          return (
            <div key={dow} className="flex flex-col p-2 overflow-y-auto group">
              {/* Day header */}
              <div className={`text-center mb-2 pb-1 border-b ${isToday2 ? 'border-[#4EDBA1]' : 'border-gray-100'}`}>
                <div className={`text-xs font-bold uppercase ${isToday2 ? 'text-[#4EDBA1]' : 'text-gray-400'}`}>
                  {SHORT_DAY_NAMES[dow]}
                </div>
                <div className={`text-lg font-semibold ${isToday2 ? 'text-[#4EDBA1]' : 'text-gray-700'}`}>
                  {date.getDate()}
                </div>
              </div>

              {/* Entries */}
              {dayEntries.map((entry) => (
                <EntryRow key={entry.id} entry={entry} onDelete={onDeleteEntry} onToggleComplete={onToggleComplete} />
              ))}

              {/* Add entry */}
              <InlineEntryInput onSubmit={(text, type) => onCreateEntry(date, text, type)} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// === Minimal Weekly Layout — Compact stacked list ===

function MinimalLayoutRender({
  template,
  weekStartDate,
  entries,
  activeWidgets,
  onCreateEntry,
  onDeleteEntry,
  onToggleComplete,
  onWidgetDataChange,
  onNavigateWeek,
}: WeeklyLayoutViewProps) {
  const weekNumber = getWeekNumber(weekStartDate);
  const allDays = [1, 2, 3, 4, 5, 6, 0];

  const weekDates = useMemo(() => {
    const dates: Record<number, Date> = {};
    for (let dow = 0; dow <= 6; dow++) {
      dates[dow] = getDateForDayOfWeek(weekStartDate, dow);
    }
    return dates;
  }, [weekStartDate]);

  const entriesByDate = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const entry of entries) {
      if (entry.date) {
        const dateKey = `${entry.date.getFullYear()}-${entry.date.getMonth()}-${entry.date.getDate()}`;
        const existing = map.get(dateKey) ?? [];
        existing.push(entry);
        map.set(dateKey, existing);
      }
    }
    return map;
  }, [entries]);

  function getEntriesForDate(date: Date): Entry[] {
    const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return entriesByDate.get(dateKey) ?? [];
  }

  const dayColors = ['bg-[#F5A6C8]/10', 'bg-[#4EDBA1]/10', 'bg-[#5BA4E8]/10', 'bg-[#F5C872]/10', 'bg-[#B8A9E8]/10', 'bg-[#F5A6C8]/10', 'bg-[#4EDBA1]/10'];

  return (
    <div className="relative w-full h-full bg-[#fafafa] rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
        <button onClick={() => onNavigateWeek('prev')} className="text-gray-400 hover:text-gray-600 p-1" aria-label="Previous week">←</button>
        <span className="text-sm font-medium text-gray-600">Week {weekNumber} · {formatWeekRange(weekStartDate)}</span>
        <button onClick={() => onNavigateWeek('next')} className="text-gray-400 hover:text-gray-600 p-1" aria-label="Next week">→</button>
      </div>

      {/* Stacked day rows */}
      <div className="overflow-y-auto h-[calc(100%-48px)] p-4 space-y-2">
        {allDays.map((dow, idx) => {
          const date = weekDates[dow];
          const dayEntries = getEntriesForDate(date);
          const isToday2 = isSameDay(date, new Date());

          return (
            <div key={dow} className={`rounded-xl p-3 ${dayColors[idx]} ${isToday2 ? 'ring-2 ring-[#4EDBA1]/30' : ''} group`}>
              <div className="flex items-center gap-3 mb-1">
                <span className={`text-xs font-bold uppercase ${isToday2 ? 'text-[#4EDBA1]' : 'text-gray-500'}`}>
                  {DAY_NAMES[dow]}
                </span>
                <span className="text-xs text-gray-400">{date.getDate()}</span>
                {isToday2 && <span className="w-1.5 h-1.5 rounded-full bg-[#4EDBA1]" />}
              </div>

              {dayEntries.length === 0 && (
                <p className="text-xs text-gray-300 italic">no entries</p>
              )}

              {dayEntries.map((entry) => (
                <EntryRow key={entry.id} entry={entry} onDelete={onDeleteEntry} onToggleComplete={onToggleComplete} />
              ))}

              <InlineEntryInput onSubmit={(text, type) => onCreateEntry(date, text, type)} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// === Abby's Layout — Two-page bullet journal spread ===

function AbbyLayoutRender({
  template,
  weekStartDate,
  entries,
  activeWidgets,
  onCreateEntry,
  onDeleteEntry,
  onToggleComplete,
  onWidgetDataChange,
  onNavigateWeek,
}: WeeklyLayoutViewProps) {
  const weekNumber = getWeekNumber(weekStartDate);

  // Compute dates for each day (Monday-based week)
  const weekDates = useMemo(() => {
    const dates: Record<number, Date> = {};
    for (let dow = 0; dow <= 6; dow++) {
      dates[dow] = getDateForDayOfWeek(weekStartDate, dow);
    }
    return dates;
  }, [weekStartDate]);

  // Group entries by date
  const entriesByDate = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const entry of entries) {
      if (entry.date) {
        const dateKey = `${entry.date.getFullYear()}-${entry.date.getMonth()}-${entry.date.getDate()}`;
        const existing = map.get(dateKey) ?? [];
        existing.push(entry);
        map.set(dateKey, existing);
      }
    }
    return map;
  }, [entries]);

  // Group daily widgets by day of week
  const dailyWidgetsByDayOfWeek = useMemo(() => {
    const map = new Map<number, InjectedWidget[]>();
    for (const widget of activeWidgets) {
      if (
        widget.definition.targetZoneType === 'daily-content' &&
        widget.definition.frequency === 'daily'
      ) {
        for (let dow = 0; dow <= 6; dow++) {
          const existing = map.get(dow) ?? [];
          existing.push(widget);
          map.set(dow, existing);
        }
      }
    }
    return map;
  }, [activeWidgets]);

  const supplementaryWidgets = useMemo(
    () =>
      activeWidgets
        .filter((w) => w.definition.targetZoneType === 'supplementary')
        .sort((a, b) => a.activationOrder - b.activationOrder),
    [activeWidgets]
  );

  // Find injection zones by area ID
  const injectionZonesByAreaId = useMemo(() => {
    const map = new Map<string, InjectionZone>();
    for (const zone of template.injectionZones) {
      map.set(zone.parentAreaId, zone);
    }
    return map;
  }, [template.injectionZones]);

  // Find the injection zone for day columns
  const dayColumnAreas = useMemo(
    () => template.structure.areas.filter((a) => a.type === 'day-column'),
    [template.structure.areas]
  );

  function getEntriesForDate(date: Date): Entry[] {
    const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return entriesByDate.get(dateKey) ?? [];
  }

  function getInjectionZoneForDow(dow: number): InjectionZone | undefined {
    const area = dayColumnAreas.find((a) => a.dayOfWeek === dow);
    return area ? injectionZonesByAreaId.get(area.id) : undefined;
  }

  function getWidgetsForDow(dow: number): InjectedWidget[] {
    return (dailyWidgetsByDayOfWeek.get(dow) ?? []).sort(
      (a, b) => a.activationOrder - b.activationOrder
    );
  }

  // Left page days: Mon (1), Tue (2), Wed (3)
  const leftDays = [1, 2, 3];
  // Right page days: Thu (4), Fri (5), Weekend (6+0)
  const rightDays = [4, 5];

  return (
    <div className="relative w-full h-full bg-[#fefefe] rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
      {/* Dot grid background */}
      <DotGridBackground />

      {/* Week navigation arrows at top */}
      <div className="relative flex items-center justify-between px-6 pt-3 pb-1 z-10">
        <button
          onClick={() => onNavigateWeek('prev')}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          aria-label="Previous week"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <span className="text-sm text-gray-400 font-handwriting">
          {formatWeekRange(weekStartDate)}
        </span>

        <button
          onClick={() => onNavigateWeek('next')}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          aria-label="Next week"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Two-page spread — stacks on mobile */}
      <div className="relative grid grid-cols-1 md:grid-cols-[50%_1px_50%] h-[calc(100%-40px)] overflow-y-auto md:overflow-hidden">
        {/* ====== LEFT PAGE ====== */}
        <div className="grid grid-cols-1 md:grid-cols-[36%_64%] h-full overflow-hidden">
          {/* Left strip: week title, calendar, weather */}
          <div className="p-3 flex flex-col border-r border-gray-100/50 overflow-y-auto">
            {/* Week number title */}
            <div className="mb-4">
              <h2 className="font-handwriting text-2xl text-gray-800 leading-none">week</h2>
              <span className="font-handwriting text-4xl text-gray-800 font-bold leading-tight">
                {weekNumber}
              </span>
            </div>

            {/* Mini calendar */}
            <MiniCalendar weekStartDate={weekStartDate} />

            {/* Weather tracker */}
            <div className="mt-auto">
              <WeatherTracker />
            </div>
          </div>

          {/* Left main: Mon, Tue, Wed */}
          <div className="p-3 overflow-y-auto">
            {leftDays.map((dow) => {
              const date = weekDates[dow];
              return (
                <DayBlock
                  key={dow}
                  dayOfWeek={dow}
                  date={date}
                  entries={getEntriesForDate(date)}
                  widgets={getWidgetsForDow(dow)}
                  injectionZone={getInjectionZoneForDow(dow)}
                  onCreateEntry={(text, type) => onCreateEntry(date, text, type)}
                  onDeleteEntry={onDeleteEntry}
                  onToggleComplete={onToggleComplete}
                  onWidgetDataChange={(widgetId, value) =>
                    onWidgetDataChange(widgetId, date, value)
                  }
                />
              );
            })}
          </div>
        </div>

        {/* Center spine divider — hidden on mobile */}
        <div className="hidden md:block bg-gradient-to-b from-transparent via-gray-300/60 to-transparent" />

        {/* ====== RIGHT PAGE ====== */}
        <div className="grid grid-cols-1 md:grid-cols-[56%_44%] h-full overflow-hidden">
          {/* Right main: Thu, Fri, Weekend */}
          <div className="p-3 overflow-y-auto">
            {rightDays.map((dow) => {
              const date = weekDates[dow];
              return (
                <DayBlock
                  key={dow}
                  dayOfWeek={dow}
                  date={date}
                  entries={getEntriesForDate(date)}
                  widgets={getWidgetsForDow(dow)}
                  injectionZone={getInjectionZoneForDow(dow)}
                  onCreateEntry={(text, type) => onCreateEntry(date, text, type)}
                  onDeleteEntry={onDeleteEntry}
                  onToggleComplete={onToggleComplete}
                  onWidgetDataChange={(widgetId, value) =>
                    onWidgetDataChange(widgetId, date, value)
                  }
                />
              );
            })}

            {/* Weekend block */}
            <WeekendBlock
              saturdayDate={weekDates[6]}
              sundayDate={weekDates[0]}
              saturdayEntries={getEntriesForDate(weekDates[6])}
              sundayEntries={getEntriesForDate(weekDates[0])}
              widgets={getWidgetsForDow(6)}
              injectionZone={getInjectionZoneForDow(6)}
              onCreateEntry={onCreateEntry}
              onWidgetDataChange={(widgetId, value) =>
                onWidgetDataChange(widgetId, weekDates[6], value)
              }
            />
          </div>

          {/* Right strip: Habits, Mood, Notes */}
          <div className="p-3 flex flex-col border-l border-gray-100/50 overflow-y-auto">
            {/* Habits tracker */}
            <HabitTracker weekStartDate={weekStartDate} />

            {/* Mood tracker */}
            <MoodTracker weekStartDate={weekStartDate} />

            {/* Supplementary widgets from active plans */}
            {supplementaryWidgets.length > 0 && (
              <div className="mb-4 border-l-2 border-[#5BA4E8]/30 pl-2">
                {supplementaryWidgets.map((w) => (
                  <PlanWidgetRenderer
                    key={`${w.planId}-${w.definition.widgetType}`}
                    widget={w.definition}
                    data={w.data}
                    date={weekStartDate}
                    onDataChange={(value) =>
                      onWidgetDataChange(
                        `${w.planId}:${w.definition.widgetType}`,
                        weekStartDate,
                        value
                      )
                    }
                  />
                ))}
              </div>
            )}

            {/* Notes section */}
            <div className="mt-auto">
              <NotesSection />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WeeklyLayoutView;
