import ExcelJS from 'exceljs';
import {
  AttendanceRecord,
  ServiceAttendanceSummary,
  PeriodDateRange,
  UserProfile,
  DashboardStats,
  ColumnsConfig,
  ExportTitlesConfig,
  SystemSettings,
} from '../types';
import { loadSavedExportTitles } from '../constants/exportTitles';
import { BRAND_CONFIG } from '../constants/branding';
import {
  ALL_EXCEL_COLUMNS,
  DEFAULT_EXCEL_EXPORT_COLUMNS,
  DEFAULT_EXCEL_HEADER_ACCENT_COLOR,
  DEFAULT_EXCEL_SECONDARY_COLOR,
  DEFAULT_EXCEL_YELLOW_ACCENT_COLOR,
  DEFAULT_EXCEL_HEADER_TEXT_COLOR,
  DEFAULT_EXCEL_SUBTITLE,
  ExcelColumnDefinition,
} from '../constants/excelExportSettings';
import { NYABIHU_SECTORS } from '../constants/locations';
import { DEFAULT_SERVICES } from '../data/initialData';
import { getOfficialLogoBase64 } from './logoLoader';

interface ExportExcelOptions {
  records: AttendanceRecord[];
  range: PeriodDateRange;
  districtName?: string;
  userProfile?: UserProfile | null;
  stats?: DashboardStats | null;
  serviceBreakdown?: ServiceAttendanceSummary[];
  columnsConfig?: ColumnsConfig;
  customTitles?: Partial<ExportTitlesConfig>;
  settings?: SystemSettings | null;
}

/**
 * Converts a hex color string (#23285E) to an ExcelJS 8-character ARGB string (FF23285E)
 */
function hexToArgb(hex?: string, fallback = 'FF23285E'): string {
  if (!hex) return fallback;
  const clean = hex.replace('#', '').trim();
  if (clean.length === 6) return `FF${clean.toUpperCase()}`;
  if (clean.length === 8) return clean.toUpperCase();
  return fallback;
}

