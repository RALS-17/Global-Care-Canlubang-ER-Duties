import type { ShiftKey, ShiftData } from '../types';

interface Props {
  currentShift: ShiftKey;
  shift: ShiftData;
}

export function CurrentShiftBanner({ shift }: Props) {
  return (
    <div className="current-shift-banner">
      CURRENT SHIFT: {shift.label}
    </div>
  );
}
