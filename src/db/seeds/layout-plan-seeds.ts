import type { LayoutTemplate, Plan } from '@/types/layout-plan';

// === Built-in Weekly Layout Templates ===

export const BUILT_IN_WEEKLY_TEMPLATES: LayoutTemplate[] = [
  {
    id: 'builtin-weekly-classic',
    name: 'Classic Weekly Spread',
    description:
      'Traditional bullet journal weekly spread with 7 day columns and a side panel for notes and habits.',
    category: 'weekly',
    isBuiltIn: true,
    structure: {
      areas: [
        { id: 'header', type: 'header', label: 'Week Header', x: 0, y: 0, width: 100, height: 8 },
        { id: 'mon', type: 'day-column', dayOfWeek: 1, label: 'Monday', x: 0, y: 8, width: 25, height: 46 },
        { id: 'tue', type: 'day-column', dayOfWeek: 2, label: 'Tuesday', x: 25, y: 8, width: 25, height: 46 },
        { id: 'wed', type: 'day-column', dayOfWeek: 3, label: 'Wednesday', x: 50, y: 8, width: 25, height: 46 },
        { id: 'thu', type: 'day-column', dayOfWeek: 4, label: 'Thursday', x: 75, y: 8, width: 25, height: 46 },
        { id: 'fri', type: 'day-column', dayOfWeek: 5, label: 'Friday', x: 0, y: 54, width: 25, height: 46 },
        { id: 'sat', type: 'day-column', dayOfWeek: 6, label: 'Saturday', x: 25, y: 54, width: 25, height: 46 },
        { id: 'sun', type: 'day-column', dayOfWeek: 0, label: 'Sunday', x: 50, y: 54, width: 25, height: 46 },
        { id: 'side-panel', type: 'side-panel', label: 'Side Panel', x: 75, y: 54, width: 25, height: 46 },
      ],
    },
    injectionZones: [
      { id: 'mon-daily', name: 'Monday Content', type: 'daily-content', parentAreaId: 'mon', position: 'after-entries' },
      { id: 'tue-daily', name: 'Tuesday Content', type: 'daily-content', parentAreaId: 'tue', position: 'after-entries' },
      { id: 'wed-daily', name: 'Wednesday Content', type: 'daily-content', parentAreaId: 'wed', position: 'after-entries' },
      { id: 'thu-daily', name: 'Thursday Content', type: 'daily-content', parentAreaId: 'thu', position: 'after-entries' },
      { id: 'fri-daily', name: 'Friday Content', type: 'daily-content', parentAreaId: 'fri', position: 'after-entries' },
      { id: 'sat-daily', name: 'Saturday Content', type: 'daily-content', parentAreaId: 'sat', position: 'after-entries' },
      { id: 'sun-daily', name: 'Sunday Content', type: 'daily-content', parentAreaId: 'sun', position: 'after-entries' },
      { id: 'supplementary', name: 'Supplementary', type: 'supplementary', parentAreaId: 'side-panel', position: 'top' },
    ],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'builtin-weekly-minimal',
    name: 'Minimal Weekly',
    description:
      'A compact two-column weekly layout with weekdays on the left, weekend on the right, and a notes area below.',
    category: 'weekly',
    isBuiltIn: true,
    structure: {
      areas: [
        { id: 'header', type: 'header', label: 'Week Header', x: 0, y: 0, width: 100, height: 8 },
        { id: 'mon', type: 'day-column', dayOfWeek: 1, label: 'Monday', x: 0, y: 8, width: 50, height: 18 },
        { id: 'tue', type: 'day-column', dayOfWeek: 2, label: 'Tuesday', x: 0, y: 26, width: 50, height: 18 },
        { id: 'wed', type: 'day-column', dayOfWeek: 3, label: 'Wednesday', x: 0, y: 44, width: 50, height: 18 },
        { id: 'thu', type: 'day-column', dayOfWeek: 4, label: 'Thursday', x: 0, y: 62, width: 50, height: 18 },
        { id: 'fri', type: 'day-column', dayOfWeek: 5, label: 'Friday', x: 50, y: 8, width: 50, height: 18 },
        { id: 'sat', type: 'day-column', dayOfWeek: 6, label: 'Saturday', x: 50, y: 26, width: 50, height: 18 },
        { id: 'sun', type: 'day-column', dayOfWeek: 0, label: 'Sunday', x: 50, y: 44, width: 50, height: 18 },
        { id: 'notes', type: 'notes', label: 'Notes', x: 50, y: 62, width: 50, height: 18 },
        { id: 'side-panel', type: 'side-panel', label: 'Weekly Overview', x: 0, y: 80, width: 100, height: 20 },
      ],
    },
    injectionZones: [
      { id: 'mon-daily', name: 'Monday Content', type: 'daily-content', parentAreaId: 'mon', position: 'after-entries' },
      { id: 'tue-daily', name: 'Tuesday Content', type: 'daily-content', parentAreaId: 'tue', position: 'after-entries' },
      { id: 'wed-daily', name: 'Wednesday Content', type: 'daily-content', parentAreaId: 'wed', position: 'after-entries' },
      { id: 'thu-daily', name: 'Thursday Content', type: 'daily-content', parentAreaId: 'thu', position: 'after-entries' },
      { id: 'fri-daily', name: 'Friday Content', type: 'daily-content', parentAreaId: 'fri', position: 'after-entries' },
      { id: 'sat-daily', name: 'Saturday Content', type: 'daily-content', parentAreaId: 'sat', position: 'after-entries' },
      { id: 'sun-daily', name: 'Sunday Content', type: 'daily-content', parentAreaId: 'sun', position: 'after-entries' },
      { id: 'supplementary', name: 'Supplementary', type: 'supplementary', parentAreaId: 'side-panel', position: 'top' },
    ],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

// === Built-in Monthly Layout Templates ===

export const BUILT_IN_MONTHLY_TEMPLATES: LayoutTemplate[] = [
  {
    id: 'builtin-monthly-calendar',
    name: 'Monthly Calendar Grid',
    description:
      'A traditional calendar grid layout with a month overview, goal-setting area, and monthly summary section.',
    category: 'monthly',
    isBuiltIn: true,
    structure: {
      areas: [
        { id: 'header', type: 'header', label: 'Month Header', x: 0, y: 0, width: 100, height: 10 },
        { id: 'month-grid', type: 'month-grid', label: 'Calendar Grid', x: 0, y: 10, width: 75, height: 70 },
        { id: 'goals-panel', type: 'side-panel', label: 'Goals', x: 75, y: 10, width: 25, height: 40 },
        { id: 'summary-panel', type: 'side-panel', label: 'Summary', x: 75, y: 50, width: 25, height: 30 },
        { id: 'notes', type: 'notes', label: 'Monthly Notes', x: 0, y: 80, width: 100, height: 20 },
      ],
    },
    injectionZones: [
      { id: 'monthly-goals', name: 'Monthly Goals', type: 'monthly-goals', parentAreaId: 'goals-panel', position: 'top' },
      { id: 'monthly-summary', name: 'Monthly Summary', type: 'monthly-summary', parentAreaId: 'summary-panel', position: 'top' },
    ],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'builtin-monthly-overview',
    name: 'Monthly Overview Spread',
    description:
      'A spacious monthly spread with a large planning area, goals on the left, and a reflection/summary section at the bottom.',
    category: 'monthly',
    isBuiltIn: true,
    structure: {
      areas: [
        { id: 'header', type: 'header', label: 'Month Header', x: 0, y: 0, width: 100, height: 10 },
        { id: 'goals-panel', type: 'side-panel', label: 'Monthly Goals', x: 0, y: 10, width: 30, height: 55 },
        { id: 'month-grid', type: 'month-grid', label: 'Month Planner', x: 30, y: 10, width: 70, height: 55 },
        { id: 'summary-panel', type: 'side-panel', label: 'Reflection & Summary', x: 0, y: 65, width: 100, height: 35 },
      ],
    },
    injectionZones: [
      { id: 'monthly-goals', name: 'Monthly Goals', type: 'monthly-goals', parentAreaId: 'goals-panel', position: 'top' },
      { id: 'monthly-summary', name: 'Monthly Summary', type: 'monthly-summary', parentAreaId: 'summary-panel', position: 'top' },
    ],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

// === All Built-in Layout Templates ===

export const BUILT_IN_LAYOUT_TEMPLATES: LayoutTemplate[] = [
  ...BUILT_IN_WEEKLY_TEMPLATES,
  ...BUILT_IN_MONTHLY_TEMPLATES,
];

// === Built-in Plans ===

export const BUILT_IN_PLANS: Plan[] = [
  {
    id: 'builtin-diet-plan',
    name: 'Diet Plan',
    description:
      'Track meals with breakfast, lunch, and dinner slots each day, plus a weekly grocery list.',
    isBuiltIn: true,
    widgetDefinitions: [
      { widgetType: 'breakfast', label: 'Breakfast', targetZoneType: 'daily-content', frequency: 'daily', inputType: 'free-text' },
      { widgetType: 'lunch', label: 'Lunch', targetZoneType: 'daily-content', frequency: 'daily', inputType: 'free-text' },
      { widgetType: 'dinner', label: 'Dinner', targetZoneType: 'daily-content', frequency: 'daily', inputType: 'free-text' },
      { widgetType: 'grocery-list', label: 'Grocery List', targetZoneType: 'supplementary', frequency: 'weekly', inputType: 'checklist' },
    ],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'builtin-exercise-plan',
    name: 'Exercise Plan',
    description: 'Log daily workouts with a free-text entry area for each day.',
    isBuiltIn: true,
    widgetDefinitions: [
      { widgetType: 'workout', label: 'Workout', targetZoneType: 'daily-content', frequency: 'daily', inputType: 'free-text' },
    ],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'builtin-habit-tracker',
    name: 'Habit Tracker',
    description: 'Track daily habits with checkboxes for each day of the week.',
    isBuiltIn: true,
    widgetDefinitions: [
      { widgetType: 'habits', label: 'Daily Habits', targetZoneType: 'daily-content', frequency: 'daily', inputType: 'checklist' },
    ],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'builtin-reading-list',
    name: 'Reading List',
    description: 'Track your reading progress with a weekly reading log.',
    isBuiltIn: true,
    widgetDefinitions: [
      { widgetType: 'reading-log', label: 'Reading Log', targetZoneType: 'supplementary', frequency: 'weekly', inputType: 'free-text' },
    ],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'builtin-goal-tracker',
    name: 'Goal Tracker',
    description: 'Set and track monthly goals with progress notes.',
    isBuiltIn: true,
    widgetDefinitions: [
      { widgetType: 'monthly-goals', label: 'Monthly Goals', targetZoneType: 'monthly-goals', frequency: 'monthly', inputType: 'checklist' },
      { widgetType: 'goal-progress', label: 'Goal Progress', targetZoneType: 'monthly-summary', frequency: 'monthly', inputType: 'free-text' },
    ],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];
