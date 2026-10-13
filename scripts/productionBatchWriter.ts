import { initializeApp } from 'firebase/app';
import { getFirestore, doc, writeBatch, collection, getCountFromServer, terminate } from 'firebase/firestore';
import { firebaseConfig } from '../src/firebase/config';
import { generateAllRecords } from './dryRunGenerator';
import { AttendanceRecord } from '../src/types';

// Sanitize helper to remove any undefined values before writing to Firestore
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

export async function runProductionBatchWrite() {
  console.log('--- STARTING PRODUCTION BATCH WRITE TO FIRESTORE ---');
  
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  try {
    const attendanceColl = collection(db, 'attendance');
    const initialCountSnap = await getCountFromServer(attendanceColl);
    const initialDocCount = initialCountSnap.data().count;
    console.log(`Initial attendance document count in Firestore: ${initialDocCount}`);

    console.log('Generating 6,776 attendance records from 1,694 source visitors...');
    const { generatedRecords, sourceVisitorsCount } = generateAllRecords();
    const totalRecords = generatedRecords.length;
    console.log(`Generated ${totalRecords} records for ${sourceVisitorsCount} visitors.`);

    // Batch size: 400 records per Firestore batch (max limit is 500)
    const BATCH_SIZE = 400;
    const totalBatches = Math.ceil(totalRecords / BATCH_SIZE);
    let writtenCount = 0;

    console.log(`Beginning batch commit in ${totalBatches} batches (${BATCH_SIZE} docs/batch)...`);

    for (let b = 0; b < totalBatches; b++) {
      const startIndex = b * BATCH_SIZE;
      const batchChunk = generatedRecords.slice(startIndex, startIndex + BATCH_SIZE);
      const batch = writeBatch(db);

      for (const record of batchChunk) {
        const docRef = doc(db, 'attendance', record.id);
        batch.set(docRef, cleanForFirestore(record));
      }

      await batch.commit();
      writtenCount += batchChunk.length;
      console.log(`Batch ${b + 1} of ${totalBatches} complete (${writtenCount}/${totalRecords} records committed)`);
    }

    console.log('All batches successfully committed to Firestore!');

    // Post-write count verification
    const finalCountSnap = await getCountFromServer(attendanceColl);
    const finalDocCount = finalCountSnap.data().count;
    const netAdded = finalDocCount - initialDocCount;

    console.log('--- POST-WRITE VERIFICATION ---');
    console.log(`Initial document count: ${initialDocCount}`);
    console.log(`Final document count:   ${finalDocCount}`);
    console.log(`Net documents added:    ${netAdded} (Expected: ${totalRecords})`);

    await terminate(db);
    return {
      success: true,
      initialDocCount,
      finalDocCount,
      netAdded,
      totalRecords,
    };
  } catch (err: any) {
    console.error('CRITICAL: Error in batch write operation:', err);
    await terminate(db);
    throw err;
  }
}
