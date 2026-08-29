// Centralized District and Location Configuration for NYABIHU YEGO CENTER
export const ACTIVE_PRODUCTION_DISTRICT_ID = 'nyabihu';
export const ACTIVE_PRODUCTION_DISTRICT_CODE = 'NYABIHU';
export const ACTIVE_PRODUCTION_DISTRICT_NAME = 'Nyabihu District';
export const ACTIVE_PRODUCTION_CENTER_NAME = 'NYABIHU YEGO CENTER';
export const DEFAULT_DISTRICT = ACTIVE_PRODUCTION_DISTRICT_CODE;

export const NYABIHU_SECTORS = [
  'Bigogwe',
  'Jenda',
  'Mukamira',
  'Rambura',
  'Karago',
  'Kabatwa',
  'Jomba',
  'Kintobo',
  'Rugera',
  'Rurembo',
  'Shyira',
  'Muringa',
] as const;

export type NyabihuSector = typeof NYABIHU_SECTORS[number];

export interface DistrictGroup {
  province: string;
  districts: string[];
}

export const RWANDA_DISTRICT_GROUPS: DistrictGroup[] = [
  {
    province: 'Western Province (Intara y\'Iburengerazuba)',
    districts: ['Nyabihu (Active Center)', 'Rubavu', 'Ngororero', 'Rutsiro', 'Karongi', 'Nyamasheke', 'Rusizi'],
  },
  {
    province: 'Northern Province (Intara y\'Amajyaruguru)',
    districts: ['Musanze', 'Gakenke', 'Burera', 'Rulindo', 'Gicumbi'],
  },
  {
    province: 'Kigali City (Umujyi wa Kigali)',
    districts: ['Gasabo', 'Kicukiro', 'Nyarugenge'],
  },
  {
    province: 'Southern Province (Intara y\'Amajyepfo)',
    districts: ['Muhanga', 'Kamonyi', 'Ruhango', 'Nyanza', 'Huye', 'Gisagara', 'Nyamagabe', 'Nyaruguru'],
  },
  {
    province: 'Eastern Province (Intara y\'Iburasirazuba)',
    districts: ['Bugesera', 'Gatsibo', 'Kayonza', 'Kirehe', 'Ngoma', 'Nyagatare', 'Rwamagana'],
  },
];

export const ALL_RWANDA_DISTRICTS = [
  'NYABIHU',
  'Rubavu',
  'Musanze',
  'Ngororero',
  'Rutsiro',
  'Karongi',
  'Nyamasheke',
  'Rusizi',
  'Gakenke',
  'Burera',
  'Rulindo',
  'Gicumbi',
  'Gasabo',
  'Kicukiro',
  'Nyarugenge',
  'Muhanga',
  'Kamonyi',
  'Ruhango',
  'Nyanza',
  'Huye',
  'Gisagara',
  'Nyamagabe',
  'Nyaruguru',
  'Bugesera',
  'Gatsibo',
  'Kayonza',
  'Kirehe',
  'Ngoma',
  'Nyagatare',
  'Rwamagana',
];

/**
 * Normalizes any district identifier variation into a single canonical ID.
 * Nyabihu is the active production center for all operations.
 */
export const normalizeDistrictId = (id?: string | null): string => {
  if (!id) return ACTIVE_PRODUCTION_DISTRICT_ID;
  const clean = id.toLowerCase().trim();
  if (
    clean === 'nyabihu' ||
    clean === 'dist-nyabihu' ||
    clean === 'nya-01' ||
    clean.includes('nyabihu')
  ) {
    return ACTIVE_PRODUCTION_DISTRICT_ID;
  }
  return clean;
};

export const isNyabihuDistrict = (id?: string | null): boolean => {
  return normalizeDistrictId(id) === ACTIVE_PRODUCTION_DISTRICT_ID;
};
