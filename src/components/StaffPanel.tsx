import { useState, useEffect } from 'react';
import type { ShiftKey, ShiftData, StaffMember } from '../types';
import { STAFF_GROUP_ROTATE_MS } from '../config';

interface Props {
  currentShift: ShiftKey;
  shift: ShiftData;
}

function StaffListNames({
  names,
  currentShift,
  tagClass = '',
  tagLabel,
}: {
  names: string[];
  currentShift: ShiftKey;
  tagClass?: string;
  tagLabel?: string;
}) {
  const tag = tagLabel || currentShift;
  const display = names.length > 0 ? names : ['No one listed'];
  const loop = [...display, ...display];
  const duration = Math.max(12, display.length * 4);

  return (
    <div className="staff-list-wrapper has-scroll">
      <ul
        className="staff-list scrolling"
        style={{ animationDuration: `${duration}s` }}
      >
        {loop.map((name, i) => (
          <li key={`${name}-${i}`} className="staff-item">
            <span
              className="staff-name"
              style={names.length === 0 ? { opacity: 0.45, fontWeight: 500 } : undefined}
            >
              {name}
            </span>
            {names.length > 0 && (
              <span className={`shift-tag ${tagClass}`}>{tag}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** ROD / Consultant – name + department */
function StaffListMembers({
  members,
  currentShift,
  tagClass = '',
  roleLabel,
}: {
  members: StaffMember[];
  currentShift: ShiftKey;
  tagClass?: string;
  roleLabel: string;
}) {
  const display =
    members.length > 0 ? members : [{ name: 'No one listed' } as StaffMember];
  const loop = [...display, ...display];
  const duration = Math.max(12, display.length * 4);
  const empty = members.length === 0;

  return (
    <div className="staff-list-wrapper has-scroll">
      <ul
        className="staff-list scrolling"
        style={{ animationDuration: `${duration}s` }}
      >
        {loop.map((m, i) => (
          <li key={`${m.name}-${m.department || ''}-${i}`} className="staff-item staff-item-dept">
            <div className="staff-text">
              <span
                className="staff-name"
                style={empty ? { opacity: 0.45, fontWeight: 500 } : undefined}
              >
                {m.name}
              </span>
              {!empty && m.department && (
                <span className="staff-dept">{m.department}</span>
              )}
            </div>
            {!empty && (
              <span className={`shift-tag ${tagClass}`}>
                {roleLabel} • {currentShift}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StaffPanel({ currentShift, shift }: Props) {
  const [group, setGroup] = useState<0 | 1>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setGroup((g) => (g === 0 ? 1 : 0));
    }, STAFF_GROUP_ROTATE_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="staff-panel">
      {group === 0 ? (
        <>
          <div className="staff-card nurses-card">
            <div className="staff-card-header nurses-header">
              <span className="icon">👩‍⚕️</span>
              <span>NURSES ON DUTY</span>
            </div>
            <StaffListNames names={shift.nurses} currentShift={currentShift} />
          </div>

          <div className="staff-card rods-card">
            <div className="staff-card-header rods-header">
              <span className="icon">👨‍⚕️</span>
              <span>RESIDENT ON DUTY (ROD)</span>
            </div>
            <StaffListMembers
              members={shift.rods}
              currentShift={currentShift}
              tagClass="resident"
              roleLabel="Resident"
            />
          </div>
        </>
      ) : (
        <>
          <div className="staff-card consultants-card">
            <div className="staff-card-header consultants-header">
              <span className="icon">🩺</span>
              <span>CONSULTANT ON DECK</span>
            </div>
            <StaffListMembers
              members={shift.consultants}
              currentShift={currentShift}
              tagClass="consultant"
              roleLabel="Consultant"
            />
          </div>

          <div className="staff-card shos-card">
            <div className="staff-card-header shos-header">
              <span className="icon">🏨</span>
              <span>SENIOR HOUSE OFFICER (SHO)</span>
            </div>
            <StaffListNames
              names={shift.shos}
              currentShift={currentShift}
              tagClass="sho"
              tagLabel={`SHO • ${currentShift}`}
            />
          </div>
        </>
      )}
    </div>
  );
}
