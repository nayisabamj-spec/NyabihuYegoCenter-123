import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  terminate,
} from 'firebase/firestore';
import { firebaseConfig } from '../src/firebase/config';
import { AttendanceRecord } from '../src/types';

async function checkVisitorDistinctServices() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const attendanceColl = collection(db, 'attendance');

  const q = query(attendanceColl, where('isBulkGenerated', '==', true));
  const snap = await getDocs(q);

  // Group by document ID pattern: rec-gen-${timestamp}-${visitorIndex}-${serviceNum}-${random}
  // Extract visitorIndex from doc.id
  const visitorMap = new Map<string, AttendanceRecord[]>();

  snap.forEach(docSnap => {
    const data = { ...docSnap.data(), id: docSnap.id } as AttendanceRecord;
    const parts = docSnap.id.split('-');
    // rec-gen-<timestamp>-<visitorIndex>-<serviceNum>-<random>
    const visitorIndex = parts[3]; // e.g. 1, 2, ... 1694
    if (!visitorMap.has(visitorIndex)) {
      visitorMap.set(visitorIndex, []);
    }
    visitorMap.get(visitorIndex)!.push(data);
  });

  console.log(`Total visitor groups by original generation index: ${visitorMap.size}`);

  let duplicateServicesFound = 0;
  let nonFourRecordsFound = 0;
  let range1Total = 0;
  let range2Total = 0;

  visitorMap.forEach((records, visitorIndex) => {
    if (records.length !== 4) {
      nonFourRecordsFound++;
      console.log(`Visitor ${visitorIndex} has ${records.length} records instead of 4`);
    }
    const services = new Set(records.map(r => r.serviceId));
    if (services.size !== records.length) {
      duplicateServicesFound++;
      console.log(`Visitor ${visitorIndex} (${records[0].personName}) has duplicate services:`, records.map(r => r.serviceNameSnapshot));
    }

    const r1 = records.filter(r => r.attendanceDate >= '2025-07-01' && r.attendanceDate <= '2026-06-30').length;
    const r2 = records.filter(r => r.attendanceDate >= '2026-07-01' && r.attendanceDate <= '2026-09-01').length;
    range1Total += r1;
    range2Total += r2;

    if (r1 !== 3 || r2 !== 1) {
      console.log(`Visitor ${visitorIndex} date split mismatch: ${r1} in Range 1, ${r2} in Range 2`);
    }
  });

  console.log(`\n--- VISITOR INTEGRITY VERIFICATION ---`);
  console.log(`Total Visitors: ${visitorMap.size} (Expected: 1694)`);
  console.log(`Visitors with != 4 records: ${nonFourRecordsFound}`);
  console.log(`Visitors with duplicate services: ${duplicateServicesFound}`);
  console.log(`Range 1 total: ${range1Total} (Expected: 5082, exactly 3 per visitor)`);
  console.log(`Range 2 total: ${range2Total} (Expected: 1694, exactly 1 per visitor)`);

  await terminate(db);
}

checkVisitorDistinctServices().catch(console.error);
