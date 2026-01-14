import { onIdTokenChanged, signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "./firebase";

const TOKEN_KEY = "firebaseIdToken";

export function getStoredIdToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function clearStoredIdToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

export async function signInWithGooglePopup(): Promise<void> {
  const result = await signInWithPopup(auth, googleProvider);
  const token = await result.user.getIdToken(true);
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // ignore
  }
}

export async function firebaseLogout(): Promise<void> {
  await signOut(auth);
  clearStoredIdToken();
}

/**
 * Keeps localStorage token in sync (refresh + logout).
 * Returns unsubscribe function.
 */
export function startIdTokenSync(onTokenChange?: () => void) {
  return onIdTokenChanged(auth, async (user) => {
    if (!user) {
      clearStoredIdToken();
      onTokenChange?.();
      return;
    }
    const token = await user.getIdToken();
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // ignore
    }
    onTokenChange?.();
  });
}


