'use client';

import { useState, useEffect } from 'react';
import { EntryList } from '@/components/EntryList';
import { CalendarView } from '@/components/CalendarView';
import { LayoutGallery } from '@/components/LayoutGallery';
import { LayoutEditor } from '@/components/LayoutEditor';
import CollectionView from '@/components/CollectionView';
import { WeeklySpreadView } from '@/components/WeeklySpreadView';
import { getBuiltInLayouts } from '@/services/layout-service';
import { createCalendarService } from '@/services/calendar-service';
import { InMemoryRepository } from '@/lib/persistence/in-memory-repository';
import { getDefaultSignifier } from '@/services/entry-service';
import type { Entry, CalendarConfig, Collection, EntryType, Signifier, TaskAction } from '@/types/models';
import type { CollectionEntryDisplay } from '@/components/CollectionView';

type DemoView = 'journal' | 'calendar' | 'collections' | 'layouts' | 'settings';

// Mock data
const MOCK_ENTRIES: Entry[] = [
  {
    id: 'e1', userId: 'demo', pageId: 'page-1', type: 'task', text: 'Finish project proposal',
    signifiers: [getDefaultSignifier('task'), { id: 'sig-p', symbol: '★', category: 'priority', label: 'Important' }],
    state: 'incomplete', createdAt: new Date(), updatedAt: new Date(), date: new Date(),
  },
  {
    id: 'e2', userId: 'demo', pageId: 'page-1', type: 'event', text: 'Team standup at 10am',
    signifiers: [getDefaultSignifier('event')],
    date: new Date(), createdAt: new Date(), updatedAt: new Date(),
  },
  {
    id: 'e3', userId: 'demo', pageId: 'page-1', type: 'note', text: 'Remember to buy milk on the way home',
    signifiers: [getDefaultSignifier('note')],
    createdAt: new Date(), updatedAt: new Date(),
  },
  {
    id: 'e4', userId: 'demo', pageId: 'page-1', type: 'task', text: 'Review pull request #42',
    signifiers: [getDefaultSignifier('task'), { id: 'sig-c', symbol: '■', category: 'category', label: 'Work' }],
    state: 'complete', createdAt: new Date(), updatedAt: new Date(), date: new Date(),
  },
  {
    id: 'e5', userId: 'demo', pageId: 'page-1', type: 'task', text: 'Schedule dentist appointment',
    signifiers: [getDefaultSignifier('task')],
    state: 'incomplete', createdAt: new Date(), updatedAt: new Date(),
  },
  {
    id: 'e6', userId: 'demo', pageId: 'page-1', type: 'event', text: 'Lunch with Sarah at noon',
    signifiers: [getDefaultSignifier('event')],
    date: new Date(), createdAt: new Date(), updatedAt: new Date(),
  },
];

const MOCK_COLLECTIONS: Collection[] = [
  { id: 'col-1', userId: 'demo', name: 'Work Tasks', layoutId: 'builtin-daily-log', isTemplate: false, createdAt: new Date('2024-01-15'), updatedAt: new Date() },
  { id: 'col-2', userId: 'demo', name: 'Habit Tracker', layoutId: 'builtin-daily-log', isTemplate: true, templateType: 'habit-tracker', createdAt: new Date('2024-02-01'), updatedAt: new Date() },
  { id: 'col-3', userId: 'demo', name: 'Reading List', layoutId: 'builtin-blank-page', isTemplate: true, templateType: 'reading-list', createdAt: new Date('2024-03-01'), updatedAt: new Date() },
];

const MOCK_COLLECTION_ENTRIES: CollectionEntryDisplay[] = [
  { entry: MOCK_ENTRIES[0], addedAt: new Date('2024-06-01'), sourcePageName: 'Daily Log — June 15' },
  { entry: MOCK_ENTRIES[3], addedAt: new Date('2024-06-02'), sourcePageName: 'Daily Log — June 15' },
];

function formatToday(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

// === Decorative SVG Components ===

function BlobBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
      <svg className="absolute -top-20 -right-20 w-96 h-96" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <path fill="#4EDBA1" d="M44.7,-76.4C58.8,-69.2,71.8,-58.1,79.6,-44.1C87.4,-30.1,90,-13.2,87.8,2.6C85.6,18.5,78.6,33.2,69.1,45.6C59.6,58,47.6,68.1,34.1,74.4C20.5,80.7,5.3,83.2,-9.5,81.1C-24.3,79,-38.7,72.3,-51.4,63.1C-64.1,53.9,-75.1,42.2,-80.6,28.1C-86.1,14,-86.1,-2.5,-82.1,-17.8C-78.1,-33.1,-70.1,-47.2,-58.5,-55.5C-46.9,-63.8,-31.7,-66.3,-17.4,-72.6C-3.1,-78.9,10.3,-89,24.8,-89.3C39.3,-89.6,54.9,-80.1,44.7,-76.4Z" transform="translate(100 100)" />
      </svg>
      <svg className="absolute -bottom-32 -left-16 w-80 h-80" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <path fill="#F5A6C8" d="M39.2,-65.9C50.5,-59.3,59,-48.2,66.7,-36C74.4,-23.8,81.3,-10.5,80.5,2.1C79.7,14.7,71.2,26.5,62.3,37.3C53.4,48.1,44.1,57.9,32.8,64.5C21.5,71.1,8.2,74.5,-5.4,74.7C-19,74.9,-33,71.9,-44.2,64.8C-55.4,57.7,-63.8,46.5,-69.8,34C-75.8,21.5,-79.4,7.7,-77.5,-5.2C-75.6,-18.1,-68.2,-30.1,-58.8,-39.7C-49.4,-49.3,-38,-56.5,-26.1,-62.7C-14.2,-68.9,-1.8,-74.1,10.4,-74.3C22.6,-74.5,44.8,-69.7,39.2,-65.9Z" transform="translate(100 100)" />
      </svg>
      <svg className="absolute top-1/2 right-1/4 w-64 h-64" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <path fill="#F5C872" fillOpacity="0.5" d="M43.5,-73.2C56.3,-66.2,66.6,-54.3,74.1,-40.8C81.6,-27.3,86.3,-12.2,84.3,1.8C82.3,15.8,73.6,28.7,64.4,40.7C55.2,52.7,45.5,63.8,33.5,70.5C21.5,77.2,7.2,79.5,-6.8,77.8C-20.8,76.1,-34.5,70.4,-46.3,62.2C-58.1,54,-68,43.3,-73.9,30.5C-79.8,17.7,-81.7,2.8,-78.8,-11C-75.9,-24.8,-68.2,-37.5,-57.6,-45.7C-47,-53.9,-33.5,-57.6,-21,-63.5C-8.5,-69.4,3,-77.5,15.6,-79.4C28.2,-81.3,41.9,-77,43.5,-73.2Z" transform="translate(100 100)" />
      </svg>
    </div>
  );
}

function ProgressRing({ completed, total }: { completed: number; total: number }) {
  const percentage = total > 0 ? (completed / total) * 100 : 0;
  const circumference = 2 * Math.PI * 38;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative w-24 h-24">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r="38" fill="none" stroke="#f0f0f0" strokeWidth="6" />
        <circle
          cx="44" cy="44" r="38" fill="none"
          stroke="url(#progress-gradient)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-700 ease-out"
        />
        <defs>
          <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4EDBA1" />
            <stop offset="100%" stopColor="#3BC98A" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-gray-800">{Math.round(percentage)}%</span>
        <span className="text-[9px] text-gray-400 uppercase tracking-wider">done</span>
      </div>
    </div>
  );
}

function TaskIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="7" stroke="#4EDBA1" strokeWidth="2" />
      <circle cx="9" cy="9" r="3" fill="#4EDBA1" />
    </svg>
  );
}

function EventIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="2" y="4" width="14" height="12" rx="3" stroke="#F5A6C8" strokeWidth="1.5" />
      <path d="M2 8h14" stroke="#F5A6C8" strokeWidth="1.5" />
      <circle cx="6" cy="11.5" r="1.5" fill="#F5A6C8" />
    </svg>
  );
}

function NoteIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M4 5h10M4 9h7M4 13h9" stroke="#F5C872" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function EmptyJournalIllustration() {
  return (
    <div className="flex flex-col items-center py-12">
      <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
        <rect x="20" y="15" width="80" height="95" rx="8" fill="#fafcfb" stroke="#e0e0e0" strokeWidth="1.5" />
        <path d="M35 40h50M35 52h40M35 64h45M35 76h30" stroke="#4EDBA1" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
        <circle cx="85" cy="90" r="18" fill="#F5A6C8" opacity="0.15" />
        <path d="M80 88l4 4 8-8" stroke="#F5A6C8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p className="text-sm text-gray-400 mt-4">No entries yet — add your first one below</p>
    </div>
  );
}

function WaveDivider() {
  return (
    <svg className="w-full h-6" viewBox="0 0 1200 24" preserveAspectRatio="none">
      <path d="M0,12 C200,20 400,4 600,12 C800,20 1000,4 1200,12 L1200,24 L0,24 Z" fill="white" fillOpacity="0.5" />
    </svg>
  );
}

// === Main Component ===

export default function DemoPage() {
  const [activeView, setActiveView] = useState<DemoView>('journal');
  const [entries, setEntries] = useState<Entry[]>(MOCK_ENTRIES);
  const [showLayoutGallery, setShowLayoutGallery] = useState(false);
  const [editingLayout, setEditingLayout] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<Collection | undefined>(MOCK_COLLECTIONS[0]);
  const [mounted, setMounted] = useState(false);
  const [spreadType, setSpreadType] = useState<'daily' | 'weekly'>('weekly');

  useEffect(() => { setMounted(true); }, []);

  const [calendarService] = useState(() => {
    const entryRepo = new InMemoryRepository<Entry>();
    const configRepo = new InMemoryRepository<CalendarConfig>();
    MOCK_ENTRIES.forEach(e => { if (e.date) entryRepo.create(e); });
    return createCalendarService(entryRepo, configRepo);
  });

  const builtInLayouts = getBuiltInLayouts();

  const taskEntries = entries.filter(e => e.type === 'task');
  const completedTasks = taskEntries.filter(e => e.state === 'complete').length;
  const totalTasks = taskEntries.length;

  function handleCreateEntry(data: { type: EntryType; text: string; signifiers: Signifier[]; date?: Date }) {
    const newEntry: Entry = {
      id: `e-${Date.now()}`,
      userId: 'demo',
      pageId: 'page-1',
      type: data.type,
      text: data.text,
      signifiers: data.signifiers,
      state: data.type === 'task' ? 'incomplete' : undefined,
      date: data.date,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setEntries(prev => [...prev, newEntry]);
  }

  function handleTaskAction(entryId: string, action: TaskAction) {
    setEntries(prev => prev.map(e => {
      if (e.id !== entryId) return e;
      const stateMap: Record<TaskAction, string> = { complete: 'complete', migrate: 'migrated', cancel: 'cancelled' };
      return { ...e, state: stateMap[action] as Entry['state'], updatedAt: new Date() };
    }));
  }

  const navItems: { id: DemoView; label: string; icon: React.ReactNode }[] = [
    { id: 'journal', label: 'Journal', icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="2" width="14" height="16" rx="3" stroke="currentColor" strokeWidth="1.5"/><path d="M7 7h6M7 10h4M7 13h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg> },
    { id: 'calendar', label: 'Calendar', icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="4" width="16" height="14" rx="3" stroke="currentColor" strokeWidth="1.5"/><path d="M2 8h16" stroke="currentColor" strokeWidth="1.5"/><path d="M6 2v3M14 2v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
    { id: 'collections', label: 'Collections', icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="6" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M6 6V4a1 1 0 011-1h6a1 1 0 011 1v2" stroke="currentColor" strokeWidth="1.5"/></svg> },
    { id: 'layouts', label: 'Layouts', icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="2" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/><rect x="11" y="2" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/><rect x="2" y="11" width="16" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/></svg> },
    { id: 'settings', label: 'Settings', icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.93 4.93l1.41 1.41M13.66 13.66l1.41 1.41M4.93 15.07l1.41-1.41M13.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg> },
  ];

  return (
    <div className={`flex h-screen overflow-hidden bg-[#fbfcfd] transition-opacity duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      {/* Sidebar */}
      <aside className="w-[260px] flex-shrink-0 border-r border-gray-100/80 bg-white/70 backdrop-blur-xl flex flex-col relative overflow-hidden">
        {/* Decorative gradient at top of sidebar */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#F5A6C8]/8 to-transparent pointer-events-none" />

        {/* Logo */}
        <div className="relative px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#4EDBA1] via-[#F5C872] to-[#F5A6C8] flex items-center justify-center shadow-lg shadow-[#4EDBA1]/20">
              <span className="text-white text-lg">✦</span>
            </div>
            <div>
              <h1 className="text-[15px] font-bold text-gray-900 tracking-tight">BushyBeaver</h1>
              <p className="text-[11px] text-gray-400 font-medium">Digital Journal</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="relative flex-1 px-4 py-2 space-y-1">
          {navItems.map((item, idx) => {
            const colors = [
              { active: 'from-[#4EDBA1]/10 to-[#4EDBA1]/5', text: 'text-[#2A9D6E]', dot: 'bg-[#4EDBA1]', shadow: 'shadow-[#4EDBA1]/10' },
              { active: 'from-[#F5A6C8]/10 to-[#F5A6C8]/5', text: 'text-[#D4749A]', dot: 'bg-[#F5A6C8]', shadow: 'shadow-[#F5A6C8]/10' },
              { active: 'from-[#F5C872]/10 to-[#F5C872]/5', text: 'text-[#C9993D]', dot: 'bg-[#F5C872]', shadow: 'shadow-[#F5C872]/10' },
              { active: 'from-[#4EDBA1]/10 to-[#4EDBA1]/5', text: 'text-[#2A9D6E]', dot: 'bg-[#4EDBA1]', shadow: 'shadow-[#4EDBA1]/10' },
              { active: 'from-[#F5A6C8]/10 to-[#F5A6C8]/5', text: 'text-[#D4749A]', dot: 'bg-[#F5A6C8]', shadow: 'shadow-[#F5A6C8]/10' },
            ];
            const c = colors[idx];
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200 group ${
                  activeView === item.id
                    ? `bg-gradient-to-r ${c.active} ${c.text} shadow-sm ${c.shadow}`
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50/80'
                }`}
              >
                <span className={`transition-transform duration-200 ${activeView === item.id ? 'scale-110' : 'group-hover:scale-105'}`}>
                  {item.icon}
                </span>
                {item.label}
                {activeView === item.id && (
                  <div className={`ml-auto w-1.5 h-1.5 rounded-full ${c.dot}`} />
                )}
              </button>
            );
          })}
        </nav>

        {/* User card at bottom */}
        <div className="relative px-4 py-5 border-t border-gray-100/80">
          {/* Colorful accent bar */}
          <div className="absolute top-0 left-4 right-4 h-0.5 bg-gradient-to-r from-[#4EDBA1] via-[#F5C872] to-[#F5A6C8] rounded-full" />
          <div className="flex items-center gap-3 px-3 py-2 rounded-2xl bg-gradient-to-r from-[#F5A6C8]/5 to-[#F5C872]/5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F5A6C8] to-[#E88DB4] flex items-center justify-center shadow-md shadow-[#F5A6C8]/20">
              <span className="text-white text-sm font-bold">A</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-700">Abby Dickerman</p>
              <p className="text-[10px] text-gray-400">Pro plan ✨</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto relative">
        {/* Journal view */}
        {activeView === 'journal' && (
          <div className="relative h-full flex flex-col">
            {/* Hero banner with gradient and blobs */}
            <div className="relative h-40 bg-gradient-to-br from-[#4EDBA1] via-[#F5C872] to-[#F5A6C8] overflow-hidden flex-shrink-0">
              <BlobBackground />
              <div className="relative z-10 px-10 pt-8 flex items-end justify-between">
                <div>
                  <p className="text-white/70 text-xs font-semibold uppercase tracking-[0.2em]">Today&apos;s Journal</p>
                  <h2 className="text-2xl font-bold text-white mt-1 tracking-tight">{formatToday()}</h2>
                </div>
                {/* Spread type switcher */}
                <div className="flex gap-1 bg-white/20 backdrop-blur-sm rounded-xl p-1 mb-4">
                  <button
                    onClick={() => setSpreadType('daily')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                      spreadType === 'daily' ? 'bg-white text-gray-800 shadow-sm' : 'text-white/80 hover:text-white'
                    }`}
                  >
                    Daily Log
                  </button>
                  <button
                    onClick={() => setSpreadType('weekly')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                      spreadType === 'weekly' ? 'bg-white text-gray-800 shadow-sm' : 'text-white/80 hover:text-white'
                    }`}
                  >
                    Weekly Spread
                  </button>
                </div>
              </div>
              <WaveDivider />
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {spreadType === 'weekly' ? (
                <div className="h-[calc(100vh-220px)]">
                  <WeeklySpreadView
                    weekNumber={Math.ceil(new Date().getDate() / 7)}
                    month={new Date().toLocaleDateString('en-US', { month: 'long' })}
                    year={new Date().getFullYear()}
                    days={[
                      { day: 'Monday', shortDay: 'M', date: 16, color: '#F5A6C8', headerBg: 'bg-[#F5A6C8]/15', entries: [MOCK_ENTRIES[0], MOCK_ENTRIES[2]] },
                      { day: 'Tuesday', shortDay: 'T', date: 17, color: '#4EDBA1', headerBg: 'bg-[#4EDBA1]/15', entries: [MOCK_ENTRIES[1]] },
                      { day: 'Wednesday', shortDay: 'W', date: 18, color: '#5BA4E8', headerBg: 'bg-[#5BA4E8]/15', entries: [MOCK_ENTRIES[4]] },
                      { day: 'Thursday', shortDay: 'T', date: 19, color: '#F5C872', headerBg: 'bg-[#F5C872]/15', entries: [MOCK_ENTRIES[5], MOCK_ENTRIES[3]] },
                      { day: 'Friday', shortDay: 'F', date: 20, color: '#B8A9E8', headerBg: 'bg-[#B8A9E8]/15', entries: [] },
                      { day: 'Saturday', shortDay: 'S', date: 21, color: '#F5C872', headerBg: 'bg-[#F5C872]/15', entries: [] },
                      { day: 'Sunday', shortDay: 'S', date: 22, color: '#F5A6C8', headerBg: 'bg-[#F5A6C8]/15', entries: [] },
                    ]}
                    onAddEntry={(day, text, type) => {
                      handleCreateEntry({ type, text, signifiers: [], date: new Date() });
                    }}
                  />
                </div>
              ) : (
                <div className="max-w-3xl mx-auto">
                  {/* Stats row */}
              <div className="grid grid-cols-4 gap-4 mb-8">
                {/* Progress ring card */}
                <div className="col-span-1 p-5 rounded-3xl bg-white border border-gray-100 shadow-sm shadow-gray-100/50 flex flex-col items-center justify-center">
                  <ProgressRing completed={completedTasks} total={totalTasks} />
                  <p className="text-[10px] text-gray-400 mt-2 uppercase tracking-wider font-medium">Tasks</p>
                </div>

                {/* Stat cards — vivid colors */}
                <div className="col-span-1 p-5 rounded-3xl bg-gradient-to-br from-[#4EDBA1] to-[#3BC98A] shadow-lg shadow-[#4EDBA1]/20 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-2">
                    <TaskIcon />
                    <span className="text-[10px] text-white/70 uppercase tracking-wider font-medium">Open</span>
                  </div>
                  <p className="text-3xl font-bold text-white">{entries.filter(e => e.type === 'task' && e.state === 'incomplete').length}</p>
                </div>

                <div className="col-span-1 p-5 rounded-3xl bg-gradient-to-br from-[#F5A6C8] to-[#E88DB4] shadow-lg shadow-[#F5A6C8]/20 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-2">
                    <EventIcon />
                    <span className="text-[10px] text-white/70 uppercase tracking-wider font-medium">Events</span>
                  </div>
                  <p className="text-3xl font-bold text-white">{entries.filter(e => e.type === 'event').length}</p>
                </div>

                <div className="col-span-1 p-5 rounded-3xl bg-gradient-to-br from-[#F5C872] to-[#E8B44E] shadow-lg shadow-[#F5C872]/20 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-2">
                    <NoteIcon />
                    <span className="text-[10px] text-white/70 uppercase tracking-wider font-medium">Notes</span>
                  </div>
                  <p className="text-3xl font-bold text-white">{entries.filter(e => e.type === 'note').length}</p>
                </div>
              </div>

              {/* Journal entries card */}
              <div className="rounded-3xl border border-gray-100 bg-white/80 backdrop-blur-sm shadow-sm shadow-gray-100/50 p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-700">Entries</h3>
                  <button
                    onClick={() => setShowLayoutGallery(true)}
                    className="text-xs text-[#D4749A] hover:text-[#C0607D] font-medium transition-colors flex items-center gap-1"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="1" y="8" width="12" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/></svg>
                    Change layout
                  </button>
                </div>
                <EntryList
                  entries={entries}
                  pageId="page-1"
                  availablePages={[
                    { id: 'page-2', userId: 'demo', layoutId: 'builtin-daily-log', title: 'Tomorrow', createdAt: new Date(), updatedAt: new Date() },
                    { id: 'page-3', userId: 'demo', layoutId: 'builtin-weekly-spread', title: 'Weekly Review', createdAt: new Date(), updatedAt: new Date() },
                  ]}
                  onCreateEntry={handleCreateEntry}
                  onTaskAction={handleTaskAction}
                  onMigrate={(entryId) => handleTaskAction(entryId, 'migrate')}
                />
              </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Calendar view */}
        {activeView === 'calendar' && (
          <div className="h-full p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Calendar</h2>
              <p className="text-sm text-gray-400 mt-1">Navigate your schedule across time</p>
            </div>
            <div className="h-[calc(100%-80px)] rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
              <CalendarView calendarService={calendarService} refreshIntervalMs={0} />
            </div>
          </div>
        )}

        {/* Collections */}
        {activeView === 'collections' && (
          <div className="p-8">
            <CollectionView
              collections={MOCK_COLLECTIONS}
              layouts={builtInLayouts}
              selectedCollection={selectedCollection}
              collectionEntries={selectedCollection?.id === 'col-1' ? MOCK_COLLECTION_ENTRIES : []}
              availableEntries={entries.filter(e => e.state !== 'migrated')}
              onCreateCollection={async (name) => alert(`Created: ${name}`)}
              onSelectCollection={(id) => setSelectedCollection(MOCK_COLLECTIONS.find(c => c.id === id))}
              onAddEntry={async (entryId) => alert(`Added ${entryId}`)}
              onRemoveEntry={async (entryId) => alert(`Removed ${entryId}`)}
              onDeleteCollection={async (id) => alert(`Deleted ${id}`)}
            />
          </div>
        )}

        {/* Layouts */}
        {activeView === 'layouts' && (
          <div className="max-w-4xl mx-auto px-10 py-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Layouts</h2>
                <p className="text-sm text-gray-400 mt-1">Design your perfect page structure</p>
              </div>
              <button
                onClick={() => setEditingLayout(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-[#4EDBA1] via-[#F5C872] to-[#F5A6C8] text-white text-sm font-semibold rounded-2xl hover:shadow-lg hover:shadow-[#F5A6C8]/25 transition-all duration-200"
              >
                + New Layout
              </button>
            </div>

            {editingLayout && (
              <div className="border border-gray-100 rounded-3xl bg-white h-[550px] shadow-sm mb-8 overflow-hidden">
                <LayoutEditor
                  existingLayouts={builtInLayouts}
                  userId="demo"
                  onSave={async (layout) => { alert(`Saved: ${layout.name}`); setEditingLayout(false); }}
                  onCancel={() => setEditingLayout(false)}
                />
              </div>
            )}

            {!editingLayout && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                {builtInLayouts.map((layout, idx) => {
                  const cardColors = [
                    { border: 'group-hover:border-[#4EDBA1]/40', shadow: 'group-hover:shadow-[#4EDBA1]/10', area: 'from-[#4EDBA1]/5 to-[#4EDBA1]/15', areaHover: 'group-hover:from-[#4EDBA1]/15 group-hover:to-[#4EDBA1]/25', text: 'group-hover:text-[#2A9D6E]' },
                    { border: 'group-hover:border-[#F5A6C8]/40', shadow: 'group-hover:shadow-[#F5A6C8]/10', area: 'from-[#F5A6C8]/5 to-[#F5A6C8]/15', areaHover: 'group-hover:from-[#F5A6C8]/15 group-hover:to-[#F5A6C8]/25', text: 'group-hover:text-[#D4749A]' },
                    { border: 'group-hover:border-[#F5C872]/40', shadow: 'group-hover:shadow-[#F5C872]/10', area: 'from-[#F5C872]/5 to-[#F5C872]/15', areaHover: 'group-hover:from-[#F5C872]/15 group-hover:to-[#F5C872]/25', text: 'group-hover:text-[#C9993D]' },
                    { border: 'group-hover:border-[#B8A9E8]/40', shadow: 'group-hover:shadow-[#B8A9E8]/10', area: 'from-[#B8A9E8]/5 to-[#B8A9E8]/15', areaHover: 'group-hover:from-[#B8A9E8]/15 group-hover:to-[#B8A9E8]/25', text: 'group-hover:text-[#8B7CC8]' },
                  ];
                  const c = cardColors[idx % cardColors.length];
                  return (
                    <div key={layout.id} className="group cursor-pointer">
                      <div className={`relative w-full aspect-[3/4] rounded-2xl border border-gray-100 bg-white p-3 shadow-sm group-hover:shadow-lg ${c.shadow} ${c.border} transition-all duration-300 overflow-hidden`}>
                        <div className="relative w-full h-full rounded-xl bg-gradient-to-br from-[#fafcfb] to-[#f5f9f7]">
                          {layout.contentAreas.map(area => (
                            <div
                              key={area.id}
                              className={`absolute rounded-lg border border-current/10 bg-gradient-to-br ${c.area} ${c.areaHover} transition-colors duration-300`}
                              style={{ left: `${area.x}%`, top: `${area.y}%`, width: `${area.width}%`, height: `${area.height}%` }}
                            />
                          ))}
                        </div>
                      </div>
                      <p className={`text-sm font-medium text-gray-600 text-center mt-3 ${c.text} transition-colors`}>{layout.name}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Settings */}
        {activeView === 'settings' && (
          <div className="max-w-2xl mx-auto px-10 py-8">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-8">Settings</h2>
            <div className="space-y-5">
              <div className="p-6 rounded-3xl border border-gray-100 bg-white shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Theme</h3>
                <div className="flex gap-3">
                  {[
                    { name: 'Mint', color: '#4EDBA1' },
                    { name: 'Rose', color: '#F5A6C8' },
                    { name: 'Gold', color: '#F5C872' },
                    { name: 'Ocean', color: '#5BA4E8' },
                    { name: 'Lavender', color: '#B8A9E8' },
                  ].map(theme => (
                    <button key={theme.name} className="flex flex-col items-center gap-2 group">
                      <div
                        className={`w-10 h-10 rounded-xl shadow-sm transition-transform duration-200 group-hover:scale-110 ${theme.name === 'Mint' ? 'ring-2 ring-offset-2 ring-[#4EDBA1]' : ''}`}
                        style={{ backgroundColor: theme.color }}
                      />
                      <span className="text-[10px] text-gray-500 font-medium">{theme.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-6 rounded-3xl border border-gray-100 bg-white shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Calendar</h3>
                <p className="text-sm text-gray-400">Week starts on: <span className="text-gray-700 font-semibold">Monday</span></p>
              </div>
              <div className="p-6 rounded-3xl border border-gray-100 bg-white shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Account</h3>
                <p className="text-sm text-gray-400">Signed in as <span className="text-gray-700 font-semibold">abby@example.com</span></p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Layout gallery modal */}
      {showLayoutGallery && (
        <LayoutGallery
          customLayouts={[]}
          onSelect={(layout) => { alert(`Switched to: ${layout.name}`); setShowLayoutGallery(false); }}
          onDismiss={() => setShowLayoutGallery(false)}
        />
      )}
    </div>
  );
}
