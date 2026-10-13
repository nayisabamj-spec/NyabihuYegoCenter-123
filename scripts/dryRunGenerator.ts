import fs from 'fs';
import path from 'path';
import { COMMITTEE_ATTENDANCE_RECORDS } from '../src/data/committeeDataset';
import { DEFAULT_SERVICES } from '../src/data/initialData';
import { AttendanceRecord, Sex } from '../src/types';

// Services list directly from live configuration
const ACTIVE_SERVICES = DEFAULT_SERVICES.map(s => ({
  id: s.id,
  name: s.name,
}));

// Date helper functions
function getRandomDateInRange(startDateStr: string, endDateStr: string): string {
  const start = new Date(startDateStr + 'T00:00:00Z').getTime();
  const end = new Date(endDateStr + 'T23:59:59Z').getTime();
  const randomTime = start + Math.random() * (end - start);
  const d = new Date(randomTime);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getRandomTime(): string {
  // Operating hours 08:00 to 17:00
  const hour = Math.floor(Math.random() * 10) + 8; // 8 to 17
  const minute = Math.floor(Math.random() * 60);
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

// Deterministic or seeded shuffle helper for selecting 4 distinct services
function getFourDistinctServices(): Array<{ id: string; name: string }> {
  const shuffled = [...ACTIVE_SERVICES].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 4);
}

export function generateAllRecords() {
  const sourceVisitors = COMMITTEE_ATTENDANCE_RECORDS;
  const generatedRecords: AttendanceRecord[] = [];

  const RANGE_1_START = '2025-07-01';
  const RANGE_1_END = '2026-06-30';
  const RANGE_2_START = '2026-07-01';
  const RANGE_2_END = '2026-08-30'; // Today

  sourceVisitors.forEach((visitor, visitorIndex) => {
    // Select 4 unique services for this visitor
    const chosenServices = getFourDistinctServices();

    // Generate 3 records in Range 1 (2025-07-01 to 2026-06-30)
    for (let i = 0; i < 3; i++) {
      const srv = chosenServices[i];
      const attDate = getRandomDateInRange(RANGE_1_START, RANGE_1_END);
      const attTime = getRandomTime();
      const uniqueSuffix = Math.random().toString(36).substring(2, 8);
      const recId = `rec-gen-${Date.now()}-${visitorIndex + 1}-${i + 1}-${uniqueSuffix}`;
      
      const recordIsoTime = `${attDate}T${attTime}:00.000Z`;

      const rec: AttendanceRecord = {
        id: recId,
        districtId: 'nyabihu',
        districtName: 'Nyabihu District',
        adminId: 'admin_nyabihu_committee',
        recordedBy: 'Nyabihu Youth Center Administration',
        personName: visitor.personName.trim(),
        sex: (visitor.sex === 'Female' ? 'Female' : 'Male') as Sex,
        serviceId: srv.id,
        serviceNameSnapshot: srv.name,
        sector: visitor.sector || 'Mukamira',
        cell: visitor.cell || '',
        village: visitor.village || '',
        phoneNumber: visitor.phoneNumber ? String(visitor.phoneNumber) : '',
        nationalId: visitor.nationalId ? String(visitor.nationalId) : '',
        attendanceDate: attDate,
        attendanceTime: attTime,
        isBulkGenerated: true,
        notes: `Multi-Service Attendance (${srv.name})`,
        createdAt: recordIsoTime,
        updatedAt: recordIsoTime,
      };

      generatedRecords.push(rec);
    }

    // Generate 1 record in Range 2 (2026-07-01 to 2026-08-30)
    {
      const srv = chosenServices[3];
      const attDate = getRandomDateInRange(RANGE_2_START, RANGE_2_END);
      const attTime = getRandomTime();
      const uniqueSuffix = Math.random().toString(36).substring(2, 8);
      const recId = `rec-gen-${Date.now()}-${visitorIndex + 1}-4-${uniqueSuffix}`;
      
      const recordIsoTime = `${attDate}T${attTime}:00.000Z`;

      const rec: AttendanceRecord = {
        id: recId,
        districtId: 'nyabihu',
        districtName: 'Nyabihu District',
        adminId: 'admin_nyabihu_committee',
        recordedBy: 'Nyabihu Youth Center Administration',
        personName: visitor.personName.trim(),
        sex: (visitor.sex === 'Female' ? 'Female' : 'Male') as Sex,
        serviceId: srv.id,
        serviceNameSnapshot: srv.name,
        sector: visitor.sector || 'Mukamira',
        cell: visitor.cell || '',
        village: visitor.village || '',
        phoneNumber: visitor.phoneNumber ? String(visitor.phoneNumber) : '',
        nationalId: visitor.nationalId ? String(visitor.nationalId) : '',
        attendanceDate: attDate,
        attendanceTime: attTime,
        isBulkGenerated: true,
        notes: `Multi-Service Attendance (${srv.name})`,
        createdAt: recordIsoTime,
        updatedAt: recordIsoTime,
      };

      generatedRecords.push(rec);
    }
  });

  return {
    sourceVisitorsCount: sourceVisitors.length,
    generatedRecords,
  };
}

// Run dry-run and export preview
const result = generateAllRecords();
const total = result.generatedRecords.length;

let range1Count = 0;
let range2Count = 0;
const serviceDistribution: Record<string, number> = {};

// Verification checks
let duplicateServiceViolations = 0;
const visitorServiceMap = new Map<number, Set<string>>();

result.generatedRecords.forEach((rec, idx) => {
  const visitorIdx = Math.floor(idx / 4);
  if (!visitorServiceMap.has(visitorIdx)) {
    visitorServiceMap.set(visitorIdx, new Set());
  }
  const servicesSet = visitorServiceMap.get(visitorIdx)!;
  if (servicesSet.has(rec.serviceId)) {
    duplicateServiceViolations++;
  }
  servicesSet.add(rec.serviceId);

  if (rec.attendanceDate >= '2025-07-01' && rec.attendanceDate <= '2026-06-30') {
    range1Count++;
  } else if (rec.attendanceDate >= '2026-07-01' && rec.attendanceDate <= '2026-08-30') {
    range2Count++;
  }

  serviceDistribution[rec.serviceNameSnapshot] = (serviceDistribution[rec.serviceNameSnapshot] || 0) + 1;
});

const previewPath = path.join(process.cwd(), 'scripts', 'dry_run_preview.json');
fs.mkdirSync(path.dirname(previewPath), { recursive: true });
fs.writeFileSync(
  previewPath,
  JSON.stringify(
    {
      summary: {
        totalVisitors: result.sourceVisitorsCount,
        totalRecordsGenerated: total,
        expectedTotal: 1694 * 4,
        range1Count_2025_07_01_to_2026_06_30: range1Count,
        range2Count_2026_07_01_to_2026_08_30: range2Count,
        duplicateServiceViolations,
        serviceDistribution,
      },
      first20Records: result.generatedRecords.slice(0, 20),
    },
    null,
    2
  )
);

console.log('DRY RUN GENERATION COMPLETE:');
console.log(`Source visitors: ${result.sourceVisitorsCount}`);
console.log(`Total generated records: ${total}`);
console.log(`Range 1 (01/07/2025 - 30/06/2026): ${range1Count}`);
console.log(`Range 2 (01/07/2026 - 30/08/2026): ${range2Count}`);
console.log(`Duplicate service violations: ${duplicateServiceViolations}`);
console.log('Service distribution:');
Object.entries(serviceDistribution).forEach(([srv, count]) => {
  console.log(`  - ${srv}: ${count} (${((count / total) * 100).toFixed(1)}%)`);
});
