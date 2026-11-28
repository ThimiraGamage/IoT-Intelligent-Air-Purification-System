import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Leaf, ShieldCheck, CheckCircle2, House, LogOut } from "lucide-react";
import type { User } from "firebase/auth";
import { useApp } from "../hooks/useApp";
import {
  isFirebaseConfigured,
  registerWithFirebase,
  saveUserProfileInRtdb,
  sendFirebasePasswordReset,
  signInWithFirebase,
  signInWithGoogle,
  signOutFirebase,
  subscribeAuthState,
} from "../services/firebase";
import "./management.css";

export default function Auth() {
  const { updateSettings, notify } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const register = location.pathname === "/register";
  const forgot = location.pathname === "/forgot-password";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => subscribeAuthState(setCurrentUser), []);

  async function handleGoogleSignIn() {
    setError("");
    if (!isFirebaseConfigured) {
      setError(
        "Firebase is not configured. Add VITE_FIREBASE_* keys to .env.",
      );
      return;
    }
    setBusy(true);
    try {
      const user = await signInWithGoogle();
      const displayName =
        user.displayName || user.email?.split("@")[0] || "User";
      updateSettings({
        name: displayName,
        email: user.email || "",
      });
      void saveUserProfileInRtdb(user.uid, {
        name: displayName,
        email: user.email || "",
      }).catch(() => {});
      notify("Signed in with Google");
      navigate("/devices");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Google sign-in failed.";
      setError(
        msg.includes("auth/unauthorized-domain")
          ? `Domain "${window.location.hostname}" is not authorized for Google Sign-In. Open http://localhost:5173 or add "${window.location.hostname}" in Firebase Console -> Authentication -> Settings -> Authorized domains.`
          : msg,
      );
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!isFirebaseConfigured) {
      setError(
        "Firebase is not configured. Add VITE_FIREBASE_* keys to .env.",
      );
      return;
    }
    setBusy(true);
    try {
      if (forgot) {
        await sendFirebasePasswordReset(email);
        setSent(true);
        notify("Password reset email sent");
        return;
      }
      if (register) {
        if (!name.trim()) {
          setError("Enter your name to create an account.");
          return;
        }
        const user = await registerWithFirebase(name, email, password);
        updateSettings({
          name: user.displayName || name.trim(),
          email: user.email || email.trim(),
        });
        notify("Account created and signed in");
      } else {
        const user = await signInWithFirebase(email, password);
        updateSettings({
          name: user.displayName || email.split("@")[0] || "User",
          email: user.email || email.trim(),
        });
        notify("Signed in with Firebase");
      }
      setPassword("");
      navigate("/devices");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="manage-auth">
      <section className="manage-auth-story">
        <Link to="/" className="manage-auth-brand">
          <Leaf size={32} strokeWidth={1.5} />
          aeris
          <span
            style={{
              fontSize: 12,
              letterSpacing: 2,
              marginLeft: 9,
              opacity: 0.6,
            }}
          >
            AIR, CONSIDERED.
          </span>
        </Link>
        <div>
          <h2>
            A little closer
            <br />
            to feeling home.
          </h2>
          <p>
            Thoughtful technology. Quietly cleaner air. A little more room to
            breathe.
          </p>
        </div>
        <small>Designed around the air you live in.</small>
      </section>
      <main className="manage-auth-panel">
        <div className="manage-auth-inner" key={location.pathname}>
          <span className="badge green">Firebase account</span>
          {currentUser && (
            <div
              className="card"
              style={{
                padding: "0.75rem 1rem",
                marginBottom: "1rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.75rem",
              }}
            >
              <span style={{ fontSize: 13 }}>
                Signed in as <strong>{currentUser.email}</strong>
              </span>
              <button
                type="button"
                className="button secondary"
                onClick={async () => {
                  await signOutFirebase();
                  notify("Signed out");
                }}
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          )}
          <h1>
            {forgot
              ? "A fresh start."
              : register
                ? "Make yourself at home."
                : "Welcome home."}
          </h1>
          <p className="muted">
            {forgot
              ? "Enter your email to receive a Firebase password reset link."
              : register
                ? "Create an Aeris account to register and manage your purifiers."
                : "Sign in to register your ESP32 purifiers and view live telemetry."}
          </p>
          {sent && forgot ? (
            <div className="manage-confirm" role="status">
              <CheckCircle2 size={30} color="#34714a" />
              <h3>Password reset email sent</h3>
              <p>
                Check your inbox at <strong>{email}</strong> for a link to
                reset your Aeris password.
              </p>
              <Link
                className="button primary"
                to="/login"
                onClick={() => setSent(false)}
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <form className="manage-form" onSubmit={submit}>
              {register && (
                <label>
                  Your name
                  <input
                    name="name"
                    value={name}
                    required
                    maxLength={60}
                    autoComplete="name"
                    onChange={(event) => setName(event.target.value)}
                    placeholder="How should we call you?"
                  />
                </label>
              )}
              <label>
                Email address
                <input
                  name="email"
                  value={email}
                  required
                  type="email"
                  autoComplete="email"
                  maxLength={120}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                />
              </label>
              {!forgot && (
                <label>
                  Password
                  <input
                    name="password"
                    value={password}
                    required
                    type="password"
                    minLength={8}
                    autoComplete={
                      register ? "new-password" : "current-password"
                    }
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="At least 8 characters"
                  />
                </label>
              )}
              {!register && !forgot && (
                <Link
                  to="/forgot-password"
                  className="manage-forgot-link"
                  onClick={() => setSent(false)}
                >
                  Forgot password?
                </Link>
              )}
              {error && (
                <p role="alert" className="manage-error">
                  {error}
                </p>
              )}
              <button className="button primary" type="submit" disabled={busy}>
                {busy
                  ? "Please wait..."
                  : forgot
                    ? "Send reset link"
                    : register
                      ? "Create account"
                      : "Sign in"}
              </button>
              {!forgot && (
                <button
                  type="button"
                  className="button secondary"
                  disabled={busy}
                  onClick={handleGoogleSignIn}
                >
                  Continue with Google
                </button>
              )}
            </form>
          )}
          <div className="manage-auth-links">
            {forgot ? (
              <Link to="/login" onClick={() => setSent(false)}>
                Remembered it? Sign in
              </Link>
            ) : register ? (
              <>
                Already have a profile?{" "}
                <Link to="/login" onClick={() => setError("")}>
                  Sign in
                </Link>
              </>
            ) : (
              <>
                New around here?{" "}
                <Link to="/register" onClick={() => setError("")}>
                  Create an account
                </Link>
              </>
            )}
          </div>
          <Link className="manage-auth-back" to="/">
            <House size={16} />
            Explore the dashboard
          </Link>
          <div className="manage-auth-note">
            <ShieldCheck
              size={16}
              style={{ verticalAlign: "middle", marginRight: 6 }}
            />
            Sign in with your Aeris account to register purifiers, view live
            ESP32 readings, and sync your preferences across devices.
          </div>
        </div>
      </main>
    </div>
  );
}
