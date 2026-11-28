import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, Link, Navigate, useLocation } from "react-router-dom";
import type { User } from "firebase/auth";
import { isFirebaseConfigured, subscribeAuthState } from "../services/firebase";
import {
  Activity,
  BarChart3,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Cpu,
  Fan,
  Home,
  Leaf,
  Menu,
  Moon,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Wind,
  X,
  Zap,
  Check,
  WifiOff,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "../hooks/useApp";

const navigation = [
  {
    title: "WORKSPACE",
    items: [
      { to: "/", label: "Overview", icon: Home },
      { to: "/monitoring", label: "Live monitoring", icon: Activity },
      { to: "/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    title: "YOUR PURIFIER",
    items: [
      { to: "/control", label: "Device control", icon: SlidersHorizontal },
      { to: "/automation", label: "Smart automation", icon: Zap },
      { to: "/devices", label: "Devices", icon: Cpu },
      { to: "/maintenance", label: "Filter maintenance", icon: Fan },
      { to: "/energy", label: "Energy consumption", icon: Leaf },
    ],
  },
  {
    title: "PREFERENCES",
    items: [
      { to: "/notifications", label: "Notifications", icon: Bell },
      { to: "/settings", label: "Settings", icon: Settings2 },
    ],
  },
];
export default function Layout() {
  const app = useApp();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const [authReady, setAuthReady] = useState(!isFirebaseConfigured);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const helpRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return subscribeAuthState((user) => {
      setCurrentUser(user);
      setAuthReady(true);
    });
  }, []);
  const unread = app.notifications.filter((n) => !n.read).length;
  const title =
    navigation.flatMap((n) => n.items).find((n) => n.to === location.pathname)
      ?.label || "Workspace";
  useEffect(() => {
    document.title = `${title} · Aeris`;
    window.scrollTo(0, 0);
  }, [title]);
  useEffect(() => {
    if (help) helpRef.current?.showModal();
    else helpRef.current?.close();
  }, [help]);

  if (!authReady) {
    return (
      <div className="loading-screen" role="status">
        <Wind className="loading-icon" size={36} />
        <span>Loading your Aeris account…</span>
      </div>
    );
  }

  if (
    isFirebaseConfigured &&
    currentUser &&
    app.devices.length === 0 &&
    location.pathname !== "/devices" &&
    location.pathname !== "/settings"
  ) {
    return <Navigate to="/devices" replace />;
  }
  return (
    <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      {mobileOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}
        aria-label="Main navigation"
      >
        <Link
          to="/"
          className="brand"
          aria-label="Aeris home"
          onClick={() => setMobileOpen(false)}
        >
          <span className="brand-symbol">
            <Wind size={28} />
          </span>
          <span className="brand-text">
            aeris<span className="brand-period">.</span>
          </span>
        </Link>
        <button
          className="icon-button mobile-sidebar-close"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        >
          <X size={20} />
        </button>
        <div className="workspace-label">
          <span className="workspace-icon">
            <Home size={15} />
          </span>
          <span>
            My home<small>Personal workspace</small>
          </span>
          <ChevronDown size={14} />
        </div>
        <nav>
          {navigation.map((group) => (
            <div className="nav-group" key={group.title}>
              <p className="nav-group-title">{group.title}</p>
              {group.items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  title={collapsed ? label : undefined}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `nav-item ${isActive ? "active" : ""}`
                  }
                >
                  <Icon size={18} strokeWidth={1.7} />
                  <span>{label}</span>
                  {to === "/notifications" && unread > 0 && (
                    <span className="nav-count">{unread}</span>
                  )}
                  {to === "/monitoring" && <span className="live-nav-dot" />}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="leaf-mark">
              <Leaf size={20} />
            </span>
            <div>
              <strong>A little care. Cleaner air.</strong>
              <p>Your home is in good hands.</p>
            </div>
          </div>
          <button
            className="nav-item help-button"
            onClick={() => setHelp(true)}
            title="Help and support"
          >
            <CircleHelp size={18} />
            <span>Help & support</span>
          </button>
          <div className="sidebar-foot">
            <span>AERIS · RESEARCH EDITION</span>
            <button
              className="icon-button"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? (
                <ChevronRight size={16} />
              ) : (
                <ChevronLeft size={16} />
              )}
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={21} />
            </button>
            <Home size={15} />
            <span className="breadcrumb-slash">/</span>
            <span>{title}</span>
          </div>
          <div className="topbar-actions">
            <span className="demo-badge">
              <span />
              {!currentUser
                ? "Presentation · Simulated"
                : app.telemetrySource === "live"
                  ? "Live ESP32"
                  : "Waiting for ESP32"}
            </span>
            <button
              className="icon-button theme-toggle"
              aria-label={`Switch to ${app.settings.theme === "dark" ? "light" : "dark"} theme`}
              onClick={() =>
                app.updateSettings({
                  theme: app.settings.theme === "dark" ? "light" : "dark",
                })
              }
            >
              {app.settings.theme === "dark" ? (
                <Sun size={18} />
              ) : (
                <Moon size={18} />
              )}
            </button>
            <Link
              to="/notifications"
              className="icon-button notification-button"
              aria-label={`${unread} unread notifications`}
            >
              <Bell size={19} />
              {unread > 0 && <span />}
            </Link>
            <span className="topbar-divider" />
            <Link
              to={currentUser ? "/settings" : "/login"}
              className="profile-link"
            >
              <span className="avatar">
                {currentUser
                  ? app.settings.name.slice(0, 1).toUpperCase()
                  : "?"}
              </span>
              <span>
                {currentUser ? app.settings.name : "Guest"}
                <small>{currentUser ? "My account" : "Sign in"}</small>
              </span>
              <ChevronDown size={13} />
            </Link>
          </div>
        </header>
        {app.connection !== "connected" && (
          <div className="connection-banner" role="status">
            <WifiOff size={16} />
            {app.connection === "reconnecting"
              ? "Reconnecting to your purifier…"
              : "Purifier disconnected. Displaying the last known readings."}
            <button onClick={app.simulateConnection}>Reconnect</button>
          </div>
        )}
        <main id="main-content" className="main-content">
          <Outlet />
        </main>
        <footer className="app-footer">
          <span>Thoughtfully made for the air you live in.</span>
          <span>
            <ShieldCheck size={13} />{" "}
            {app.telemetrySource === "live"
              ? "Live telemetry · Firebase RTDB"
              : "Connected · Firebase RTDB"}
          </span>
        </footer>
      </div>
      <AnimatePresence>
        {app.toast && (
          <motion.div
            role="status"
            className="toast"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
          >
            <Check size={18} />
            <span>{app.toast}</span>
            <button
              className="icon-button"
              aria-label="Dismiss message"
              onClick={app.clearToast}
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <dialog
        ref={helpRef}
        className="help-dialog"
        onCancel={() => setHelp(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setHelp(false);
        }}
      >
        <div className="card-header">
          <h2>A little help, whenever you need it.</h2>
          <button
            className="icon-button"
            aria-label="Close help"
            onClick={() => setHelp(false)}
          >
            <X size={20} />
          </button>
        </div>
        <p>
          Aeris is a research prototype dashboard. Demo mode uses simulated
          sensor readings and device acknowledgements.
        </p>
        <details>
          <summary>How is my air quality index calculated?</summary>
          <p>
            The demo particulate index uses EPA 2024 PM2.5 and PM10 breakpoints.
            Live readings are instantaneous and do not replace a regulatory
            24-hour AQI or NowCast.
          </p>
        </details>
        <details>
          <summary>Where is my information stored?</summary>
          <p>
            Demo preferences, devices and rules stay in this browser. A secure
            backend, account system and hardware connection are future
            integrations.
          </p>
        </details>
        <details>
          <summary>What can the purifier measure?</summary>
          <p>
            The demo covers particles, CO₂, total VOCs, temperature and
            humidity. Individual chemical identification requires suitable
            validated sensors. This prototype is not a certified safety alarm or
            medical device.
          </p>
        </details>
        <Link
          className="button primary"
          to="/settings"
          onClick={() => setHelp(false)}
        >
          Open settings
        </Link>
      </dialog>
    </div>
  );
}
