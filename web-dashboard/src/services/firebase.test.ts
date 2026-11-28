import { describe, expect, it } from "vitest";
import { getFirebaseConfig } from "./firebase";

describe("getFirebaseConfig", () => {
  it("reads Firebase Realtime Database settings from environment variables", () => {
    const config = getFirebaseConfig({
      VITE_FIREBASE_API_KEY: "test-key",
      VITE_FIREBASE_AUTH_DOMAIN: "example.firebaseapp.com",
      VITE_FIREBASE_DATABASE_URL:
        "https://example-default-rtdb.asia-southeast1.firebasedatabase.app",
      VITE_FIREBASE_PROJECT_ID: "example",
      VITE_FIREBASE_STORAGE_BUCKET: "example.firebasestorage.app",
      VITE_FIREBASE_MESSAGING_SENDER_ID: "123456",
      VITE_FIREBASE_APP_ID: "1:123456:web:abc",
      VITE_FIREBASE_MEASUREMENT_ID: "G-TEST123",
    });

    expect(config).toEqual({
      apiKey: "test-key",
      authDomain: "example.firebaseapp.com",
      databaseURL:
        "https://example-default-rtdb.asia-southeast1.firebasedatabase.app",
      projectId: "example",
      storageBucket: "example.firebasestorage.app",
      messagingSenderId: "123456",
      appId: "1:123456:web:abc",
      measurementId: "G-TEST123",
    });
  });

  it("treats blank env values as undefined", () => {
    const config = getFirebaseConfig({
      VITE_FIREBASE_API_KEY: "   ",
      VITE_FIREBASE_DATABASE_URL: "",
    });

    expect(config.apiKey).toBeUndefined();
    expect(config.databaseURL).toBeUndefined();
  });
});
