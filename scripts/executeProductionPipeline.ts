import fs from 'fs';
import path from 'path';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  getCountFromServer,
  doc,
  writeBatch,
  query,
  where,
  terminate,
} from 'firebase/firestore';
import { firebaseConfig } from '../src/firebase/config';
import { generateAllRecords } from './dryRunGenerator';
import { AttendanceRecord } from '../src/types';

// Helper to strip undefined values for Firestore
function cleanForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(cleanForFirestore);
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = cleanForFirestore(value);
    }
  }
  return cleaned;
}

async function run() {
  console.log('=== PHASE 1: CONNECT TO FIRESTORE & BACKUP CURRENT ATTENDANCE COLLECTION ===');
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const attendanceColl = collection(db, 'attendance');

  // 1. Initial count
  const initialCountSnap = await getCountFromServer(attendanceColl);
  const initialDocCount = initialCountSnap.data().count;
  console.log(`Current attendance records in Firestore: ${initialDocCount}`);

  // 2. Fetch all existing records and write to backup JSON
  console.log('Downloading existing attendance records for safety backup...');
  const existingDocsSnap = await getDocs(attendanceColl);
  const backupRecords: any[] = [];
  existingDocsSnap.forEach((d) => {
    backupRecords.push({ id: d.id, ...d.data() });
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), 'backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const backupFile = path.join(backupDir, `attendance_backup_${timestamp}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(backupRecords, null, 2));

  const stats = fs.statSync(backupFile);
  console.log(`✅ Backup successfully saved to: ${backupFile}`);
  console.log(`   Backup record count: ${backupRecords.length} docs (${(stats.size / 1024).toFixed(1)} KB)`);

  // Verify backup is not empty if documents exist
  if (initialDocCount > 0 && backupRecords.length !== initialDocCount) {
    throw new Error(`Backup record count (${backupRecords.length}) does not match server count (${initialDocCount}). Aborting.`);
  }

  console.log('\n=== PHASE 2: GENERATE 6,776 MULTI-SERVICE ATTENDANCE RECORDS ===');
  const { generatedRecords, sourceVisitorsCount } = generateAllRecords();
  const totalRecords = generatedRecords.length;
  console.log(`Generated ${totalRecords} records for ${sourceVisitorsCount} visitors.`);
  console.log(`All records include 'isBulkGenerated: true' flag: ${generatedRecords.every(r => r.isBulkGenerated === true)}`);

  console.log('\n=== PHASE 3: BATCHED FIRESTORE PRODUCTION WRITE (400 records/batch) ===');
  const BATCH_SIZE = 400;
  const totalBatches = Math.ceil(totalRecords / BATCH_SIZE);
  let writtenCount = 0;

  for (let b = 0; b < totalBatches; b++) {
    const startIndex = b * BATCH_SIZE;
    const chunk = generatedRecords.slice(startIndex, startIndex + BATCH_SIZE);
    const batch = writeBatch(db);

    for (const record of chunk) {
      const docRef = doc(db, 'attendance', record.id);
      batch.set(docRef, cleanForFirestore(record));
    }

    await batch.commit();
    writtenCount += chunk.length;
    console.log(`Batch ${b + 1} of ${totalBatches} complete (${writtenCount} of ${totalRecords} committed)`);
  }

  console.log('✅ All batches successfully committed to Firestore!');

  console.log('\n=== PHASE 4: POST-WRITE VERIFICATION ===');
  const finalCountSnap = await getCountFromServer(attendanceColl);
  const finalDocCount = finalCountSnap.data().count;
  const netAdded = finalDocCount - initialDocCount;

  console.log(`Initial document count: ${initialDocCount}`);
  console.log(`Final document count:   ${finalDocCount}`);
  console.log(`Net documents added:    ${netAdded} (Expected: ${totalRecords})`);

  // Spot-check 5 random visitors
  console.log('\n--- SPOT CHECKING 5 RANDOM VISITORS ---');
  const sampleIndices = [12, 145, 532, 988, 1420];
  const sampleVisitors = sampleIndices.map(i => generatedRecords[i * 4].personName);

  for (const name of sampleVisitors) {
    const q = query(attendanceColl, where('personName', '==', name));
    const snap = await getDocs(q);
    const docs = snap.docs.map(d => d.data() as AttendanceRecord);
    const generatedForPerson = docs.filter(d => d.isBulkGenerated);
    const distinctServices = new Set(generatedForPerson.map(d => d.serviceId));
    const range1 = generatedForPerson.filter(d => d.attendanceDate >= '2025-07-01' && d.attendanceDate <= '2026-06-30').length;
    const range2 = generatedForPerson.filter(d => d.attendanceDate >= '2026-07-01' && d.attendanceDate <= '2026-08-30').length;

    console.log(`Visitor: "${name}"`);
    console.log(`  - Total records in DB: ${docs.length} (Bulk generated: ${generatedForPerson.length})`);
    console.log(`  - Distinct services: ${distinctServices.size} of ${generatedForPerson.length} (${Array.from(distinctServices).join(', ')})`);
    console.log(`  - Date distribution: ${range1} in Range 1 (2025-2026), ${range2} in Range 2 (2026-Current)`);
    console.log(`  - isBulkGenerated flag: ${generatedForPerson.every(d => d.isBulkGenerated === true)}`);
  }

  await terminate(db);
  console.log('\n=== COMPLETE: MULTI-SERVICE VISITOR SEEDING FINISHED SUCCESSFULLY ===');
}

run().catch((err) => {
  console.error('CRITICAL EXECUTION ERROR:', err);
  process.exit(1);
});
