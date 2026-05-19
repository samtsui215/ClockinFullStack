import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Cleans the private key value as stored in env vars. Handles the common
 * shapes you actually see on hosting platforms:
 *   - the value wrapped in `"..."` or `'...'` (Vercel "Paste .env" sometimes leaves these)
 *   - literal `\n` escapes that need to become real newlines
 *   - a value that already has real newlines (no-op)
 */
function normalizePrivateKey(raw: string | undefined): string | undefined {
    if (!raw) return undefined;
    const stripped = raw.replace(/^['"]|['"]$/g, '');
    return stripped.replace(/\\n/g, '\n');
}

const initFirebaseAdmin = () => {
    const apps = getApps();

    if(!apps.length){
        initializeApp({
            credential: cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
            })
        })
    }

    return{
        auth: getAuth(),
        db: getFirestore()
    }
}

export const { auth, db } = initFirebaseAdmin();
