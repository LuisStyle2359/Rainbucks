import { createJSONStorage } from "zustand/middleware";

/**
 * localStorage with an in-memory fallback. In private windows or embedded
 * pages, touching localStorage can throw. The game keeps working then,
 * it just forgets its state on reload.
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
