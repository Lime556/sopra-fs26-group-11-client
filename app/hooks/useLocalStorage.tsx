import { useEffect, useState } from "react";

interface LocalStorage<T> {
  value: T;
  set: (newVal: T) => void;
  clear: () => void;
}

interface StorageOptions {
  storage?: "local" | "session";
}

/**
 * This custom function/hook safely handles SSR by checking
 * for the window before accessing browser localStorage.
 * IMPORTANT: It has a local react state AND a localStorage state.
 * When initializing the state with a default value,
 * clearing will revert to this default value for the state and
 * the corresponding token gets deleted in the localStorage.
 *
 * @param key - The key from localStorage, generic type T.
 * @param defaultValue - The default value if nothing is in localStorage yet.
 * @returns An object containing:
 *  - value: The current value (synced with localStorage).
 *  - set: Updates both react state & localStorage.
 *  - clear: Resets state to defaultValue and deletes localStorage key.
 */
export default function useLocalStorage<T>(
  key: string,
  defaultValue: T,
  options: StorageOptions = {},
): LocalStorage<T> {
  const storageType = options.storage ?? "local";

  const getStorage = (): Storage | null => {
    if (typeof window === "undefined") {
      return null;
    }

    return storageType === "session" ? globalThis.sessionStorage : globalThis.localStorage;
  };

  const readStoredValue = (): T => {
    const storage = getStorage();
    if (!storage) {
      return defaultValue;
    }

    try {
      const stored = storage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : defaultValue;
    } catch (error) {
      console.error(`Error reading ${storageType}Storage key "${key}":`, error);
      return defaultValue;
    }
  };

  const [value, setValue] = useState<T>(() => readStoredValue());

  // Re-sync if the key changes
  useEffect(() => {
    setValue(readStoredValue());
  }, [key, storageType]);

  // Simple setter that updates both state and localStorage
  const set = (newVal: T) => {
    setValue(newVal);
    const storage = getStorage();
    if (storage) {
      storage.setItem(key, JSON.stringify(newVal));
    }
  };

  // Removes the key from localStorage and resets the state
  const clear = () => {
    setValue(defaultValue);
    const storage = getStorage();
    if (storage) {
      storage.removeItem(key);
    }
  };

  return { value, set, clear };
}
