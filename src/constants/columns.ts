import { ColumnDefinition, ColumnsConfig, ColumnKey } from '../types';

export const ALL_COLUMNS: ColumnDefinition[] = [
  // Core Information
  {
    key: 'attendanceDate',
    label: 'Date',
    labelKinyarwanda: 'Itariki',
    category: 'core',
    defaultVisible: true,
    exportHeader: 'Date (YYYY-MM-DD)',
  },
  {
    key: 'personName',
    label: 'Youth Name',
    labelKinyarwanda: 'Amazina y\'Urubyiruko',
    category: 'core',
    defaultVisible: true,
    exportHeader: 'Full Name (Amazina)',
  },
  {
    key: 'sex',
    label: 'Sex / Gender',
    labelKinyarwanda: 'Igitsina (Gabo/Gore)',
    category: 'core',
    defaultVisible: true,
    exportHeader: 'Sex (Igitsina)',
  },
  {
    key: 'serviceName',
    label: 'Service / Program',
    labelKinyarwanda: 'Serivisi Yahawe',
    category: 'core',
    defaultVisible: true,
    exportHeader: 'Service Requested (Serivisi)',
  },

  // Demographics & Contact
  {
    key: 'districtName',
    label: 'District',
    labelKinyarwanda: 'Akarere',
    category: 'demographics',
    defaultVisible: true,
    exportHeader: 'District (Akarere)',
  },
  {
    key: 'sector',
    label: 'Sector',
    labelKinyarwanda: 'Umurenge',
    category: 'demographics',
    defaultVisible: true,
    exportHeader: 'Sector (Umurenge)',
  },
  {
    key: 'cell',
    label: 'Cell',
    labelKinyarwanda: 'Akagari',
    category: 'demographics',
    defaultVisible: true,
    exportHeader: 'Cell (Akagari)',
  },
  {
    key: 'village',
    label: 'Village',
    labelKinyarwanda: 'Umudugudu',
    category: 'demographics',
    defaultVisible: true,
    exportHeader: 'Village (Umudugudu)',
  },
  {
    key: 'phoneNumber',
    label: 'Phone Number',
    labelKinyarwanda: 'Telefoni',
    category: 'demographics',
    defaultVisible: true,
    exportHeader: 'Phone Number (Telefoni)',
  },
  {
    key: 'nationalId',
    label: 'National ID',
    labelKinyarwanda: 'Indangamuntu (16 Digits)',
    category: 'demographics',
    defaultVisible: true,
    exportHeader: 'National ID (Indangamuntu)',
  },
  {
    key: 'email',
    label: 'Email Address',
    labelKinyarwanda: 'Imeri',
    category: 'demographics',
    defaultVisible: false,
    exportHeader: 'Email Address',
  },

  // System & Metadata (Unimportant by default - can be toggled by Admin)
  {
    key: 'attendanceTime',
    label: 'Check-In Time',
    labelKinyarwanda: 'Isaha yo Kwinjira',
    category: 'system',
    defaultVisible: false, // Unimportant by default
    exportHeader: 'Time (HH:MM)',
  },
  {
    key: 'recordId',
    label: 'Record ID',
    labelKinyarwanda: 'Nimero y\'Inyandiko',
    category: 'system',
    defaultVisible: false, // Unimportant by default
    exportHeader: 'Record ID',
  },
  {
    key: 'entryMethod',
    label: 'Entry Method',
    labelKinyarwanda: 'Uburyo bwo Kwiyandikisha',
    category: 'system',
    defaultVisible: false, // Unimportant by default
    exportHeader: 'Entry Method (Kiosk / Staff)',
  },
  {
    key: 'recordedBy',
    label: 'Recorded By',
    labelKinyarwanda: 'Uwanditse Inyandiko',
    category: 'system',
    defaultVisible: false, // Unimportant by default
    exportHeader: 'Recorded By (Staff)',
  },
  {
    key: 'notes',
    label: 'Notes / Purpose',
    labelKinyarwanda: 'Impamvu / Ibisobanuro',
    category: 'system',
    defaultVisible: false, // Unimportant by default
    exportHeader: 'Notes / Purpose',
  },
];

export const DEFAULT_COLUMNS_CONFIG: ColumnsConfig = {
  attendanceDate: true,
  personName: true,
  sex: true,
  serviceName: true,
  districtName: true,
  sector: true,
  cell: true,
  village: true,
  phoneNumber: true,
  nationalId: true,
  email: false,
  attendanceTime: false,
  recordId: false,
  entryMethod: false,
  recordedBy: false,
  notes: false,
};

export const ATTENDANCE_COLS_STORAGE_KEY = 'nyabihu_attendance_columns_config';
export const REPORTS_COLS_STORAGE_KEY = 'nyabihu_reports_columns_config';

export function loadSavedColumnsConfig(storageKey: string): ColumnsConfig {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_COLUMNS_CONFIG, ...parsed };
    }
  } catch (e) {
    console.warn('Error reading saved columns config:', e);
  }
  return { ...DEFAULT_COLUMNS_CONFIG };
}

export function saveColumnsConfig(storageKey: string, config: ColumnsConfig): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(config));
  } catch (e) {
    console.warn('Error saving columns config:', e);
  }
}
