import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@finance:monthCutoffDay';

// null = desligado; senão, a partir desse dia a Home passa a mostrar o mês seguinte
let globalCutoff: number | null = null;
const listeners = new Set<(v: number | null) => void>();

function notify(value: number | null) {
  globalCutoff = value;
  listeners.forEach((fn) => fn(value));
}

export function useMonthCutoff() {
  const [cutoffDay, setCutoffDayState] = useState(globalCutoff);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value !== null) {
        const parsed = parseInt(value);
        notify(Number.isNaN(parsed) ? null : parsed);
      }
    });
  }, []);

  useEffect(() => {
    listeners.add(setCutoffDayState);
    return () => { listeners.delete(setCutoffDayState); };
  }, []);

  async function setCutoffDay(day: number | null) {
    notify(day);
    await AsyncStorage.setItem(STORAGE_KEY, day === null ? '' : String(day));
  }

  return { cutoffDay, setCutoffDay };
}

/** Mês/ano que a Home deve exibir, considerando o dia de virada. */
export function getDisplayMonth(cutoffDay: number | null, now = new Date()) {
  let month = now.getMonth() + 1;
  let year = now.getFullYear();
  if (cutoffDay !== null && now.getDate() >= cutoffDay) {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return { month, year };
}

/** Data sugerida para novos lançamentos: dia 10 do mês exibido na Home (YYYY-MM-DD). */
export function getSuggestedEntryDate(cutoffDay: number | null, now = new Date()) {
  const { month, year } = getDisplayMonth(cutoffDay, now);
  return `${year}-${String(month).padStart(2, '0')}-10`;
}
