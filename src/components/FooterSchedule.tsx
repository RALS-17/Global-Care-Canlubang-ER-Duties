import type { ShiftKey, StaffData } from '../types';

interface Props {
  currentShift: ShiftKey;
  data: StaffData;
}

const SHIFT_ORDER: ShiftKey[] = ['6-2', '2-10', '10-6'];

export function FooterSchedule({ currentShift, data }: Props) {
  return (
    <footer className="footer-schedule">
      <span className="footer-brand">Global Care Canlubang · ER Duty Board</span>
      <span className="footer-sep">·</span>
      <span className="footer-label">FULL DAY SCHEDULE</span>
      {SHIFT_ORDER.map((key) => {
        const isCurrent = key === currentShift;
        return (
          <span
            key={key}
            className={`footer-shift ${isCurrent ? 'is-current' : ''}`}
          >
            {isCurrent ? `← ${data.shifts[key].label} CURRENT` : data.shifts[key].label}
          </span>
        );
      })}
    </footer>
  );
}
