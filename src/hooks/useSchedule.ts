import { useState, useEffect, useCallback } from 'react';
import type { StaffData, ShiftKey } from '../types';
import { staffData as fallbackData } from '../data/staff';
import { supabase, type ScheduleRow } from '../lib/supabase';
import { DATA_REFRESH_MS, isSupabaseConfigured } from '../config';

const SHIFT_HOURS: Record<ShiftKey, { startHour: number; endHour: number; defaultLabel: string }> = {
  '6-2': { startHour: 6, endHour: 14, defaultLabel: '06:00 – 14:00 (6-2)' },
  '2-10': { startHour: 14, endHour: 22, defaultLabel: '14:00 – 22:00 (2-10)' },
  '10-6': { startHour: 22, endHour: 6, defaultLabel: '22:00 – 06:00 (10-6)' },
};

function emptyShifts(): StaffData['shifts'] {
  return {
    '6-2': {
      label: SHIFT_HOURS['6-2'].defaultLabel,
      startHour: 6,
      endHour: 14,
      nurses: [],
      rods: [],
      consultants: [],
      shos: [],
    },
    '2-10': {
      label: SHIFT_HOURS['2-10'].defaultLabel,
      startHour: 14,
      endHour: 22,
      nurses: [],
      rods: [],
      consultants: [],
      shos: [],
    },
    '10-6': {
      label: SHIFT_HOURS['10-6'].defaultLabel,
      startHour: 22,
      endHour: 6,
      nurses: [],
      rods: [],
      consultants: [],
      shos: [],
    },
  };
}

function rowsToStaffData(rows: ScheduleRow[]): StaffData {
  const shifts = emptyShifts();
  for (const row of rows) {
    const key = row.shift_key as ShiftKey;
    if (!shifts[key]) continue;
    shifts[key] = {
      label: row.label || SHIFT_HOURS[key].defaultLabel,
      startHour: SHIFT_HOURS[key].startHour,
      endHour: SHIFT_HOURS[key].endHour,
      nurses: row.nurses || [],
      rods: row.rods || [],
      consultants: row.consultants || [],
      shos: row.shos || [],
    };
  }
  return { shifts };
}

export function useSchedule() {
  const [data, setData] = useState<StaffData>(fallbackData);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'supabase' | 'local'>('local');

  const fetchSchedule = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setData(fallbackData);
      setSource('local');
      setLoading(false);
      return;
    }

    try {
      const { data: rows, error } = await supabase
        .from('schedules')
        .select('*')
        .order('shift_key');

      if (error) throw error;
      if (rows && rows.length > 0) {
        setData(rowsToStaffData(rows as ScheduleRow[]));
        setSource('supabase');
      } else {
        setData(fallbackData);
        setSource('local');
      }
    } catch (err) {
      console.warn('Schedule fetch failed, using local:', err);
      setData(fallbackData);
      setSource('local');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedule();

    // Backup poll
    const timer = setInterval(fetchSchedule, DATA_REFRESH_MS);

    // Live updates via Supabase Realtime (no restart needed)
    let channel: ReturnType<typeof supabase.channel> | null = null;
    if (isSupabaseConfigured) {
      channel = supabase
        .channel('schedules-live')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'schedules' },
          () => {
            fetchSchedule();
          }
        )
        .subscribe();
    }

    return () => {
      clearInterval(timer);
      if (channel) supabase.removeChannel(channel);
    };
  }, [fetchSchedule]);

  return { data, loading, source, refresh: fetchSchedule };
}
