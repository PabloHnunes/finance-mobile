import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@finance:hideValues';

let globalHidden = false;
const listeners = new Set<(v: boolean) => void>();

function notify(value: boolean) {
  globalHidden = value;
  listeners.forEach((fn) => fn(value));
}

export function useHideValues() {
  const [hidden, setHidden] = useState(globalHidden);

  useEffect(() => {
    // Load from storage on first mount
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value !== null) {
        const parsed = value === 'true';
        notify(parsed);
      }
    });
  }, []);

  useEffect(() => {
    listeners.add(setHidden);
    return () => { listeners.delete(setHidden); };
  }, []);

  async function toggle() {
    const next = !globalHidden;
    notify(next);
    await AsyncStorage.setItem(STORAGE_KEY, String(next));
  }

  return { hidden, toggle };
}
