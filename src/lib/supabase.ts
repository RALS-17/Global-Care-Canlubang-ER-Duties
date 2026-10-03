import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';

export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder'
);

export type ScheduleRow = {
  shift_key: '6-2' | '2-10' | '10-6';
  label: string;
  nurses: string[];
  rods: string[];
  updated_at?: string;
};

export type VideoRow = {
  id: string;
  name: string;
  file_path: string;
  public_url: string;
  sort_order: number;
  created_at: string;
};
