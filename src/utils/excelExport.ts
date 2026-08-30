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

  const maleCount = records.filter((r) => r.sex === 'Male').length;
  const femaleCount = records.filter((r) => r.sex === 'Female').length;

  // 2. Resolve Active Ordered Columns dynamically
  let activeCols: ExcelColumnDefinition[] = [];

  if (Array.isArray(settings?.excelExportColumns) && settings.excelExportColumns.length > 0) {
    const chosenCols: ExcelColumnDefinition[] = [];
    settings.excelExportColumns.forEach((colKey) => {
      const match = ALL_EXCEL_COLUMNS.find((c) => c.key === colKey);
      if (match && !chosenCols.some((c) => c.key === match.key)) {
        chosenCols.push(match);
      }
    });

    // Ensure 'no' and 'personName' are strictly present
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

  // 3. Initialize ExcelJS Workbook
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

  // ==========================================
  // SHEET 1: ATTENDANCE REGISTER
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

  // Row 1: Spacer / Logo margin
  wsRegister.getRow(1).height = 10;

  // Row 2: Main Brand Title Banner (Navy Blue with Bold White text)
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

  // Row 3: Accent Yellow Brand Line (#E6E65A)
  const yellowRow = wsRegister.getRow(3);
  yellowRow.height = 5;
  wsRegister.mergeCells(`A3:${lastColLetter}3`);
  const yellowCell = wsRegister.getCell('A3');
  yellowCell.value = '';
  yellowCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: yellowAccentArgb },
  };

  // Row 4: Subtitle & Location Banner (Light Slate with Navy text)
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

  // Row 5: Metadata Info Bar (Reporting period & totals)
  const metaRow = wsRegister.getRow(5);
  metaRow.height = 20;
  wsRegister.mergeCells(`A5:${lastColLetter}5`);
  const metaCell = wsRegister.getCell('A5');
  const generatedTimeStr = new Date().toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  metaCell.value = `  Period: ${range.label} (${range.startDate} to ${range.endDate})   •   Total: ${records.length} visitors (Male: ${maleCount}  |  Female: ${femaleCount})   •   Exported: ${generatedTimeStr} by ${userProfile?.fullName || 'Administrator'}`;
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

  // Embed Logo Image if available
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

  // Rows 7+: Data Rows with alternating zebra row styling & formatted cells
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
          cell.numFmt = '@'; // Explicit text format to protect leading zero
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
          break;
        case 'nationalId':
          cell.value = nationalIdFormatted;
          cell.numFmt = '@'; // Explicit text format for 16 digits
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
          cell.font = { name: 'Consolas', size: 9, color: { argb: 'FF334155' } };
          break;
        default:
          cell.value = '';
      }
    });

    currentRowIdx++;
  });

  // Bottom Summary / Sign-off Row
  const totalRow = wsRegister.getRow(currentRowIdx);
  totalRow.height = 24;
  wsRegister.mergeCells(`A${currentRowIdx}:B${currentRowIdx}`);
  const totalLabelCell = totalRow.getCell(1);
  totalLabelCell.value = `TOTAL ATTENDEES: ${records.length}`;
  totalLabelCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: headerBgArgb } };
  totalLabelCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFDFF8F5' }, // Soft Mint
  };
  totalLabelCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  for (let c = 3; c <= lastColNum; c++) {
    const cCell = totalRow.getCell(c);
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
  // SHEET 2: SERVICE BREAKDOWN SUMMARY
  // ==========================================
  const effectiveBreakdown = serviceBreakdown || stats?.serviceBreakdown || [];
  if (shouldIncludeServiceSheet && effectiveBreakdown.length > 0) {
    const sheet2Name = (titles.serviceSummarySheetTitle || 'Service Summary').substring(0, 31);
    const wsSummary = workbook.addWorksheet(sheet2Name, {
      views: [{ state: 'frozen', ySplit: 5 }],
      properties: { defaultRowHeight: 20 },
    });

    wsSummary.columns = [
      { header: 'No.', key: 'no', width: 8 },
      { header: 'Service Name', key: 'name', width: 34 },
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
    let totMale = 0;
    let totFemale = 0;
    let totAll = 0;

    effectiveBreakdown.forEach((s, idx) => {
      totMale += s.maleCount;
      totFemale += s.femaleCount;
      totAll += s.totalCount;

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
    sTotRow.getCell(3).value = totMale;
    sTotRow.getCell(4).value = totFemale;
    sTotRow.getCell(5).value = totAll;
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
  // SHEET 3: SECTOR BREAKDOWN SUMMARY
  // ==========================================
  const nyabihuSectors = [
    'Bigogwe', 'Jenda', 'Mukamira', 'Rambura', 'Rugera',
    'Rurembo', 'Shyira', 'Kabatwa', 'Jomba', 'Karago', 'Kintobo', 'Other'
  ];

  const sectorCounts = nyabihuSectors.map((sec) => {
    const secRecords = records.filter((r) => (r.sector || 'Mukamira').toLowerCase() === sec.toLowerCase());
    const m = secRecords.filter((r) => r.sex === 'Male').length;
    const f = secRecords.filter((r) => r.sex === 'Female').length;
    const tot = secRecords.length;
    const pct = records.length > 0 ? ((tot / records.length) * 100).toFixed(1) : '0.0';
    return { sector: sec, male: m, female: f, total: tot, percentage: pct };
  }).filter((s) => s.total > 0 || ['Bigogwe', 'Jenda', 'Mukamira', 'Rambura'].includes(s.sector));

  if (shouldIncludeSectorSheet && sectorCounts.length > 0) {
    const sheet3Name = (titles.sectorSummarySheetTitle || 'Sector Breakdown').substring(0, 31);
    const wsSector = workbook.addWorksheet(sheet3Name, {
      views: [{ state: 'frozen', ySplit: 5 }],
      properties: { defaultRowHeight: 20 },
    });

    wsSector.columns = [
      { header: 'No.', key: 'no', width: 8 },
      { header: 'Sector Name (Umurenge)', key: 'sec', width: 28 },
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
    secSub.value = `  District: ${formattedDistrict}  |  Identified Sectors: ${sectorCounts.length}  |  Period: ${range.label}`;
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
    sectorCounts.forEach((sec, idx) => {
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
