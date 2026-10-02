import type { ShiftKey, StaffData } from '../types';

interface Props {
  currentShift: ShiftKey;
  data: StaffData;
}

const SHIFT_ORDER: ShiftKey[] = ['6-2', '2-10', '10-6'];

export function FooterSchedule({ currentShift, data }: Props) {
  return (
    <footer className="footer-schedule">
      <span className="footer-label">FULL DAY SCHEDULE</span>
      <span className="separator">•</span>

      {SHIFT_ORDER.map((key, i) => {
        const isCurrent = key === currentShift;
        return (
          <span key={key} className={`shift-item ${isCurrent ? 'current' : ''}`}>
            {isCurrent && <span className="arrow">← </span>}
            {data.shifts[key].label}
            {isCurrent && <span className="current-text"> CURRENT</span>}
            {i < SHIFT_ORDER.length - 1 && <span className="separator"> • </span>}
          </span>
        );
      })}
    </footer>
  );
}
