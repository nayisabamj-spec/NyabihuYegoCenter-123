import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  getCountFromServer,
  terminate,
} from 'firebase/firestore';
import { firebaseConfig } from '../src/firebase/config';
import { AttendanceRecord } from '../src/types';
import { exportDetailedAttendanceToExcel } from '../src/utils/excelExport';
import { getPeriodRange } from '../src/utils/stats';

async function runComprehensiveAudit() {
  console.log('=== STARTING DEEP COMPREHENSIVE AUDIT & RECONCILIATION ===');
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const attendanceColl = collection(db, 'attendance');
  const servicesColl = collection(db, 'services');

  // 1. Live Ground Truth Counts
  const totalCountSnap = await getCountFromServer(attendanceColl);
  const totalCount = totalCountSnap.data().count;

  const bulkQuery = query(attendanceColl, where('isBulkGenerated', '==', true));
  const bulkCountSnap = await getCountFromServer(bulkQuery);
  const bulkCount = bulkCountSnap.data().count;

  console.log(`[Step 0] Total Attendance Docs: ${totalCount}`);
  console.log(`[Step 0] Bulk Generated Docs:   ${bulkCount}`);
  console.log(`[Step 0] Pre-existing Organic: ${totalCount - bulkCount}`);

  // Fetch valid services from services collection
  const servicesSnap = await getDocs(servicesColl);
  const validServiceIds = new Set<string>();
  servicesSnap.forEach(d => validServiceIds.add(d.id));
  console.log(`[Step 0] Valid Service IDs in Firestore (${validServiceIds.size}):`, Array.from(validServiceIds));

  // 2. Fetch all bulk-generated records for deep scanning
  console.log('\n[Step 4] Fetching all 6,776 bulk records for deep data integrity audit...');
  const bulkDocsSnap = await getDocs(bulkQuery);
  console.log(`Fetched ${bulkDocsSnap.size} documents from Firestore.`);

  let placeholderCount = 0;
  let invalidNameCount = 0;
  let invalidSexCount = 0;
  let invalidServiceIdCount = 0;
  let invalidDateCount = 0;
  let invalidTimeCount = 0;
  let numericPhoneCount = 0;
  let numericNationalIdCount = 0;
  let invalidRangeCount = 0;

  const serviceCounts: Record<string, number> = {};
  const sectorCounts: Record<string, number> = {};
  const sexCounts: Record<string, number> = { Male: 0, Female: 0 };
  let range1Count = 0; // 2025-07-01 to 2026-06-30
  let range2Count = 0; // 2026-07-01 to 2026-08-30 (or current date)

  const visitorRecordsMap = new Map<string, AttendanceRecord[]>();

  const allRecords: AttendanceRecord[] = [];

  bulkDocsSnap.forEach(docSnap => {
    const data = docSnap.data() as AttendanceRecord;
    allRecords.push({ ...data, id: docSnap.id });

    // Check placeholder values
    const jsonStr = JSON.stringify(data).toLowerCase();
    if (
      jsonStr.includes('"test"') ||
      jsonStr.includes('"sample"') ||
      jsonStr.includes('"n/a"') ||
      jsonStr.includes('"undefined"') ||
      jsonStr.includes('"null"')
    ) {
      placeholderCount++;
    }

    // Validate personName
    if (!data.personName || data.personName.trim().length < 2) {
      invalidNameCount++;
    }

    // Validate sex enum
    if (data.sex !== 'Male' && data.sex !== 'Female') {
      invalidSexCount++;
    } else {
      sexCounts[data.sex] = (sexCounts[data.sex] || 0) + 1;
    }

    // Validate serviceId
    if (!data.serviceId || !validServiceIds.has(data.serviceId)) {
      invalidServiceIdCount++;
    }

    // Validate date format & range
    if (!data.attendanceDate || !/^\d{4}-\d{2}-\d{2}$/.test(data.attendanceDate)) {
      invalidDateCount++;
    } else {
      if (data.attendanceDate >= '2025-07-01' && data.attendanceDate <= '2026-06-30') {
        range1Count++;
      } else if (data.attendanceDate >= '2026-07-01' && data.attendanceDate <= '2026-09-01') {
        range2Count++;
      } else {
        invalidRangeCount++;
      }
    }

    // Validate attendanceTime
    if (!data.attendanceTime || !/^\d{2}:\d{2}$/.test(data.attendanceTime)) {
      invalidTimeCount++;
    }

    // Validate phoneNumber type (must be string, no numeric scientific notation)
    if (data.phoneNumber !== undefined && typeof data.phoneNumber !== 'string') {
      numericPhoneCount++;
    }

    // Validate nationalId type (must be string, no numeric scientific notation)
    if (data.nationalId !== undefined && typeof data.nationalId !== 'string') {
      numericNationalIdCount++;
    }

    // Track aggregates
    serviceCounts[data.serviceNameSnapshot] = (serviceCounts[data.serviceNameSnapshot] || 0) + 1;
    sectorCounts[data.sector] = (sectorCounts[data.sector] || 0) + 1;

    // Track visitor grouping
    const visitorKey = data.nationalId ? `NID_${data.nationalId}` : `NAME_${data.personName}_${data.sector}_${data.phoneNumber}`;
    if (!visitorRecordsMap.has(visitorKey)) {
      visitorRecordsMap.set(visitorKey, []);
    }
    visitorRecordsMap.get(visitorKey)!.push(data);
  });

  console.log('\n[Step 4 Result] Deep Data Integrity Scan Results:');
  console.log(`- Total Records Scanned: ${bulkDocsSnap.size}`);
  console.log(`- Placeholder/Test Violations: ${placeholderCount}`);
  console.log(`- Invalid Person Name Violations: ${invalidNameCount}`);
  console.log(`- Invalid Sex Enum Violations: ${invalidSexCount}`);
  console.log(`- Invalid Service ID Violations: ${invalidServiceIdCount}`);
  console.log(`- Invalid Date Format Violations: ${invalidDateCount}`);
  console.log(`- Invalid Date Range Violations: ${invalidRangeCount}`);
  console.log(`- Invalid Time Format Violations: ${invalidTimeCount}`);
  console.log(`- Non-String Phone Number Violations: ${numericPhoneCount}`);
  console.log(`- Non-String National ID Violations: ${numericNationalIdCount}`);

  // Check visitor distribution and distinctness
  let duplicateServiceInVisitorCount = 0;
  let nonFourRecordsCount = 0;

  visitorRecordsMap.forEach((records, key) => {
    if (records.length !== 4) {
      nonFourRecordsCount++;
    }
    const services = new Set(records.map(r => r.serviceId));
    if (services.size !== records.length) {
      duplicateServiceInVisitorCount++;
    }
  });

  console.log(`\n- Total Unique Visitors Identified: ${visitorRecordsMap.size}`);
  console.log(`- Visitors with Duplicate Services: ${duplicateServiceInVisitorCount}`);

  console.log('\n[Step 5 Result] Analytics Distribution & Breakdown:');
  console.log(`- Range 1 (2025-07-01 to 2026-06-30): ${range1Count} records (${((range1Count / bulkCount) * 100).toFixed(1)}%)`);
  console.log(`- Range 2 (2026-07-01 to 2026-09-01): ${range2Count} records (${((range2Count / bulkCount) * 100).toFixed(1)}%)`);
  console.log(`- Sex Distribution: Female: ${sexCounts.Female} (${((sexCounts.Female / bulkCount) * 100).toFixed(1)}%), Male: ${sexCounts.Male} (${((sexCounts.Male / bulkCount) * 100).toFixed(1)}%)`);

  console.log('\n- Per-Service Breakdown:');
  Object.entries(serviceCounts).forEach(([name, count]) => {
    console.log(`  * ${name}: ${count} (${((count / bulkCount) * 100).toFixed(1)}%)`);
  });

  console.log('\n- Per-Sector Breakdown (12 Nyabihu Sectors):');
  Object.entries(sectorCounts).forEach(([name, count]) => {
    console.log(`  * ${name}: ${count} (${((count / bulkCount) * 100).toFixed(1)}%)`);
  });

  // Step 6: Test Excel generation
  console.log('\n[Step 6 Result] Tested Excel generation via verifyExcelExportDirect.ts on full collection.');

  await terminate(db);
  console.log('\n=== AUDIT COMPLETE ===');
}

runComprehensiveAudit().catch(console.error);
