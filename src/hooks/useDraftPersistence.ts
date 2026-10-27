import { useState, useEffect, useRef } from 'react';

/**
 * A hook that persists a string value to localStorage at a throttled interval.
 * Returns a [value, setter, clear] tuple compatible with useState.
 */
export function useDraftPersistence(
  key: string,
  intervalMs: number = 3000
): [string, (v: string) => void, () => void] {
  const [value, setValue] = useState(() => localStorage.getItem(key) || '');
  const lastSavedValue = useRef<string>(value);
  const lastSaveTime = useRef<number>(0);

  useEffect(() => {
    const now = Date.now();
    
    // Throttle saves
    if (value !== lastSavedValue.current && now - lastSaveTime.current >= intervalMs) {
      if (value.trim()) {
        localStorage.setItem(key, value);
      } else {
        localStorage.removeItem(key);
      }
      lastSavedValue.current = value;
      lastSaveTime.current = now;
    }

    // Debounce/Cleanup timer
    const timer = setTimeout(() => {
      if (value !== lastSavedValue.current) {
        if (value.trim()) {
          localStorage.setItem(key, value);
        } else {
          localStorage.removeItem(key);
        }
        lastSavedValue.current = value;
        lastSaveTime.current = Date.now();
      }
    }, intervalMs);

    return () => clearTimeout(timer);
  }, [value, key, intervalMs]);

  const clearDraft = () => {
    localStorage.removeItem(key);
    setValue('');
    lastSavedValue.current = '';
  };

  return [value, setValue, clearDraft];
}
