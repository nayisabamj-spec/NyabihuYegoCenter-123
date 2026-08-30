import { AttendanceRecord } from '../types';
import youthDataRaw from './youthEventDataset.json';

export const YOUTH_EVENT_ATTENDEES: AttendanceRecord[] = (youthDataRaw as any[]).map((r) => ({
  ...r,
  districtId: 'nyabihu',
  districtName: 'Nyabihu District',
}));

export function getYouthEventAttendees(): AttendanceRecord[] {
  return YOUTH_EVENT_ATTENDEES;
}
