import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Leaf, ShieldCheck, CheckCircle2, House } from "lucide-react";
import { useApp } from "../hooks/useApp";
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
  const [accepted, setAccepted] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (forgot) {
      setSent(true);
      return;
    }
    if (register && !name.trim()) {
      setError("Enter your name to create a demo profile.");
      return;
    }
    if (password.length < 8) {
      setError("Use at least 8 characters for this demo form.");
      return;
    }
    if (register && !accepted) {
      setError("Confirm that you understand this is a local demonstration.");
      return;
    }
    if (register) updateSettings({ name: name.trim(), email: email.trim() });
    else updateSettings({ email: email.trim() });
    try {
      sessionStorage.setItem(
        "aeris-demo-session",
        JSON.stringify({ email: email.trim(), demonstration: true }),
      );
    } catch {
      /* A blocked storage environment can still enter the demo. */
    }
    setPassword("");
    notify(
      register
        ? "Demo profile created locally"
        : "Entered demonstration session",
    );
    navigate("/");
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
          <span className="badge green">Demonstration account</span>
          <h1>
            {forgot
              ? "A fresh start."
              : register
                ? "Make yourself at home."
                : "Welcome home."}
          </h1>
          <p className="muted">
            {forgot
              ? "Explore how account recovery will feel when the backend is connected."
              : register
                ? "Create a local profile to personalize your Aeris demonstration."
                : "Enter the demonstration and find your fresh-air routine."}
          </p>
          {sent && forgot ? (
            <div className="manage-confirm" role="status">
              <CheckCircle2 size={30} color="#34714a" />
              <h3>Recovery flow previewed</h3>
              <p>
                A production service would send a secure reset link if an
                account exists for <strong>{email}</strong>. No email was sent
                in this demonstration.
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
              {register && (
                <label className="manage-checkbox-label">
                  <input
                    className="manage-checkbox"
                    type="checkbox"
                    required
                    checked={accepted}
                    onChange={(event) => setAccepted(event.target.checked)}
                  />
                  I understand this is a local demo, with no secure account or
                  cloud authentication.
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
              <button className="button primary" type="submit">
                {forgot
                  ? "Preview recovery"
                  : register
                    ? "Create demo profile"
                    : "Enter demo"}
              </button>
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
                  Create a demo profile
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
            This is frontend-only authentication for presentation. Any valid
            email and a password of at least 8 characters enters the demo.
            Passwords are never stored or sent. Use a made-up password.
          </div>
        </div>
      </main>
    </div>
  );
}
