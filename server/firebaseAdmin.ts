import admin from "firebase-admin";

export function isFirebaseAdminInitialized() {
  return admin.apps.length > 0;
}

function getServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (e) {
      // Fall through and try env-var decomposition
    }
  }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    : undefined;

  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && privateKey) {
    return {
      project_id: process.env.FIREBASE_PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: privateKey,
    };
  }

  return undefined;
}

const serviceAccount = getServiceAccount();

if (!admin.apps.length) {
  if (!serviceAccount) {
    // Do not throw here — allow runtime to proceed; verification will fail later if not configured.
    // This keeps local development/migrations flexible.
    // Consumers should set FIREBASE_SERVICE_ACCOUNT or the decomposed env vars.
    // eslint-disable-next-line no-console
    console.warn("Firebase service account not configured. Firebase Admin not initialized.");
  } else {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });
  }
}

export default admin;
