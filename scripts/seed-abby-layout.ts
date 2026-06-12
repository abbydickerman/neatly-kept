import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function seed() {
  const structure = {
    areas: [
      { id: 'week-title', type: 'header', label: 'Week Title', x: 0, y: 0, width: 18, height: 15 },
      { id: 'mini-cal', type: 'side-panel', label: 'Mini Calendar', x: 0, y: 15, width: 18, height: 18 },
      { id: 'weather', type: 'side-panel', label: 'Weather', x: 0, y: 33, width: 18, height: 67 },
      { id: 'mon', type: 'day-column', dayOfWeek: 1, label: 'Monday', x: 18, y: 0, width: 32, height: 33 },
      { id: 'tue', type: 'day-column', dayOfWeek: 2, label: 'Tuesday', x: 18, y: 33, width: 32, height: 33 },
      { id: 'wed', type: 'day-column', dayOfWeek: 3, label: 'Wednesday', x: 18, y: 66, width: 32, height: 34 },
      { id: 'thu', type: 'day-column', dayOfWeek: 4, label: 'Thursday', x: 50, y: 0, width: 28, height: 33 },
      { id: 'fri', type: 'day-column', dayOfWeek: 5, label: 'Friday', x: 50, y: 33, width: 28, height: 33 },
      { id: 'weekend', type: 'day-column', dayOfWeek: 6, label: 'Weekend', x: 50, y: 66, width: 28, height: 34 },
      { id: 'habits', type: 'side-panel', label: 'Habits', x: 78, y: 0, width: 22, height: 33 },
      { id: 'mood', type: 'side-panel', label: 'Mood', x: 78, y: 33, width: 22, height: 33 },
      { id: 'notes', type: 'notes', label: 'Notes', x: 78, y: 66, width: 22, height: 34 },
    ]
  };

  const injectionZones = [
    { id: 'mon-daily', name: 'Monday Content', type: 'daily-content', parentAreaId: 'mon', position: 'after-entries' },
    { id: 'tue-daily', name: 'Tuesday Content', type: 'daily-content', parentAreaId: 'tue', position: 'after-entries' },
    { id: 'wed-daily', name: 'Wednesday Content', type: 'daily-content', parentAreaId: 'wed', position: 'after-entries' },
    { id: 'thu-daily', name: 'Thursday Content', type: 'daily-content', parentAreaId: 'thu', position: 'after-entries' },
    { id: 'fri-daily', name: 'Friday Content', type: 'daily-content', parentAreaId: 'fri', position: 'after-entries' },
    { id: 'weekend-daily', name: 'Weekend Content', type: 'daily-content', parentAreaId: 'weekend', position: 'after-entries' },
    { id: 'habits-supp', name: 'Habits Tracker', type: 'supplementary', parentAreaId: 'habits', position: 'top' },
    { id: 'mood-supp', name: 'Mood Tracker', type: 'supplementary', parentAreaId: 'mood', position: 'top' },
  ];

  await sql`
    INSERT INTO layout_templates (name, description, category, is_built_in, structure, injection_zones)
    VALUES (
      ${"Abby's Layout"},
      ${"Two-page bujo spread: week title + mini calendar + weather on far left, Mon/Tue/Wed stacked center-left, Thu/Fri/Weekend stacked center-right, habits/mood/notes panels on far right."},
      'weekly',
      true,
      ${JSON.stringify(structure)}::jsonb,
      ${JSON.stringify(injectionZones)}::jsonb
    )
  `;
  console.log("Done! Abby's Layout added to the database.");
}

seed().catch(console.error);
