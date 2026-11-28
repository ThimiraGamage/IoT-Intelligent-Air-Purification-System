import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { signOutFirebase } from "../services/firebase";
import {
  UserRound,
  Bell,
  Sun,
  Languages,
  ShieldCheck,
  Check,
  LogOut,
  Mail,
  Smartphone,
} from "lucide-react";
import { useApp } from "../hooks/useApp";
import type { Settings as SettingsType } from "../types";
import { Heading, SettingRow, Toggle } from "./ManagementUI";

export default function Settings() {
  const { settings, updateSettings, notify } = useApp();
  const [name, setName] = useState(settings.name);
  const [email, setEmail] = useState(settings.email);
  const [saved, setSaved] = useState(false);
  function save(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      notify("Enter your name before saving your profile.");
      return;
    }
    updateSettings({ name: name.trim(), email: email.trim() });
    setSaved(true);
    notify("Profile updated");
  }
  function change(patch: Partial<SettingsType>) {
    updateSettings(patch);
    notify("Preference saved");
  }
  return (
    <div className="manage-stack">
      <Heading
        eyebrow="MAKE YOURSELF AT HOME"
        title="The little preferences."
        description="Aeris, shaped around you."
        action={<span className="badge green">Preferences saved locally</span>}
      />
      <div className="manage-settings-layout">
        <section className="card manage-pad">
          <div className="card-header">
            <div>
              <p className="eyebrow">YOUR SPACE</p>
              <h2>A familiar face</h2>
            </div>
            <UserRound size={22} />
          </div>
          <div className="manage-profile-top">
            <span className="manage-avatar">
              {settings.name
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0])
                .join("")}
            </span>
            <div>
              <strong>{settings.name}</strong>
              <p className="muted">Your personal Aeris account profile</p>
            </div>
          </div>
          <form onSubmit={save} className="manage-form">
            <label>
              Your name
              <input
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setSaved(false);
                }}
                required
                maxLength={60}
                autoComplete="name"
              />
            </label>
            <label>
              Email address
              <input
                value={email}
                type="email"
                onChange={(event) => {
                  setEmail(event.target.value);
                  setSaved(false);
                }}
                required
                maxLength={120}
                autoComplete="email"
              />
            </label>
            <div className="manage-actions">
              <button className="button primary" type="submit">
                Save profile
              </button>
              {saved && (
                <span className="manage-saved">
                  <Check size={16} />
                  Saved
                </span>
              )}
            </div>
          </form>
          <p className="manage-caption">
            Profile and device preferences are saved to your Firebase account
            when signed in.
          </p>
        </section>
        <section className="card manage-pad">
          <div className="card-header">
            <div>
              <p className="eyebrow">JUST YOUR STYLE</p>
              <h2>Look & language</h2>
            </div>
            <Sun size={23} />
          </div>
          <label className="manage-label" style={{ marginTop: 20 }}>
            Theme
            <select
              className="manage-input"
              value={settings.theme}
              onChange={(event) =>
                change({ theme: event.target.value as SettingsType["theme"] })
              }
            >
              <option value="light">Light · a fresh perspective</option>
              <option value="dark">Dark · easy on the eyes</option>
              <option value="system">Match my device</option>
            </select>
          </label>
          <label className="manage-label" style={{ marginTop: 25 }}>
            Language
            <select
              className="manage-input"
              value={settings.language}
              onChange={(event) =>
                change({
                  language: event.target.value as SettingsType["language"],
                })
              }
            >
              <option value="en">English</option>
              <option value="si">සිංහල · Sinhala preview</option>
            </select>
          </label>
          <div className="manage-note" style={{ marginTop: 25 }}>
            <Languages size={19} />
            <p>
              {settings.language === "si" ? "ආයුබෝවන්! භාෂා මනාපය සුරකින ලදී. " : ""}
              English and Sinhala preference support is prepared. Sinhala is a
              localization preview; technical pages and research terminology
              remain in English pending translation review.
            </p>
          </div>
        </section>
        <section className="card manage-pad">
          <div className="card-header">
            <div>
              <p className="eyebrow">ONLY WHAT MATTERS</p>
              <h2>Keep me in the loop</h2>
            </div>
            <Bell size={22} />
          </div>
          <SettingRow
            title="In-app updates"
            description="Show demo air quality, device, and maintenance updates."
          >
            <Toggle
              label="In-app notifications"
              checked={settings.notifications}
              onChange={() =>
                change({ notifications: !settings.notifications })
              }
            />
          </SettingRow>
          <SettingRow
            title="Email preference"
            description="Save your preference for future email delivery. No emails are sent in demo mode."
          >
            <Toggle
              label="Email notifications preference"
              checked={settings.emailNotifications}
              onChange={() =>
                change({ emailNotifications: !settings.emailNotifications })
              }
            />
          </SettingRow>
          <div className="manage-note" style={{ marginTop: 18 }}>
            <Mail size={18} />
            <p>
              Preferences are stored in this browser. Production delivery
              channels and notification permissions will be managed by the
              backend.
            </p>
          </div>
        </section>
        <section className="card manage-pad">
          <div className="card-header">
            <div>
              <p className="eyebrow">YOUR HOME, YOUR DATA</p>
              <h2>Privacy & account</h2>
            </div>
            <ShieldCheck size={22} />
          </div>
          <SettingRow
            title="Research participation preference"
            description="Save whether you would like to share anonymized research data."
          >
            <Toggle
              label="Research data sharing preference"
              checked={settings.analyticsConsent}
              onChange={() =>
                change({ analyticsConsent: !settings.analyticsConsent })
              }
            />
          </SettingRow>
          <SettingRow
            title="Account"
            description="Sign in, create an account, or manage your Firebase session."
          >
            <Link className="button secondary small" to="/login">
              <Smartphone size={15} />
              Sign in
            </Link>
          </SettingRow>
          <div className="manage-actions" style={{ marginTop: 20 }}>
            <Link
              className="button secondary"
              to="/login"
              onClick={async () => {
                await signOutFirebase();
                notify("Signed out");
              }}
            >
              <LogOut size={16} />
              Sign out
            </Link>
          </div>
          <p className="manage-caption">
            Your account settings and registered purifiers sync via Firebase
            Authentication and Realtime Database.
          </p>
        </section>
      </div>
    </div>
  );
}
