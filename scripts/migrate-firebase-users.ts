// scripts/migrate-firebase-users.ts
import { auth } from '@/firebase/admin';
import { addUserToSQL } from '@/lib/actions/user.actions';

async function migrateFirebaseUsers() {
  try {
    console.log('🚀 Migrating Firebase users to SQL database...');
    
    const listUsersResult = await auth.listUsers();
    console.log(`Found ${listUsersResult.users.length} users in Firebase`);
    
    for (const userRecord of listUsersResult.users) {
      const displayName = userRecord.displayName || '';
      const nameParts = displayName.split(' ');
      const firstName = nameParts[0] || userRecord.email?.split('@')[0] || 'User';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
      
      await addUserToSQL({
        id: userRecord.uid,
        email: userRecord.email || '',
        firstName: firstName,
        lastName: lastName,
        userType: 'employee'
      });
      
      console.log(`✅ Migrated: ${userRecord.email}`);
    }
    
    console.log('✅ Migration completed!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

migrateFirebaseUsers();