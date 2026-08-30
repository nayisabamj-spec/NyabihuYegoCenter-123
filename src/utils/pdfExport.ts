import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  AttendanceRecord,
  DashboardStats,
  PeriodDateRange,
  UserProfile,
  ChallengerInsight,
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
  DEFAULT_EXCEL_SUBTITLE,
} from '../constants/excelExportSettings';
import { getOfficialLogoBase64 } from './logoLoader';

/**
 * Helper to convert hex color (#23285E) to RGB tuple [35, 40, 94]
 */
function hexToRgb(hex?: string, defaultRgb: [number, number, number] = [35, 40, 94]): [number, number, number] {
  if (!hex) return defaultRgb;
  const clean = hex.replace('#', '').trim();
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
      return [r, g, b];
    }
  }
  return defaultRgb;
}

/**
 * 1. EXPORT ATTENDANCE LIST / USERS TO BRANDED PDF
 * Generates an official, beautifully branded tabular PDF document of the attendee list.
 */
export async function exportAttendanceListToPDF({
  records,
  range,
  userProfile,
  districtName = 'NYABIHU DISTRICT',
  settings,
  customTitles,
}: {
  records: AttendanceRecord[];
  range: PeriodDateRange;
  userProfile?: UserProfile | null;
  districtName?: string;
  settings?: SystemSettings | null;
  customTitles?: Partial<ExportTitlesConfig>;
}): Promise<void> {
  const savedTitles = loadSavedExportTitles();
  const titles: ExportTitlesConfig = {
    ...savedTitles,
    ...customTitles,
  };

  const effectiveCenterName =
    settings?.centerName?.trim() ||
    titles.reportMainTitle?.trim() ||
    BRAND_CONFIG.name ||
    'NYABIHU YEGO CENTER';

  const effectiveSubtitle =
    settings?.excelSubtitle?.trim() ||
    titles.reportSubTitle?.trim() ||
    DEFAULT_EXCEL_SUBTITLE;

  const navyRgb = hexToRgb(settings?.excelHeaderAccentColor || DEFAULT_EXCEL_HEADER_ACCENT_COLOR, [35, 40, 94]);
  const tealRgb = hexToRgb(settings?.excelSecondaryColor || DEFAULT_EXCEL_SECONDARY_COLOR, [53, 145, 200]);
  const yellowRgb = hexToRgb(settings?.excelYellowAccentColor || DEFAULT_EXCEL_YELLOW_ACCENT_COLOR, [230, 230, 90]);

  const shouldIncludeLogo = settings?.includeLogoInPdf !== false;
  const formattedDistrict = districtName.toUpperCase().includes('NYABIHU')
    ? 'NYABIHU DISTRICT'
    : districtName.toUpperCase();

  const maleCount = records.filter((r) => r.sex === 'Male').length;
  const femaleCount = records.filter((r) => r.sex === 'Female').length;

  // Determine active columns from admin settings or defaults
  const enabledColKeys =
    Array.isArray(settings?.excelExportColumns) && settings.excelExportColumns.length > 0
      ? settings.excelExportColumns
      : DEFAULT_EXCEL_EXPORT_COLUMNS;

  const activeCols = enabledColKeys
    .map((k) => ALL_EXCEL_COLUMNS.find((c) => c.key === k))
    .filter(Boolean);

  // Landscape A4 for comfortable multi-column layout
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;

  // Load logo
  let logoAsset: { dataUrl: string; extension: 'png' | 'jpeg' } | null = null;
  if (shouldIncludeLogo) {
    try {
      logoAsset = await getOfficialLogoBase64(settings?.logoUrl);
    } catch {
      logoAsset = null;
    }
  }

  // Define Table Headers & Body
  const tableHeaders = activeCols.map((c) => c?.exportHeader || c?.label || '');
  const tableBody = records.map((r, index) => {
    return activeCols.map((col) => {
      if (!col) return '';
      switch (col.key) {
        case 'no':
          return (index + 1).toString();
        case 'personName':
          return r.personName || '—';
        case 'sex':
          return r.sex || '—';
        case 'serviceName':
          return r.serviceNameSnapshot || '—';
        case 'districtName':
          return r.districtName || r.districtId || formattedDistrict;
        case 'sector':
          return r.sector || 'Mukamira';
        case 'cell':
          return r.cell || '—';
        case 'village':
          return r.village || '—';
        case 'phoneNumber':
          return r.phoneNumber || '—';
        case 'nationalId':
          return r.nationalId
            ? r.nationalId.length === 16
              ? `${r.nationalId.slice(0, 1)} ${r.nationalId.slice(1, 5)} ${r.nationalId.slice(5, 6)} ${r.nationalId.slice(6, 13)} ${r.nationalId.slice(13, 14)} ${r.nationalId.slice(14, 16)}`
              : r.nationalId
            : '—';
        default:
          return '';
      }
    });
  });

  // Render using autoTable
  autoTable(doc, {
    head: [tableHeaders],
    body: tableBody,
    startY: 42,
    margin: { top: 42, right: margin, bottom: 18, left: margin },
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2,
      textColor: [31, 34, 44],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      valign: 'middle',
    },
    headStyles: {
      fillColor: navyRgb,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
    },
    didDrawPage: (data) => {
      // Header Top Navy Bar
      doc.setFillColor(navyRgb[0], navyRgb[1], navyRgb[2]);
      doc.rect(0, 0, pageWidth, 28, 'F');

      // Yellow Brand Accent Line
      doc.setFillColor(yellowRgb[0], yellowRgb[1], yellowRgb[2]);
      doc.rect(0, 28, pageWidth, 2, 'F');

      // Embedded Logo
      let textStartX = margin;
      if (shouldIncludeLogo && logoAsset) {
        try {
          doc.addImage(logoAsset.dataUrl, logoAsset.extension.toUpperCase(), margin, 3.5, 21, 21);
          textStartX = margin + 25;
        } catch {
          // Fallback without image
        }
      }

      // Center Name & Subtitle
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(effectiveCenterName.toUpperCase(), textStartX, 11);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(223, 248, 245);
      doc.text(effectiveSubtitle, textStartX, 17);

      // District & Generation Metadata on Top Right
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(`District: ${formattedDistrict}`, pageWidth - margin, 10, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(223, 248, 245);
      const generatedDateStr = new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      doc.text(`Exported: ${generatedDateStr}`, pageWidth - margin, 16, { align: 'right' });

      // Sub-banner metadata strip
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.rect(margin, 31.5, pageWidth - margin * 2, 7.5, 'FD');

      doc.setTextColor(51, 65, 85);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.text(`Period: ${range.label} (${range.startDate} to ${range.endDate})`, margin + 3, 36.5);

      const summaryStr = `Total Visitors: ${records.length}  |  Male: ${maleCount}  |  Female: ${femaleCount}  |  Staff: ${userProfile?.fullName || 'Administrator'}`;
      doc.setFont('helvetica', 'normal');
      doc.text(summaryStr, pageWidth - margin - 3, 36.5, { align: 'right' });

      // Footer
      const footerY = pageHeight - 8;
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `${effectiveCenterName} • Official Youth Services Attendance Record System`,
        margin,
        footerY
      );

      const pageStr = `Page ${data.pageNumber}`;
      doc.text(pageStr, pageWidth - margin, footerY, { align: 'right' });
    },
  });

  const cleanDist = formattedDistrict.replace(/\s+/g, '_');
  const filename = `Nyabihu_YEGO_Attendees_${cleanDist}_${range.startDate}_to_${range.endDate}.pdf`;
  doc.save(filename);
}

