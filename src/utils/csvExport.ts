import { AttendanceRecord, ServiceAttendanceSummary, PeriodDateRange, ColumnsConfig } from '../types';
import { ALL_COLUMNS, DEFAULT_COLUMNS_CONFIG } from '../constants/columns';

export function exportAttendanceToCSV(
  records: AttendanceRecord[],
  districtName: string,
  range: PeriodDateRange,
  columnsConfig: ColumnsConfig = DEFAULT_COLUMNS_CONFIG
) {
  // Determine active columns
  const activeCols = ALL_COLUMNS.filter(c => !!columnsConfig[c.key]);

  const headers = ['No.', ...activeCols.map(c => c.exportHeader)];

  const rows = records.map((r, idx) => {
    const values: (string | number)[] = [idx + 1];

    activeCols.forEach((col) => {
      switch (col.key) {
        case 'recordId':
          values.push(`"${r.id}"`);
          break;
        case 'attendanceDate':
          values.push(`"${r.attendanceDate}"`);
          break;
        case 'attendanceTime':
          values.push(`"${r.attendanceTime}"`);
          break;
        case 'personName':
          values.push(`"${r.personName.replace(/"/g, '""')}"`);
          break;
        case 'sex':
          values.push(`"${r.sex}"`);
          break;
        case 'serviceName':
          values.push(`"${r.serviceNameSnapshot.replace(/"/g, '""')}"`);
          break;
        case 'districtName':
          values.push(`"${(r.districtName || districtName || 'NYABIHU').replace(/"/g, '""')}"`);
          break;
        case 'sector':
          values.push(`"${(r.sector || 'Mukamira').replace(/"/g, '""')}"`);
          break;
        case 'cell':
          values.push(`"${(r.cell || '').replace(/"/g, '""')}"`);
          break;
        case 'village':
          values.push(`"${(r.village || '').replace(/"/g, '""')}"`);
          break;
        case 'phoneNumber':
          values.push(`"${(r.phoneNumber || '').replace(/"/g, '""')}"`);
          break;
        case 'email':
          values.push(`"${(r.email || '').replace(/"/g, '""')}"`);
          break;
        case 'nationalId':
          values.push(`"${(r.nationalId || '').replace(/"/g, '""')}"`);
          break;
        case 'entryMethod':
          values.push(`"${r.isSelfCheckIn ? 'Visitor Self Check-In' : 'Staff Desk Entry'}"`);
          break;
        case 'recordedBy':
          values.push(`"${(r.recordedBy || '').replace(/"/g, '""')}"`);
          break;
        case 'notes':
          values.push(`"${(r.notes || '').replace(/"/g, '""')}"`);
          break;
      }
    });

    return values;
  });

  const csvContent = '\uFEFF' + [
    `"NYABIHU YEGO CENTER - ATTENDANCE VISITOR REGISTER"`,
    `"District: ${districtName || 'NYABIHU DISTRICT'}"`,
    `"Period: ${range.label} (${range.startDate} to ${range.endDate})"`,
    `"Total Visitors: ${records.length}"`,
    '',
    headers.join(','),
    ...rows.map(r => r.join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Nyabihu_Yego_Attendance_${(districtName || 'NYABIHU').replace(/\s+/g, '_')}_${range.startDate}_to_${range.endDate}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportSummaryToCSV(
  summaries: ServiceAttendanceSummary[],
  totalVisits: number,
  maleVisits: number,
  femaleVisits: number,
  districtName: string,
  range: PeriodDateRange
) {
  const headers = ['Service Name', 'Male Visits', 'Female Visits', 'Total Visits', 'Percentage Share (%)'];
  
  const rows = summaries.map(s => [
    `"${s.serviceName.replace(/"/g, '""')}"`,
    s.maleCount,
    s.femaleCount,
    s.totalCount,
    `${s.percentage}%`
  ]);

  rows.push([
    '"TOTAL"',
    maleVisits,
    femaleVisits,
    totalVisits,
    '100.0%'
  ]);

  const csvContent = '\uFEFF' + [
    `"NYABIHU YEGO CENTER - ATTENDANCE REPORT SUMMARY"`,
    `"District: ${districtName || 'NYABIHU DISTRICT'}"`,
    `"Period: ${range.label} (${range.startDate} to ${range.endDate})"`,
    `"Exported Date: ${new Date().toISOString()}"`,
    '',
    headers.join(','),
    ...rows.map(r => r.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Nyabihu_Yego_Summary_${(districtName || 'NYABIHU').replace(/\s+/g, '_')}_${range.startDate}_to_${range.endDate}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
