import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

function assertFirebaseConfig() {
  const required: Array<{ key: keyof typeof firebaseConfig; env: string }> = [
    { key: "apiKey", env: "VITE_FIREBASE_API_KEY" },
    { key: "authDomain", env: "VITE_FIREBASE_AUTH_DOMAIN" },
    { key: "projectId", env: "VITE_FIREBASE_PROJECT_ID" },
    { key: "appId", env: "VITE_FIREBASE_APP_ID" },
  ];
  for (const { key, env } of required) {
    if (!firebaseConfig[key]) {
      // eslint-disable-next-line no-console
      console.warn(`[firebase] Missing ${env}`);
    }
  }
}

assertFirebaseConfig();

export const firebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });


