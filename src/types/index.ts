export type ShiftKey = '6-2' | '2-10' | '10-6';

/** ROD & Consultant can include department; nurses/SHO are plain names */
export interface StaffMember {
  name: string;
  department?: string;
}

export interface ShiftData {
  label: string;
  startHour: number;
  endHour: number;
  nurses: string[];
  rods: StaffMember[];
  consultants: StaffMember[];
  shos: string[];
}

export interface StaffData {
  shifts: Record<ShiftKey, ShiftData>;
}

/** Store in DB text[] as "Name||Department" (department optional) */
export function encodeMember(m: StaffMember): string {
  const name = (m.name || '').trim();
  const dept = (m.department || '').trim();
  if (!name) return '';
  return dept ? `${name}||${dept}` : name;
}

export function parseMember(raw: string): StaffMember {
  const s = (raw || '').trim();
  if (!s) return { name: '' };
  if (s.includes('||')) {
    const [name, ...rest] = s.split('||');
    return { name: name.trim(), department: rest.join('||').trim() || undefined };
  }
  // Admin line format: Name | Department
  if (s.includes('|')) {
    const idx = s.indexOf('|');
    return {
      name: s.slice(0, idx).trim(),
      department: s.slice(idx + 1).trim() || undefined,
    };
  }
  return { name: s };
}

export function parseMemberList(linesOrCsv: string): StaffMember[] {
  return linesOrCsv
    .split(/\n|,/)
    .map((x) => parseMember(x.trim()))
    .filter((m) => m.name);
}

export function membersToFormText(members: StaffMember[]): string {
  return members
    .map((m) =>
      m.department ? `${m.name} | ${m.department}` : m.name
    )
    .join('\n');
}
