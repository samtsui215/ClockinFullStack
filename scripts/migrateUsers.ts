// scripts/migrateUsers.ts
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

// Manually read .env.local file
function loadEnvFile() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local file not found');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars: Record<string, string> = {};

  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let value = match[2] || '';
      
      // Remove quotes if present
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      
      envVars[match[1]] = value.trim();
    }
  });

  return envVars;
}

// Load environment variables
const envVars = loadEnvFile();

const projectId = envVars.FIREBASE_PROJECT_ID;
const clientEmail = envVars.FIREBASE_CLIENT_EMAIL;
const privateKey = envVars.FIREBASE_PRIVATE_KEY;

console.log('Project ID:', projectId);
console.log('Client Email:', clientEmail);
console.log('Private Key exists:', !!privateKey);

if (!projectId || !clientEmail || !privateKey) {
  console.error('❌ Missing required environment variables:');
  if (!projectId) console.error('   - FIREBASE_PROJECT_ID');
  if (!clientEmail) console.error('   - FIREBASE_CLIENT_EMAIL');
  if (!privateKey) console.error('   - FIREBASE_PRIVATE_KEY');
  process.exit(1);
}

// Initialize Firebase Admin
const initFirebaseAdmin = () => {
  const apps = getApps();

  if (!apps.length) {
    try {
      initializeApp({
        credential: cert({
          projectId: projectId,
          clientEmail: clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n')
        })
      });
      console.log('✅ Firebase Admin initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Firebase Admin:', error);
      process.exit(1);
    }
  }

  return {
    auth: getAuth(),
    db: getFirestore()
  };
};

const { auth, db } = initFirebaseAdmin();

async function migrateExistingUsers() {
  try {
    console.log('\n🚀 Starting user migration...\n');
    
    // Test connection first
    try {
      const testResult = await auth.listUsers(1);
      console.log('✅ Connected to Firebase Auth successfully');
    } catch (error) {
      console.error('❌ Cannot connect to Firebase Auth. Check your credentials.');
      process.exit(1);
    }

    const listUsersResult = await auth.listUsers();
    
    if (listUsersResult.users.length === 0) {
      console.log('ℹ️  No users found in Firebase Auth');
      return;
    }

    console.log(`📋 Found ${listUsersResult.users.length} users in Firebase Auth\n`);

    let migratedCount = 0;
    let existingCount = 0;
    let errorCount = 0;
    
    for (const userRecord of listUsersResult.users) {
      try {
        const userRef = db.collection('users').doc(userRecord.uid);
        const userDoc = await userRef.get();
        
        if (!userDoc.exists) {
          await userRef.set({
            email: userRecord.email,
            displayName: userRecord.displayName || userRecord.email?.split('@')[0] || 'User',
            createdAt: new Date().toISOString(),
            status: 'active',
            migrated: true,
            authCreatedAt: userRecord.metadata.creationTime,
            lastSignInTime: userRecord.metadata.lastSignInTime,
          });
          migratedCount++;
          console.log(`✅ Migrated user: ${userRecord.email}`);
        } else {
          existingCount++;
          console.log(`ℹ️  User already exists: ${userRecord.email}`);
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ Error migrating user ${userRecord.email}:`, error);
      }
    }
    
    console.log('\n📊 Migration completed!');
    console.log(`✅ Migrated: ${migratedCount} users`);
    console.log(`ℹ️  Already existed: ${existingCount} users`);
    console.log(`❌ Errors: ${errorCount} users`);
    console.log(`📋 Total users processed: ${listUsersResult.users.length}`);
    
  } catch (error) {
    console.error('❌ Error during user migration:', error);
    process.exit(1);
  }
}

// Run the migration
migrateExistingUsers();