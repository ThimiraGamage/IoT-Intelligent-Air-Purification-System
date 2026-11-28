import { getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type Auth,
  type User,
} from "firebase/auth";
import {
  get,
  getDatabase,
  onValue,
  push,
  ref,
  set,
  update,
  type Database,
  type Unsubscribe,
} from "firebase/database";

const readEnv = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

export function getFirebaseConfig(
  env: Record<string, string | undefined> = import.meta.env,
): FirebaseOptions {
  return {
    apiKey: readEnv(env.VITE_FIREBASE_API_KEY),
    authDomain: readEnv(env.VITE_FIREBASE_AUTH_DOMAIN),
    databaseURL: readEnv(env.VITE_FIREBASE_DATABASE_URL),
    projectId: readEnv(env.VITE_FIREBASE_PROJECT_ID),
    storageBucket: readEnv(env.VITE_FIREBASE_STORAGE_BUCKET),
    messagingSenderId: readEnv(env.VITE_FIREBASE_MESSAGING_SENDER_ID),
    appId: readEnv(env.VITE_FIREBASE_APP_ID),
    measurementId: readEnv(env.VITE_FIREBASE_MEASUREMENT_ID),
  };
}

const firebaseConfig = getFirebaseConfig();

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.databaseURL &&
    firebaseConfig.projectId,
);

export const firebaseApp: FirebaseApp | null = isFirebaseConfigured
  ? getApps()[0] ?? initializeApp(firebaseConfig)
  : null;

export const rtdb: Database | null = firebaseApp
  ? getDatabase(firebaseApp)
  : null;

export const firebaseAuth: Auth | null = firebaseApp
  ? getAuth(firebaseApp)
  : null;

let analyticsPromise: Promise<Analytics | null> | null = null;

export function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (
    !firebaseApp ||
    !firebaseConfig.measurementId ||
    typeof window === "undefined"
  ) {
    return Promise.resolve(null);
  }
  if (!analyticsPromise) {
    analyticsPromise = isSupported()
      .then((supported) => (supported ? getAnalytics(firebaseApp) : null))
      .catch(() => null);
  }
  return analyticsPromise;
}

function requireRtdb(): Database {
  if (!rtdb) {
    throw new Error(
      "Firebase Realtime Database is not configured. Set VITE_FIREBASE_* variables in .env.",
    );
  }
  return rtdb;
}

export async function readRtdbValue<T>(path: string): Promise<T | null> {
  const snapshot = await get(ref(requireRtdb(), path));
  return snapshot.exists() ? (snapshot.val() as T) : null;
}

export async function writeRtdbValue<T>(path: string, value: T): Promise<void> {
  await set(ref(requireRtdb(), path), value);
}

export async function updateRtdbValues(
  path: string,
  patch: Record<string, unknown>,
): Promise<void> {
  await update(ref(requireRtdb(), path), patch);
}

export async function pushRtdbValue<T>(
  path: string,
  value: T,
): Promise<string | null> {
  const newRef = await push(ref(requireRtdb(), path), value);
  return newRef.key;
}

export function subscribeRtdbValue<T>(
  path: string,
  onData: (value: T | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onValue(
    ref(requireRtdb(), path),
    (snapshot) => {
      onData(snapshot.exists() ? (snapshot.val() as T) : null);
    },
    (error) => {
      onError?.(error);
    },
  );
}

function requireAuth(): Auth {
  if (!firebaseAuth) {
    throw new Error(
      "Firebase Authentication is not configured. Set VITE_FIREBASE_* variables in .env.",
    );
  }
  return firebaseAuth;
}

export function subscribeAuthState(
  callback: (user: User | null) => void,
): () => void {
  if (!firebaseAuth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(firebaseAuth, callback);
}

export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(requireAuth(), provider);
  return credential.user;
}

export async function signInWithFirebase(
  email: string,
  password: string,
): Promise<User> {
  const credential = await signInWithEmailAndPassword(
    requireAuth(),
    email.trim(),
    password,
  );
  return credential.user;
}

export async function registerWithFirebase(
  name: string,
  email: string,
  password: string,
): Promise<User> {
  const credential = await createUserWithEmailAndPassword(
    requireAuth(),
    email.trim(),
    password,
  );
  if (name.trim()) {
    await updateProfile(credential.user, { displayName: name.trim() });
  }
  return credential.user;
}

export async function sendFirebasePasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(requireAuth(), email.trim());
}

export async function signOutFirebase(): Promise<void> {
  if (firebaseAuth) {
    await signOut(firebaseAuth);
  }
}

export interface UserRegisteredDevice {
  id: string;
  name: string;
  room: string;
  serialNumber: string;
  registeredAt?: string;
}

export async function saveUserProfileInRtdb(
  uid: string,
  profile: { name: string; email: string },
): Promise<void> {
  if (!rtdb) return;
  await update(ref(rtdb, `users/${uid}/profile`), {
    ...profile,
    updatedAt: new Date().toISOString(),
  });
}

export async function registerUserDeviceInRtdb(
  uid: string,
  device: UserRegisteredDevice,
): Promise<void> {
  if (!rtdb) return;
  await update(ref(rtdb, `users/${uid}/devices/${device.id}`), {
    id: device.id,
    name: device.name,
    room: device.room,
    serialNumber: device.serialNumber,
    registeredAt: device.registeredAt ?? new Date().toISOString(),
  });
}

export async function saveUserSettingsInRtdb(
  uid: string,
  settings: object,
): Promise<void> {
  if (!rtdb) return;
  await update(ref(rtdb, `users/${uid}/settings`), {
    ...settings,
    updatedAt: new Date().toISOString(),
  });
}

export function subscribeUserSettingsInRtdb<T extends object>(
  uid: string,
  onSettings: (settings: Partial<T>) => void,
): Unsubscribe {
  if (!rtdb) return () => {};
  return onValue(
    ref(rtdb, `users/${uid}/settings`),
    (snapshot) => {
      if (snapshot.exists()) {
        onSettings(snapshot.val() as Partial<T>);
      }
    },
    () => {
      // Ignore permission errors when rules are locked
    },
  );
}

export function subscribeUserDevicesInRtdb(
  uid: string,
  onDevices: (devices: UserRegisteredDevice[]) => void,
): Unsubscribe {
  if (!rtdb) return () => {};
  return onValue(
    ref(rtdb, `users/${uid}/devices`),
    (snapshot) => {
      if (!snapshot.exists()) {
        onDevices([]);
        return;
      }
      const raw = snapshot.val() as Record<string, UserRegisteredDevice>;
      const list = Object.values(raw).filter(
        (d) => d && typeof d.id === "string" && typeof d.name === "string",
      );
      onDevices(list);
    },
    () => {
      // Ignore permission errors when rules are locked
    },
  );
}
