import type { StaffData } from '../types';

export const staffData: StaffData = {
  shifts: {
    '6-2': {
      label: '06:00 – 14:00 (6-2)',
      startHour: 6,
      endHour: 14,
      nurses: ['Aldrin S. RN', 'Noel M. RN', 'Gerald D. RN'],
      rods: [{ name: 'Dr. Eli A.', department: 'Emergency Medicine' }],
      consultants: [{ name: 'Dr. Consultant A.', department: 'Internal Medicine' }],
      shos: ['Dr. SHO A.'],
    },
    '2-10': {
      label: '14:00 – 22:00 (2-10)',
      startHour: 14,
      endHour: 22,
      nurses: ['Aldrin S. RN', 'Noel M. RN', 'Gerald D. RN'],
      rods: [{ name: 'Dr. Eli A.', department: 'Emergency Medicine' }],
      consultants: [{ name: 'Dr. Consultant B.', department: 'Surgery' }],
      shos: ['Dr. SHO B.'],
    },
    '10-6': {
      label: '22:00 – 06:00 (10-6)',
      startHour: 22,
      endHour: 6,
      nurses: ['Aldrin S. RN', 'Noel M. RN', 'Gerald D. RN'],
      rods: [{ name: 'Dr. Eli A.', department: 'Emergency Medicine' }],
      consultants: [{ name: 'Dr. Consultant C.', department: 'Pediatrics' }],
      shos: ['Dr. SHO C.'],
    },
  },
};
