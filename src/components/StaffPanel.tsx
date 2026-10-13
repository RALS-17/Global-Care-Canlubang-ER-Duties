import { useRef, useState, useLayoutEffect, useCallback } from 'react';
import type { ShiftKey, ShiftData, StaffMember } from '../types';

interface Props {
  currentShift: ShiftKey;
  shift: ShiftData;
}

/**
 * Stays 1 column while names fit in the card.
 * Switches to 2 columns only when single-column would scroll/overflow.
 */
function NameList({
  names,
  tag,
  tagClass,
  autoSplit = false,
}: {
  names: string[];
  tag: string;
  tagClass?: string;
  autoSplit?: boolean;
}) {
  const empty = names.length === 0;
  const display = empty ? ['— No one listed —'] : names.slice(0, 25);
  const listRef = useRef<HTMLUListElement>(null);
  const [twoCol, setTwoCol] = useState(false);

  const measure = useCallback(() => {
    if (!autoSplit || empty) {
      setTwoCol(false);
      return;
    }
    const el = listRef.current;
    if (!el) return;

    // Force single-column to test whether content fits
    el.classList.remove('two-col');
    // Allow measuring natural content height vs visible area
    void el.offsetHeight;

    const overflows = el.scrollHeight > el.clientHeight + 4;
    if (overflows) {
      el.classList.add('two-col');
      setTwoCol(true);
    } else {
      setTwoCol(false);
    }
  }, [autoSplit, empty, display.length]);

  useLayoutEffect(() => {
    // Start single-column; only promote if it overflows
    setTwoCol(false);
    const id = requestAnimationFrame(() => measure());

    const el = listRef.current;
    if (!el || !autoSplit) {
      return () => cancelAnimationFrame(id);
    }

    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    if (el.parentElement) ro.observe(el.parentElement);

    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(id);
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure, autoSplit, display.join('|')]);

  return (
    <ul ref={listRef} className={`duty-list ${twoCol ? 'two-col' : ''}`}>
      {display.map((name, i) => (
        <li key={`${name}-${i}`} className={`duty-row ${empty ? 'is-empty' : ''}`}>
          <span className="duty-name">{name}</span>
          {!empty && <span className={`duty-tag ${tagClass || ''}`}>{tag}</span>}
        </li>
      ))}
    </ul>
  );
}

function MemberList({
  members,
  tag,
  tagClass,
}: {
  members: StaffMember[];
  tag: string;
  tagClass?: string;
}) {
  const empty = members.length === 0;
  const display = empty
    ? [{ name: '— No one listed —' } as StaffMember]
    : members.slice(0, 25);

  return (
    <ul className="duty-list">
      {display.map((m, i) => (
        <li
          key={`${m.name}-${m.department || ''}-${i}`}
          className={`duty-row ${empty ? 'is-empty' : ''}`}
        >
          <div className="duty-text">
            <span className="duty-name">{m.name}</span>
            {!empty && m.department && (
              <span className="duty-dept">{m.department}</span>
            )}
          </div>
          {!empty && <span className={`duty-tag ${tagClass || ''}`}>{tag}</span>}
        </li>
      ))}
    </ul>
  );
}

/**
 * Layout 2:
 * Consultant (left tall) | Video (center) | ROD (right tall)
 *                    SHO | Nurses (under video)
 */
export function StaffPanel({ shift }: Props) {
  return (
    <>
      <div className="duty-card consult-card">
        <div className="duty-card-head consult-head">
          <span className="duty-icon">🩺</span>
          <span>CONSULTANT ON DECK</span>
        </div>
        <MemberList members={shift.consultants} tag="Cons" tagClass="tag-blue" />
      </div>

      <div className="duty-card rod-card">
        <div className="duty-card-head rod-head">
          <span className="duty-icon">👨‍⚕️</span>
          <span>RESIDENT ON DUTY (ROD)</span>
        </div>
        <MemberList members={shift.rods} tag="ROD" tagClass="tag-blue" />
      </div>

      <div className="duty-card sho-card">
        <div className="duty-card-head sho-head">
          <span className="duty-icon">🏨</span>
          <span>SENIOR HOUSE OFFICER (SHO)</span>
        </div>
        <NameList names={shift.shos} tag="SHO" tagClass="tag-green" autoSplit />
      </div>

      <div className="duty-card nurses-card">
        <div className="duty-card-head nurses-head">
          <span className="duty-icon">👩‍⚕️</span>
          <span>NURSES ON DUTY</span>
        </div>
        <NameList names={shift.nurses} tag="RN" tagClass="tag-green" autoSplit />
      </div>
    </>
  );
}
