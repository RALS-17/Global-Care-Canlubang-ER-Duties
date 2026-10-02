import { useState, useEffect } from 'react';
import type { ShiftKey } from '../types';

export function useCurrentShift(): ShiftKey {
  const [current, setCurrent] = useState<ShiftKey>('2-10');

  useEffect(() => {
    const detectShift = (): ShiftKey => {
      const hour = new Date().getHours();
      if (hour >= 6 && hour < 14) return '6-2';
      if (hour >= 14 && hour < 22) return '2-10';
      return '10-6';
    };

    setCurrent(detectShift());

    // Recheck every minute
    const timer = setInterval(() => {
      setCurrent(detectShift());
    }, 60_000);

    return () => clearInterval(timer);
  }, []);

  return current;
}
