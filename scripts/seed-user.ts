import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function seed() {
  const email = 'abby@test.com';
  const password = 'password123';
  const name = 'Abby Dickerman';

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Check if user already exists
  const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
  
  if (existing.length > 0) {
    console.log(`User already exists: ${email} (id: ${existing[0].id})`);
    console.log('\n✅ You can sign in with:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    return;
  }

  // Insert user
  const [user] = await sql`
    INSERT INTO users (email, name, hashed_password, email_verified)
    VALUES (${email}, ${name}, ${hashedPassword}, NOW())
    RETURNING id, email, name
  `;

  console.log(`\n✅ Created test user:`);
  console.log(`   ID: ${user.id}`);
  console.log(`   Name: ${user.name}`);
  console.log(`   Email: ${user.email}`);
  console.log(`\n🔑 Sign in with:`);
  console.log(`   Email: ${email}`);
  console.log(`   Password: ${password}`);

  // Seed some sample data for this user
  const userId = user.id;

  // Create a journal page
  const [page] = await sql`
    INSERT INTO journal_pages (user_id, title)
    VALUES (${userId}, 'Daily Log')
    RETURNING id
  `;

  // Create some entries
  await sql`
    INSERT INTO entries (user_id, page_id, type, text, signifiers, state, date)
    VALUES 
      (${userId}, ${page.id}, 'task', 'Finish project proposal', ${JSON.stringify([{id: 'sig-bullet', symbol: '•', category: 'type', label: 'Task'}])}, 'incomplete', CURRENT_DATE),
      (${userId}, ${page.id}, 'event', 'Team standup at 10am', ${JSON.stringify([{id: 'sig-circle', symbol: '○', category: 'type', label: 'Event'}])}, NULL, CURRENT_DATE),
      (${userId}, ${page.id}, 'note', 'Remember to buy milk', ${JSON.stringify([{id: 'sig-dash', symbol: '–', category: 'type', label: 'Note'}])}, NULL, NULL),
      (${userId}, ${page.id}, 'task', 'Review pull request #42', ${JSON.stringify([{id: 'sig-bullet', symbol: '•', category: 'type', label: 'Task'}])}, 'complete', CURRENT_DATE),
      (${userId}, ${page.id}, 'task', 'Schedule dentist appointment', ${JSON.stringify([{id: 'sig-bullet', symbol: '•', category: 'type', label: 'Task'}])}, 'incomplete', NULL)
  `;

  // Create a collection
  await sql`
    INSERT INTO collections (user_id, name, is_template, template_type)
    VALUES 
      (${userId}, 'Work Tasks', false, NULL),
      (${userId}, 'Habit Tracker', true, 'habit-tracker')
  `;

  // Create calendar config
  await sql`
    INSERT INTO calendar_configs (user_id, week_start_day, color_theme, layout_density, visible_entry_types)
    VALUES (${userId}, 'monday', 'default', 'standard', '["task", "event", "note"]')
  `;

  console.log(`\n📝 Seeded sample data: 1 journal page, 5 entries, 2 collections, calendar config`);
}

seed().catch(console.error);
