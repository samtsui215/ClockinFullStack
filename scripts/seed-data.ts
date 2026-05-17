// scripts/seed-data.ts
import db from '../lib/database';

async function seedData() {
  console.log('Adding sample users...');

  // Clear any existing data
  await db.prepare('DELETE FROM users').run();

  // Add sample users
  const insertUser = db.prepare(`
    INSERT INTO users (id, email, first_name, last_name, user_type)
    VALUES (?, ?, ?, ?, ?)
  `);

  await insertUser.run('user1', 'admin@example.com', 'John', 'Doe', 'admin');
  await insertUser.run('user2', 'jane@example.com', 'Jane', 'Smith', 'manager');
  await insertUser.run('user3', 'bob@example.com', 'Bob', 'Johnson', 'employee');

  console.log('✅ Sample data added!');
}

seedData();
