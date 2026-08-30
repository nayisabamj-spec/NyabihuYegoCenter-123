import { AttendanceRecord } from '../types';
import committeeDataRaw from './committeeDataset.json';
import youthDataRaw from './youthEventDataset.json';

export const YOUTH_EVENT_RECORDS: AttendanceRecord[] = (youthDataRaw as any[]).map((r) => ({
  ...r,
  districtId: 'nyabihu',
  districtName: 'Nyabihu District',
}));

export const COMMITTEE_ONLY_RECORDS: AttendanceRecord[] = (committeeDataRaw as any[]).map((r) => ({
  ...r,
  districtId: 'nyabihu',
  districtName: 'Nyabihu District',
}));

// All official registered records: 94 Youth Event Attendees + 1,600 Committee Member Records = 1,694
export const COMMITTEE_ATTENDANCE_RECORDS: AttendanceRecord[] = [
  ...YOUTH_EVENT_RECORDS,
  ...COMMITTEE_ONLY_RECORDS,
];

export function getCommitteeAttendanceRecords(): AttendanceRecord[] {
  return COMMITTEE_ATTENDANCE_RECORDS;
}

