import { useState, useEffect } from 'react';
import type { StaffData, ShiftKey } from '../types';
import { staffData as fallbackData } from '../data/staff';
import { GOOGLE_SHEET_CSV_URL, SCHEDULE_REFRESH_MS } from '../config';

const SHIFT_HOURS: Record<ShiftKey, { startHour: number; endHour: number; defaultLabel: string }> = {
  '6-2': { startHour: 6, endHour: 14, defaultLabel: '06:00 – 14:00 (6-2)' },
  '2-10': { startHour: 14, endHour: 22, defaultLabel: '14:00 – 22:00 (2-10)' },
  '10-6': { startHour: 22, endHour: 6, defaultLabel: '22:00 – 06:00 (10-6)' },
};

function parseCSV(text: string): StaffData | null {
  try {
    const lines = text
      .trim()
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length < 2) return null;

    // Skip header row
    const rows = lines.slice(1);

    const shifts: StaffData['shifts'] = {
      '6-2': {
        label: SHIFT_HOURS['6-2'].defaultLabel,
        startHour: 6,
        endHour: 14,
        nurses: [],
        rods: [],
      },
      '2-10': {
        label: SHIFT_HOURS['2-10'].defaultLabel,
        startHour: 14,
        endHour: 22,
        nurses: [],
        rods: [],
      },
      '10-6': {
        label: SHIFT_HOURS['10-6'].defaultLabel,
        startHour: 22,
        endHour: 6,
        nurses: [],
        rods: [],
      },
    };

    for (const row of rows) {
      // Simple CSV split (handles basic quoted fields)
      const cols = row.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));

      // Expected columns: ShiftKey, Label, Nurses, RODs
      const shiftKey = cols[0] as ShiftKey;
      if (!shifts[shiftKey]) continue;

      const label = cols[1] || SHIFT_HOURS[shiftKey].defaultLabel;
      const nursesRaw = cols[2] || '';
      const rodsRaw = cols[3] || '';

      const nurses = nursesRaw
        .split(/[;|]/)
        .map((n) => n.trim())
        .filter(Boolean);

      const rods = rodsRaw
        .split(/[;|]/)
        .map((n) => n.trim())
        .filter(Boolean);

      shifts[shiftKey] = {
        label,
        startHour: SHIFT_HOURS[shiftKey].startHour,
        endHour: SHIFT_HOURS[shiftKey].endHour,
        nurses,
        rods,
      };
    }

    return { shifts };
  } catch (err) {
    console.error('Failed to parse schedule CSV:', err);
    return null;
  }
}

export function useSchedule() {
  const [data, setData] = useState<StaffData>(fallbackData);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'google' | 'local'>('local');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchSchedule = async () => {
    // Skip if the placeholder URL is still there
    if (GOOGLE_SHEET_CSV_URL.includes('YOUR_SHEET_ID')) {
      setData(fallbackData);
      setSource('local');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(GOOGLE_SHEET_CSV_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const text = await res.text();
      const parsed = parseCSV(text);

      if (parsed) {
        setData(parsed);
        setSource('google');
        setLastUpdated(new Date());
      } else {
        setData(fallbackData);
        setSource('local');
      }
    } catch (err) {
      console.warn('Could not load Google Sheet, using local data:', err);
      setData(fallbackData);
      setSource('local');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();

    const timer = setInterval(fetchSchedule, SCHEDULE_REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  return { data, loading, source, lastUpdated };
}
