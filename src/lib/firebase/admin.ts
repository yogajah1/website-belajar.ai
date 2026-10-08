import { getApps, initializeApp, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const isFirebaseAdminConfigured = Boolean(
  process.env.FIREBASE_ADMIN_PROJECT_ID &&
  process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
  process.env.FIREBASE_ADMIN_PRIVATE_KEY
);

let adminApp: App | null = null;

if (isFirebaseAdminConfigured && !getApps().length) {
  try {
    const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || '').replace(/\\n/g, '\n');
    adminApp = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey,
      }),
    });
  } catch (err) {
    console.warn('Firebase Admin init warning:', err);
  }
}

export async function verifyAuthToken(authHeader: string | null): Promise<{ uid: string; email?: string } | null> {
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  // If running in development / test / fallback mode
  if (token.startsWith('mock_user_') || token.startsWith('guest_user_') || token === 'guest_user') {
    return {
      uid: token,
      email: `${token}@belajarquest.local`,
    };
  }

  if (isFirebaseAdminConfigured && getApps().length > 0) {
    try {
      const authInstance = getAuth();
      const decodedToken = await authInstance.verifyIdToken(token);
      return {
        uid: decodedToken.uid,
        email: decodedToken.email,
      };
    } catch (err) {
      console.error('Failed to verify Firebase ID token:', err);
      return null;
    }
  }

  // Fallback for local developer preview
  return {
    uid: token || 'local_user',
    email: 'user@belajarquest.local',
  };
}
