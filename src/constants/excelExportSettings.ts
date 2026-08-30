import { BRAND_CONFIG } from './branding';

export type ExcelColumnKey =
  | 'no'
  | 'personName'
  | 'sex'
  | 'serviceName'
  | 'districtName'
  | 'sector'
  | 'cell'
  | 'village'
  | 'phoneNumber'
  | 'nationalId';

export interface ExcelColumnDefinition {
  key: ExcelColumnKey;
  label: string;
  labelKinyarwanda: string;
  exportHeader: string;
  required?: boolean; // locked to always enabled (e.g. 'no' and 'personName')
  sensitive?: boolean; // sensitive personal data (e.g. 'nationalId')
  defaultEnabled: boolean;
  width: number;
}

export const ALL_EXCEL_COLUMNS: ExcelColumnDefinition[] = [
  {
    key: 'no',
    label: 'No.',
    labelKinyarwanda: 'Nimero',
    exportHeader: 'No.',
    required: true,
    defaultEnabled: true,
    width: 6,
  },
  {
    key: 'personName',
    label: 'Full Name',
    labelKinyarwanda: 'Amazina',
    exportHeader: 'Full Name (Amazina)',
    required: true,
    defaultEnabled: true,
    width: 26,
  },
  {
    key: 'sex',
    label: 'Sex',
    labelKinyarwanda: 'Igitsina',
    exportHeader: 'Sex (Igitsina)',
    required: false,
    defaultEnabled: true,
    width: 14,
  },
  {
    key: 'serviceName',
    label: 'Service Requested',
    labelKinyarwanda: 'Serivisi Yahawe',
    exportHeader: 'Service Requested (Serivisi)',
    required: false,
    defaultEnabled: true,
    width: 28,
  },
  {
    key: 'districtName',
    label: 'District',
    labelKinyarwanda: 'Akarere',
    exportHeader: 'District (Akarere)',
    required: false,
    defaultEnabled: true,
    width: 16,
  },
  {
    key: 'sector',
    label: 'Sector',
    labelKinyarwanda: 'Umurenge',
    exportHeader: 'Sector (Umurenge)',
    required: false,
    defaultEnabled: true,
    width: 16,
  },
  {
    key: 'cell',
    label: 'Cell',
    labelKinyarwanda: 'Akagari',
    exportHeader: 'Cell (Akagari)',
    required: false,
    defaultEnabled: true,
    width: 16,
  },
  {
    key: 'village',
    label: 'Village',
    labelKinyarwanda: 'Umudugudu',
    exportHeader: 'Village (Umudugudu)',
    required: false,
    defaultEnabled: true,
    width: 16,
  },
  {
    key: 'phoneNumber',
    label: 'Phone Number',
    labelKinyarwanda: 'Telefoni',
    exportHeader: 'Phone Number (Telefoni)',
    required: false,
    defaultEnabled: true,
    width: 18,
  },
  {
    key: 'nationalId',
    label: 'National ID',
    labelKinyarwanda: 'Indangamuntu',
    exportHeader: 'National ID (Indangamuntu)',
    required: false,
    sensitive: true,
    defaultEnabled: false, // Default to OFF for privacy & sensitive personal data
    width: 22,
  },
];

// Default ordered list of enabled columns (National ID is excluded by default)
export const DEFAULT_EXCEL_EXPORT_COLUMNS: ExcelColumnKey[] = [
  'no',
  'personName',
  'sex',
  'serviceName',
  'districtName',
  'sector',
  'cell',
  'village',
  'phoneNumber',
];

export const DEFAULT_EXCEL_HEADER_ACCENT_COLOR = BRAND_CONFIG.themeColors.primaryNavy || '#23285E';
export const DEFAULT_EXCEL_SECONDARY_COLOR = BRAND_CONFIG.themeColors.secondaryTeal || '#3591C8';
export const DEFAULT_EXCEL_YELLOW_ACCENT_COLOR = BRAND_CONFIG.themeColors.sunYellow || '#E6E65A';
export const DEFAULT_EXCEL_HEADER_TEXT_COLOR = '#FFFFFF';
export const DEFAULT_EXCEL_SUBTITLE = 'Attendance Report — Nyabihu District';
export const DEFAULT_EXCEL_LOGO_URL = BRAND_CONFIG.logoUrl;
export const DEFAULT_INCLUDE_LOGO = true;
export const DEFAULT_INCLUDE_BREAKDOWN_SHEETS = true;
