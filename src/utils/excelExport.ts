import {
  AttendanceRecord,
  ServiceAttendanceSummary,
  PeriodDateRange,
  UserProfile,
  DashboardStats,
  ColumnsConfig
} from '../types';
import { ALL_COLUMNS, DEFAULT_COLUMNS_CONFIG } from '../constants/columns';

interface ExportExcelOptions {
  records: AttendanceRecord[];
  range: PeriodDateRange;
  districtName?: string;
  userProfile?: UserProfile | null;
  stats?: DashboardStats | null;
  serviceBreakdown?: ServiceAttendanceSummary[];
  columnsConfig?: ColumnsConfig;
}

function escapeXml(str: string | number | null | undefined): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function exportDetailedAttendanceToExcel({
  records,
  range,
  districtName = 'NYABIHU DISTRICT',
  userProfile,
  stats,
  serviceBreakdown,
  columnsConfig = DEFAULT_COLUMNS_CONFIG,
}: ExportExcelOptions) {
  const formattedDistrict = districtName.toUpperCase().includes('NYABIHU')
    ? 'NYABIHU DISTRICT'
    : districtName.toUpperCase();

  const maleCount = records.filter((r) => r.sex === 'Male').length;
  const femaleCount = records.filter((r) => r.sex === 'Female').length;

  const activeCols = ALL_COLUMNS.filter(c => !!columnsConfig[c.key]);
  const totalColCount = Math.max(1, activeCols.length + 1); // +1 for "No." column
  const mergeAcrossTotal = Math.max(0, totalColCount - 1);
  const part1Merge = Math.max(0, Math.floor((totalColCount - 1) / 3));
  const part2Merge = Math.max(0, Math.floor((totalColCount - 1) / 3));
  const part3Merge = Math.max(0, (totalColCount - 1) - part1Merge - part2Merge - 1);

  // Build Worksheet 1: Attendance Register
  let registerRowsXml = '';

  // Title row
  registerRowsXml += `
    <Row ss:Height="30">
      <Cell ss:MergeAcross="${mergeAcrossTotal}" ss:StyleID="TitleHeader">
        <Data ss:Type="String">NYABIHU YEGO CENTER - OFFICIAL YOUTH ATTENDANCE REGISTER</Data>
      </Cell>
    </Row>
    <Row ss:Height="22">
      <Cell ss:MergeAcross="${mergeAcrossTotal}" ss:StyleID="SubHeader">
        <Data ss:Type="String">Location: ${escapeXml(formattedDistrict)} | Nyabihu Youth Empowerment for Global Opportunity (YEGO) Center</Data>
      </Cell>
    </Row>
    <Row ss:Height="20">
      <Cell ss:MergeAcross="${part1Merge}" ss:StyleID="MetaCell">
        <Data ss:Type="String">Date Range: ${escapeXml(range.label)} (${escapeXml(range.startDate)} to ${escapeXml(range.endDate)})</Data>
      </Cell>
      <Cell ss:MergeAcross="${part2Merge}" ss:StyleID="MetaCell">
        <Data ss:Type="String">Total Visitors: ${records.length} (Male: ${maleCount} | Female: ${femaleCount})</Data>
      </Cell>
      <Cell ss:MergeAcross="${part3Merge}" ss:StyleID="MetaRight">
        <Data ss:Type="String">Exported: ${escapeXml(new Date().toLocaleString())} by ${escapeXml(userProfile?.fullName || 'Administrator')}</Data>
      </Cell>
    </Row>
    <Row ss:Height="8"><Cell/></Row>
    <Row ss:Height="26">
      <Cell ss:StyleID="ColHeader"><Data ss:Type="String">No.</Data></Cell>
      ${activeCols.map(c => `<Cell ss:StyleID="ColHeader"><Data ss:Type="String">${escapeXml(c.exportHeader)}</Data></Cell>`).join('\n      ')}
    </Row>
  `;

  records.forEach((r, idx) => {
    const isEven = idx % 2 === 0;
    const cellStyle = isEven ? 'DataRowEven' : 'DataRowOdd';
    const centerStyle = isEven ? 'DataCenterEven' : 'DataCenterOdd';
    const nameStyle = isEven ? 'DataNameEven' : 'DataNameOdd';
    const sexStyle = r.sex === 'Female'
      ? (isEven ? 'DataSexFemaleEven' : 'DataSexFemaleOdd')
      : (isEven ? 'DataSexMaleEven' : 'DataSexMaleOdd');

    const nationalIdFormatted = r.nationalId
      ? r.nationalId.length === 16
        ? `${r.nationalId.slice(0, 1)} ${r.nationalId.slice(1, 5)} ${r.nationalId.slice(5, 6)} ${r.nationalId.slice(6, 13)} ${r.nationalId.slice(13, 14)} ${r.nationalId.slice(14, 16)}`
        : r.nationalId
      : '—';

    let cellsXml = `<Cell ss:StyleID="${centerStyle}"><Data ss:Type="Number">${idx + 1}</Data></Cell>`;

    activeCols.forEach((col) => {
      switch (col.key) {
        case 'recordId':
          cellsXml += `<Cell ss:StyleID="${centerStyle}"><Data ss:Type="String">${escapeXml(r.id)}</Data></Cell>`;
          break;
        case 'attendanceDate':
          cellsXml += `<Cell ss:StyleID="${centerStyle}"><Data ss:Type="String">${escapeXml(r.attendanceDate)}</Data></Cell>`;
          break;
        case 'attendanceTime':
          cellsXml += `<Cell ss:StyleID="${centerStyle}"><Data ss:Type="String">${escapeXml(r.attendanceTime)}</Data></Cell>`;
          break;
        case 'personName':
          cellsXml += `<Cell ss:StyleID="${nameStyle}"><Data ss:Type="String">${escapeXml(r.personName)}</Data></Cell>`;
          break;
        case 'sex':
          cellsXml += `<Cell ss:StyleID="${sexStyle}"><Data ss:Type="String">${escapeXml(r.sex)}</Data></Cell>`;
          break;
        case 'serviceName':
          cellsXml += `<Cell ss:StyleID="${cellStyle}"><Data ss:Type="String">${escapeXml(r.serviceNameSnapshot)}</Data></Cell>`;
          break;
        case 'districtName':
          cellsXml += `<Cell ss:StyleID="${centerStyle}"><Data ss:Type="String">${escapeXml(r.districtName || 'NYABIHU')}</Data></Cell>`;
          break;
        case 'sector':
          cellsXml += `<Cell ss:StyleID="${cellStyle}"><Data ss:Type="String">${escapeXml(r.sector || 'Mukamira')}</Data></Cell>`;
          break;
        case 'cell':
          cellsXml += `<Cell ss:StyleID="${cellStyle}"><Data ss:Type="String">${escapeXml(r.cell || '—')}</Data></Cell>`;
          break;
        case 'village':
          cellsXml += `<Cell ss:StyleID="${cellStyle}"><Data ss:Type="String">${escapeXml(r.village || '—')}</Data></Cell>`;
          break;
        case 'phoneNumber':
          cellsXml += `<Cell ss:StyleID="${centerStyle}"><Data ss:Type="String">${escapeXml(r.phoneNumber || '—')}</Data></Cell>`;
          break;
        case 'email':
          cellsXml += `<Cell ss:StyleID="${cellStyle}"><Data ss:Type="String">${escapeXml(r.email || '—')}</Data></Cell>`;
          break;
        case 'nationalId':
          cellsXml += `<Cell ss:StyleID="${centerStyle}"><Data ss:Type="String">${escapeXml(nationalIdFormatted)}</Data></Cell>`;
          break;
        case 'entryMethod':
          cellsXml += `<Cell ss:StyleID="${centerStyle}"><Data ss:Type="String">${r.isSelfCheckIn ? 'Visitor Self Check-In' : 'Staff Desk Entry'}</Data></Cell>`;
          break;
        case 'recordedBy':
          cellsXml += `<Cell ss:StyleID="${cellStyle}"><Data ss:Type="String">${escapeXml(r.recordedBy)}</Data></Cell>`;
          break;
        case 'notes':
          cellsXml += `<Cell ss:StyleID="${cellStyle}"><Data ss:Type="String">${escapeXml(r.notes || '—')}</Data></Cell>`;
          break;
      }
    });

    registerRowsXml += `
      <Row ss:Height="22">
        ${cellsXml}
      </Row>
    `;
  });

  // Build Worksheet 2: Service Summary
  const breakdownList = serviceBreakdown || stats?.serviceBreakdown || [];
  let totalMale = 0;
  let totalFemale = 0;
  let grandTotal = 0;

  let summaryRowsXml = `
    <Row ss:Height="28">
      <Cell ss:MergeAcross="6" ss:StyleID="TitleHeader">
        <Data ss:Type="String">NYABIHU YEGO CENTER - SERVICES ATTENDANCE SUMMARY</Data>
      </Cell>
    </Row>
    <Row ss:Height="20">
      <Cell ss:MergeAcross="6" ss:StyleID="SubHeader">
        <Data ss:Type="String">District: ${escapeXml(formattedDistrict)} | Period: ${escapeXml(range.label)} (${escapeXml(range.startDate)} to ${escapeXml(range.endDate)})</Data>
      </Cell>
    </Row>
    <Row ss:Height="8"><Cell/></Row>
    <Row ss:Height="24">
      <Cell ss:StyleID="ColHeader"><Data ss:Type="String">No.</Data></Cell>
      <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Youth Service Program (Serivisi)</Data></Cell>
      <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Male Visits (Gabo)</Data></Cell>
      <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Female Visits (Gore)</Data></Cell>
      <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Total Attendance</Data></Cell>
      <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Male %</Data></Cell>
      <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Total Share %</Data></Cell>
    </Row>
  `;

  breakdownList.forEach((s, idx) => {
    totalMale += s.maleCount;
    totalFemale += s.femaleCount;
    grandTotal += s.totalCount;

    const isEven = idx % 2 === 0;
    const rowStyle = isEven ? 'DataRowEven' : 'DataRowOdd';
    const centerStyle = isEven ? 'DataCenterEven' : 'DataCenterOdd';
    const nameStyle = isEven ? 'DataNameEven' : 'DataNameOdd';
    const mShare = s.totalCount > 0 ? ((s.maleCount / s.totalCount) * 100).toFixed(1) + '%' : '0%';

    summaryRowsXml += `
      <Row ss:Height="22">
        <Cell ss:StyleID="${centerStyle}"><Data ss:Type="Number">${idx + 1}</Data></Cell>
        <Cell ss:StyleID="${nameStyle}"><Data ss:Type="String">${escapeXml(s.serviceName)}</Data></Cell>
        <Cell ss:StyleID="${centerStyle}"><Data ss:Type="Number">${s.maleCount}</Data></Cell>
        <Cell ss:StyleID="${centerStyle}"><Data ss:Type="Number">${s.femaleCount}</Data></Cell>
        <Cell ss:StyleID="${centerStyle}"><Data ss:Type="Number">${s.totalCount}</Data></Cell>
        <Cell ss:StyleID="${centerStyle}"><Data ss:Type="String">${mShare}</Data></Cell>
        <Cell ss:StyleID="${centerStyle}"><Data ss:Type="String">${s.percentage}%</Data></Cell>
      </Row>
    `;
  });

  summaryRowsXml += `
    <Row ss:Height="24">
      <Cell ss:StyleID="TotalRow"><Data ss:Type="String"></Data></Cell>
      <Cell ss:StyleID="TotalRow"><Data ss:Type="String">TOTAL ATTENDANCE</Data></Cell>
      <Cell ss:StyleID="TotalRow"><Data ss:Type="Number">${totalMale}</Data></Cell>
      <Cell ss:StyleID="TotalRow"><Data ss:Type="Number">${totalFemale}</Data></Cell>
      <Cell ss:StyleID="TotalRow"><Data ss:Type="Number">${grandTotal}</Data></Cell>
      <Cell ss:StyleID="TotalRow"><Data ss:Type="String">${grandTotal > 0 ? ((totalMale / grandTotal) * 100).toFixed(1) + '%' : '0%'}</Data></Cell>
      <Cell ss:StyleID="TotalRow"><Data ss:Type="String">100.0%</Data></Cell>
    </Row>
  `;

  // Build Worksheet 3: Sectors Breakdown
  const sectorCounts: Record<string, { male: number; female: number; total: number }> = {};
  records.forEach((r) => {
    const sec = r.sector || 'Mukamira';
    if (!sectorCounts[sec]) {
      sectorCounts[sec] = { male: 0, female: 0, total: 0 };
    }
    if (r.sex === 'Male') sectorCounts[sec].male += 1;
    else sectorCounts[sec].female += 1;
    sectorCounts[sec].total += 1;
  });

  const sortedSectors = Object.entries(sectorCounts).sort((a, b) => b[1].total - a[1].total);

  let sectorRowsXml = `
    <Row ss:Height="28">
      <Cell ss:MergeAcross="5" ss:StyleID="TitleHeader">
        <Data ss:Type="String">NYABIHU DISTRICT - SECTOR ORIGIN DISTRIBUTION</Data>
      </Cell>
    </Row>
    <Row ss:Height="20">
      <Cell ss:MergeAcross="5" ss:StyleID="SubHeader">
        <Data ss:Type="String">Nyabihu YEGO Center | Attendance origins across sectors</Data>
      </Cell>
    </Row>
    <Row ss:Height="8"><Cell/></Row>
    <Row ss:Height="24">
      <Cell ss:StyleID="ColHeader"><Data ss:Type="String">No.</Data></Cell>
      <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Nyabihu Sector (Umurenge)</Data></Cell>
      <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Male Youths</Data></Cell>
      <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Female Youths</Data></Cell>
      <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Total Visitors</Data></Cell>
      <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Share (%)</Data></Cell>
    </Row>
  `;

  sortedSectors.forEach(([secName, counts], idx) => {
    const isEven = idx % 2 === 0;
    const centerStyle = isEven ? 'DataCenterEven' : 'DataCenterOdd';
    const nameStyle = isEven ? 'DataNameEven' : 'DataNameOdd';
    const pct = records.length > 0 ? ((counts.total / records.length) * 100).toFixed(1) + '%' : '0%';

    sectorRowsXml += `
      <Row ss:Height="20">
        <Cell ss:StyleID="${centerStyle}"><Data ss:Type="Number">${idx + 1}</Data></Cell>
        <Cell ss:StyleID="${nameStyle}"><Data ss:Type="String">${escapeXml(secName)}</Data></Cell>
        <Cell ss:StyleID="${centerStyle}"><Data ss:Type="Number">${counts.male}</Data></Cell>
        <Cell ss:StyleID="${centerStyle}"><Data ss:Type="Number">${counts.female}</Data></Cell>
        <Cell ss:StyleID="${centerStyle}"><Data ss:Type="Number">${counts.total}</Data></Cell>
        <Cell ss:StyleID="${centerStyle}"><Data ss:Type="String">${pct}</Data></Cell>
      </Row>
    `;
  });

  // Complete SpreadsheetML XML document
  const excelXml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="TitleHeader">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#1F222C"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="14" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#23285E" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="SubHeader">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#23285E" ss:Bold="1"/>
   <Interior ss:Color="#E6E65A" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="MetaCell">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#1F222C" ss:Bold="1"/>
  </Style>
  <Style ss:ID="MetaRight">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="9" ss:Color="#64748B" ss:Italic="1"/>
  </Style>
  <Style ss:ID="ColHeader">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#1F222C"/>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#1F222C"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#23285E" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="DataRowEven">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#1F222C"/>
   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="DataRowOdd">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#1F222C"/>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="DataCenterEven">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#1F222C"/>
   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="DataCenterOdd">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#1F222C"/>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="DataNameEven">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#23285E" ss:Bold="1"/>
   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="DataNameOdd">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#23285E" ss:Bold="1"/>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="DataSexMaleEven">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#1D4ED8" ss:Bold="1"/>
   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="DataSexMaleOdd">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#1D4ED8" ss:Bold="1"/>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="DataSexFemaleEven">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#BE185D" ss:Bold="1"/>
   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="DataSexFemaleOdd">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#BE185D" ss:Bold="1"/>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="TotalRow">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Double" ss:Weight="3" ss:Color="#23285E"/>
    <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#23285E"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#94A3B8"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#94A3B8"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#23285E" ss:Bold="1"/>
   <Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/>
  </Style>
 </Styles>

 <Worksheet ss:Name="Attendance Register">
  <Table ss:DefaultRowHeight="18">
   <Column ss:Width="35"/>
   <Column ss:Width="95"/>
   <Column ss:Width="85"/>
   <Column ss:Width="65"/>
   <Column ss:Width="160"/>
   <Column ss:Width="70"/>
   <Column ss:Width="200"/>
   <Column ss:Width="95"/>
   <Column ss:Width="90"/>
   <Column ss:Width="80"/>
   <Column ss:Width="80"/>
   <Column ss:Width="95"/>
   <Column ss:Width="130"/>
   <Column ss:Width="140"/>
   <Column ss:Width="110"/>
   <Column ss:Width="110"/>
   <Column ss:Width="150"/>
   ${registerRowsXml}
  </Table>
 </Worksheet>

 <Worksheet ss:Name="Service Summary">
  <Table ss:DefaultRowHeight="18">
   <Column ss:Width="40"/>
   <Column ss:Width="220"/>
   <Column ss:Width="90"/>
   <Column ss:Width="90"/>
   <Column ss:Width="100"/>
   <Column ss:Width="80"/>
   <Column ss:Width="85"/>
   ${summaryRowsXml}
  </Table>
 </Worksheet>

 <Worksheet ss:Name="Nyabihu Sectors Breakdown">
  <Table ss:DefaultRowHeight="18">
   <Column ss:Width="40"/>
   <Column ss:Width="160"/>
   <Column ss:Width="90"/>
   <Column ss:Width="90"/>
   <Column ss:Width="100"/>
   <Column ss:Width="80"/>
   ${sectorRowsXml}
  </Table>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([excelXml], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });

  const cleanDist = formattedDistrict.replace(/\s+/g, '_');
  const filename = `Nyabihu_YEGO_Attendance_${cleanDist}_${range.startDate}_to_${range.endDate}.xls`;

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}
