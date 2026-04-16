import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export interface AppSettings {
  showBeta: boolean;
  refreshInterval: number; // minutes
  criticalPct: number;
  visibleRuns: 1 | 2;
  staleFactor: number;
  staleMinutes: number; // processing staleness threshold
  favorites: string[];
  showFavoritesOnly: boolean;
}

const DEFAULTS: AppSettings = {
  showBeta: false,
  refreshInterval: 5,
  criticalPct: 80,
  visibleRuns: 2,
  staleFactor: 1.85,
  staleMinutes: 20,
  favorites: [],
  showFavoritesOnly: false,
};

const STORAGE_KEY = "imw-app-settings";

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

function saveSettings(s: AppSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

interface SettingsContextValue {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  const updateSettings = (patch: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  };

  return React.createElement(SettingsContext.Provider, { value: { settings, updateSettings } }, children);
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
