import { Component, Suspense, lazy } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import { AlertCircle, Wind } from "lucide-react";
import Layout from "./layouts/Layout";
import Overview from "./pages/Overview";
import Monitoring from "./pages/Monitoring";
const Analytics = lazy(() => import("./pages/Analytics"));
const DeviceControl = lazy(() => import("./pages/DeviceControl"));
const Automation = lazy(() => import("./pages/Automation"));
const Devices = lazy(() => import("./pages/Devices"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Maintenance = lazy(() => import("./pages/Maintenance"));
const Energy = lazy(() => import("./pages/Energy"));
const Settings = lazy(() => import("./pages/Settings"));
const Auth = lazy(() => import("./pages/Auth"));

class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Dashboard error", error, info.componentStack);
  }
  render() {
    return this.state.failed ? (
      <main className="error-page">
        <AlertCircle size={36} />
        <h1>Something interrupted the fresh air.</h1>
        <p>
          Your saved demo settings are still on this browser. Reload to
          reconnect.
        </p>
        <button
          className="button primary"
          onClick={() => window.location.reload()}
        >
          Reload dashboard
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
export default function App() {
  const location = useLocation();
  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          <div className="loading-screen" role="status">
            <Wind className="loading-icon" size={36} />
            <span>Making room for fresh air…</span>
          </div>
        }
      >
        <Routes location={location}>
          <Route path="/login" element={<Auth />} />
          <Route path="/register" element={<Auth />} />
          <Route path="/forgot-password" element={<Auth />} />
          <Route element={<Layout />}>
            <Route index element={<Overview />} />
            <Route path="monitoring" element={<Monitoring />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="control" element={<DeviceControl />} />
            <Route path="automation" element={<Automation />} />
            <Route path="devices" element={<Devices />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="maintenance" element={<Maintenance />} />
            <Route path="energy" element={<Energy />} />
            <Route path="settings" element={<Settings />} />
            <Route
              path="*"
              element={
                <div className="empty-state">
                  <Wind size={40} />
                  <h1>A little off course.</h1>
                  <p>We couldn't find that page.</p>
                  <Link className="button primary" to="/">
                    Back to overview
                  </Link>
                </div>
              }
            />
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
