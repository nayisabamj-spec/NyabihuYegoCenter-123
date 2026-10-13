import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, getCountFromServer, terminate } from 'firebase/firestore';
import { firebaseConfig } from '../src/firebase/config';

async function spotCheckDates() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const attendanceColl = collection(db, 'attendance');

  // Check late 2025: 2025-11-01 to 2025-12-31
  const qLate2025 = query(attendanceColl, where('attendanceDate', '>=', '2025-11-01'), where('attendanceDate', '<=', '2025-12-31'));
  const snapLate2025 = await getCountFromServer(qLate2025);
  console.log(`Date Spot-check [Late 2025: 2025-11-01 to 2025-12-31]: ${snapLate2025.data().count} records found.`);

  // Check mid 2026 (Range 2): 2026-07-01 to 2026-08-30
  const qMid2026 = query(attendanceColl, where('attendanceDate', '>=', '2026-07-01'), where('attendanceDate', '<=', '2026-08-30'));
  const snapMid2026 = await getCountFromServer(qMid2026);
  console.log(`Date Spot-check [Mid 2026 / Range 2: 2026-07-01 to 2026-08-30]: ${snapMid2026.data().count} records found.`);

  // Check pre-existing organic records
  const qOrganic = query(attendanceColl, where('isBulkGenerated', '!=', true));
  const snapOrganic = await getCountFromServer(qOrganic);
  console.log(`Organic pre-existing records (isBulkGenerated != true): ${snapOrganic.data().count} records found.`);

  await terminate(db);
}

spotCheckDates().catch(console.error);
