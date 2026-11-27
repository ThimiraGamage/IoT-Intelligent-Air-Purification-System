import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { AppContextValue } from "../types";
import { DemoAirService } from "../services/demoService";

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [service] = useState(() => new DemoAirService());
  const state = useSyncExternalStore(
    service.subscribe,
    service.getSnapshot,
    service.getSnapshot,
  );
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      const theme =
        state.settings.theme === "system"
          ? media.matches
            ? "dark"
            : "light"
          : state.settings.theme;
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
    };
    applyTheme();
    media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [state.settings.theme]);
  const device = state.devices.find(
    (item) => item.id === state.selectedDeviceId,
  )!;
  const value: AppContextValue = {
    ...state,
    device,
    aqi: state.history[state.history.length - 1].aqi,
    selectDevice: service.selectDevice,
    sendCommand: service.sendCommand,
    updateDevice: service.updateDevice,
    addDevice: service.addDevice,
    markRead: service.markRead,
    deleteNotification: service.deleteNotification,
    addRule: service.addRule,
    updateRule: service.updateRule,
    deleteRule: service.deleteRule,
    updateSettings: service.updateSettings,
    resetFilter: service.resetFilter,
    simulateConnection: service.simulateConnection,
    notify: service.notify,
    clearToast: service.clearToast,
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// The provider and hook intentionally expose a single public context entry point.
// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider.");
  return context;
}
