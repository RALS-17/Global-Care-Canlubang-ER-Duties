import type { StaffData } from '../types';

export const staffData: StaffData = {
  shifts: {
    '6-2': {
      label: '06:00 – 14:00 (6-2)',
      startHour: 6,
      endHour: 14,
      nurses: [
        'Sarah M. RN',
        'Lisa T. RN',
        'John D. RN',
        'Maria G. RN',
        'Anna P. RN',
      ],
      rods: [
        'Dr. James K.',
        'Dr. Emily R.',
        'Dr. Michael T.',
      ],
    },
    '2-10': {
      label: '14:00 – 22:00 (2-10)',
      startHour: 14,
      endHour: 22,
      nurses: [
        'Sarah M. RN',
        'Lisa T. RN',
        'Mark R. RN',
        'Aisha K. RN',
        'Paolo S. RN',
        'Jenny L. RN',
      ],
      rods: [
        'Dr. James K.',
        'Dr. Priya S.',
        'Dr. Carlos M.',
        'Dr. Hannah R.',
      ],
    },
    '10-6': {
      label: '22:00 – 06:00 (10-6)',
      startHour: 22,
      endHour: 6,
      nurses: [
        'Nina P. RN',
        'Tom H. RN',
        'Karen L. RN',
        'Rico M. RN',
      ],
      rods: [
        'Dr. Alex W.',
        'Dr. Sofia L.',
        'Dr. Ben C.',
      ],
    },
  },
};
