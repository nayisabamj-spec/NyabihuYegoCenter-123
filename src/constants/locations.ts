export const DEFAULT_DISTRICT = 'NYABIHU';

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

export interface DistrictGroup {
  province: string;
  districts: string[];
}

export const RWANDA_DISTRICT_GROUPS: DistrictGroup[] = [
  {
    province: 'Western Province (Intara y\'Iburengerazuba)',
    districts: ['Nyabihu (Main Center)', 'Rubavu', 'Ngororero', 'Rutsiro', 'Karongi', 'Nyamasheke', 'Rusizi'],
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