/**
 * 2. EXPORT EXECUTIVE SUMMARY / MANAGEMENT REPORT TO PDF
 * Generates an executive analytical report with metrics, charts, insights, and service breakdown.
 */
export async function exportReportToPDF(
  stats: DashboardStats,
  currentRange: PeriodDateRange,
  userProfile: UserProfile,
  districtName: string,
  insights: ChallengerInsight[],
  filteredRecords: AttendanceRecord[],
  columnsConfig?: ColumnsConfig,
  customTitles?: Partial<ExportTitlesConfig>,
  settings?: SystemSettings | null
): Promise<void> {
  const savedTitles = loadSavedExportTitles();
  const titles: ExportTitlesConfig = {
    ...savedTitles,
    ...customTitles,
  };

  const effectiveCenterName =
    settings?.centerName?.trim() ||
    titles.reportMainTitle?.trim() ||
    BRAND_CONFIG.name ||
    'NYABIHU YEGO CENTER';

  const effectiveSubtitle =
    settings?.excelSubtitle?.trim() ||
    titles.reportSubTitle?.trim() ||
    'Youth Services Attendance & Management Report';

  const navyRgb = hexToRgb(settings?.excelHeaderAccentColor || DEFAULT_EXCEL_HEADER_ACCENT_COLOR, [35, 40, 94]);
  const tealRgb = hexToRgb(settings?.excelSecondaryColor || DEFAULT_EXCEL_SECONDARY_COLOR, [53, 145, 200]);
  const yellowRgb = hexToRgb(settings?.excelYellowAccentColor || DEFAULT_EXCEL_YELLOW_ACCENT_COLOR, [230, 230, 90]);

  const shouldIncludeLogo = settings?.includeLogoInPdf !== false;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 18;

  // Load logo
  let logoAsset: { dataUrl: string; extension: 'png' | 'jpeg' } | null = null;
  if (shouldIncludeLogo) {
    try {
      logoAsset = await getOfficialLogoBase64(settings?.logoUrl);
    } catch {
      logoAsset = null;
    }
  }

  // Header background banner
  doc.setFillColor(navyRgb[0], navyRgb[1], navyRgb[2]);
  doc.rect(0, 0, pageWidth, 32, 'F');

  // Accent yellow line
  doc.setFillColor(yellowRgb[0], yellowRgb[1], yellowRgb[2]);
  doc.rect(0, 32, pageWidth, 2.5, 'F');

  // Embed Logo if available
  let textStartX = margin;
  if (shouldIncludeLogo && logoAsset) {
    try {
      doc.addImage(logoAsset.dataUrl, logoAsset.extension.toUpperCase(), margin, 4, 24, 24);
      textStartX = margin + 27;
    } catch {
      // Fallback
    }
  }

  // Center Name / Main Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(effectiveCenterName.toUpperCase(), textStartX, 13);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(223, 248, 245);
  doc.text(effectiveSubtitle, textStartX, 20);

  // District badge in top right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  const displayDistrict = districtName.toUpperCase().includes('NYABIHU')
    ? 'NYABIHU DISTRICT'
    : districtName.toUpperCase();
  doc.text(`District: ${displayDistrict}`, pageWidth - margin, 13, { align: 'right' });

  const generatedDateStr = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Generated: ${generatedDateStr}`, pageWidth - margin, 20, { align: 'right' });

  y = 42;

  // Report metadata box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 22, 2, 2, 'FD');

  doc.setTextColor(31, 34, 44);
  doc.setFontSize(9);

  // Row 1
  doc.setFont('helvetica', 'bold');
  doc.text('Reporting Period:', margin + 4, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.text(`${currentRange.label} (${currentRange.startDate} to ${currentRange.endDate})`, margin + 36, y + 7);

  // Row 2
  doc.setFont('helvetica', 'bold');
  const prepLabel = titles.preparedByLabel || 'Generated By:';
  doc.text(prepLabel.endsWith(':') ? prepLabel : `${prepLabel}:`, margin + 4, y + 15);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `${userProfile.fullName} (${userProfile.role === 'director' ? 'Main Director' : 'District Administrator'})`,
    margin + 36,
    y + 15
  );

  y += 28;

  // Section 1: Executive Attendance Summary Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(navyRgb[0], navyRgb[1], navyRgb[2]);
  doc.text(titles.pdfSection1Title || '1. Executive Attendance Summary', margin, y);
  y += 6;

  // 4 Metric cards
  const cardWidth = (pageWidth - margin * 2 - 9) / 4;
  const metrics = [
    { label: 'Total Visits', val: stats.filteredTotal.toLocaleString(), sub: `${stats.dailyAverage}/day avg` },
    { label: 'Male Visits', val: stats.maleTotal.toLocaleString(), sub: `${stats.malePercentage}% share` },
    { label: 'Female Visits', val: stats.femaleTotal.toLocaleString(), sub: `${stats.femalePercentage}% share` },
    {
      label: 'Top Service',
      val: stats.mostRequestedService ? stats.mostRequestedService.totalCount.toString() : '0',
      sub: stats.mostRequestedService
        ? stats.mostRequestedService.serviceName.length > 14
          ? stats.mostRequestedService.serviceName.substring(0, 12) + '...'
          : stats.mostRequestedService.serviceName
        : 'N/A',
    },
  ];

  metrics.forEach((m, idx) => {
    const cx = margin + idx * (cardWidth + 3);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(cx, y, cardWidth, 20, 2, 2, 'FD');

    // Accent top bar in teal
    doc.setFillColor(tealRgb[0], tealRgb[1], tealRgb[2]);
    doc.rect(cx, y, cardWidth, 1.5, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(m.label, cx + cardWidth / 2, y + 6, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(navyRgb[0], navyRgb[1], navyRgb[2]);
    doc.text(m.val, cx + cardWidth / 2, y + 12, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(m.sub, cx + cardWidth / 2, y + 17, { align: 'center' });
  });

  y += 26;

  // Section 2: Service Breakdown Table Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(navyRgb[0], navyRgb[1], navyRgb[2]);
  doc.text(titles.pdfSection2Title || '2. Service Usage Breakdown', margin, y);
  y += 6;

  // Table header
  const thHeight = 7;
  doc.setFillColor(navyRgb[0], navyRgb[1], navyRgb[2]);
  doc.rect(margin, y, pageWidth - margin * 2, thHeight, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('Service Name', margin + 4, y + 5);
  doc.text('Male', margin + 95, y + 5, { align: 'right' });
  doc.text('Female', margin + 120, y + 5, { align: 'right' });
  doc.text('Total Visits', margin + 150, y + 5, { align: 'right' });
  doc.text('Share (%)', pageWidth - margin - 4, y + 5, { align: 'right' });
  y += thHeight;

  // Table rows
  doc.setFontSize(8);
  stats.serviceBreakdown.forEach((srv, index) => {
    const isEven = index % 2 === 0;
    doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    doc.rect(margin, y, pageWidth - margin * 2, 6.5, 'F');
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y + 6.5, pageWidth - margin, y + 6.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(31, 34, 44);
    const truncName = srv.serviceName.length > 44 ? srv.serviceName.substring(0, 42) + '...' : srv.serviceName;
    doc.text(truncName, margin + 4, y + 4.5);

    doc.text(srv.maleCount.toString(), margin + 95, y + 4.5, { align: 'right' });
    doc.text(srv.femaleCount.toString(), margin + 120, y + 4.5, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.text(srv.totalCount.toString(), margin + 150, y + 4.5, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.text(`${srv.percentage}%`, pageWidth - margin - 4, y + 4.5, { align: 'right' });

    y += 6.5;
  });

  // Total row
  doc.setFillColor(223, 248, 245);
  doc.rect(margin, y, pageWidth - margin * 2, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(navyRgb[0], navyRgb[1], navyRgb[2]);
  doc.text('Total Service Attendance', margin + 4, y + 5);
  doc.text(stats.maleTotal.toString(), margin + 95, y + 5, { align: 'right' });
  doc.text(stats.femaleTotal.toString(), margin + 120, y + 5, { align: 'right' });
  doc.text(stats.filteredTotal.toString(), margin + 150, y + 5, { align: 'right' });
  doc.text('100.0%', pageWidth - margin - 4, y + 5, { align: 'right' });

  y += 14;

  // Section 3: Data Insights & Observations Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(navyRgb[0], navyRgb[1], navyRgb[2]);
  doc.text(titles.pdfSection3Title || '3. What the Attendance Data is Telling You', margin, y);
  y += 6;

  insights.slice(0, 3).forEach((ins) => {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 14, 1.5, 1.5, 'FD');

    // Left accent bar
    doc.setFillColor(ins.type === 'attention' ? 220 : 53, ins.type === 'attention' ? 38 : 145, ins.type === 'attention' ? 38 : 200);
    doc.rect(margin, y, 2.5, 14, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(navyRgb[0], navyRgb[1], navyRgb[2]);
    doc.text(ins.headline, margin + 5, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const obsTrunc = ins.observation.length > 110 ? ins.observation.substring(0, 108) + '...' : ins.observation;
    doc.text(obsTrunc, margin + 5, y + 10);

    y += 16;
  });

  // Footer on page 1
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, 280, pageWidth - margin, 280);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  const footerString = titles.pdfFooterText || `${effectiveCenterName} • Official Youth Services Attendance Record System`;
  doc.text(footerString, margin, 285);
  doc.text('Page 1 of 1', pageWidth - margin, 285, { align: 'right' });

  // Save the PDF
  const cleanDist = displayDistrict.replace(/\s+/g, '_');
  const filename = `Nyabihu_YEGO_Report_${cleanDist}_${currentRange.startDate}_to_${currentRange.endDate}.pdf`;
  doc.save(filename);
}
