import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload,
  ClipboardPaste,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Sliders,
  Trash2,
  Database,
  Calendar,
  Clock,
  Layers,
  Sparkles,
  ArrowRight,
  UserCheck,
  ShieldCheck,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { Sex } from '../../types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { NYABIHU_SECTORS } from '../../constants/locations';
import { formatDateYYYYMMDD } from '../../utils/stats';

interface BulkAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ParsedRow {
  originalIndex: number;
  personName: string;
  sex: Sex;
  serviceId?: string;
  serviceName?: string;
  attendanceDate?: string;
  attendanceTime?: string;
  sector?: string;
  cell?: string;
  village?: string;
  phoneNumber?: string;
  nationalId?: string;
  notes?: string;
  isValid: boolean;
  validationReason?: string;
}

// Sample realistic data for testing with 1-click
const SAMPLE_PASTE_DATA = `Name\tGender\tService\tSector\tPhone\tNational ID
IRADUKUNDA Jean Paul\tMale\tICT & Digital Skills Corner\tMukamira\t0788123456\t1200180012345678
UWASE Aline\tFemale\tJob Corner & Career Advisory\tJenda\t0789234567\t1200270023456789
MUGISHA David\tMale\tYouth Talent & Music Production\tBigogwe\t0788345678\t1199980034567890
INGABIRE Diane\tFemale\tSRH & Youth Friendly Health Clinic\tRambura\t0787456789\t1200370045678901
NIYONZIMA Emmanuel\tMale\tSports & Physical Fitness Program\tRurembo\t0785567890\t1199880056789012
UWIMANA Marie Chantal\tFemale\tMentorship & Life Skills Guidance\tKintobo\t0786678901\t1200070067890123
HAKIZIMANA Faustin\tMale\tVolunteering & Community Outreach\tRugera\t0784789012\t1199780078901234
MUKAMAZIMPAKA Claudine\tFemale\tICT & Digital Skills Corner\tShyira\t0783890123\t1200470089012345`;

