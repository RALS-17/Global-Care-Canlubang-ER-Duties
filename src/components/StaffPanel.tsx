import type { ShiftKey, ShiftData } from '../types';

interface Props {
  currentShift: ShiftKey;
  shift: ShiftData;
}

function StaffList({
  names,
  currentShift,
  isResident = false,
}: {
  names: string[];
  currentShift: ShiftKey;
  isResident?: boolean;
}) {
  const shouldScroll = names.length > 3;

  return (
    <div className={`staff-list-wrapper ${shouldScroll ? 'has-scroll' : ''}`}>
      <ul className={`staff-list ${shouldScroll ? 'scrolling' : ''}`}>
        {(shouldScroll ? [...names, ...names] : names).map((name, i) => (
          <li key={`${name}-${i}`} className="staff-item">
            <span className="staff-name">{name}</span>
            <span className={`shift-tag ${isResident ? 'resident' : ''}`}>
              {isResident ? `Resident • ${currentShift}` : currentShift}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StaffPanel({ currentShift, shift }: Props) {
  return (
    <div className="staff-panel">
      <div className="staff-card nurses-card">
        <div className="staff-card-header nurses-header">
          <span className="icon">👩‍⚕️</span>
          <span>NURSES ON DUTY</span>
        </div>
        <StaffList names={shift.nurses} currentShift={currentShift} />
      </div>

      <div className="staff-card rods-card">
        <div className="staff-card-header rods-header">
          <span className="icon">👨‍⚕️</span>
          <span>ROD ON DECK</span>
        </div>
        <StaffList
          names={shift.rods}
          currentShift={currentShift}
          isResident
        />
      </div>
    </div>
  );
}
