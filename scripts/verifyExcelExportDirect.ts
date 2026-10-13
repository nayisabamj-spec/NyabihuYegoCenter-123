import ExcelJS from 'exceljs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, terminate } from 'firebase/firestore';
import { firebaseConfig } from '../src/firebase/config';
import { AttendanceRecord } from '../src/types';

async function verifyExcelExportDirect() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const attendanceColl = collection(db, 'attendance');

  const snapshot = await getDocs(attendanceColl);
  const allDocs: AttendanceRecord[] = [];
  snapshot.forEach(d => allDocs.push({ ...d.data(), id: d.id } as AttendanceRecord));

  console.log(`Fetched ${allDocs.length} records from Firestore for Excel export verification.`);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Nyabihu YEGO Attendance System';
  workbook.lastModifiedBy = 'Nyabihu YEGO Attendance System';
  workbook.created = new Date();
  workbook.modified = new Date();

  // 1. Detailed sheet
  const ws = workbook.addWorksheet('Attendance Register (Urutonde)');
  
  // Headers
  ws.addRow(['No.', 'Full Name (Amazina)', 'Sex (Igitsina)', 'Service (Serivisi)', 'District (Akarere)', 'Sector (Umurenge)', 'Cell (Akagari)', 'Village (Umudugudu)', 'Phone Number (Telefoni)', 'National ID (Indangamuntu)', 'Attendance Date (Itariki)', 'Attendance Time (Isaha)']);

  allDocs.forEach((rec, idx) => {
    ws.addRow([
      idx + 1,
      rec.personName || '',
      rec.sex || '',
      rec.serviceNameSnapshot || '',
      rec.districtName || 'Nyabihu District',
      rec.sector || '',
      rec.cell || '',
      rec.village || '',
      rec.phoneNumber ? String(rec.phoneNumber) : '',
      rec.nationalId ? String(rec.nationalId) : '',
      rec.attendanceDate || '',
      rec.attendanceTime || '',
    ]);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  console.log(`✅ Excel Workbook created successfully!`);
  console.log(`   - Total sheets: ${workbook.worksheets.length}`);
  console.log(`   - Register Sheet row count (including header): ${ws.rowCount}`);
  console.log(`   - Data rows: ${ws.rowCount - 1} (Matches live Firestore: ${ws.rowCount - 1 === allDocs.length})`);
  console.log(`   - Export file buffer size: ${(buffer.byteLength / (1024 * 1024)).toFixed(2)} MB`);

  // Spot-check row 10 and row 1000
  const row10 = ws.getRow(11);
  console.log(`   - Sample Data Row 10: Name=${row10.getCell(2).value}, Phone="${row10.getCell(9).value}" (type=${typeof row10.getCell(9).value}), NID="${row10.getCell(10).value}" (type=${typeof row10.getCell(10).value})`);

  const row1000 = ws.getRow(1001);
  console.log(`   - Sample Data Row 1000: Name=${row1000.getCell(2).value}, Phone="${row1000.getCell(9).value}" (type=${typeof row1000.getCell(9).value}), NID="${row1000.getCell(10).value}" (type=${typeof row1000.getCell(10).value})`);

  await terminate(db);
}

verifyExcelExportDirect().catch(console.error);
