import type { ShiftKey, ShiftData } from '../types';
import { useClock } from '../hooks/useClock';

interface Props {
  currentShift: ShiftKey;
  shift: ShiftData;
}

export function CurrentShiftBanner({ shift }: Props) {
  const { time, date } = useClock();

  return (
    <div className="section-bar">
      <div className="section-bar-left">
        <span className="section-accent" />
        <span className="section-title">ER ON-DUTY TEAM</span>
        <span className="section-shift">CURRENT SHIFT · {shift.label}</span>
      </div>
      <div className="section-bar-right">
        <span className="broadcast-label">BROADCAST TIME</span>
        <span className="broadcast-value">
          {date} AT {time}
        </span>
      </div>
    </div>
  );
}
