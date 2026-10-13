import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  getCountFromServer,
  doc,
  writeBatch,
  terminate,
} from 'firebase/firestore';
import { firebaseConfig } from '../src/firebase/config';
import { COMMITTEE_ATTENDANCE_RECORDS } from '../src/data/committeeDataset';
import { DEFAULT_SERVICES } from '../src/data/initialData';
import { AttendanceRecord } from '../src/types';

async function performAudit() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const attendanceColl = collection(db, 'attendance');

  console.log('--- EXECUTING LIVE GROUND-TRUTH FIRESTORE AUDIT ---');

  // Total count
  const totalCountSnap = await getCountFromServer(attendanceColl);
  const totalCount = totalCountSnap.data().count;

  // Count where isBulkGenerated == true
  const bulkQuery = query(attendanceColl, where('isBulkGenerated', '==', true));
  const bulkCountSnap = await getCountFromServer(bulkQuery);
  const bulkCount = bulkCountSnap.data().count;

  console.log(`Live Firestore Total Attendance Docs: ${totalCount}`);
  console.log(`Live Firestore isBulkGenerated == true Docs: ${bulkCount}`);
  console.log(`Organic / Pre-existing Docs: ${totalCount - bulkCount}`);

  await terminate(db);
}

performAudit().catch(console.error);
