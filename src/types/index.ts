export type ShiftKey = '6-2' | '2-10' | '10-6';

export interface ShiftData {
  label: string;
  startHour: number;
  endHour: number;
  nurses: string[];
  rods: string[];
}

export interface StaffData {
  shifts: Record<ShiftKey, ShiftData>;
}
