import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Save,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Heading,
  Layers,
  FileDown,
  Info,
  Type
} from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { ExportTitlesConfig } from '../../types';
import { DEFAULT_EXPORT_TITLES, loadSavedExportTitles, saveExportTitles } from '../../constants/exportTitles';

interface ExportTitlesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (config: ExportTitlesConfig) => void;
  onExportExcel?: (customTitles: ExportTitlesConfig) => void;
  onExportPDF?: (customTitles: ExportTitlesConfig) => void;
  showPdfExport?: boolean;
}

export const ExportTitlesModal: React.FC<ExportTitlesModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onExportExcel,
  onExportPDF,
  showPdfExport = true,
}) => {
  const [titles, setTitles] = useState<ExportTitlesConfig>(DEFAULT_EXPORT_TITLES);
  const [activeTab, setActiveTab] = useState<'excel' | 'pdf' | 'sheets' | 'preview'>('excel');
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitles(loadSavedExportTitles());
      setIsDirty(false);
    }
  }, [isOpen]);

  const handleChange = (field: keyof ExportTitlesConfig, value: string) => {
    setTitles((prev) => ({
      ...prev,
      [field]: value,
    }));
    setIsDirty(true);
  };

  const handleResetDefaults = () => {
    setTitles(DEFAULT_EXPORT_TITLES);
    setIsDirty(true);
  };

  const handleSaveOnly = () => {
    saveExportTitles(titles);
    setIsDirty(false);
    if (onSave) onSave(titles);
    onClose();
  };

  const handleSaveAndExportExcel = () => {
    saveExportTitles(titles);
    setIsDirty(false);
    if (onSave) onSave(titles);
    if (onExportExcel) {
      onExportExcel(titles);
      onClose();
    }
  };

  const handleSaveAndExportPDF = () => {
    saveExportTitles(titles);
    setIsDirty(false);
    if (onSave) onSave(titles);
    if (onExportPDF) {
      onExportPDF(titles);
      onClose();
    }
  };

  // Preset templates
  const applyPreset = (preset: 'default' | 'ministry' | 'formal') => {
    if (preset === 'default') {
      setTitles(DEFAULT_EXPORT_TITLES);
    } else if (preset === 'ministry') {
      setTitles({
        ...DEFAULT_EXPORT_TITLES,
        reportMainTitle: 'MINIYOUTH - NYABIHU YEGO CENTER',
        reportSubTitle: 'Youth Empowerment for Global Opportunity • Official Attendance & Impact Report',
        excelRegisterTitle: 'REPUBLIC OF RWANDA • MINIYOUTH - NYABIHU YEGO CENTER ATTENDANCE REGISTER',
        excelLocationHeader: 'Nyabihu District, Western Province • Youth Empowerment Center',
        pdfSection1Title: '1. National Youth Attendance & Reach Summary',
        pdfSection2Title: '2. Youth Program & Service Utilization Breakdown',
        pdfSection3Title: '3. Strategic Observations & Youth Demographic Insights',
        pdfFooterText: 'MINISTRY OF YOUTH AND ARTS • NYABIHU YEGO CENTER STATISTICAL ARCHIVE',
        preparedByLabel: 'Report Authorized By',
      });
    } else if (preset === 'formal') {
      setTitles({
        ...DEFAULT_EXPORT_TITLES,
        reportMainTitle: 'NYABIHU DISTRICT YEGO CENTER',
        reportSubTitle: 'Comprehensive Youth Service Delivery & Monitoring Report',
        excelRegisterTitle: 'NYABIHU DISTRICT YEGO CENTER - OFFICIAL BENEFICIARY VISITATION REGISTER',
        excelLocationHeader: 'Nyabihu District Youth Center - Mukamira Sector',
        pdfSection1Title: '1. Executive Summary & Period Metrics',
        pdfSection2Title: '2. Service & Training Participation Matrix',
        pdfSection3Title: '3. Key Observations & Program Recommendations',
        pdfFooterText: 'NYABIHU DISTRICT YEGO CENTER • Official Administrative Record',
        preparedByLabel: 'Prepared and Certified By',
      });
    }
    setIsDirty(true);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Customize Export Titles & Report Headers"
      subtitle="Edit the titles, headers, and section names that appear on generated Excel (.xlsx) and PDF reports"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-5">
        {/* Preset quick buttons */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#23285E]">
            <Sparkles className="w-4 h-4 text-[#3591C8]" />
            <span>Quick Presets:</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => applyPreset('default')}
              className="px-2.5 py-1 text-xs font-medium bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer transition-colors"
            >
              Standard YEGO
            </button>
            <button
              type="button"
              onClick={() => applyPreset('ministry')}
              className="px-2.5 py-1 text-xs font-medium bg-white text-[#23285E] hover:bg-blue-50 border border-blue-200 rounded-lg cursor-pointer transition-colors"
            >
              MINIYOUTH Institutional
            </button>
            <button
              type="button"
              onClick={() => applyPreset('formal')}
              className="px-2.5 py-1 text-xs font-medium bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200 rounded-lg cursor-pointer transition-colors"
            >
              District Administrative
            </button>
          </div>
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-slate-200 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('excel')}
            className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'excel'
                ? 'border-[#3591C8] text-[#23285E]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Excel (.xlsx) Titles</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pdf')}
            className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'pdf'
                ? 'border-[#3591C8] text-[#23285E]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="w-4 h-4 text-rose-600" />
            <span>PDF Report Titles</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sheets')}
            className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'sheets'
                ? 'border-[#3591C8] text-[#23285E]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Worksheet & Author Labels</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'preview'
                ? 'border-[#3591C8] text-[#23285E]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Type className="w-4 h-4 text-amber-600" />
            <span>Live Header Preview</span>
          </button>
        </div>

        {/* Tab 1: Excel Titles */}
        {activeTab === 'excel' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Excel Register Main Title (Row 1 Header)
              </label>
              <input
                type="text"
                value={titles.excelRegisterTitle}
                onChange={(e) => handleChange('excelRegisterTitle', e.target.value)}
                placeholder="e.g. NYABIHU YEGO CENTER - OFFICIAL YOUTH ATTENDANCE REGISTER"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3591C8] focus:border-[#3591C8]"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Appears bold across the top of the generated .xlsx attendance register worksheet.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Excel Location & Center Subtitle (Row 2 Header)
              </label>
              <input
                type="text"
                value={titles.excelLocationHeader}
                onChange={(e) => handleChange('excelLocationHeader', e.target.value)}
                placeholder="e.g. Nyabihu Youth Empowerment for Global Opportunity (YEGO) Center"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3591C8] focus:border-[#3591C8]"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Appears in the location row accompanying the district badge.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Primary Organization Name
                </label>
                <input
                  type="text"
                  value={titles.reportMainTitle}
                  onChange={(e) => handleChange('reportMainTitle', e.target.value)}
                  placeholder="e.g. NYABIHU YEGO CENTER"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3591C8] focus:border-[#3591C8]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Default Subtitle / System Purpose
                </label>
                <input
                  type="text"
                  value={titles.reportSubTitle}
                  onChange={(e) => handleChange('reportSubTitle', e.target.value)}
                  placeholder="e.g. Youth Services Attendance & Management Report"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3591C8] focus:border-[#3591C8]"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: PDF Report Titles */}
        {activeTab === 'pdf' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  PDF Banner Center Name
                </label>
                <input
                  type="text"
                  value={titles.reportMainTitle}
                  onChange={(e) => handleChange('reportMainTitle', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3591C8] focus:border-[#3591C8]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  PDF Banner Subtitle
                </label>
                <input
                  type="text"
                  value={titles.reportSubTitle}
                  onChange={(e) => handleChange('reportSubTitle', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3591C8] focus:border-[#3591C8]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Section 1 Title (Metrics Summary)
              </label>
              <input
                type="text"
                value={titles.pdfSection1Title}
                onChange={(e) => handleChange('pdfSection1Title', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3591C8] focus:border-[#3591C8]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Section 2 Title (Services Breakdown)
              </label>
              <input
                type="text"
                value={titles.pdfSection2Title}
                onChange={(e) => handleChange('pdfSection2Title', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3591C8] focus:border-[#3591C8]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Section 3 Title (Insights & Observations)
              </label>
              <input
                type="text"
                value={titles.pdfSection3Title}
                onChange={(e) => handleChange('pdfSection3Title', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3591C8] focus:border-[#3591C8]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                PDF Footer Legal / System Citation
              </label>
              <input
                type="text"
                value={titles.pdfFooterText}
                onChange={(e) => handleChange('pdfFooterText', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3591C8] focus:border-[#3591C8]"
              />
            </div>
          </div>
        )}

        {/* Tab 3: Worksheets & Labels */}
        {activeTab === 'sheets' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sheet 1 Tab Name
                </label>
                <input
                  type="text"
                  maxLength={30}
                  value={titles.attendanceSheetTitle}
                  onChange={(e) => handleChange('attendanceSheetTitle', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3591C8] focus:border-[#3591C8]"
                />
                <p className="text-[10px] text-slate-400 mt-1">Main attendance list tab</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sheet 2 Tab Name
                </label>
                <input
                  type="text"
                  maxLength={30}
                  value={titles.serviceSummarySheetTitle}
                  onChange={(e) => handleChange('serviceSummarySheetTitle', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3591C8] focus:border-[#3591C8]"
                />
                <p className="text-[10px] text-slate-400 mt-1">Services summary tab</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sheet 3 Tab Name
                </label>
                <input
                  type="text"
                  maxLength={30}
                  value={titles.sectorSummarySheetTitle}
                  onChange={(e) => handleChange('sectorSummarySheetTitle', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3591C8] focus:border-[#3591C8]"
                />
                <p className="text-[10px] text-slate-400 mt-1">Sectors breakdown tab</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Author / Generator Prefix Label
              </label>
              <input
                type="text"
                value={titles.preparedByLabel}
                onChange={(e) => handleChange('preparedByLabel', e.target.value)}
                placeholder="e.g. Generated By, Exported By, Certified By"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3591C8] focus:border-[#3591C8]"
              />
            </div>
          </div>
        )}

        {/* Tab 4: Live Preview */}
        {activeTab === 'preview' && (
          <div className="space-y-4">
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-900 text-white shadow-xs">
              <div className="text-[10px] uppercase font-bold text-[#E6E65A] mb-1">
                Excel (.xlsx) Header Preview
              </div>
              <div className="text-base font-extrabold text-white tracking-wide">
                {titles.excelRegisterTitle}
              </div>
              <div className="text-xs text-slate-300 mt-0.5">
                Location: NYABIHU DISTRICT | {titles.excelLocationHeader}
              </div>
              <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-4">
                <span>Date Range: This Month (2026-08-01 to 2026-08-31)</span>
                <span>{titles.preparedByLabel}: Administrator</span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs">
              <div className="text-[10px] uppercase font-bold text-[#3591C8] mb-1">
                PDF Document Header Preview
              </div>
              <div className="bg-[#23285E] text-white p-3 rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-sm font-extrabold">{titles.reportMainTitle}</div>
                  <div className="text-[11px] text-[#DFF8F5]">{titles.reportSubTitle}</div>
                </div>
                <div className="text-[10px] font-bold bg-white/10 px-2 py-1 rounded">
                  DISTRICT: NYABIHU
                </div>
              </div>
              <div className="mt-3 space-y-1.5 text-xs text-slate-700">
                <div className="font-bold text-[#23285E]">{titles.pdfSection1Title}</div>
                <div className="font-bold text-[#23285E]">{titles.pdfSection2Title}</div>
                <div className="font-bold text-[#23285E]">{titles.pdfSection3Title}</div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-200 text-[10px] text-slate-400">
                {titles.pdfFooterText}
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 cursor-pointer py-1 px-2 rounded hover:bg-slate-100 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Default Titles</span>
          </button>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveOnly}
              icon={<Save className="w-3.5 h-3.5 text-[#3591C8]" />}
            >
              Save Titles
            </Button>

            {onExportExcel && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveAndExportExcel}
                icon={<FileSpreadsheet className="w-3.5 h-3.5 text-[#E6E65A]" />}
                className="bg-emerald-700 hover:bg-emerald-800 text-white"
              >
                Save & Export .xlsx
              </Button>
            )}

            {showPdfExport && onExportPDF && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveAndExportPDF}
                icon={<FileText className="w-3.5 h-3.5 text-[#E6E65A]" />}
              >
                Save & Export PDF
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
