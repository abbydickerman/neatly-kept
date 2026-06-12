'use client';

import { useState } from 'react';
import type { Entry, EntryType } from '@/types/models';

// === Types ===

interface DayEntries {
  day: string;
  shortDay: string;
  date: number;
  entries: Entry[];
  color: string;
  headerBg: string;
}

interface WeeklySpreadViewProps {
  weekNumber: number;
  month: string;
  year: number;
  days: DayEntries[];
  habits?: string[];
  habitData?: Record<string, boolean[]>;
  notes?: string[];
  onAddEntry?: (day: string, text: string, type: EntryType) => void;
}

// === Bullet symbols ===
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

// === Components ===

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

function MiniCalendar({ month, year }: { month: string; year: number }) {
  const monthIndex = new Date(`${month} 1, ${year}`).getMonth();
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const today = new Date().getDate();
  const isCurrentMonth = new Date().getMonth() === monthIndex && new Date().getFullYear() === year;

  const days = [];
  // Adjust for Monday start
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  for (let i = 0; i < startOffset; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  return (
    <div className="mb-6">
      <h3 className="font-handwriting text-lg text-gray-700 mb-2">{month}</h3>
      <div className="grid grid-cols-7 gap-0.5 text-[9px]">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <div key={i} className="w-5 h-4 flex items-center justify-center font-bold text-gray-500">{d}</div>
        ))}
        {days.map((day, i) => (
          <div
            key={i}
            className={`w-5 h-5 flex items-center justify-center rounded-sm ${
              day === today && isCurrentMonth
                ? 'bg-[#4EDBA1] text-white font-bold'
                : day ? 'text-gray-600' : ''
            }`}
          >
            {day ?? ''}
          </div>
        ))}
      </div>
    </div>
  );
}

function HabitTracker({ habits, data }: { habits: string[]; data: Record<string, boolean[]> }) {
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const dotColors = ['bg-[#4EDBA1]', 'bg-[#F5A6C8]', 'bg-[#F5C872]', 'bg-[#5BA4E8]', 'bg-[#B8A9E8]'];

  return (
    <div className="mb-6">
      <h3 className="font-handwriting text-lg text-gray-700 mb-2 flex items-center gap-2">
        habits
        <span className="flex gap-1">
          {['🎯', '💪', '📖', '💧', '🧘'].slice(0, habits.length).map((e, i) => (
            <span key={i} className="text-xs">{e}</span>
          ))}
        </span>
      </h3>
      <div className="space-y-1.5">
        <div className="flex gap-1 pl-16">
          {dayLabels.map((d, i) => (
            <div key={i} className="w-5 h-4 flex items-center justify-center text-[9px] font-bold text-gray-400">{d}</div>
          ))}
        </div>
        {habits.map((habit, hIdx) => (
          <div key={habit} className="flex items-center gap-1">
            <span className="text-[10px] text-gray-500 w-16 truncate">{habit}</span>
            {(data[habit] ?? Array(7).fill(false)).map((done, dIdx) => (
              <div
                key={dIdx}
                className={`w-5 h-5 rounded-sm border flex items-center justify-center ${
                  done
                    ? `${dotColors[hIdx % dotColors.length]} border-transparent`
                    : 'border-gray-200 bg-white'
                }`}
              >
                {done && <span className="text-white text-[8px]">✓</span>}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function MoodTracker() {
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const moods = ['😊', '😌', '😊', '😤', '😊', '🥳', '😴'];
  const moodColors = ['bg-[#4EDBA1]/20', 'bg-[#5BA4E8]/20', 'bg-[#4EDBA1]/20', 'bg-[#F5A6C8]/20', 'bg-[#4EDBA1]/20', 'bg-[#F5C872]/20', 'bg-[#B8A9E8]/20'];

  return (
    <div className="mb-6">
      <h3 className="font-handwriting text-lg text-gray-700 mb-2">mood</h3>
      <div className="grid grid-cols-7 gap-1">
        {dayLabels.map((d, i) => (
          <div key={`label-${i}`} className="text-[9px] font-bold text-gray-400 text-center">{d}</div>
        ))}
        {moods.map((mood, i) => (
          <div key={i} className={`w-7 h-7 rounded-md ${moodColors[i]} flex items-center justify-center text-sm`}>
            {mood}
          </div>
        ))}
      </div>
    </div>
  );
}

function EntryRow({ entry }: { entry: Entry }) {
  const symbol = BULLET_SYMBOLS[entry.type];
  const color = BULLET_COLORS[entry.type];
  const isComplete = entry.state === 'complete';
  const isCancelled = entry.state === 'cancelled';

  return (
    <div className="flex items-start gap-2 py-0.5">
      <span className={`text-sm font-bold ${color} w-4 flex-shrink-0`}>{symbol}</span>
      <span className={`text-[12px] leading-relaxed ${
        isComplete ? 'line-through text-gray-300' : isCancelled ? 'line-through text-red-300' : 'text-gray-700'
      }`}>
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
    <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
      <select
        value={type}
        onChange={(e) => setType(e.target.value as EntryType)}
        className="text-[10px] bg-transparent border-none text-gray-400 p-0 w-8"
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
      />
    </div>
  );
}

// === Main Component ===

export function WeeklySpreadView({
  weekNumber,
  month,
  year,
  days,
  habits = ['Exercise', 'Read', 'Meditate', 'Water'],
  habitData = {
    'Exercise': [true, true, false, true, true, false, false],
    'Read': [true, true, true, true, false, true, true],
    'Meditate': [false, true, true, false, true, true, false],
    'Water': [true, true, true, true, true, true, false],
  },
  notes = ['thank you Helen!!!'],
  onAddEntry,
}: WeeklySpreadViewProps) {
  return (
    <div className="relative w-full h-full bg-[#fefefe] rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
      {/* Dot grid background */}
      <DotGridBackground />

      {/* Main content - two page spread */}
      <div className="relative grid grid-cols-[1fr_1px_1fr] h-full">
        {/* LEFT PAGE */}
        <div className="p-6 overflow-y-auto">
          {/* Week title */}
          <div className="mb-5">
            <h2 className="font-handwriting text-4xl text-gray-800 leading-none">week</h2>
            <span className="font-handwriting text-5xl text-gray-800 font-bold">{weekNumber}</span>
          </div>

          {/* Mini calendar */}
          <MiniCalendar month={month} year={year} />

          {/* Monday - Wednesday */}
          <div className="space-y-4">
            {days.slice(0, 3).map((day) => (
              <div key={day.day} className="group">
                {/* Day header - washi tape style */}
                <div className={`inline-block px-3 py-0.5 rounded-sm mb-1.5 ${day.headerBg}`}>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600">
                    {day.day} {day.date}
                  </span>
                </div>
                {/* Entries */}
                <div className="pl-1">
                  {day.entries.map((entry) => (
                    <EntryRow key={entry.id} entry={entry} />
                  ))}
                  {onAddEntry && (
                    <InlineEntryInput onSubmit={(text, type) => onAddEntry(day.day, text, type)} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center spine */}
        <div className="bg-gradient-to-b from-transparent via-gray-200 to-transparent" />

        {/* RIGHT PAGE */}
        <div className="p-6 overflow-y-auto">
          {/* Thursday - Weekend */}
          <div className="space-y-4 mb-6">
            {days.slice(3, 5).map((day) => (
              <div key={day.day} className="group">
                <div className={`inline-block px-3 py-0.5 rounded-sm mb-1.5 ${day.headerBg}`}>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600">
                    {day.day} {day.date}
                  </span>
                </div>
                <div className="pl-1">
                  {day.entries.map((entry) => (
                    <EntryRow key={entry.id} entry={entry} />
                  ))}
                  {onAddEntry && (
                    <InlineEntryInput onSubmit={(text, type) => onAddEntry(day.day, text, type)} />
                  )}
                </div>
              </div>
            ))}

            {/* Weekend combined */}
            {days.length > 5 && (
              <div className="group">
                <div className={`inline-block px-3 py-0.5 rounded-sm mb-1.5 bg-[#B8A9E8]/20`}>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600">
                    Weekend {days[5]?.date}–{days[6]?.date}
                  </span>
                </div>
                <div className="pl-1">
                  {[...days[5]?.entries ?? [], ...days[6]?.entries ?? []].map((entry) => (
                    <EntryRow key={entry.id} entry={entry} />
                  ))}
                  {onAddEntry && (
                    <InlineEntryInput onSubmit={(text, type) => onAddEntry('Weekend', text, type)} />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Side panels */}
          <div className="border-t border-gray-100 pt-4 space-y-4">
            {/* Habits */}
            <HabitTracker habits={habits} data={habitData} />

            {/* Mood */}
            <MoodTracker />

            {/* Notes */}
            <div>
              <h3 className="font-handwriting text-lg text-gray-700 mb-2">notes</h3>
              <div className="space-y-1">
                {notes.map((note, i) => (
                  <p key={i} className="text-[11px] text-gray-600 italic">{note}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WeeklySpreadView;
