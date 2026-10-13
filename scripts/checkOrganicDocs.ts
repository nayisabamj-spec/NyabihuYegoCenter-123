import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, terminate } from 'firebase/firestore';
import { firebaseConfig } from '../src/firebase/config';

async function checkOrganicDocs() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const attendanceColl = collection(db, 'attendance');

  const snap = await getDocs(attendanceColl);
  let bulkCount = 0;
  let organicCount = 0;

  const organicDocIds: string[] = [];

  snap.forEach(d => {
    const data = d.data();
    if (data.isBulkGenerated === true) {
      bulkCount++;
    } else {
      organicCount++;
      if (organicDocIds.length < 5) {
        organicDocIds.push(d.id);
      }
    }
  });

  console.log(`Direct Scan of all documents in Firestore 'attendance' collection:`);
  console.log(`- Total Documents: ${snap.size}`);
  console.log(`- Bulk Generated (isBulkGenerated === true): ${bulkCount}`);
  console.log(`- Organic / Pre-existing (isBulkGenerated !== true): ${organicCount}`);
  console.log(`- Sample Organic Doc IDs:`, organicDocIds);

  await terminate(db);
}

checkOrganicDocs().catch(console.error);
