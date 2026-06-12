import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function seed() {
  console.log('Seeding layout templates and plans...\n');

  // Check if already seeded
  const existing = await sql`SELECT id FROM layout_templates LIMIT 1`;
  if (existing.length > 0) {
    console.log('Layout templates already seeded. Skipping.');
  } else {
    // === Weekly Templates ===
    await sql`
      INSERT INTO layout_templates (id, name, description, category, is_built_in, structure, injection_zones)
      VALUES 
        (
          'builtin-weekly-classic',
          'Classic Weekly Spread',
          'Traditional bullet journal weekly spread with 7 day columns and a side panel for notes and habits. Inspired by popular bujo layouts.',
          'weekly',
          true,
          ${JSON.stringify({
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
          })}::jsonb,
          ${JSON.stringify([
            { id: 'mon-daily', name: 'Monday Content', type: 'daily-content', parentAreaId: 'mon', position: 'after-entries' },
            { id: 'tue-daily', name: 'Tuesday Content', type: 'daily-content', parentAreaId: 'tue', position: 'after-entries' },
            { id: 'wed-daily', name: 'Wednesday Content', type: 'daily-content', parentAreaId: 'wed', position: 'after-entries' },
            { id: 'thu-daily', name: 'Thursday Content', type: 'daily-content', parentAreaId: 'thu', position: 'after-entries' },
            { id: 'fri-daily', name: 'Friday Content', type: 'daily-content', parentAreaId: 'fri', position: 'after-entries' },
            { id: 'sat-daily', name: 'Saturday Content', type: 'daily-content', parentAreaId: 'sat', position: 'after-entries' },
            { id: 'sun-daily', name: 'Sunday Content', type: 'daily-content', parentAreaId: 'sun', position: 'after-entries' },
            { id: 'supplementary', name: 'Supplementary', type: 'supplementary', parentAreaId: 'side-panel', position: 'top' },
          ])}::jsonb
        ),
        (
          'builtin-weekly-bujo-spread',
          'Bujo Two-Page Spread',
          'A two-page bullet journal spread with Mon-Wed on the left, Thu-Fri + Weekend on the right, plus habits, mood tracker, mini calendar, and notes panels.',
          'weekly',
          true,
          ${JSON.stringify({
            areas: [
              { id: 'week-title', type: 'header', label: 'Week Title', x: 0, y: 0, width: 30, height: 12 },
              { id: 'mini-cal', type: 'side-panel', label: 'Mini Calendar', x: 0, y: 12, width: 30, height: 20 },
              { id: 'mon', type: 'day-column', dayOfWeek: 1, label: 'Monday', x: 30, y: 0, width: 23, height: 33 },
              { id: 'tue', type: 'day-column', dayOfWeek: 2, label: 'Tuesday', x: 30, y: 33, width: 23, height: 33 },
              { id: 'wed', type: 'day-column', dayOfWeek: 3, label: 'Wednesday', x: 30, y: 66, width: 23, height: 34 },
              { id: 'thu', type: 'day-column', dayOfWeek: 4, label: 'Thursday', x: 53, y: 0, width: 23, height: 33 },
              { id: 'fri', type: 'day-column', dayOfWeek: 5, label: 'Friday', x: 53, y: 33, width: 23, height: 33 },
              { id: 'weekend', type: 'day-column', dayOfWeek: 6, label: 'Weekend', x: 53, y: 66, width: 23, height: 34 },
              { id: 'habits-panel', type: 'side-panel', label: 'Habits', x: 76, y: 0, width: 24, height: 35 },
              { id: 'mood-panel', type: 'side-panel', label: 'Mood', x: 76, y: 35, width: 24, height: 25 },
              { id: 'notes-panel', type: 'notes', label: 'Notes', x: 76, y: 60, width: 24, height: 20 },
              { id: 'weather-panel', type: 'side-panel', label: 'Weather', x: 0, y: 32, width: 30, height: 68 },
            ],
          })}::jsonb,
          ${JSON.stringify([
            { id: 'mon-daily', name: 'Monday Content', type: 'daily-content', parentAreaId: 'mon', position: 'after-entries' },
            { id: 'tue-daily', name: 'Tuesday Content', type: 'daily-content', parentAreaId: 'tue', position: 'after-entries' },
            { id: 'wed-daily', name: 'Wednesday Content', type: 'daily-content', parentAreaId: 'wed', position: 'after-entries' },
            { id: 'thu-daily', name: 'Thursday Content', type: 'daily-content', parentAreaId: 'thu', position: 'after-entries' },
            { id: 'fri-daily', name: 'Friday Content', type: 'daily-content', parentAreaId: 'fri', position: 'after-entries' },
            { id: 'weekend-daily', name: 'Weekend Content', type: 'daily-content', parentAreaId: 'weekend', position: 'after-entries' },
            { id: 'habits-supp', name: 'Habits', type: 'supplementary', parentAreaId: 'habits-panel', position: 'top' },
            { id: 'mood-supp', name: 'Mood', type: 'supplementary', parentAreaId: 'mood-panel', position: 'top' },
          ])}::jsonb
        ),
        (
          'builtin-weekly-minimal',
          'Minimal Weekly',
          'A compact two-column weekly layout with weekdays on the left, weekend on the right, and a notes area below.',
          'weekly',
          true,
          ${JSON.stringify({
            areas: [
              { id: 'header', type: 'header', label: 'Week Header', x: 0, y: 0, width: 100, height: 8 },
              { id: 'mon', type: 'day-column', dayOfWeek: 1, label: 'Monday', x: 0, y: 8, width: 50, height: 18 },
              { id: 'tue', type: 'day-column', dayOfWeek: 2, label: 'Tuesday', x: 0, y: 26, width: 50, height: 18 },
              { id: 'wed', type: 'day-column', dayOfWeek: 3, label: 'Wednesday', x: 0, y: 44, width: 50, height: 18 },
              { id: 'thu', type: 'day-column', dayOfWeek: 4, label: 'Thursday', x: 0, y: 62, width: 50, height: 18 },
              { id: 'fri', type: 'day-column', dayOfWeek: 5, label: 'Friday', x: 50, y: 8, width: 50, height: 18 },
              { id: 'sat', type: 'day-column', dayOfWeek: 6, label: 'Saturday', x: 50, y: 26, width: 50, height: 18 },
              { id: 'sun', type: 'day-column', dayOfWeek: 0, label: 'Sunday', x: 50, y: 44, width: 50, height: 18 },
              { id: 'side-panel', type: 'side-panel', label: 'Weekly Overview', x: 0, y: 80, width: 100, height: 20 },
            ],
          })}::jsonb,
          ${JSON.stringify([
            { id: 'mon-daily', name: 'Monday Content', type: 'daily-content', parentAreaId: 'mon', position: 'after-entries' },
            { id: 'tue-daily', name: 'Tuesday Content', type: 'daily-content', parentAreaId: 'tue', position: 'after-entries' },
            { id: 'wed-daily', name: 'Wednesday Content', type: 'daily-content', parentAreaId: 'wed', position: 'after-entries' },
            { id: 'thu-daily', name: 'Thursday Content', type: 'daily-content', parentAreaId: 'thu', position: 'after-entries' },
            { id: 'fri-daily', name: 'Friday Content', type: 'daily-content', parentAreaId: 'fri', position: 'after-entries' },
            { id: 'sat-daily', name: 'Saturday Content', type: 'daily-content', parentAreaId: 'sat', position: 'after-entries' },
            { id: 'sun-daily', name: 'Sunday Content', type: 'daily-content', parentAreaId: 'sun', position: 'after-entries' },
            { id: 'supplementary', name: 'Supplementary', type: 'supplementary', parentAreaId: 'side-panel', position: 'top' },
          ])}::jsonb
        ),
        (
          'builtin-monthly-calendar',
          'Monthly Calendar Grid',
          'A traditional calendar grid layout with a month overview, goal-setting area, and monthly summary section.',
          'monthly',
          true,
          ${JSON.stringify({
            areas: [
              { id: 'header', type: 'header', label: 'Month Header', x: 0, y: 0, width: 100, height: 10 },
              { id: 'month-grid', type: 'month-grid', label: 'Calendar Grid', x: 0, y: 10, width: 75, height: 70 },
              { id: 'goals-panel', type: 'side-panel', label: 'Goals', x: 75, y: 10, width: 25, height: 40 },
              { id: 'summary-panel', type: 'side-panel', label: 'Summary', x: 75, y: 50, width: 25, height: 30 },
              { id: 'notes', type: 'notes', label: 'Monthly Notes', x: 0, y: 80, width: 100, height: 20 },
            ],
          })}::jsonb,
          ${JSON.stringify([
            { id: 'monthly-goals', name: 'Monthly Goals', type: 'monthly-goals', parentAreaId: 'goals-panel', position: 'top' },
            { id: 'monthly-summary', name: 'Monthly Summary', type: 'monthly-summary', parentAreaId: 'summary-panel', position: 'top' },
          ])}::jsonb
        ),
        (
          'builtin-monthly-overview',
          'Monthly Overview Spread',
          'A spacious monthly spread with a large planning area, goals on the left, and a reflection section at the bottom.',
          'monthly',
          true,
          ${JSON.stringify({
            areas: [
              { id: 'header', type: 'header', label: 'Month Header', x: 0, y: 0, width: 100, height: 10 },
              { id: 'goals-panel', type: 'side-panel', label: 'Monthly Goals', x: 0, y: 10, width: 30, height: 55 },
              { id: 'month-grid', type: 'month-grid', label: 'Month Planner', x: 30, y: 10, width: 70, height: 55 },
              { id: 'summary-panel', type: 'side-panel', label: 'Reflection', x: 0, y: 65, width: 100, height: 35 },
            ],
          })}::jsonb,
          ${JSON.stringify([
            { id: 'monthly-goals', name: 'Monthly Goals', type: 'monthly-goals', parentAreaId: 'goals-panel', position: 'top' },
            { id: 'monthly-summary', name: 'Monthly Summary', type: 'monthly-summary', parentAreaId: 'summary-panel', position: 'top' },
          ])}::jsonb
        )
    `;
    console.log('✅ Seeded 5 layout templates (3 weekly, 2 monthly)');
  }

  // === Plans ===
  const existingPlans = await sql`SELECT id FROM plans LIMIT 1`;
  if (existingPlans.length > 0) {
    console.log('Plans already seeded. Skipping.');
  } else {
    await sql`
      INSERT INTO plans (id, name, description, is_built_in, widget_definitions)
      VALUES 
        (
          'builtin-diet-plan',
          'Diet Plan',
          'Track meals with breakfast, lunch, and dinner slots each day, plus a weekly grocery list.',
          true,
          ${JSON.stringify([
            { widgetType: 'breakfast', label: 'Breakfast', targetZoneType: 'daily-content', frequency: 'daily', inputType: 'free-text' },
            { widgetType: 'lunch', label: 'Lunch', targetZoneType: 'daily-content', frequency: 'daily', inputType: 'free-text' },
            { widgetType: 'dinner', label: 'Dinner', targetZoneType: 'daily-content', frequency: 'daily', inputType: 'free-text' },
            { widgetType: 'grocery-list', label: 'Grocery List', targetZoneType: 'supplementary', frequency: 'weekly', inputType: 'checklist' },
          ])}::jsonb
        ),
        (
          'builtin-exercise-plan',
          'Exercise Plan',
          'Log daily workouts with a free-text entry area for each day.',
          true,
          ${JSON.stringify([
            { widgetType: 'workout', label: 'Workout', targetZoneType: 'daily-content', frequency: 'daily', inputType: 'free-text' },
          ])}::jsonb
        ),
        (
          'builtin-habit-tracker',
          'Habit Tracker',
          'Track daily habits with checkboxes for each day of the week.',
          true,
          ${JSON.stringify([
            { widgetType: 'habits', label: 'Daily Habits', targetZoneType: 'daily-content', frequency: 'daily', inputType: 'checklist' },
          ])}::jsonb
        ),
        (
          'builtin-reading-list',
          'Reading List',
          'Track your reading progress with a weekly reading log.',
          true,
          ${JSON.stringify([
            { widgetType: 'reading-log', label: 'Reading Log', targetZoneType: 'supplementary', frequency: 'weekly', inputType: 'free-text' },
          ])}::jsonb
        ),
        (
          'builtin-goal-tracker',
          'Goal Tracker',
          'Set and track monthly goals with progress notes.',
          true,
          ${JSON.stringify([
            { widgetType: 'monthly-goals', label: 'Monthly Goals', targetZoneType: 'monthly-goals', frequency: 'monthly', inputType: 'checklist' },
            { widgetType: 'goal-progress', label: 'Goal Progress', targetZoneType: 'monthly-summary', frequency: 'monthly', inputType: 'free-text' },
          ])}::jsonb
        )
    `;
    console.log('✅ Seeded 5 plans (Diet, Exercise, Habit Tracker, Reading List, Goal Tracker)');
  }

  console.log('\n🎉 Done! Layouts and plans are ready.');
}

seed().catch(console.error);
