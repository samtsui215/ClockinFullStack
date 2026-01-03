// scripts/seed-data.ts
import db from '../lib/database';

async function seedData() {
  console.log('Adding sample users...');
  
  // Clear any existing data
  db.exec('DELETE FROM users');
  
  // Add sample users
  const insertUser = db.prepare(`
    INSERT INTO users (id, email, first_name, last_name, user_type) 
    VALUES (?, ?, ?, ?, ?)
  `);

  insertUser.run('user1', 'admin@example.com', 'John', 'Doe', 'admin');
  insertUser.run('user2', 'jane@example.com', 'Jane', 'Smith', 'manager');
  insertUser.run('user3', 'bob@example.com', 'Bob', 'Johnson', 'employee');

  console.log('✅ Sample data added!');
  console.log('Check with: sqlite3 database.db "SELECT * FROM users;"');
}

seedData();