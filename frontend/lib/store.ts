import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Beneficiary, Alert, FilterState, SystemStatus, TelemetryEvent } from "@/types";

interface AppState {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  currentView: "dashboard" | "risk" | "beneficiaries" | "telemetry" | "forecasts" | "alerts" | "map" | "settings";
  setCurrentView: (view: AppState["currentView"]) => void;

  systemStatus: SystemStatus | null;
  setSystemStatus: (status: SystemStatus) => void;

  alerts: Alert[];
  setAlerts: (alerts: Alert[]) => void;
  addAlert: (alert: Alert) => void;
  acknowledgeAlert: (id: string) => void;
  resolveAlert: (id: string) => void;

  telemetryEvents: TelemetryEvent[];
  setTelemetryEvents: (events: TelemetryEvent[]) => void;
  addTelemetryEvent: (event: TelemetryEvent) => void;

  selectedBeneficiary: Beneficiary | null;
  setSelectedBeneficiary: (beneficiary: Beneficiary | null) => void;

  filters: FilterState;
  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;

  isOfflineMode: boolean;
  setIsOfflineMode: (offline: boolean) => void;

  pendingSyncCount: number;
  setPendingSyncCount: (count: number) => void;

  theme: "light" | "dark" | "system";
  setTheme: (theme: "light" | "dark" | "system") => void;

  notifications: Array<{ id: string; message: string; type: "info" | "success" | "warning" | "error" }>;
  addNotification: (notification: Omit<AppState["notifications"][0], "id">) => void;
  removeNotification: (id: string) => void;

  hasSeenOnboarding: boolean;
  markOnboardingSeen: () => void;
}

const defaultFilters: FilterState = {
  search: "",
  region: "all",
  riskTier: "all",
  dateRange: { from: null, to: null },
  sortBy: "riskScore",
  sortOrder: "desc",
  page: 1,
  pageSize: 20,
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),

      currentView: "dashboard",
      setCurrentView: (view) => set({ currentView: view }),

      systemStatus: null,
      setSystemStatus: (status) => set({ systemStatus: status }),

      alerts: [],
      setAlerts: (alerts) => set({ alerts }),
      addAlert: (alert) => set({ alerts: [alert, ...get().alerts] }),
      acknowledgeAlert: (id) =>
        set({
          alerts: get().alerts.map((a) =>
            a.id === id ? { ...a, status: "acknowledged" as const, acknowledgedAt: new Date().toISOString() } : a
          ),
        }),
      resolveAlert: (id) =>
        set({
          alerts: get().alerts.map((a) =>
            a.id === id ? { ...a, status: "resolved" as const, resolvedAt: new Date().toISOString() } : a
          ),
        }),

      telemetryEvents: [],
      setTelemetryEvents: (events) => set({ telemetryEvents: events }),
      addTelemetryEvent: (event) => set({ telemetryEvents: [event, ...get().telemetryEvents].slice(0, 100) }),

      selectedBeneficiary: null,
      setSelectedBeneficiary: (beneficiary) => set({ selectedBeneficiary: beneficiary }),

      filters: defaultFilters,
      setFilters: (filters) => set({ filters: { ...get().filters, ...filters } }),
      resetFilters: () => set({ filters: defaultFilters }),

      isOfflineMode: false,
      setIsOfflineMode: (offline) => set({ isOfflineMode: offline }),

      pendingSyncCount: 0,
      setPendingSyncCount: (count) => set({ pendingSyncCount: count }),

      theme: "light",
      setTheme: (theme) => {
        set({ theme });
        if (typeof document !== "undefined") {
          if (theme === "system") {
            document.documentElement.classList.toggle(
              "dark",
              window.matchMedia("(prefers-color-scheme: dark)").matches
            );
          } else {
            document.documentElement.classList.toggle("dark", theme === "dark");
          }
        }
      },

      notifications: [],
      addNotification: (notification) =>
        set({
          notifications: [
            ...get().notifications,
            { ...notification, id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}` },
          ].slice(-5),
        }),
      removeNotification: (id) =>
        set({ notifications: get().notifications.filter((n) => n.id !== id) }),

      hasSeenOnboarding: false,
      markOnboardingSeen: () => set({ hasSeenOnboarding: true }),
    }),
    {
      name: "inuka-sentinel-store",
      partialize: (state) => ({
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
        hasSeenOnboarding: state.hasSeenOnboarding,
      }),
    }
  )
);