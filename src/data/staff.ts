import type { StaffData } from '../types';

export const staffData: StaffData = {
  shifts: {
    '6-2': {
      label: '06:00 – 14:00 (6-2)',
      startHour: 6,
      endHour: 14,
      nurses: ['Aldrin S. RN', 'Noel M. RN', 'Gerald D. RN'],
      rods: ['Dr. Eli A.'],
      consultants: ['Dr. Consultant A.'],
      shos: ['Dr. SHO A.'],
    },
    '2-10': {
      label: '14:00 – 22:00 (2-10)',
      startHour: 14,
      endHour: 22,
      nurses: ['Aldrin S. RN', 'Noel M. RN', 'Gerald D. RN'],
      rods: ['Dr. Eli A.'],
      consultants: ['Dr. Consultant B.'],
      shos: ['Dr. SHO B.'],
    },
    '10-6': {
      label: '22:00 – 06:00 (10-6)',
      startHour: 22,
      endHour: 6,
      nurses: ['Aldrin S. RN', 'Noel M. RN', 'Gerald D. RN'],
      rods: ['Dr. Eli A.'],
      consultants: ['Dr. Consultant C.'],
      shos: ['Dr. SHO C.'],
    },
  },
};