export async function exportDetailedAttendanceToExcel({
  records,
  range,
  districtName = 'NYABIHU DISTRICT',
  userProfile,
  stats,
  serviceBreakdown,
  customTitles,
  settings,
}: ExportExcelOptions): Promise<void> {
  const savedTitles = loadSavedExportTitles();
  const titles: ExportTitlesConfig = {
    ...savedTitles,
    ...customTitles,
  };

  // 1. Resolve Branding values dynamically from Settings (or defaults)
  const effectiveCenterName =
    settings?.centerName?.trim() ||
    titles.reportMainTitle?.trim() ||
    BRAND_CONFIG.name ||
    'NYABIHU YEGO CENTER';

  const effectiveSubtitle =
    settings?.excelSubtitle?.trim() ||
    titles.excelLocationHeader?.trim() ||
    titles.reportSubTitle?.trim() ||
    DEFAULT_EXCEL_SUBTITLE;

  const headerBgHex = settings?.excelHeaderAccentColor?.trim() || DEFAULT_EXCEL_HEADER_ACCENT_COLOR;
  const headerBgArgb = hexToArgb(headerBgHex, 'FF23285E');

  const secondaryColorHex = settings?.excelSecondaryColor?.trim() || DEFAULT_EXCEL_SECONDARY_COLOR;
  const secondaryColorArgb = hexToArgb(secondaryColorHex, 'FF3591C8');

  const yellowAccentHex = settings?.excelYellowAccentColor?.trim() || DEFAULT_EXCEL_YELLOW_ACCENT_COLOR;
  const yellowAccentArgb = hexToArgb(yellowAccentHex, 'FFE6E65A');

  const headerTextHex = settings?.excelHeaderTextColor?.trim() || DEFAULT_EXCEL_HEADER_TEXT_COLOR;
  const headerTextArgb = hexToArgb(headerTextHex, 'FFFFFFFF');

  const shouldIncludeLogo = settings?.includeLogoInExcel !== false;
  const shouldIncludeServiceSheet = settings?.includeServiceBreakdownSheet !== false;
  const shouldIncludeSectorSheet = settings?.includeSectorBreakdownSheet !== false;

  const formattedDistrict = districtName.toUpperCase().includes('NYABIHU')
    ? 'NYABIHU DISTRICT'
    : districtName.toUpperCase();

  // 2. Compute All Summary Statistics Deterministically from Database Records
  const totalCount = records.length;
  const maleCount = records.filter((r) => r.sex === 'Male').length;
  const femaleCount = records.filter((r) => r.sex === 'Female').length;
  const malePct = totalCount > 0 ? ((maleCount / totalCount) * 100).toFixed(1) : '0.0';
  const femalePct = totalCount > 0 ? ((femaleCount / totalCount) * 100).toFixed(1) : '0.0';

  // Compute daily average
  const sDate = new Date(range.startDate);
  const eDate = new Date(range.endDate);
  const totalDays = Math.max(1, Math.round((eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const dailyAverage = totalCount > 0 ? (totalCount / totalDays).toFixed(1) : '0.0';

  // Build Comprehensive Service Breakdown
  const serviceStatsMap = new Map<string, { male: number; female: number; total: number; name: string }>();

  DEFAULT_SERVICES.forEach((s) => {
    serviceStatsMap.set(s.id, {
      male: 0,
      female: 0,
      total: 0,
      name: s.name,
    });
  });

  records.forEach((rec) => {
    // Match by serviceId or service name
    let sKey = rec.serviceId;
    if (!serviceStatsMap.has(sKey)) {
      const matchByName = Array.from(serviceStatsMap.entries()).find(
        ([, v]) => v.name.toLowerCase() === (rec.serviceNameSnapshot || '').toLowerCase()
      );
      if (matchByName) {
        sKey = matchByName[0];
      } else {
        serviceStatsMap.set(sKey, {
          male: 0,
          female: 0,
          total: 0,
          name: rec.serviceNameSnapshot || rec.serviceId,
        });
      }
    }

    const item = serviceStatsMap.get(sKey)!;
    if (rec.sex === 'Male') item.male += 1;
    if (rec.sex === 'Female') item.female += 1;
    item.total += 1;
    serviceStatsMap.set(sKey, item);
  });

  const computedServiceBreakdown = Array.from(serviceStatsMap.entries()).map(([sId, data]) => {
    const pct = totalCount > 0 ? Number(((data.total / totalCount) * 100).toFixed(1)) : 0;
    return {
      serviceId: sId,
      serviceName: data.name,
      maleCount: data.male,
      femaleCount: data.female,
      totalCount: data.total,
      percentage: pct,
    };
  });

  // Sort services by highest total
  computedServiceBreakdown.sort((a, b) => b.totalCount - a.totalCount);
  const effectiveBreakdown = serviceBreakdown && serviceBreakdown.length > 0
    ? serviceBreakdown
    : (stats?.serviceBreakdown && stats.serviceBreakdown.length > 0 ? stats.serviceBreakdown : computedServiceBreakdown);

  // Build Comprehensive Sector Breakdown (All 12 Sectors of Nyabihu)
  const sectorList = [...NYABIHU_SECTORS, 'Other / Outside District'] as string[];
  const computedSectorBreakdown = sectorList.map((sec) => {
    const isOther = sec.startsWith('Other');
    const secRecords = records.filter((r) => {
      const s = (r.sector || 'Mukamira').trim();
      if (isOther) {
        return !NYABIHU_SECTORS.some((ns) => ns.toLowerCase() === s.toLowerCase());
      }
      return s.toLowerCase() === sec.toLowerCase();
    });

    const m = secRecords.filter((r) => r.sex === 'Male').length;
    const f = secRecords.filter((r) => r.sex === 'Female').length;
    const tot = secRecords.length;
    const pct = totalCount > 0 ? ((tot / totalCount) * 100).toFixed(1) : '0.0';
    return { sector: sec, male: m, female: f, total: tot, percentage: pct };
  }).filter((s) => s.total > 0 || ['Bigogwe', 'Jenda', 'Mukamira', 'Rambura'].includes(s.sector));

  // Build Monthly Timeline Breakdown
  const monthMap = new Map<string, { male: number; female: number; total: number }>();
  records.forEach((r) => {
    const ym = r.attendanceDate ? r.attendanceDate.substring(0, 7) : 'Unknown';
    const entry = monthMap.get(ym) || { male: 0, female: 0, total: 0 };
    if (r.sex === 'Male') entry.male += 1;
    if (r.sex === 'Female') entry.female += 1;
    entry.total += 1;
    monthMap.set(ym, entry);
  });

  const sortedMonths = Array.from(monthMap.keys()).sort();
  const monthlyTimeline = sortedMonths.map((ym) => {
    const [y, m] = ym.split('-').map(Number);
    const dateObj = new Date(y, m - 1, 1);
    const label = !isNaN(dateObj.getTime())
      ? dateObj.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
      : ym;
    const data = monthMap.get(ym)!;
    const pct = totalCount > 0 ? ((data.total / totalCount) * 100).toFixed(1) : '0.0';
    return { ym, label, ...data, percentage: pct };
  });

  // 3. Resolve Active Ordered Columns for the Attendance Register sheet
  let activeCols: ExcelColumnDefinition[] = [];

  if (Array.isArray(settings?.excelExportColumns) && settings.excelExportColumns.length > 0) {
    const chosenCols: ExcelColumnDefinition[] = [];
    settings.excelExportColumns.forEach((colKey) => {
      const match = ALL_EXCEL_COLUMNS.find((c) => c.key === colKey);
      if (match && !chosenCols.some((c) => c.key === match.key)) {
        chosenCols.push(match);
      }
    });

    // Ensure 'no' and 'personName' are present
    if (!chosenCols.some((c) => c.key === 'no')) {
      const noCol = ALL_EXCEL_COLUMNS.find((c) => c.key === 'no')!;
      chosenCols.unshift(noCol);
    }
    if (!chosenCols.some((c) => c.key === 'personName')) {
      const nameCol = ALL_EXCEL_COLUMNS.find((c) => c.key === 'personName')!;
      const noIdx = chosenCols.findIndex((c) => c.key === 'no');
      chosenCols.splice(noIdx + 1, 0, nameCol);
    }

    activeCols = chosenCols;
  } else {
    activeCols = DEFAULT_EXCEL_EXPORT_COLUMNS.map((k) =>
      ALL_EXCEL_COLUMNS.find((c) => c.key === k)!
    ).filter(Boolean);
  }

  // 4. Initialize ExcelJS Workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = effectiveCenterName;
  workbook.lastModifiedBy = userProfile?.fullName || 'Administrator';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Load official Logo for inclusion in the workbook
  let logoAsset: { base64: string; extension: 'png' | 'jpeg' } | null = null;
  if (shouldIncludeLogo) {
    try {
      logoAsset = await getOfficialLogoBase64(settings?.logoUrl);
    } catch {
      logoAsset = null;
    }
  }

  const generatedTimeStr = new Date().toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // ==========================================
  // SHEET 1: ATTENDANCE REGISTER (PRIMARY FIRST TAB)
  // ==========================================
  const sheet1Name = (titles.attendanceSheetTitle || 'Attendance Register').substring(0, 31);
  const wsRegister = workbook.addWorksheet(sheet1Name, {
    views: [{ state: 'frozen', ySplit: 6 }],
    properties: { defaultRowHeight: 20 },
  });

  const lastColNum = activeCols.length;
  const lastColLetter = wsRegister.getColumn(lastColNum).letter;

  // Set column widths
  activeCols.forEach((col, index) => {
    wsRegister.getColumn(index + 1).width = Math.max(col.width, 10);
  });

  // Row 1: Spacer
  wsRegister.getRow(1).height = 10;

  // Row 2: Main Brand Title Banner
  const titleRow = wsRegister.getRow(2);
  titleRow.height = 42;
  wsRegister.mergeCells(`A2:${lastColLetter}2`);
  const titleCell = wsRegister.getCell('A2');
  titleCell.value = `   ${effectiveCenterName.toUpperCase()} — OFFICIAL YOUTH ATTENDANCE REGISTER`;
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: headerTextArgb } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: headerBgArgb },
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: shouldIncludeLogo && logoAsset ? 7 : 1 };

  // Row 3: Accent Yellow Brand Line
  const yellowRow = wsRegister.getRow(3);
  yellowRow.height = 5;
  wsRegister.mergeCells(`A3:${lastColLetter}3`);
  const yellowCell = wsRegister.getCell('A3');
  yellowCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: yellowAccentArgb },
  };

  // Row 4: Subtitle & Location Banner
  const subRow = wsRegister.getRow(4);
  subRow.height = 22;
  wsRegister.mergeCells(`A4:${lastColLetter}4`);
  const subCell = wsRegister.getCell('A4');
  subCell.value = `  Location: ${formattedDistrict}  |  ${effectiveSubtitle}`;
  subCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: headerBgArgb } };
  subCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1F5F9' },
  };
  subCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  // Row 5: Metadata Info Bar
  const metaRow = wsRegister.getRow(5);
  metaRow.height = 20;
  wsRegister.mergeCells(`A5:${lastColLetter}5`);
  const metaCell = wsRegister.getCell('A5');
  metaCell.value = `  Period: ${range.label} (${range.startDate} to ${range.endDate})   •   Total: ${records.length.toLocaleString()} visitors (Male: ${maleCount.toLocaleString()}  |  Female: ${femaleCount.toLocaleString()})   •   Exported: ${generatedTimeStr} by ${userProfile?.fullName || 'Administrator'}`;
  metaCell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF475569' } };
  metaCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFFFFF' },
  };
  metaCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  metaCell.border = {
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  };

  // Embed Logo Image on Sheet 1 (Attendance Register) if available
  if (shouldIncludeLogo && logoAsset) {
    try {
      const imageId = workbook.addImage({
        base64: logoAsset.base64,
        extension: logoAsset.extension,
      });

      wsRegister.addImage(imageId, {
        tl: { col: 0.15, row: 1.15 },
        ext: { width: 44, height: 44 },
        editAs: 'oneCell',
      });
    } catch (e) {
      console.warn('Could not insert logo image into Excel:', e);
    }
  }

  // Row 6: Table Column Headers
  const headerRow = wsRegister.getRow(6);
  headerRow.height = 26;
  activeCols.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.exportHeader;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: headerTextArgb } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: headerBgArgb },
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: ['no', 'sex'].includes(col.key) ? 'center' : 'left',
      wrapText: false,
    };
    cell.border = {
      top: { style: 'medium', color: { argb: yellowAccentArgb } },
      bottom: { style: 'medium', color: { argb: secondaryColorArgb } },
      left: { style: 'thin', color: { argb: 'FF334155' } },
      right: { style: 'thin', color: { argb: 'FF334155' } },
    };
  });

  // Rows 7+: Data Rows with alternating zebra row styling
  let currentRowIdx = 7;
  records.forEach((r, recordIdx) => {
    const dataRow = wsRegister.getRow(currentRowIdx);
    dataRow.height = 21;
    const isEven = recordIdx % 2 === 0;
    const rowBgArgb = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

    const nationalIdFormatted = r.nationalId
      ? r.nationalId.length === 16
        ? `${r.nationalId.slice(0, 1)} ${r.nationalId.slice(1, 5)} ${r.nationalId.slice(5, 6)} ${r.nationalId.slice(6, 13)} ${r.nationalId.slice(13, 14)} ${r.nationalId.slice(14, 16)}`
        : r.nationalId
      : '—';

    activeCols.forEach((col, colIdx) => {
      const cell = dataRow.getCell(colIdx + 1);
      cell.font = { name: 'Calibri', size: 9.5, color: { argb: 'FF1F222C' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: rowBgArgb },
      };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFF1F5F9' } },
        right: { style: 'thin', color: { argb: 'FFF1F5F9' } },
      };

      switch (col.key) {
        case 'no':
          cell.value = recordIdx + 1;
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF64748B' } };
          break;
        case 'personName':
          cell.value = r.personName || '—';
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
          cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: headerBgArgb } };
          break;
        case 'sex':
          cell.value = r.sex || '—';
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          if (r.sex === 'Male') {
            cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF1D4ED8' } };
          } else if (r.sex === 'Female') {
            cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FFBE185D' } };
          }
          break;
        case 'serviceName':
          cell.value = r.serviceNameSnapshot || '—';
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
          break;
        case 'districtName':
          cell.value = r.districtName || r.districtId || formattedDistrict;
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
          break;
        case 'sector':
          cell.value = r.sector || 'Mukamira';
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
          break;
        case 'cell':
          cell.value = r.cell || '—';
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
          break;
        case 'village':
          cell.value = r.village || '—';
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
          break;
        case 'phoneNumber':
          cell.value = r.phoneNumber || '—';
          cell.numFmt = '@';
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
          break;
        case 'nationalId':
          cell.value = nationalIdFormatted;
          cell.numFmt = '@';
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
          cell.font = { name: 'Consolas', size: 9, color: { argb: 'FF334155' } };
          break;
        default:
          cell.value = '';
      }
    });

    currentRowIdx++;
  });

  // Bottom Total Row for Attendance Register
  const regTotalRow = wsRegister.getRow(currentRowIdx);
  regTotalRow.height = 24;
  wsRegister.mergeCells(`A${currentRowIdx}:B${currentRowIdx}`);
  const regTotalLabel = regTotalRow.getCell(1);
  regTotalLabel.value = `TOTAL ATTENDEES: ${records.length.toLocaleString()}`;
  regTotalLabel.font = { name: 'Calibri', size: 10, bold: true, color: { argb: headerBgArgb } };
  regTotalLabel.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFDFF8F5' },
  };
  regTotalLabel.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  for (let c = 3; c <= lastColNum; c++) {
    const cCell = regTotalRow.getCell(c);
    cCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDFF8F5' },
    };
    cCell.border = {
      top: { style: 'medium', color: { argb: secondaryColorArgb } },
      bottom: { style: 'double', color: { argb: headerBgArgb } },
    };
  }

  // ==========================================
  // SHEET 2: EXECUTIVE & ANALYTICS SUMMARY (COMES AFTER ATTENDANCE REGISTER)
  // ==========================================
  const wsExec = workbook.addWorksheet('Analytics Summary', {
    views: [{ state: 'frozen', ySplit: 6 }],
    properties: { defaultRowHeight: 20 },
  });

  // Set column widths for Sheet 2
  wsExec.columns = [
    { key: 'colA', width: 6 },
    { key: 'colB', width: 36 },
    { key: 'colC', width: 18 },
    { key: 'colD', width: 18 },
    { key: 'colE', width: 18 },
    { key: 'colF', width: 16 },
    { key: 'colG', width: 22 },
  ];

  // Row 1: Spacer
  wsExec.getRow(1).height = 10;

  // Row 2: Title Banner (Navy Blue with Bold White text)
  const execTitleRow = wsExec.getRow(2);
  execTitleRow.height = 42;
  wsExec.mergeCells('A2:G2');
  const execTitleCell = wsExec.getCell('A2');
  execTitleCell.value = `   ${effectiveCenterName.toUpperCase()} — EXECUTIVE & ANALYTICS SUMMARY`;
  execTitleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: headerTextArgb } };
  execTitleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: headerBgArgb },
  };
  execTitleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: shouldIncludeLogo && logoAsset ? 7 : 1 };

  // Row 3: Accent Yellow Brand Line (#E6E65A)
  const execYellowRow = wsExec.getRow(3);
  execYellowRow.height = 5;
  wsExec.mergeCells('A3:G3');
  const execYellowCell = wsExec.getCell('A3');
  execYellowCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: yellowAccentArgb },
  };

  // Row 4: Subtitle & Location Banner
  const execSubRow = wsExec.getRow(4);
  execSubRow.height = 22;
  wsExec.mergeCells('A4:G4');
  const execSubCell = wsExec.getCell('A4');
  execSubCell.value = `  Location: ${formattedDistrict}  |  ${effectiveSubtitle}`;
  execSubCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: headerBgArgb } };
  execSubCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1F5F9' },
  };
  execSubCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  // Row 5: Metadata Info Bar
  const execMetaRow = wsExec.getRow(5);
  execMetaRow.height = 22;
  wsExec.mergeCells('A5:G5');
  const execMetaCell = wsExec.getCell('A5');
  execMetaCell.value = `  Reporting Scope: ${range.label} (${range.startDate} to ${range.endDate})   •   Total Verified Attendees: ${totalCount.toLocaleString()}   •   Exported: ${generatedTimeStr} by ${userProfile?.fullName || 'Administrator'}`;
  execMetaCell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF475569' } };
  execMetaCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFFFFF' },
  };
  execMetaCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  execMetaCell.border = {
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  };

  // Embed Logo Image on Sheet 2 if available
  if (shouldIncludeLogo && logoAsset) {
    try {
      const imageId = workbook.addImage({
        base64: logoAsset.base64,
        extension: logoAsset.extension,
      });

      wsExec.addImage(imageId, {
        tl: { col: 0.15, row: 1.15 },
        ext: { width: 44, height: 44 },
        editAs: 'oneCell',
      });
    } catch (e) {
      console.warn('Could not insert logo image into Excel:', e);
    }
  }

  // Row 6: Spacer
  wsExec.getRow(6).height = 12;

  // Row 7-11: EXECUTIVE KPI SUMMARY DASHBOARD BLOCK
  wsExec.mergeCells('A7:G7');
  const kpiSectionHead = wsExec.getCell('A7');
  kpiSectionHead.value = '  EXECUTIVE KEY PERFORMANCE INDICATORS (IMIBUSHO RUSANGE)';
  kpiSectionHead.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: headerBgArgb } };
  kpiSectionHead.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  kpiSectionHead.alignment = { vertical: 'middle', horizontal: 'left' };
  wsExec.getRow(7).height = 24;

  // KPI Row 1 (Rows 8-9)
  const kpiCards = [
    { label: 'TOTAL VISITS RECORDED', val: totalCount.toLocaleString(), sub: `${dailyAverage} visits/day avg`, colStart: 1, colEnd: 2, bg: 'FFF8FAFC' },
    { label: 'MALE VISITS (GABO)', val: `${maleCount.toLocaleString()} (${malePct}%)`, sub: 'Registered male youth', colStart: 3, colEnd: 4, bg: 'FFEFF6FF' },
    { label: 'FEMALE VISITS (GORE)', val: `${femaleCount.toLocaleString()} (${femalePct}%)`, sub: 'Registered female youth', colStart: 5, colEnd: 6, bg: 'FFFDF2F8' },
    { label: 'GENDER PARITY', val: `${femalePct}% F / ${malePct}% M`, sub: 'Parity balance index', colStart: 7, colEnd: 7, bg: 'FFF0FDF4' },
  ];

  kpiCards.forEach((c) => {
    const rLabel = wsExec.getRow(8);
    const rVal = wsExec.getRow(9);
    rLabel.height = 18;
    rVal.height = 26;

    if (c.colStart !== c.colEnd) {
      wsExec.mergeCells(8, c.colStart, 8, c.colEnd);
      wsExec.mergeCells(9, c.colStart, 9, c.colEnd);
    }

    const cLabel = wsExec.getCell(8, c.colStart);
    cLabel.value = `  ${c.label}`;
    cLabel.font = { name: 'Calibri', size: 8.5, bold: true, color: { argb: 'FF64748B' } };
    cLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c.bg } };
    cLabel.alignment = { vertical: 'middle', horizontal: 'left' };

    const cVal = wsExec.getCell(9, c.colStart);
    cVal.value = `  ${c.val}  —  ${c.sub}`;
    cVal.font = { name: 'Calibri', size: 10, bold: true, color: { argb: headerBgArgb } };
    cVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c.bg } };
    cVal.alignment = { vertical: 'middle', horizontal: 'left' };

    // Apply border to KPI card
    for (let col = c.colStart; col <= c.colEnd; col++) {
      wsExec.getCell(8, col).border = { top: { style: 'thin', color: { argb: 'FFCBD5E1' } }, left: { style: 'thin', color: { argb: 'FFCBD5E1' } }, right: { style: 'thin', color: { argb: 'FFCBD5E1' } } };
      wsExec.getCell(9, col).border = { bottom: { style: 'medium', color: { argb: secondaryColorArgb } }, left: { style: 'thin', color: { argb: 'FFCBD5E1' } }, right: { style: 'thin', color: { argb: 'FFCBD5E1' } } };
    }
  });

  // Row 10: Spacer
  wsExec.getRow(10).height = 14;

  // ==========================================
  // SECTION 1: SERVICE UTILIZATION BREAKDOWN TABLE
  // ==========================================
  let execRowIdx = 11;
  wsExec.mergeCells(`A${execRowIdx}:G${execRowIdx}`);
  const srvSecHead = wsExec.getCell(`A${execRowIdx}`);
  srvSecHead.value = '  1. SERVICE PROGRAM ATTENDANCE & UTILIZATION BREAKDOWN';
  srvSecHead.font = { name: 'Calibri', size: 11, bold: true, color: { argb: headerTextArgb } };
  srvSecHead.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerBgArgb } };
  srvSecHead.alignment = { vertical: 'middle', horizontal: 'left' };
  wsExec.getRow(execRowIdx).height = 26;
  execRowIdx++;

  // Service Table Headers
  const srvHeaders = ['No.', 'Service Program Name', 'Male Visits', 'Female Visits', 'Total Visits', 'Share (%)', 'Demand Status'];
  const srvHeadRow = wsExec.getRow(execRowIdx);
  srvHeadRow.height = 24;
  srvHeaders.forEach((h, i) => {
    const cell = srvHeadRow.getCell(i + 1);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: headerTextArgb } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: secondaryColorArgb } };
    cell.alignment = { vertical: 'middle', horizontal: i === 0 ? 'center' : (i >= 2 && i <= 5) ? 'right' : 'left' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF1E293B' } },
      bottom: { style: 'medium', color: { argb: headerBgArgb } },
    };
  });
  execRowIdx++;

  const srvDataStartRow = execRowIdx;
  effectiveBreakdown.forEach((s, idx) => {
    const r = wsExec.getRow(execRowIdx);
    r.height = 20;
    const isEven = idx % 2 === 0;
    const bg = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

    r.getCell(1).value = idx + 1;
    r.getCell(1).alignment = { horizontal: 'center' };
    r.getCell(2).value = s.serviceName;
    r.getCell(2).font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: headerBgArgb } };
    r.getCell(3).value = s.maleCount;
    r.getCell(4).value = s.femaleCount;
    r.getCell(5).value = s.totalCount;
    r.getCell(5).font = { name: 'Calibri', size: 9.5, bold: true };
    r.getCell(6).value = `${s.percentage}%`;

    const statusStr = s.percentage >= 15 ? 'High Demand Program' : s.percentage >= 8 ? 'Active Program' : 'Steady Utilization';
    r.getCell(7).value = statusStr;
    r.getCell(7).font = { name: 'Calibri', size: 9, italic: true, color: { argb: s.percentage >= 15 ? 'FF1E40AF' : 'FF475569' } };

    for (let c = 1; c <= 7; c++) {
      r.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      r.getCell(c).border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
    }
    execRowIdx++;
  });
  const srvDataEndRow = execRowIdx - 1;

  // Service Total Row
  const srvTotRow = wsExec.getRow(execRowIdx);
  srvTotRow.height = 24;
  srvTotRow.getCell(2).value = 'TOTAL ALL SERVICES';
  srvTotRow.getCell(2).font = { name: 'Calibri', size: 10, bold: true, color: { argb: headerBgArgb } };
  srvTotRow.getCell(3).value = { formula: `SUM(C${srvDataStartRow}:C${srvDataEndRow})`, result: maleCount };
  srvTotRow.getCell(4).value = { formula: `SUM(D${srvDataStartRow}:D${srvDataEndRow})`, result: femaleCount };
  srvTotRow.getCell(5).value = { formula: `SUM(E${srvDataStartRow}:E${srvDataEndRow})`, result: totalCount };
  srvTotRow.getCell(5).font = { name: 'Calibri', size: 10, bold: true };
  srvTotRow.getCell(6).value = '100.0%';
  srvTotRow.getCell(7).value = `${effectiveBreakdown.length} Services Evaluated`;

  for (let c = 1; c <= 7; c++) {
    srvTotRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDFF8F5' } };
    srvTotRow.getCell(c).border = {
      top: { style: 'medium', color: { argb: secondaryColorArgb } },
      bottom: { style: 'double', color: { argb: headerBgArgb } },
    };
  }
  execRowIdx += 2;

  // ==========================================
  // SECTION 2: GEOGRAPHIC ATTENDANCE BY NYABIHU SECTOR
  // ==========================================
  wsExec.mergeCells(`A${execRowIdx}:G${execRowIdx}`);
  const secSecHead = wsExec.getCell(`A${execRowIdx}`);
  secSecHead.value = '  2. GEOGRAPHIC DISTRIBUTION ACROSS NYABIHU DISTRICT SECTORS (IMIRENGE)';
  secSecHead.font = { name: 'Calibri', size: 11, bold: true, color: { argb: headerTextArgb } };
  secSecHead.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerBgArgb } };
  secSecHead.alignment = { vertical: 'middle', horizontal: 'left' };
  wsExec.getRow(execRowIdx).height = 26;
  execRowIdx++;

  // Sector Table Headers
  const secHeaders = ['No.', 'Sector Name (Umurenge)', 'Male Visitors', 'Female Visitors', 'Total Visitors', 'Share (%)', 'Coverage Reach'];
  const secHeadRow = wsExec.getRow(execRowIdx);
  secHeadRow.height = 24;
  secHeaders.forEach((h, i) => {
    const cell = secHeadRow.getCell(i + 1);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: headerTextArgb } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: secondaryColorArgb } };
    cell.alignment = { vertical: 'middle', horizontal: i === 0 ? 'center' : (i >= 2 && i <= 5) ? 'right' : 'left' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF1E293B' } },
      bottom: { style: 'medium', color: { argb: headerBgArgb } },
    };
  });
  execRowIdx++;

  const secDataStartRow = execRowIdx;
  computedSectorBreakdown.forEach((sec, idx) => {
    const r = wsExec.getRow(execRowIdx);
    r.height = 20;
    const isEven = idx % 2 === 0;
    const bg = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

    r.getCell(1).value = idx + 1;
    r.getCell(1).alignment = { horizontal: 'center' };
    r.getCell(2).value = sec.sector;
    r.getCell(2).font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: headerBgArgb } };
    r.getCell(3).value = sec.male;
    r.getCell(4).value = sec.female;
    r.getCell(5).value = sec.total;
    r.getCell(5).font = { name: 'Calibri', size: 9.5, bold: true };
    r.getCell(6).value = `${sec.percentage}%`;
    r.getCell(7).value = sec.total > 0 ? 'Active Participation' : 'Baseline';
    r.getCell(7).font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF475569' } };

    for (let c = 1; c <= 7; c++) {
      r.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      r.getCell(c).border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
    }
    execRowIdx++;
  });
  const secDataEndRow = execRowIdx - 1;

  // Sector Total Row
  const secTotRow = wsExec.getRow(execRowIdx);
  secTotRow.height = 24;
  secTotRow.getCell(2).value = 'TOTAL ALL SECTORS';
  secTotRow.getCell(2).font = { name: 'Calibri', size: 10, bold: true, color: { argb: headerBgArgb } };
  secTotRow.getCell(3).value = { formula: `SUM(C${secDataStartRow}:C${secDataEndRow})`, result: maleCount };
  secTotRow.getCell(4).value = { formula: `SUM(D${secDataStartRow}:D${secDataEndRow})`, result: femaleCount };
  secTotRow.getCell(5).value = { formula: `SUM(E${secDataStartRow}:E${secDataEndRow})`, result: totalCount };
  secTotRow.getCell(5).font = { name: 'Calibri', size: 10, bold: true };
  secTotRow.getCell(6).value = '100.0%';
  secTotRow.getCell(7).value = `${computedSectorBreakdown.length} Sectors Profiled`;

  for (let c = 1; c <= 7; c++) {
    secTotRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDFF8F5' } };
    secTotRow.getCell(c).border = {
      top: { style: 'medium', color: { argb: secondaryColorArgb } },
      bottom: { style: 'double', color: { argb: headerBgArgb } },
    };
  }
  execRowIdx += 2;

  // ==========================================
  // SECTION 3: MONTHLY ATTENDANCE TIMELINE
  // ==========================================
  if (monthlyTimeline.length > 0) {
    wsExec.mergeCells(`A${execRowIdx}:G${execRowIdx}`);
    const monthSecHead = wsExec.getCell(`A${execRowIdx}`);
    monthSecHead.value = '  3. MONTHLY ATTENDANCE & PARTICIPATION TIMELINE';
    monthSecHead.font = { name: 'Calibri', size: 11, bold: true, color: { argb: headerTextArgb } };
    monthSecHead.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerBgArgb } };
    monthSecHead.alignment = { vertical: 'middle', horizontal: 'left' };
    wsExec.getRow(execRowIdx).height = 26;
    execRowIdx++;

    // Monthly Headers
    const monthHeaders = ['No.', 'Month / Period', 'Male Visits', 'Female Visits', 'Total Visits', 'Share (%)', 'Period Status'];
    const monthHeadRow = wsExec.getRow(execRowIdx);
    monthHeadRow.height = 24;
    monthHeaders.forEach((h, i) => {
      const cell = monthHeadRow.getCell(i + 1);
      cell.value = h;
      cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: headerTextArgb } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: secondaryColorArgb } };
      cell.alignment = { vertical: 'middle', horizontal: i === 0 ? 'center' : (i >= 2 && i <= 5) ? 'right' : 'left' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF1E293B' } },
        bottom: { style: 'medium', color: { argb: headerBgArgb } },
      };
    });
    execRowIdx++;

    const monthDataStartRow = execRowIdx;
    monthlyTimeline.forEach((m, idx) => {
      const r = wsExec.getRow(execRowIdx);
      r.height = 20;
      const isEven = idx % 2 === 0;
      const bg = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

      r.getCell(1).value = idx + 1;
      r.getCell(1).alignment = { horizontal: 'center' };
      r.getCell(2).value = m.label;
      r.getCell(2).font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: headerBgArgb } };
      r.getCell(3).value = m.male;
      r.getCell(4).value = m.female;
      r.getCell(5).value = m.total;
      r.getCell(5).font = { name: 'Calibri', size: 9.5, bold: true };
      r.getCell(6).value = `${m.percentage}%`;
      r.getCell(7).value = 'Verified Attendance';
      r.getCell(7).font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF475569' } };

      for (let c = 1; c <= 7; c++) {
        r.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        r.getCell(c).border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
      }
      execRowIdx++;
    });
    const monthDataEndRow = execRowIdx - 1;

    // Monthly Total Row
    const monthTotRow = wsExec.getRow(execRowIdx);
    monthTotRow.height = 24;
    monthTotRow.getCell(2).value = 'TOTAL ALL TIMELINE PERIODS';
    monthTotRow.getCell(2).font = { name: 'Calibri', size: 10, bold: true, color: { argb: headerBgArgb } };
    monthTotRow.getCell(3).value = { formula: `SUM(C${monthDataStartRow}:C${monthDataEndRow})`, result: maleCount };
    monthTotRow.getCell(4).value = { formula: `SUM(D${monthDataStartRow}:D${monthDataEndRow})`, result: femaleCount };
    monthTotRow.getCell(5).value = { formula: `SUM(E${monthDataStartRow}:E${monthDataEndRow})`, result: totalCount };
    monthTotRow.getCell(5).font = { name: 'Calibri', size: 10, bold: true };
    monthTotRow.getCell(6).value = '100.0%';
    monthTotRow.getCell(7).value = `${monthlyTimeline.length} Months Active`;

    for (let c = 1; c <= 7; c++) {
      monthTotRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDFF8F5' } };
      monthTotRow.getCell(c).border = {
        top: { style: 'medium', color: { argb: secondaryColorArgb } },
        bottom: { style: 'double', color: { argb: headerBgArgb } },
      };
    }
    execRowIdx += 2;
  }

  // ==========================================
  // ADMINISTRATIVE ATTESTATION & SIGN-OFF BLOCK
  // ==========================================
  execRowIdx += 1;
  wsExec.mergeCells(`A${execRowIdx}:C${execRowIdx}`);
  wsExec.mergeCells(`E${execRowIdx}:G${execRowIdx}`);
  const prepHead = wsExec.getCell(`A${execRowIdx}`);
  prepHead.value = '  PREPARED BY (Yateguwe na):';
  prepHead.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: headerBgArgb } };

  const appHead = wsExec.getCell(`E${execRowIdx}`);
  appHead.value = '  VERIFIED & APPROVED BY (Yemejwe na):';
  appHead.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: headerBgArgb } };
  execRowIdx++;

  wsExec.mergeCells(`A${execRowIdx}:C${execRowIdx}`);
  wsExec.mergeCells(`E${execRowIdx}:G${execRowIdx}`);
  const prepName = wsExec.getCell(`A${execRowIdx}`);
  prepName.value = `  Name: ${userProfile?.fullName || 'Attendance Desk Staff'}  |  Role: Administrator`;
  prepName.font = { name: 'Calibri', size: 9, italic: true };

  const appName = wsExec.getCell(`E${execRowIdx}`);
  appName.value = `  Center Director / Nyabihu District Youth Coordinator`;
  appName.font = { name: 'Calibri', size: 9, italic: true };
  execRowIdx += 2;

  // ==========================================
  // SHEET 3: SERVICE SUMMARY SHEET
  // ==========================================
  if (shouldIncludeServiceSheet && effectiveBreakdown.length > 0) {
    const sheet3Name = (titles.serviceSummarySheetTitle || 'Service Summary').substring(0, 31);
    const wsSummary = workbook.addWorksheet(sheet3Name, {
      views: [{ state: 'frozen', ySplit: 5 }],
      properties: { defaultRowHeight: 20 },
    });

    wsSummary.columns = [
      { header: 'No.', key: 'no', width: 8 },
      { header: 'Service Name', key: 'name', width: 36 },
      { header: 'Male Visits', key: 'male', width: 16 },
      { header: 'Female Visits', key: 'female', width: 16 },
      { header: 'Total Visits', key: 'total', width: 16 },
      { header: 'Share (%)', key: 'share', width: 14 },
    ];

    // Banner
    wsSummary.mergeCells('A1:F1');
    const sTitle = wsSummary.getCell('A1');
    sTitle.value = `  ${effectiveCenterName.toUpperCase()} — SERVICE UTILIZATION BREAKDOWN`;
    sTitle.font = { name: 'Calibri', size: 12, bold: true, color: { argb: headerTextArgb } };
    sTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerBgArgb } };
    sTitle.alignment = { vertical: 'middle', horizontal: 'left' };
    wsSummary.getRow(1).height = 36;

    // Yellow line
    wsSummary.mergeCells('A2:F2');
    const sYellow = wsSummary.getCell('A2');
    sYellow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: yellowAccentArgb } };
    wsSummary.getRow(2).height = 4;

    // Subtitle
    wsSummary.mergeCells('A3:F3');
    const sSub = wsSummary.getCell('A3');
    sSub.value = `  District: ${formattedDistrict}  |  Period: ${range.label} (${range.startDate} to ${range.endDate})`;
    sSub.font = { name: 'Calibri', size: 9.5, italic: true, color: { argb: 'FF475569' } };
    sSub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    wsSummary.getRow(3).height = 20;

    // Blank row
    wsSummary.getRow(4).height = 8;

    // Headers
    const sHeadRow = wsSummary.getRow(5);
    sHeadRow.height = 24;
    ['No.', 'Service Name', 'Male Visits', 'Female Visits', 'Total Visits', 'Share (%)'].forEach((h, i) => {
      const cell = sHeadRow.getCell(i + 1);
      cell.value = h;
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: headerTextArgb } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerBgArgb } };
      cell.alignment = { vertical: 'middle', horizontal: i === 0 ? 'center' : i > 1 ? 'right' : 'left' };
    });

    let sRowIdx = 6;
    effectiveBreakdown.forEach((s, idx) => {
      const r = wsSummary.getRow(sRowIdx);
      r.height = 20;
      const isEven = idx % 2 === 0;
      const bg = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

      r.getCell(1).value = idx + 1;
      r.getCell(1).alignment = { horizontal: 'center' };
      r.getCell(2).value = s.serviceName;
      r.getCell(2).font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: headerBgArgb } };
      r.getCell(3).value = s.maleCount;
      r.getCell(4).value = s.femaleCount;
      r.getCell(5).value = s.totalCount;
      r.getCell(5).font = { name: 'Calibri', size: 9.5, bold: true };
      r.getCell(6).value = `${s.percentage}%`;

      for (let c = 1; c <= 6; c++) {
        r.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        r.getCell(c).border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
      }
      sRowIdx++;
    });

    // Total row
    const sTotRow = wsSummary.getRow(sRowIdx);
    sTotRow.height = 24;
    sTotRow.getCell(2).value = 'TOTAL ALL SERVICES';
    sTotRow.getCell(2).font = { name: 'Calibri', size: 10, bold: true, color: { argb: headerBgArgb } };
    sTotRow.getCell(3).value = maleCount;
    sTotRow.getCell(4).value = femaleCount;
    sTotRow.getCell(5).value = totalCount;
    sTotRow.getCell(5).font = { name: 'Calibri', size: 10, bold: true };
    sTotRow.getCell(6).value = '100.0%';

    for (let c = 1; c <= 6; c++) {
      sTotRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDFF8F5' } };
      sTotRow.getCell(c).border = {
        top: { style: 'medium', color: { argb: secondaryColorArgb } },
        bottom: { style: 'double', color: { argb: headerBgArgb } },
      };
    }
  }

  // ==========================================
  // SHEET 4: SECTOR BREAKDOWN SHEET
  // ==========================================
  if (shouldIncludeSectorSheet && computedSectorBreakdown.length > 0) {
    const sheet4Name = (titles.sectorSummarySheetTitle || 'Sector Breakdown').substring(0, 31);
    const wsSector = workbook.addWorksheet(sheet4Name, {
      views: [{ state: 'frozen', ySplit: 5 }],
      properties: { defaultRowHeight: 20 },
    });

    wsSector.columns = [
      { header: 'No.', key: 'no', width: 8 },
      { header: 'Sector Name (Umurenge)', key: 'sec', width: 30 },
      { header: 'Male Visitors', key: 'male', width: 16 },
      { header: 'Female Visitors', key: 'female', width: 16 },
      { header: 'Total Visitors', key: 'total', width: 16 },
      { header: 'Share (%)', key: 'share', width: 14 },
    ];

    wsSector.mergeCells('A1:F1');
    const secTitle = wsSector.getCell('A1');
    secTitle.value = `  ${effectiveCenterName.toUpperCase()} — ATTENDANCE BY NYABIHU SECTOR`;
    secTitle.font = { name: 'Calibri', size: 12, bold: true, color: { argb: headerTextArgb } };
    secTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerBgArgb } };
    secTitle.alignment = { vertical: 'middle', horizontal: 'left' };
    wsSector.getRow(1).height = 36;

    wsSector.mergeCells('A2:F2');
    wsSector.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: yellowAccentArgb } };
    wsSector.getRow(2).height = 4;

    wsSector.mergeCells('A3:F3');
    const secSub = wsSector.getCell('A3');
    secSub.value = `  District: ${formattedDistrict}  |  Identified Sectors: ${computedSectorBreakdown.length}  |  Period: ${range.label}`;
    secSub.font = { name: 'Calibri', size: 9.5, italic: true, color: { argb: 'FF475569' } };
    secSub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    wsSector.getRow(3).height = 20;

    wsSector.getRow(4).height = 8;

    const secHeadRow = wsSector.getRow(5);
    secHeadRow.height = 24;
    ['No.', 'Sector Name (Umurenge)', 'Male Visitors', 'Female Visitors', 'Total Visitors', 'Share (%)'].forEach((h, i) => {
      const cell = secHeadRow.getCell(i + 1);
      cell.value = h;
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: headerTextArgb } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerBgArgb } };
      cell.alignment = { vertical: 'middle', horizontal: i === 0 ? 'center' : i > 1 ? 'right' : 'left' };
    });

    let secRowIdx = 6;
    computedSectorBreakdown.forEach((sec, idx) => {
      const r = wsSector.getRow(secRowIdx);
      r.height = 20;
      const isEven = idx % 2 === 0;
      const bg = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

      r.getCell(1).value = idx + 1;
      r.getCell(1).alignment = { horizontal: 'center' };
      r.getCell(2).value = sec.sector;
      r.getCell(2).font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: headerBgArgb } };
      r.getCell(3).value = sec.male;
      r.getCell(4).value = sec.female;
      r.getCell(5).value = sec.total;
      r.getCell(5).font = { name: 'Calibri', size: 9.5, bold: true };
      r.getCell(6).value = `${sec.percentage}%`;

      for (let c = 1; c <= 6; c++) {
        r.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        r.getCell(c).border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
      }
      secRowIdx++;
    });

    // Total row
    const secTotRow = wsSector.getRow(secRowIdx);
    secTotRow.height = 24;
    secTotRow.getCell(2).value = 'TOTAL ALL SECTORS';
    secTotRow.getCell(2).font = { name: 'Calibri', size: 10, bold: true, color: { argb: headerBgArgb } };
    secTotRow.getCell(3).value = maleCount;
    secTotRow.getCell(4).value = femaleCount;
    secTotRow.getCell(5).value = totalCount;
    secTotRow.getCell(5).font = { name: 'Calibri', size: 10, bold: true };
    secTotRow.getCell(6).value = '100.0%';

    for (let c = 1; c <= 6; c++) {
      secTotRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDFF8F5' } };
      secTotRow.getCell(c).border = {
        top: { style: 'medium', color: { argb: secondaryColorArgb } },
        bottom: { style: 'double', color: { argb: headerBgArgb } },
      };
    }
  }

  // ==========================================
  // GENERATE GENUINE .XLSX FILE & TRIGGER BROWSER DOWNLOAD
  // ==========================================
  const cleanDist = formattedDistrict.replace(/\s+/g, '_');
  const filename = `Nyabihu_YEGO_Attendance_${cleanDist}_${range.startDate}_to_${range.endDate}.xlsx`;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}
