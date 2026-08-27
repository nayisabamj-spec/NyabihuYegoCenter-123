import React, { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Layers,
  Users,
  Building2,
  CheckCircle2,
  TrendingUp,
  FileSpreadsheet,
  Lightbulb,
  TableProperties,
  SlidersHorizontal
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { PeriodType, PeriodDateRange, AttendanceRecord, ColumnsConfig } from '../types';
import {
  getPeriodRange,
  computeDashboardStats,
  generateChallengerInsights,
  filterAttendanceByRange,
  formatDateYYYYMMDD
} from '../utils/stats';
import { exportReportToPDF } from '../utils/pdfExport';
import { exportSummaryToCSV, exportAttendanceToCSV } from '../utils/csvExport';
import { exportDetailedAttendanceToExcel } from '../utils/excelExport';
import { Logo } from '../components/common/Logo';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { ColumnCustomizerModal } from '../components/common/ColumnCustomizerModal';
import {
  DEFAULT_COLUMNS_CONFIG,
  REPORTS_COLS_STORAGE_KEY,
  loadSavedColumnsConfig,
  saveColumnsConfig,
} from '../constants/columns';

export const ReportsPage: React.FC = () => {
  const { userProfile, isDirector } = useAuth();
  const { attendanceRecords, services, districts, activeDistrictFilter } = useApp();
  const { toast } = useToast();

  // Column customization state
  const [columnsConfig, setColumnsConfig] = useState<ColumnsConfig>(() =>
    loadSavedColumnsConfig(REPORTS_COLS_STORAGE_KEY)
  );
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);

  const [period, setPeriod] = useState<PeriodType>('this_month');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [sexFilter, setSexFilter] = useState<'all' | 'Male' | 'Female'>('all');
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [excelGenerating, setExcelGenerating] = useState(false);

  const currentRange: PeriodDateRange = useMemo(() => {
    return getPeriodRange(period, customStart, customEnd);
  }, [period, customStart, customEnd]);

  // Compute filtered records and statistics
  const filteredRecords = useMemo(() => {
    return filterAttendanceByRange(
      attendanceRecords,
      currentRange.startDate,
      currentRange.endDate,
      serviceFilter,
      sexFilter === 'all' ? undefined : sexFilter
    );
  }, [attendanceRecords, currentRange, serviceFilter, sexFilter]);

  const stats = useMemo(() => {
    return computeDashboardStats(filteredRecords, services, currentRange);
  }, [filteredRecords, services, currentRange]);

  const insights = useMemo(() => {
    return generateChallengerInsights(stats, currentRange);
  }, [stats, currentRange]);

  const activeDistrictName = isDirector
    ? (activeDistrictFilter === 'all' ? 'All Districts (Nyabihu Main)' : (districts.find(d => d.id === activeDistrictFilter)?.name || 'Nyabihu District'))
    : (userProfile?.districtName || 'Nyabihu District');

  const activeColumnCount = useMemo(() => {
    return Object.values(columnsConfig).filter(Boolean).length;
  }, [columnsConfig]);

  const handleUpdateColumns = (newConfig: ColumnsConfig) => {
    setColumnsConfig(newConfig);
    saveColumnsConfig(REPORTS_COLS_STORAGE_KEY, newConfig);
    toast.success('Report Columns Updated', 'Export formats will reflect your customized columns.');
  };

  const handleResetColumns = () => {
    setColumnsConfig(DEFAULT_COLUMNS_CONFIG);
    saveColumnsConfig(REPORTS_COLS_STORAGE_KEY, DEFAULT_COLUMNS_CONFIG);
    toast.info('Default Columns Restored', 'Record ID, Time, Entry Method, Recorded By, and Notes hidden by default.');
  };

  const handleExportPDF = () => {
    if (!userProfile) return;
    setPdfGenerating(true);
    try {
      exportReportToPDF(
        stats,
        currentRange,
        userProfile,
        activeDistrictName,
        insights,
        filteredRecords,
        columnsConfig
      );
      toast.success('PDF Export Complete', 'Institutional attendance report has been generated.');
    } catch (err: any) {
      toast.error('PDF Generation Failed', err?.message || 'Could not export PDF report.');
    } finally {
      setTimeout(() => setPdfGenerating(false), 600);
    }
  };

  const handleExportExcel = async () => {
    setExcelGenerating(true);
    try {
      await exportDetailedAttendanceToExcel({
        records: filteredRecords,
        range: currentRange,
        districtName: activeDistrictName || 'NYABIHU DISTRICT',
        userProfile,
        stats,
        serviceBreakdown: stats.serviceBreakdown,
        columnsConfig,
      });
      toast.success('Excel Workbook Generated', `Exported ${filteredRecords.length} records with ${activeColumnCount} custom columns.`);
    } catch (err) {
      console.error('Error generating Excel file:', err);
      toast.error('Excel Export Error', 'Could not generate the Excel file.');
    } finally {
      setExcelGenerating(false);
    }
  };

  const handleExportCSV = () => {
    exportAttendanceToCSV(
      filteredRecords,
      activeDistrictName || 'NYABIHU DISTRICT',
      currentRange,
      columnsConfig
    );
    toast.success('CSV Download Started', `Exported ${filteredRecords.length} records with ${activeColumnCount} columns.`);
  };

  const handlePrint = () => {
    toast.info('Print Dialog Opened', 'Select your printer or Save as PDF.');
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Report Generator Controls Bar */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs no-print">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#3591C8]">Official Reporting & Export</span>
            <h1 className="text-2xl font-extrabold text-[#23285E]">Youth Services Attendance Reports</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Generate standardized institutional Excel spreadsheets, PDF reports, and attendance exports for Nyabihu YEGO Center.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsColumnModalOpen(true)}
              icon={<SlidersHorizontal className="w-4 h-4 text-[#3591C8]" />}
              className="border-slate-300 hover:border-[#3591C8]"
            >
              Columns ({activeColumnCount})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              icon={<Printer className="w-4 h-4 text-slate-600" />}
            >
              Print
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              icon={<FileSpreadsheet className="w-4 h-4 text-slate-600" />}
              disabled={filteredRecords.length === 0}
            >
              Export CSV
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportExcel}
              loading={excelGenerating}
              icon={<TableProperties className="w-4 h-4 text-[#23285E]" />}
              disabled={filteredRecords.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold border-none"
            >
              Generate Excel File (.xlsx)
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleExportPDF}
              loading={pdfGenerating}
              icon={<Download className="w-4 h-4 text-[#E6E65A]" />}
              disabled={filteredRecords.length === 0}
            >
              Export Official PDF
            </Button>
          </div>
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
          {/* Period selector */}
          <div>
            <label className="block text-xs font-bold text-[#23285E] mb-1.5 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#3591C8]" />
              <span>Reporting Period</span>
            </label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodType)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-[#1F222C] cursor-pointer"
            >
              <option value="today">Daily (Today)</option>
              <option value="yesterday">Daily (Yesterday)</option>
              <option value="this_week">Weekly (This Week)</option>
              <option value="last_week">Weekly (Last Week)</option>
              <option value="this_month">Monthly (This Month)</option>
              <option value="last_month">Monthly (Last Month)</option>
              <option value="last_3_months">3-Month Period (Quarter)</option>
              <option value="last_4_months">4-Month Period (Trimester)</option>
              <option value="this_year">Yearly (Full Year)</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {/* Service filter */}
          <div>
            <label className="block text-xs font-bold text-[#23285E] mb-1.5 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-[#3591C8]" />
              <span>Service Scope</span>
            </label>
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-[#1F222C] cursor-pointer"
            >
              <option value="all">All 9 Youth Services</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Sex filter */}
          <div>
            <label className="block text-xs font-bold text-[#23285E] mb-1.5 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-[#3591C8]" />
              <span>Gender Scope</span>
            </label>
            <select
              value={sexFilter}
              onChange={(e) => setSexFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-[#1F222C] cursor-pointer"
            >
              <option value="all">All Genders (Male & Female)</option>
              <option value="Male">Male Youths Only</option>
              <option value="Female">Female Youths Only</option>
            </select>
          </div>

          {/* Date range inputs if custom */}
          {period === 'custom' ? (
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-[10px] text-slate-500 mb-1">Start</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] text-slate-500 mb-1">End</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col justify-end">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Active Date Range</span>
              <p className="text-xs font-mono font-bold text-[#23285E] mt-1 truncate">
                {currentRange.startDate} → {currentRange.endDate}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Official Report Document Canvas (Printable & Export-Ready) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 sm:p-10 max-w-5xl mx-auto space-y-8 print:border-none print:shadow-none print:p-0">
        {/* Document Header Banner */}
        <div className="border-b-2 border-[#23285E] pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Logo size="lg" />
          </div>

          <div className="text-left sm:text-right space-y-1">
            <h2 className="text-sm font-extrabold text-[#23285E] uppercase tracking-wider font-georgia">
              Youth Services Attendance Report
            </h2>
            <p className="text-xs text-slate-600 font-semibold">
              District Center: <span className="text-[#3591C8]">{activeDistrictName}</span>
            </p>
            <p className="text-xs text-slate-500">
              Reporting Period: <strong className="text-slate-800">{currentRange.label}</strong>
            </p>
            <p className="text-[11px] text-slate-400">
              Generated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} by {userProfile?.fullName}
            </p>
          </div>
        </div>

        {/* 1. Executive Summary Grid */}
        <section className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#23285E]">
            1. Executive Attendance Summary
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Visits</span>
              <div className="text-2xl sm:text-3xl font-black text-[#23285E] font-roboto mt-1">
                {stats.filteredTotal.toLocaleString()}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">{stats.dailyAverage} visits / day avg</p>
            </div>

            <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200">
              <span className="text-[11px] font-semibold text-[#3591C8] uppercase">Male Visits</span>
              <div className="text-2xl sm:text-3xl font-black text-[#23285E] font-roboto mt-1">
                {stats.maleTotal.toLocaleString()}
              </div>
              <p className="text-[10px] text-slate-600 mt-1 font-semibold">{stats.malePercentage}% of total</p>
            </div>

            <div className="p-4 rounded-xl bg-pink-50/70 border border-pink-200">
              <span className="text-[11px] font-semibold text-pink-700 uppercase">Female Visits</span>
              <div className="text-2xl sm:text-3xl font-black text-[#23285E] font-roboto mt-1">
                {stats.femaleTotal.toLocaleString()}
              </div>
              <p className="text-[10px] text-slate-600 mt-1 font-semibold">{stats.femalePercentage}% of total</p>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200">
              <span className="text-[11px] font-semibold text-amber-800 uppercase">Top Service</span>
              <div className="text-lg font-bold text-[#23285E] truncate mt-1">
                {stats.mostRequestedService ? stats.mostRequestedService.serviceName : 'N/A'}
              </div>
              <p className="text-[10px] text-slate-600 mt-1">
                {stats.mostRequestedService ? `${stats.mostRequestedService.totalCount} visits (${stats.mostRequestedService.percentage}%)` : '0 visits'}
              </p>
            </div>
          </div>
        </section>

        {/* 2. Service Usage Breakdown Table */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#23285E]">
              2. Service Usage Breakdown Table
            </h3>
            <span className="text-xs text-slate-500 font-medium">{stats.serviceBreakdown.length} Services Evaluated</span>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#23285E] text-white font-bold">
                  <th className="py-3 px-4">Service Program</th>
                  <th className="py-3 px-4 text-right">Male Visits</th>
                  <th className="py-3 px-4 text-right">Female Visits</th>
                  <th className="py-3 px-4 text-right">Total Visits</th>
                  <th className="py-3 px-4 text-right">Share (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {stats.serviceBreakdown.map((srv, idx) => (
                  <tr key={srv.serviceId} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                    <td className="py-3 px-4 font-semibold text-[#23285E]">
                      {srv.serviceName}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">
                      {srv.maleCount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">
                      {srv.femaleCount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-[#23285E]">
                      {srv.totalCount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-600">
                      {srv.percentage}%
                    </td>
                  </tr>
                ))}
                {/* Total Row */}
                <tr className="bg-[#DFF8F5]/80 font-bold text-[#23285E] border-t-2 border-slate-300">
                  <td className="py-3 px-4 uppercase tracking-wider font-extrabold">
                    Total Service Attendance
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-black">
                    {stats.maleTotal.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-black">
                    {stats.femaleTotal.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-black text-sm text-[#23285E]">
                    {stats.filteredTotal.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-black">
                    100.0%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 3. Key Observations & Data Insights */}
        <section className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#23285E]">
            3. Key Operational Observations & Trends
          </h3>

          <div className="space-y-2.5">
            {insights.map((ins) => (
              <div key={ins.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-[#23285E]">{ins.headline}</span>
                  {ins.metric && <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded font-mono font-bold">{ins.metric}</span>}
                </div>
                <p className="text-slate-600 leading-relaxed">{ins.observation}</p>
                <p className="text-slate-500 mt-1 font-medium"><strong className="text-slate-700">Implication:</strong> {ins.implication}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Institutional Document Footer */}
        <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <div>
            <p className="font-bold text-[#23285E]">NYABIHU YEGO CENTER</p>
            <p className="text-[11px] text-slate-400">Youth Services Attendance & Management Platform • Republic of Rwanda</p>
          </div>
          <div className="text-left sm:text-right text-[11px]">
            <p>Verified Administrative Attendance Record</p>
            <p className="text-slate-400">Page 1 of 1</p>
          </div>
        </div>
      </div>

      {/* Column Customizer Modal */}
      <ColumnCustomizerModal
        isOpen={isColumnModalOpen}
        onClose={() => setIsColumnModalOpen(false)}
        columnsConfig={columnsConfig}
        onChangeConfig={handleUpdateColumns}
        onReset={handleResetColumns}
        title="Customize Report Export Fields"
        subtitle="Manage which attendance columns are included in generated Excel, CSV, and tabular data exports."
      />
    </div>
  );
};
