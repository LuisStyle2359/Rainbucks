import { createJSONStorage } from "zustand/middleware";

/**
 * localStorage mit Rückfall auf einen Speicher im Arbeitsspeicher.
 * In privaten Fenstern oder eingebetteten Seiten kann der Zugriff auf
 * localStorage eine Exception werfen. Das Spiel läuft dann trotzdem,
 * nur ohne Speichern über das Neuladen hinaus.
 */
const memory = new Map<string, string>();

const safeLocalStorage = {
  getItem(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return memory.get(key) ?? null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      memory.set(key, value);
    }
  },
  removeItem(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch {
      memory.delete(key);
    }
  },
};

export const createSafeStorage = <T>() => createJSONStorage<T>(() => safeLocalStorage);