export const BulkAttendanceModal: React.FC<BulkAttendanceModalProps> = ({ isOpen, onClose }) => {
  const { services, bulkRecordAttendance } = useApp();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('paste');

  // File Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [rawWorkbook, setRawWorkbook] = useState<XLSX.WorkBook | null>(null);

  // Paste Text State
  const [pasteText, setPasteText] = useState<string>('');

  // Raw Tabular Data (2D array: rows x columns)
  const [matrixData, setMatrixData] = useState<string[][]>([]);
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);

  // Column Mappings (fieldName -> column index, -1 for unmapped)
  const [mapping, setMapping] = useState<{
    nameCol: number;
    sexCol: number;
    serviceCol: number;
    dateCol: number;
    timeCol: number;
    sectorCol: number;
    cellCol: number;
    villageCol: number;
    phoneCol: number;
    nidCol: number;
    notesCol: number;
  }>({
    nameCol: -1,
    sexCol: -1,
    serviceCol: -1,
    dateCol: -1,
    timeCol: -1,
    sectorCol: -1,
    cellCol: -1,
    villageCol: -1,
    phoneCol: -1,
    nidCol: -1,
    notesCol: -1,
  });

  // Batch Defaults
  const [defaultServiceId, setDefaultServiceId] = useState<string>('srv-ict');
  const [defaultDate, setDefaultDate] = useState<string>(formatDateYYYYMMDD(new Date()));
  const [defaultSector, setDefaultSector] = useState<string>('Mukamira');
  const [showAdvancedMapping, setShowAdvancedMapping] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // 1. Process Excel File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        const workbook = XLSX.read(buffer, { type: 'array' });
        setRawWorkbook(workbook);
        setAvailableSheets(workbook.SheetNames);

        // Auto select first sheet (or "Attendance Register" if present)
        const preferredSheet =
          workbook.SheetNames.find((s) => s.toLowerCase().includes('attendance')) ||
          workbook.SheetNames[0];
        setSelectedSheet(preferredSheet);
        parseWorksheet(workbook, preferredSheet);
      } catch (err: any) {
        toast.error('File Read Error', err?.message || 'Could not parse Excel spreadsheet');
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Parse a specific worksheet from the workbook
  const parseWorksheet = (workbook: XLSX.WorkBook, sheetName: string) => {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) return;

    // Convert sheet to 2D array of strings
    const rawData = XLSX.utils.sheet_to_json<string[]>(worksheet, {
      header: 1,
      defval: '',
      blankrows: false,
    });

    if (rawData.length === 0) {
      setMatrixData([]);
      setDetectedHeaders([]);
      return;
    }

    // Find the header row: first row that contains typical column words
    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(rawData.length, 10); i++) {
      const row = rawData[i] || [];
      const rowStr = row.map((c) => String(c).toLowerCase()).join(' ');
      if (
        rowStr.includes('name') ||
        rowStr.includes('amazina') ||
        rowStr.includes('gender') ||
        rowStr.includes('sex') ||
        rowStr.includes('service') ||
        rowStr.includes('gahunda')
      ) {
        headerRowIndex = i;
        break;
      }
    }

    const headers = (rawData[headerRowIndex] || []).map((c, i) => String(c).trim() || `Col ${i + 1}`);
    const rows = rawData.slice(headerRowIndex + 1).map((r) => r.map((c) => String(c || '').trim()));

    setDetectedHeaders(headers);
    setMatrixData(rows);
    autoDetectMappings(headers);
  };

  // 2. Process Pasted Text
  const handlePasteChange = (text: string) => {
    setPasteText(text);
    if (!text.trim()) {
      setMatrixData([]);
      setDetectedHeaders([]);
      return;
    }

    // Split lines
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return;

    // Detect delimiter: tab (\t), comma (,), semicolon (;)
    const firstLine = lines[0];
    let delimiter = '\t';
    if (firstLine.includes('\t')) {
      delimiter = '\t';
    } else if (firstLine.includes(',') && !firstLine.includes('\t')) {
      delimiter = ',';
    } else if (firstLine.includes(';')) {
      delimiter = ';';
    }

    const splitRows = lines.map((line) => line.split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, '')));

    if (splitRows.length === 0) return;

    // Check if line 0 looks like a header
    const firstRowStr = splitRows[0].map((c) => c.toLowerCase()).join(' ');
    const isFirstRowHeader =
      firstRowStr.includes('name') ||
      firstRowStr.includes('amazina') ||
      firstRowStr.includes('izina') ||
      firstRowStr.includes('gender') ||
      firstRowStr.includes('sex') ||
      firstRowStr.includes('gahunda') ||
      firstRowStr.includes('service') ||
      firstRowStr.includes('phone') ||
      firstRowStr.includes('sector');

    if (isFirstRowHeader) {
      const headers = splitRows[0].map((c, i) => c || `Col ${i + 1}`);
      const rows = splitRows.slice(1);
      setDetectedHeaders(headers);
      setMatrixData(rows);
      autoDetectMappings(headers);
    } else {
      // Create generic headers Col 1, Col 2, etc.
      const colCount = Math.max(...splitRows.map((r) => r.length));
      const headers = Array.from({ length: colCount }, (_, i) => `Column ${i + 1}`);
      setDetectedHeaders(headers);
      setMatrixData(splitRows);
      // Fallback heuristics: Col 0 -> Name, Col 1 -> Gender, Col 2 -> Service, Col 3 -> Sector
      setMapping({
        nameCol: 0,
        sexCol: colCount > 1 ? 1 : -1,
        serviceCol: colCount > 2 ? 2 : -1,
        sectorCol: colCount > 3 ? 3 : -1,
        phoneCol: colCount > 4 ? 4 : -1,
        nidCol: colCount > 5 ? 5 : -1,
        dateCol: -1,
        timeCol: -1,
        cellCol: -1,
        villageCol: -1,
        notesCol: -1,
      });
    }
  };

  // Auto-detect mappings from header labels
  const autoDetectMappings = (headers: string[]) => {
    const findCol = (keywords: string[]) => {
      return headers.findIndex((h) => {
        const lower = h.toLowerCase().trim();
        return keywords.some((k) => lower.includes(k));
      });
    };

    const newMapping = {
      nameCol: findCol(['name', 'amazina', 'izina', 'person', 'attendee', 'visitor', 'nom']),
      sexCol: findCol(['sex', 'gender', 'igitsina', 'sexe', 'genre']),
      serviceCol: findCol(['service', 'gahunda', 'program', 'umurimo', 'activity']),
      dateCol: findCol(['date', 'itariki', 'day', 'jour']),
      timeCol: findCol(['time', 'isaha', 'hour', 'heure']),
      sectorCol: findCol(['sector', 'umurenge', 'location', 'akarere']),
      cellCol: findCol(['cell', 'akagari']),
      villageCol: findCol(['village', 'umudugudu']),
      phoneCol: findCol(['phone', 'tel', 'telefoni', 'telephone', 'mobile']),
      nidCol: findCol(['national id', 'nid', 'indangamuntu', 'id card', 'cni', 'id']),
      notesCol: findCol(['notes', 'observation', 'icyitonderwa', 'comment', 'remarks']),
    };

    // If name wasn't detected by keyword, default to column 0
    if (newMapping.nameCol === -1 && headers.length > 0) {
      newMapping.nameCol = 0;
    }

    setMapping(newMapping);
  };

  // Helper to normalize gender
  const parseGender = (raw?: string): Sex => {
    if (!raw) return 'Male';
    const clean = raw.trim().toLowerCase();
    if (
      clean.startsWith('f') ||
      clean.includes('gore') ||
      clean.includes('femme') ||
      clean.includes('girl') ||
      clean.includes('umugore') ||
      clean.includes('umukobwa')
    ) {
      return 'Female';
    }
    return 'Male';
  };

  // Helper to match service name to ID
  const parseService = (raw?: string): { id: string; name: string } => {
    const defaultSrv = services.find((s) => s.id === defaultServiceId) || services[0] || {
      id: 'srv-ict',
      name: 'ICT & Digital Skills Corner',
    };

    if (!raw || !raw.trim()) {
      return { id: defaultSrv.id, name: defaultSrv.name };
    }

    const clean = raw.trim().toLowerCase();

    // Match against known services
    for (const s of services) {
      const sName = s.name.toLowerCase();
      if (sName.includes(clean) || clean.includes(sName)) {
        return { id: s.id, name: s.name };
      }
    }

    // Keyword heuristics
    if (clean.includes('ict') || clean.includes('computer') || clean.includes('digital') || clean.includes('it')) {
      const found = services.find((s) => s.id.includes('ict'));
      if (found) return { id: found.id, name: found.name };
    }
    if (clean.includes('job') || clean.includes('employment') || clean.includes('career') || clean.includes('work')) {
      const found = services.find((s) => s.id.includes('job'));
      if (found) return { id: found.id, name: found.name };
    }
    if (clean.includes('srh') || clean.includes('health') || clean.includes('clinic') || clean.includes('medical')) {
      const found = services.find((s) => s.id.includes('srh') || s.id.includes('health'));
      if (found) return { id: found.id, name: found.name };
    }
    if (clean.includes('sport') || clean.includes('football') || clean.includes('basketball') || clean.includes('fitness')) {
      const found = services.find((s) => s.id.includes('sports'));
      if (found) return { id: found.id, name: found.name };
    }
    if (clean.includes('music') || clean.includes('talent') || clean.includes('art') || clean.includes('studio')) {
      const found = services.find((s) => s.id.includes('talent') || s.id.includes('music'));
      if (found) return { id: found.id, name: found.name };
    }
    if (clean.includes('mentor') || clean.includes('life') || clean.includes('guidance') || clean.includes('counsel')) {
      const found = services.find((s) => s.id.includes('mentor') || s.id.includes('counsel'));
      if (found) return { id: found.id, name: found.name };
    }
    if (clean.includes('volunteer') || clean.includes('outreach') || clean.includes('community')) {
      const found = services.find((s) => s.id.includes('volunteer') || s.id.includes('outreach'));
      if (found) return { id: found.id, name: found.name };
    }

    // Fallback: use raw name with default service ID
    return { id: defaultSrv.id, name: raw.trim() || defaultSrv.name };
  };

  // Helper to parse date
  const parseDate = (raw?: string): string => {
    if (!raw || !raw.trim()) return defaultDate;
    const clean = raw.trim();

    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;

    // DD/MM/YYYY or DD-MM-YYYY
    const dmy = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (dmy) {
      const day = dmy[1].padStart(2, '0');
      const month = dmy[2].padStart(2, '0');
      const year = dmy[3];
      return `${year}-${month}-${day}`;
    }

    // Try Date parse
    const parsed = new Date(clean);
    if (!isNaN(parsed.getTime())) {
      return formatDateYYYYMMDD(parsed);
    }

    return defaultDate;
  };

  // Clean Rwandan National ID
  const parseNid = (raw?: string): string => {
    if (!raw) return '';
    return raw.replace(/[^0-9]/g, '').trim();
  };

  // Clean Rwandan Phone
  const parsePhone = (raw?: string): string => {
    if (!raw) return '';
    return raw.trim();
  };

  // 3. Transform Matrix Data into Parsed Attendance Rows
  const parsedRecords: ParsedRow[] = useMemo(() => {
    if (matrixData.length === 0 || mapping.nameCol === -1) return [];

    return matrixData.map((row, index) => {
      const nameVal = (row[mapping.nameCol] || '').trim();
      const sexVal = mapping.sexCol !== -1 ? row[mapping.sexCol] : '';
      const serviceVal = mapping.serviceCol !== -1 ? row[mapping.serviceCol] : '';
      const dateVal = mapping.dateCol !== -1 ? row[mapping.dateCol] : '';
      const timeVal = mapping.timeCol !== -1 ? row[mapping.timeCol] : '';
      const sectorVal = mapping.sectorCol !== -1 ? row[mapping.sectorCol] : '';
      const cellVal = mapping.cellCol !== -1 ? row[mapping.cellCol] : '';
      const villageVal = mapping.villageCol !== -1 ? row[mapping.villageCol] : '';
      const phoneVal = mapping.phoneCol !== -1 ? row[mapping.phoneCol] : '';
      const nidVal = mapping.nidCol !== -1 ? row[mapping.nidCol] : '';
      const notesVal = mapping.notesCol !== -1 ? row[mapping.notesCol] : '';

      const isValid = Boolean(nameVal && nameVal.length >= 2);
      const srv = parseService(serviceVal);

      return {
        originalIndex: index + 1,
        personName: nameVal,
        sex: parseGender(sexVal),
        serviceId: srv.id,
        serviceName: srv.name,
        attendanceDate: parseDate(dateVal),
        attendanceTime: timeVal || undefined,
        sector: sectorVal?.trim() || defaultSector,
        cell: cellVal?.trim() || '',
        village: villageVal?.trim() || '',
        phoneNumber: parsePhone(phoneVal),
        nationalId: parseNid(nidVal),
        notes: notesVal?.trim() || '',
        isValid,
        validationReason: isValid ? undefined : 'Missing or invalid attendee name',
      };
    });
  }, [matrixData, mapping, defaultServiceId, defaultDate, defaultSector, services]);

  const validRecords = useMemo(() => parsedRecords.filter((r) => r.isValid), [parsedRecords]);
  const invalidCount = parsedRecords.length - validRecords.length;
  const femaleCount = validRecords.filter((r) => r.sex === 'Female').length;
  const maleCount = validRecords.filter((r) => r.sex === 'Male').length;

  // 4. Submit Bulk Attendance
  const handleBulkSubmit = async () => {
    if (validRecords.length === 0) {
      toast.warning('No Valid Records', 'Please provide rows with attendee names to record.');
      return;
    }

    setIsSubmitting(true);
    try {
      const recordsToInsert = validRecords.map((r) => ({
        personName: r.personName,
        sex: r.sex,
        serviceId: r.serviceId || defaultServiceId,
        serviceNameSnapshot: r.serviceName,
        attendanceDate: r.attendanceDate || defaultDate,
        attendanceTime: r.attendanceTime,
        district: 'NYABIHU',
        sector: r.sector || defaultSector,
        cell: r.cell,
        village: r.village,
        phoneNumber: r.phoneNumber,
        nationalId: r.nationalId,
        notes: r.notes || (activeTab === 'upload' ? `Excel import (${selectedFileName})` : 'Pasted clipboard import'),
        importSource: activeTab === 'upload' ? ('excel_file' as const) : ('clipboard_paste' as const),
      }));

      // Call bulkRecordAttendance with saveToFirebase = false (ZERO Firebase writes!)
      const result = await bulkRecordAttendance(recordsToInsert, { saveToFirebase: false });

      if (result.success) {
        toast.success(
          `${result.count} Visits Recorded in Bulk`,
          'Records are instantly active in your Attendance Register, Dashboard, Reports, and Excel export.'
        );
        onClose();
      } else {
        toast.error('Bulk Recording Error', result.error || 'Failed to save bulk records');
      }
    } catch (err: any) {
      toast.error('Error', err?.message || 'Unexpected error while recording bulk visits');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setMatrixData([]);
    setDetectedHeaders([]);
    setSelectedFileName(null);
    setPasteText('');
    setRawWorkbook(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Record Attendance"
      subtitle="Upload an Excel (.xlsx, .csv) spreadsheet or paste copied table rows to record visits in bulk without saving to Firebase."
      maxWidth="3xl"
    >
      <div className="space-y-5 max-h-[80vh] overflow-y-auto pr-1">
        {/* Storage Guarantee Banner */}
        <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-emerald-950 flex items-center gap-1.5">
              <span>Local Offline Storage Mode (Active)</span>
              <span className="px-1.5 py-0.5 bg-emerald-200 text-emerald-900 rounded text-[10px] uppercase tracking-wide font-extrabold">
                Zero Firebase Writes
              </span>
            </p>
            <p className="text-emerald-800 text-[11px] mt-0.5">
              These records are immediately integrated into your <strong>Attendance Register</strong>,{' '}
              <strong>Dashboard KPIs</strong>, <strong>Service Analytics</strong>, and <strong>Excel Export</strong> without
              consuming Firestore quotas.
            </p>
          </div>
        </div>

        {/* Input Method Switcher Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'paste'
                ? 'bg-[#23285E] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <ClipboardPaste className="w-4 h-4" />
            <span>Copy & Paste Data</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-[#23285E] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload Excel File (.xlsx, .csv)</span>
          </button>

          {matrixData.length > 0 && (
            <button
              type="button"
              onClick={handleReset}
              className="ml-auto text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Reset Data
            </button>
          )}
        </div>

        {/* Tab 1: Upload Excel File */}
        {activeTab === 'upload' && (
          <div className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-[#3591C8] bg-slate-50 hover:bg-sky-50/40 rounded-2xl p-6 text-center cursor-pointer transition-all group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-white shadow-xs border border-slate-200 flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="text-sm font-bold text-[#23285E]">
                {selectedFileName ? selectedFileName : 'Click or Drag & Drop Excel File Here'}
              </p>
              <p className="text-xs text-slate-500 mt-1">Supports Microsoft Excel (.xlsx, .xls) and CSV files</p>
              <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#3591C8] font-bold">
                <Upload className="w-3.5 h-3.5" />
                <span>{selectedFileName ? 'Choose a different file' : 'Browse from computer'}</span>
              </div>
            </div>

            {/* Sheet Selector if multiple sheets exist */}
            {availableSheets.length > 1 && (
              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <Layers className="w-4 h-4 text-[#3591C8] shrink-0" />
                <span className="font-semibold text-slate-700">Select Worksheet:</span>
                <select
                  value={selectedSheet}
                  onChange={(e) => {
                    setSelectedSheet(e.target.value);
                    if (rawWorkbook) parseWorksheet(rawWorkbook, e.target.value);
                  }}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-[#1F222C] focus:ring-2 focus:ring-[#3591C8]"
                >
                  {availableSheets.map((sh) => (
                    <option key={sh} value={sh}>
                      {sh}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Copy & Paste Data */}
        {activeTab === 'paste' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                Paste Excel or Google Sheets Cells (Ctrl + V):
              </label>
              <button
                type="button"
                onClick={() => handlePasteChange(SAMPLE_PASTE_DATA)}
                className="text-xs font-bold text-[#3591C8] hover:text-[#23285E] flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-sky-50 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Load Sample Nyabihu Data
              </button>
            </div>
            <textarea
              rows={5}
              value={pasteText}
              onChange={(e) => handlePasteChange(e.target.value)}
              placeholder="Select rows in Excel or Google Sheets, press Ctrl+C, then click here and press Ctrl+V...&#10;&#10;Example:&#10;IRADUKUNDA Jean Paul	Male	ICT & Digital Skills Corner	Mukamira	0788123456"
              className="w-full font-mono text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3591C8] text-[#1F222C]"
            />
            <p className="text-[11px] text-slate-500">
              Columns separated by Tabs or Commas are automatically parsed. Headers like Name, Gender, Service, Sector,
              Phone, and National ID are automatically matched.
            </p>
          </div>
        )}

        {/* Column Mapping & Batch Defaults (Shown when data is loaded) */}
        {matrixData.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-slate-200">
            {/* Quick Defaults Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Default Service (if unmapped):
                </label>
                <select
                  value={defaultServiceId}
                  onChange={(e) => setDefaultServiceId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Default Date:</label>
                <input
                  type="date"
                  value={defaultDate}
                  onChange={(e) => setDefaultDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Default Sector:</label>
                <select
                  value={defaultSector}
                  onChange={(e) => setDefaultSector(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800"
                >
                  {NYABIHU_SECTORS.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Advanced Column Mapping Accordion Toggle */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAdvancedMapping(!showAdvancedMapping)}
                className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-bold text-slate-700 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-[#3591C8]" />
                  <span>Column Header Mapping ({detectedHeaders.length} columns detected)</span>
                </div>
                {showAdvancedMapping ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showAdvancedMapping && (
                <div className="p-4 bg-white grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs border-t border-slate-200">
                  {/* Name Column */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Person Name <span className="text-rose-500">*</span>:
                    </label>
                    <select
                      value={mapping.nameCol}
                      onChange={(e) => setMapping({ ...mapping, nameCol: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                    >
                      <option value={-1}>-- None --</option>
                      {detectedHeaders.map((h, i) => (
                        <option key={i} value={i}>
                          Col {i + 1}: {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sex Column */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Gender / Sex:</label>
                    <select
                      value={mapping.sexCol}
                      onChange={(e) => setMapping({ ...mapping, sexCol: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                    >
                      <option value={-1}>-- None (Default: Male) --</option>
                      {detectedHeaders.map((h, i) => (
                        <option key={i} value={i}>
                          Col {i + 1}: {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Service Column */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Service / Program:</label>
                    <select
                      value={mapping.serviceCol}
                      onChange={(e) => setMapping({ ...mapping, serviceCol: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                    >
                      <option value={-1}>-- None (Use Default) --</option>
                      {detectedHeaders.map((h, i) => (
                        <option key={i} value={i}>
                          Col {i + 1}: {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sector Column */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Sector (Umurenge):</label>
                    <select
                      value={mapping.sectorCol}
                      onChange={(e) => setMapping({ ...mapping, sectorCol: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                    >
                      <option value={-1}>-- None (Use Default) --</option>
                      {detectedHeaders.map((h, i) => (
                        <option key={i} value={i}>
                          Col {i + 1}: {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Phone Column */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Phone Number:</label>
                    <select
                      value={mapping.phoneCol}
                      onChange={(e) => setMapping({ ...mapping, phoneCol: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                    >
                      <option value={-1}>-- None --</option>
                      {detectedHeaders.map((h, i) => (
                        <option key={i} value={i}>
                          Col {i + 1}: {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* National ID Column */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">National ID (NID):</label>
                    <select
                      value={mapping.nidCol}
                      onChange={(e) => setMapping({ ...mapping, nidCol: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                    >
                      <option value={-1}>-- None --</option>
                      {detectedHeaders.map((h, i) => (
                        <option key={i} value={i}>
                          Col {i + 1}: {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date Column */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Attendance Date:</label>
                    <select
                      value={mapping.dateCol}
                      onChange={(e) => setMapping({ ...mapping, dateCol: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                    >
                      <option value={-1}>-- None (Use Default) --</option>
                      {detectedHeaders.map((h, i) => (
                        <option key={i} value={i}>
                          Col {i + 1}: {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Notes Column */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Notes / Remarks:</label>
                    <select
                      value={mapping.notesCol}
                      onChange={(e) => setMapping({ ...mapping, notesCol: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                    >
                      <option value={-1}>-- None --</option>
                      {detectedHeaders.map((h, i) => (
                        <option key={i} value={i}>
                          Col {i + 1}: {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Stats Summary Bar */}
            <div className="flex items-center justify-between bg-slate-100 p-3 rounded-xl text-xs flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <span className="font-bold text-[#23285E]">
                  Total Rows: <span className="font-black">{matrixData.length}</span>
                </span>
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Valid: {validRecords.length}
                </span>
                {invalidCount > 0 && (
                  <span className="text-amber-700 font-bold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Skipped: {invalidCount}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-blue-700 font-semibold">Male: {maleCount}</span>
                <span className="text-rose-700 font-semibold">Female: {femaleCount}</span>
              </div>
            </div>

            {/* Preview Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="bg-[#23285E] text-white px-4 py-2 flex items-center justify-between text-xs font-bold">
                <span>Preview of Records to be Recorded ({Math.min(parsedRecords.length, 10)} of {parsedRecords.length})</span>
                <span className="text-[10px] text-slate-300">Target District: NYABIHU</span>
              </div>
              <div className="max-h-60 overflow-y-auto overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-700 sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3 font-bold w-10">#</th>
                      <th className="py-2 px-3 font-bold">Person Name</th>
                      <th className="py-2 px-3 font-bold">Gender</th>
                      <th className="py-2 px-3 font-bold">Service Program</th>
                      <th className="py-2 px-3 font-bold">Sector</th>
                      <th className="py-2 px-3 font-bold">Date</th>
                      <th className="py-2 px-3 font-bold">Phone / ID</th>
                      <th className="py-2 px-3 font-bold text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRecords.slice(0, 15).map((r, i) => (
                      <tr key={i} className={r.isValid ? 'hover:bg-slate-50/60' : 'bg-rose-50/40 text-slate-400'}>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-500">{r.originalIndex}</td>
                        <td className="py-2 px-3 font-bold text-[#23285E] whitespace-nowrap">
                          {r.personName || <span className="text-rose-500 italic">Empty Name</span>}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              r.sex === 'Female' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {r.sex}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-700 max-w-[180px] truncate" title={r.serviceName}>
                          {r.serviceName}
                        </td>
                        <td className="py-2 px-3 text-slate-600 whitespace-nowrap">{r.sector}</td>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {r.attendanceDate}
                        </td>
                        <td className="py-2 px-3 text-slate-600 whitespace-nowrap font-mono text-[10px]">
                          {r.phoneNumber || r.nationalId || '-'}
                        </td>
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          {r.isValid ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Ready
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-500" title={r.validationReason}>
                              <AlertCircle className="w-3.5 h-3.5" />
                              Skipped
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer Actions */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="md"
              onClick={handleBulkSubmit}
              loading={isSubmitting}
              disabled={validRecords.length === 0}
              icon={<UserCheck className="w-4 h-4 text-[#E6E65A]" />}
              className="bg-[#23285E] hover:bg-[#1A1E48] text-white font-bold"
            >
              Record All {validRecords.length > 0 ? `${validRecords.length} Visits` : 'Visits'} in Bulk
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
