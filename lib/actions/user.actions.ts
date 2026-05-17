import db from '@/lib/database';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: string;
  weeklyCapacity?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export async function getUsers(): Promise<User[]> {
  return await db.prepare(`
    SELECT
      id,
      email,
      first_name as "firstName",
      last_name as "lastName",
      user_type as "userType",
      weekly_capacity as "weeklyCapacity",
      is_active as "isActive",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM users
    ORDER BY created_at DESC
  `).all<User>();
}

export async function updateUserRole(userId: string, userType: string): Promise<void> {
  await db.prepare(`
    UPDATE users
    SET user_type = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(userType, userId);
}

export async function createUser(userData: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: string;
}): Promise<void> {
  await db.prepare(`
    INSERT INTO users (id, email, first_name, last_name, user_type)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    userData.id,
    userData.email,
    userData.firstName,
    userData.lastName,
    userData.userType
  );
}

export async function getSQLUser(userId: string): Promise<User | null> {
  try {
    const user = await db.prepare(`
      SELECT
        id,
        email,
        first_name as "firstName",
        last_name as "lastName",
        user_type as "userType",
        weekly_capacity as "weeklyCapacity",
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM users
      WHERE id = ?
    `).get<User>(userId);

    return user ?? null;
  } catch (error) {
    console.error('Error getting SQL user:', error);
    return null;
  }
}

export async function addUserToSQL(userData: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: string;
}): Promise<void> {
  try {
    await db.prepare(`
      INSERT OR IGNORE INTO users (id, email, first_name, last_name, user_type)
      VALUES (?, ?, ?, ?, ?)
    `).run(userData.id, userData.email, userData.firstName, userData.lastName, userData.userType);
    console.log('✅ User added to SQL database:', userData.email);
  } catch (error) {
    console.error('Error adding user to SQL:', error);
    throw error;
  }
}
