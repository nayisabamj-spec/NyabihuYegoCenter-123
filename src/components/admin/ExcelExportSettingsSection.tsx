import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Palette,
  ChevronUp,
  ChevronDown,
  Lock,
  ShieldAlert,
  RotateCcw,
  Check,
  Eye,
  Image as ImageIcon,
  FileText,
  Layers,
} from 'lucide-react';
import {
  ALL_EXCEL_COLUMNS,
  DEFAULT_EXCEL_HEADER_ACCENT_COLOR,
  DEFAULT_EXCEL_SECONDARY_COLOR,
  DEFAULT_EXCEL_YELLOW_ACCENT_COLOR,
  DEFAULT_EXCEL_HEADER_TEXT_COLOR,
  DEFAULT_EXCEL_SUBTITLE,
  DEFAULT_EXCEL_LOGO_URL,
  DEFAULT_INCLUDE_LOGO,
  DEFAULT_INCLUDE_BREAKDOWN_SHEETS,
  ExcelColumnDefinition,
  ExcelColumnKey,
} from '../../constants/excelExportSettings';
import { BRAND_CONFIG } from '../../constants/branding';
import { SystemSettings } from '../../types';
import { Button } from '../common/Button';

interface ExcelExportSettingsSectionProps {
  settings: SystemSettings;
  centerName: string;
  onSave: (updates: {
    logoUrl?: string;
    includeLogoInExcel?: boolean;
    includeLogoInPdf?: boolean;
    excelHeaderAccentColor: string;
    excelSecondaryColor: string;
    excelYellowAccentColor: string;
    excelHeaderTextColor: string;
    excelSubtitle: string;
    excelExportColumns: string[];
    excelColumnOrder: string[];
    includeServiceBreakdownSheet?: boolean;
    includeSectorBreakdownSheet?: boolean;
  }) => Promise<void>;
  saving: boolean;
}

const PRIMARY_COLOR_PRESETS = [
  { name: 'Primary Navy (Brand)', hex: '#23285E' },
  { name: 'Dark Slate', hex: '#1E293B' },
  { name: 'Classic Blue', hex: '#1E3A8A' },
  { name: 'Midnight', hex: '#0F172A' },
  { name: 'Forest Green (Excel)', hex: '#107C41' },
];

const SECONDARY_COLOR_PRESETS = [
  { name: 'Secondary Teal (Brand)', hex: '#3591C8' },
  { name: 'Sky Blue', hex: '#0284C7' },
  { name: 'Teal Green', hex: '#0D9488' },
  { name: 'Cobalt', hex: '#2563EB' },
];

const YELLOW_COLOR_PRESETS = [
  { name: 'Sun Yellow (Brand)', hex: '#E6E65A' },
  { name: 'Amber Gold', hex: '#F59E0B' },
  { name: 'Vibrant Yellow', hex: '#EAB308' },
  { name: 'Canary', hex: '#FACC15' },
];

export const ExcelExportSettingsSection: React.FC<ExcelExportSettingsSectionProps> = ({
  settings,
  centerName,
  onSave,
  saving,
}) => {
  // Logo settings
  const [logoUrl, setLogoUrl] = useState<string>(settings.logoUrl || DEFAULT_EXCEL_LOGO_URL);
  const [includeLogoInExcel, setIncludeLogoInExcel] = useState<boolean>(
    settings.includeLogoInExcel ?? DEFAULT_INCLUDE_LOGO
  );
  const [includeLogoInPdf, setIncludeLogoInPdf] = useState<boolean>(
    settings.includeLogoInPdf ?? DEFAULT_INCLUDE_LOGO
  );

  // Theme color settings
  const [headerAccentColor, setHeaderAccentColor] = useState<string>(
    settings.excelHeaderAccentColor || DEFAULT_EXCEL_HEADER_ACCENT_COLOR
  );
  const [secondaryColor, setSecondaryColor] = useState<string>(
    settings.excelSecondaryColor || DEFAULT_EXCEL_SECONDARY_COLOR
  );
  const [yellowAccentColor, setYellowAccentColor] = useState<string>(
    settings.excelYellowAccentColor || DEFAULT_EXCEL_YELLOW_ACCENT_COLOR
  );
  const [headerTextColor, setHeaderTextColor] = useState<string>(
    settings.excelHeaderTextColor || DEFAULT_EXCEL_HEADER_TEXT_COLOR
  );

  // Subtitle
  const [subtitle, setSubtitle] = useState<string>(
    settings.excelSubtitle || DEFAULT_EXCEL_SUBTITLE
  );

  // Sheet inclusion settings
  const [includeServiceSheet, setIncludeServiceSheet] = useState<boolean>(
    settings.includeServiceBreakdownSheet ?? DEFAULT_INCLUDE_BREAKDOWN_SHEETS
  );
  const [includeSectorSheet, setIncludeSectorSheet] = useState<boolean>(
    settings.includeSectorBreakdownSheet ?? DEFAULT_INCLUDE_BREAKDOWN_SHEETS
  );

  // Maintain ordered column keys
  const [orderedKeys, setOrderedKeys] = useState<ExcelColumnKey[]>(() => {
    if (Array.isArray(settings.excelColumnOrder) && settings.excelColumnOrder.length > 0) {
      const existing = [...settings.excelColumnOrder] as ExcelColumnKey[];
      ALL_EXCEL_COLUMNS.forEach((c) => {
        if (!existing.includes(c.key)) existing.push(c.key);
      });
      return existing;
    }
    return ALL_EXCEL_COLUMNS.map((c) => c.key);
  });

  // Track enabled state for each column
  const [enabledMap, setEnabledMap] = useState<Record<ExcelColumnKey, boolean>>(() => {
    const initialMap: Record<ExcelColumnKey, boolean> = {
      no: true,
      personName: true,
      sex: true,
      serviceName: true,
      districtName: true,
      sector: true,
      cell: true,
      village: true,
      phoneNumber: true,
      nationalId: false, // Default to OFF for privacy & sensitive data
    };

    if (Array.isArray(settings.excelExportColumns) && settings.excelExportColumns.length > 0) {
      ALL_EXCEL_COLUMNS.forEach((c) => {
        initialMap[c.key] = settings.excelExportColumns!.includes(c.key);
      });
      initialMap.no = true;
      initialMap.personName = true;
    }

    return initialMap;
  });

  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);
  const [imgLoadError, setImgLoadError] = useState(false);

  // Sync with Firestore settings
  useEffect(() => {
    if (settings.logoUrl !== undefined) setLogoUrl(settings.logoUrl || DEFAULT_EXCEL_LOGO_URL);
    if (settings.includeLogoInExcel !== undefined) setIncludeLogoInExcel(settings.includeLogoInExcel);
    if (settings.includeLogoInPdf !== undefined) setIncludeLogoInPdf(settings.includeLogoInPdf);
    if (settings.excelHeaderAccentColor) setHeaderAccentColor(settings.excelHeaderAccentColor);
    if (settings.excelSecondaryColor) setSecondaryColor(settings.excelSecondaryColor);
    if (settings.excelYellowAccentColor) setYellowAccentColor(settings.excelYellowAccentColor);
    if (settings.excelHeaderTextColor) setHeaderTextColor(settings.excelHeaderTextColor);
    if (settings.excelSubtitle !== undefined) setSubtitle(settings.excelSubtitle);
    if (settings.includeServiceBreakdownSheet !== undefined)
      setIncludeServiceSheet(settings.includeServiceBreakdownSheet);
    if (settings.includeSectorBreakdownSheet !== undefined)
      setIncludeSectorSheet(settings.includeSectorBreakdownSheet);

    if (Array.isArray(settings.excelColumnOrder) && settings.excelColumnOrder.length > 0) {
      const existing = [...settings.excelColumnOrder] as ExcelColumnKey[];
      ALL_EXCEL_COLUMNS.forEach((c) => {
        if (!existing.includes(c.key)) existing.push(c.key);
      });
      setOrderedKeys(existing);
    }

    if (Array.isArray(settings.excelExportColumns)) {
      const map: Record<ExcelColumnKey, boolean> = {
        no: true,
        personName: true,
        sex: false,
        serviceName: false,
        districtName: false,
        sector: false,
        cell: false,
        village: false,
        phoneNumber: false,
        nationalId: false,
      };
      ALL_EXCEL_COLUMNS.forEach((c) => {
        map[c.key] = settings.excelExportColumns!.includes(c.key);
      });
      map.no = true;
      map.personName = true;
      setEnabledMap(map);
    }
  }, [
    settings.logoUrl,
    settings.includeLogoInExcel,
    settings.includeLogoInPdf,
    settings.excelHeaderAccentColor,
    settings.excelSecondaryColor,
    settings.excelYellowAccentColor,
    settings.excelHeaderTextColor,
    settings.excelSubtitle,
    settings.excelExportColumns,
    settings.excelColumnOrder,
    settings.includeServiceBreakdownSheet,
    settings.includeSectorBreakdownSheet,
  ]);

  const moveColumnUp = (index: number) => {
    if (index <= 0) return;
    const newOrder = [...orderedKeys];
    const temp = newOrder[index - 1];
    newOrder[index - 1] = newOrder[index];
    newOrder[index] = temp;
    setOrderedKeys(newOrder);
  };

  const moveColumnDown = (index: number) => {
    if (index >= orderedKeys.length - 1) return;
    const newOrder = [...orderedKeys];
    const temp = newOrder[index + 1];
    newOrder[index + 1] = newOrder[index];
    newOrder[index] = temp;
    setOrderedKeys(newOrder);
  };

  const toggleColumn = (key: ExcelColumnKey) => {
    if (key === 'no' || key === 'personName') return;
    setEnabledMap((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleResetDefaults = () => {
    setLogoUrl(DEFAULT_EXCEL_LOGO_URL);
    setIncludeLogoInExcel(true);
    setIncludeLogoInPdf(true);
    setHeaderAccentColor(DEFAULT_EXCEL_HEADER_ACCENT_COLOR);
    setSecondaryColor(DEFAULT_EXCEL_SECONDARY_COLOR);
    setYellowAccentColor(DEFAULT_EXCEL_YELLOW_ACCENT_COLOR);
    setHeaderTextColor(DEFAULT_EXCEL_HEADER_TEXT_COLOR);
    setSubtitle(DEFAULT_EXCEL_SUBTITLE);
    setIncludeServiceSheet(true);
    setIncludeSectorSheet(true);
    setOrderedKeys(ALL_EXCEL_COLUMNS.map((c) => c.key));
    setEnabledMap({
      no: true,
      personName: true,
      sex: true,
      serviceName: true,
      districtName: true,
      sector: true,
      cell: true,
      village: true,
      phoneNumber: true,
      nationalId: false,
    });
  };

  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeExportCols = orderedKeys.filter((k) => enabledMap[k]);

    if (!activeExportCols.includes('no')) activeExportCols.unshift('no');
    if (!activeExportCols.includes('personName')) {
      const noIdx = activeExportCols.indexOf('no');
      activeExportCols.splice(noIdx + 1, 0, 'personName');
    }

    await onSave({
      logoUrl: logoUrl.trim() || DEFAULT_EXCEL_LOGO_URL,
      includeLogoInExcel,
      includeLogoInPdf,
      excelHeaderAccentColor: headerAccentColor.trim() || DEFAULT_EXCEL_HEADER_ACCENT_COLOR,
      excelSecondaryColor: secondaryColor.trim() || DEFAULT_EXCEL_SECONDARY_COLOR,
      excelYellowAccentColor: yellowAccentColor.trim() || DEFAULT_EXCEL_YELLOW_ACCENT_COLOR,
      excelHeaderTextColor: headerTextColor.trim() || DEFAULT_EXCEL_HEADER_TEXT_COLOR,
      excelSubtitle: subtitle.trim() || DEFAULT_EXCEL_SUBTITLE,
      excelExportColumns: activeExportCols,
      excelColumnOrder: orderedKeys,
      includeServiceBreakdownSheet: includeServiceSheet,
      includeSectorBreakdownSheet: includeSectorSheet,
    });

    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 4000);
  };

  const activeColumnsCount = orderedKeys.filter((k) => enabledMap[k]).length;
  const activeExportColsList = orderedKeys
    .filter((k) => enabledMap[k])
    .map((k) => ALL_EXCEL_COLUMNS.find((c) => c.key === k)!)
    .filter(Boolean);

  return (
    <div className="pt-6 mt-6 border-t border-slate-200 space-y-6" id="excel-pdf-export-settings">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#23285E]/10 border border-[#23285E]/20 flex items-center justify-center text-[#23285E]">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#23285E]">Branded Excel & PDF Export Settings</h4>
            <p className="text-xs text-slate-500">
              Customize colors (blue, white & yellow branding), embedded logo, subtitles, sheets, and active column sequence
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleResetDefaults}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
          title="Restore standard Nyabihu YEGO blue, white and yellow branding"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Defaults
        </button>
      </div>

      {saveSuccessNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          Export branding & column settings saved and updated in database successfully!
        </div>
      )}

      <form onSubmit={handleSaveSection} className="space-y-6 text-xs">
        {/* 1. Official Logo & Asset Settings */}
        <div className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-4 space-y-4">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-[#3591C8]" />
            <h5 className="text-xs font-bold text-[#23285E] uppercase tracking-wider">
              Logo & Visual Branding
            </h5>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            {/* Logo Preview & Input */}
            <div className="md:col-span-2 space-y-2">
              <label className="block text-xs font-bold text-[#23285E]">
                Official Logo Image URL
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => {
                    setLogoUrl(e.target.value);
                    setImgLoadError(false);
                  }}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    setLogoUrl(DEFAULT_EXCEL_LOGO_URL);
                    setImgLoadError(false);
                  }}
                  className="px-3 py-2 text-xs font-medium text-[#23285E] bg-white border border-slate-300 hover:bg-slate-50 rounded-xl whitespace-nowrap cursor-pointer"
                  title="Use default Nyabihu YEGO logo"
                >
                  Default Logo
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                This logo is embedded directly inside exported Excel sheets and PDF reports.
              </p>
            </div>

            {/* Thumbnail Preview Box */}
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-center gap-3">
              <div className="w-14 h-14 rounded-lg bg-[#23285E] p-1 flex items-center justify-center overflow-hidden border border-[#3591C8]/30">
                {!imgLoadError && logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Export Logo Preview"
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                    onError={() => setImgLoadError(true)}
                  />
                ) : (
                  <div className="text-[10px] text-center text-white font-bold leading-tight">
                    YEGO LOGO
                  </div>
                )}
              </div>
              <div className="text-left leading-tight">
                <span className="text-xs font-bold text-[#23285E] block">Export Logo</span>
                <span className="text-[10px] text-slate-400">Embedded in Header</span>
              </div>
            </div>
          </div>

          {/* Logo Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/60">
            <label className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200 cursor-pointer">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-[#23285E] text-xs">Embed Logo in Excel Files</span>
              </div>
              <input
                type="checkbox"
                checked={includeLogoInExcel}
                onChange={(e) => setIncludeLogoInExcel(e.target.checked)}
                className="w-4 h-4 text-[#23285E] rounded border-slate-300 focus:ring-[#23285E]"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200 cursor-pointer">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-rose-600" />
                <span className="font-semibold text-[#23285E] text-xs">Embed Logo in PDF Files</span>
              </div>
              <input
                type="checkbox"
                checked={includeLogoInPdf}
                onChange={(e) => setIncludeLogoInPdf(e.target.checked)}
                className="w-4 h-4 text-[#23285E] rounded border-slate-300 focus:ring-[#23285E]"
              />
            </label>
          </div>
        </div>

        {/* 2. Color Palette (Blue, White & Yellow) */}
        <div className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-[#3591C8]" />
            <h5 className="text-xs font-bold text-[#23285E] uppercase tracking-wider">
              Brand Color Palette (Blue, White & Yellow)
            </h5>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Primary Navy Blue */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#23285E]">
                Primary Header Fill (Blue/Navy)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={headerAccentColor}
                  onChange={(e) => setHeaderAccentColor(e.target.value)}
                  className="w-8 h-8 p-0.5 rounded-lg border border-slate-300 cursor-pointer bg-white"
                />
                <input
                  type="text"
                  value={headerAccentColor}
                  onChange={(e) => setHeaderAccentColor(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono uppercase font-semibold text-xs"
                />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {PRIMARY_COLOR_PRESETS.map((p) => (
                  <button
                    key={p.hex}
                    type="button"
                    onClick={() => setHeaderAccentColor(p.hex)}
                    className={`w-4 h-4 rounded-full border transition-transform ${
                      headerAccentColor.toLowerCase() === p.hex.toLowerCase()
                        ? 'ring-2 ring-offset-1 ring-[#23285E] scale-110'
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: p.hex }}
                    title={p.name}
                  />
                ))}
              </div>
            </div>

            {/* Secondary Teal Blue */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#23285E]">
                Secondary Accent (Teal Blue)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-8 h-8 p-0.5 rounded-lg border border-slate-300 cursor-pointer bg-white"
                />
                <input
                  type="text"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono uppercase font-semibold text-xs"
                />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {SECONDARY_COLOR_PRESETS.map((p) => (
                  <button
                    key={p.hex}
                    type="button"
                    onClick={() => setSecondaryColor(p.hex)}
                    className={`w-4 h-4 rounded-full border transition-transform ${
                      secondaryColor.toLowerCase() === p.hex.toLowerCase()
                        ? 'ring-2 ring-offset-1 ring-[#3591C8] scale-110'
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: p.hex }}
                    title={p.name}
                  />
                ))}
              </div>
            </div>

            {/* Sun Yellow Accent */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#23285E]">
                Yellow Brand Accent Line
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={yellowAccentColor}
                  onChange={(e) => setYellowAccentColor(e.target.value)}
                  className="w-8 h-8 p-0.5 rounded-lg border border-slate-300 cursor-pointer bg-white"
                />
                <input
                  type="text"
                  value={yellowAccentColor}
                  onChange={(e) => setYellowAccentColor(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono uppercase font-semibold text-xs"
                />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {YELLOW_COLOR_PRESETS.map((p) => (
                  <button
                    key={p.hex}
                    type="button"
                    onClick={() => setYellowAccentColor(p.hex)}
                    className={`w-4 h-4 rounded-full border transition-transform ${
                      yellowAccentColor.toLowerCase() === p.hex.toLowerCase()
                        ? 'ring-2 ring-offset-1 ring-[#E6E65A] scale-110'
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: p.hex }}
                    title={p.name}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Subtitle Line */}
          <div className="pt-2 border-t border-slate-200/60">
            <label className="block text-xs font-bold text-[#23285E] mb-1">
              Report Subtitle Line
            </label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Attendance Report — Nyabihu District"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
            />
          </div>
        </div>

        {/* 3. Multi-Sheet Inclusion Settings */}
        <div className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#3591C8]" />
            <h5 className="text-xs font-bold text-[#23285E] uppercase tracking-wider">
              Excel Workbook Sheets Included
            </h5>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200 cursor-pointer">
              <span className="font-semibold text-[#23285E] text-xs">
                Include Service Breakdown Sheet
              </span>
              <input
                type="checkbox"
                checked={includeServiceSheet}
                onChange={(e) => setIncludeServiceSheet(e.target.checked)}
                className="w-4 h-4 text-[#23285E] rounded border-slate-300 focus:ring-[#23285E]"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200 cursor-pointer">
              <span className="font-semibold text-[#23285E] text-xs">
                Include Nyabihu Sector Breakdown Sheet
              </span>
              <input
                type="checkbox"
                checked={includeSectorSheet}
                onChange={(e) => setIncludeSectorSheet(e.target.checked)}
                className="w-4 h-4 text-[#23285E] rounded border-slate-300 focus:ring-[#23285E]"
              />
            </label>
          </div>
        </div>

        {/* 4. Column Selection & Sequence Ordering */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h5 className="text-xs font-bold text-[#23285E] uppercase tracking-wider">
                Export Column Selection & Ordering
              </h5>
              <p className="text-[11px] text-slate-500">
                Use arrows to adjust column sequence; toggle switches to include or omit columns in exported workbooks and PDFs.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-[#3591C8] border border-blue-200">
              {activeColumnsCount} of {orderedKeys.length} Columns Active
            </span>
          </div>

          {/* Draggable/Reorderable Column Checklist */}
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white overflow-hidden shadow-2xs">
            {orderedKeys.map((colKey, index) => {
              const def = ALL_EXCEL_COLUMNS.find((c) => c.key === colKey);
              if (!def) return null;

              const isEnabled = !!enabledMap[colKey];
              const isLocked = def.required;
              const isSensitive = def.sensitive;

              return (
                <div
                  key={def.key}
                  className={`flex items-center justify-between p-2.5 sm:px-3.5 transition-colors ${
                    isEnabled ? 'bg-white hover:bg-slate-50/70' : 'bg-slate-50/40 text-slate-400'
                  }`}
                >
                  {/* Left: Index, Reorder Buttons & Column Identity */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 text-[11px] font-mono font-bold text-slate-400 text-center">
                      #{index + 1}
                    </span>

                    {/* Up & Down Sequence Controls */}
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => moveColumnUp(index)}
                        className={`p-1 rounded hover:bg-slate-100 transition-colors ${
                          index === 0 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-600 cursor-pointer'
                        }`}
                        title="Move Column Up"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={index === orderedKeys.length - 1}
                        onClick={() => moveColumnDown(index)}
                        className={`p-1 rounded hover:bg-slate-100 transition-colors ${
                          index === orderedKeys.length - 1
                            ? 'text-slate-200 cursor-not-allowed'
                            : 'text-slate-600 cursor-pointer'
                        }`}
                        title="Move Column Down"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Column Labels & Badges */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`font-bold text-xs ${isEnabled ? 'text-[#23285E]' : 'text-slate-400'}`}>
                          {def.label}
                        </span>
                        <span className="text-[11px] text-slate-400">({def.labelKinyarwanda})</span>

                        {isLocked && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            <Lock className="w-2.5 h-2.5" />
                            Required
                          </span>
                        )}

                        {isSensitive && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <ShieldAlert className="w-2.5 h-2.5 text-amber-600" />
                            Sensitive Data (Default: OFF)
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 truncate">
                        Header: <span className="font-mono text-slate-600">{def.exportHeader}</span>
                      </p>
                    </div>
                  </div>

                  {/* Right: Toggle Switch */}
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        disabled={isLocked}
                        onChange={() => toggleColumn(def.key)}
                        className="sr-only peer"
                      />
                      <div
                        className={`w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all ${
                          isLocked
                            ? 'opacity-80 cursor-not-allowed peer-checked:bg-[#23285E]'
                            : 'peer-checked:bg-[#3591C8]'
                        }`}
                      ></div>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 5. Live Interactive Excel & PDF Preview */}
        <div className="bg-slate-900 rounded-xl p-4 text-white space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#3591C8]" />
              <span className="font-bold uppercase tracking-wider text-slate-300 text-[11px]">
                Live Branded Excel & PDF Preview
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: headerAccentColor }} />
              <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: secondaryColor }} />
              <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: yellowAccentColor }} />
            </div>
          </div>

          <div className="overflow-x-auto pb-1">
            <div className="border border-slate-700 rounded-lg overflow-hidden min-w-[600px] bg-slate-800">
              {/* Main title banner */}
              <div
                className="px-4 py-2.5 font-bold text-xs tracking-wide flex items-center justify-between"
                style={{ backgroundColor: headerAccentColor, color: headerTextColor }}
              >
                <div className="flex items-center gap-2.5">
                  {includeLogoInExcel && (
                    <div className="w-6 h-6 rounded bg-white/20 p-0.5 flex items-center justify-center shrink-0">
                      <img
                        src={logoUrl || BRAND_CONFIG.logoUrl}
                        alt="Logo"
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                  <span>{centerName || 'NYABIHU YEGO CENTER'} — OFFICIAL ATTENDANCE REGISTER</span>
                </div>
                <span className="text-[10px] font-mono opacity-80">RWANDA</span>
              </div>

              {/* Accent Yellow Bar */}
              <div className="h-1.5 w-full" style={{ backgroundColor: yellowAccentColor }} />

              {/* Subtitle row */}
              <div className="bg-slate-800 px-3 py-1.5 text-center text-[10px] text-slate-200 border-b border-slate-700">
                Location: NYABIHU DISTRICT | {subtitle || 'Attendance Report — Nyabihu District'}
              </div>

              {/* Column headers row */}
              <div
                className="grid grid-flow-col auto-cols-max divide-x divide-slate-700 text-[10px] font-semibold"
                style={{ backgroundColor: headerAccentColor, color: headerTextColor }}
              >
                {activeExportColsList.map((col) => (
                  <div key={col.key} className="px-2.5 py-1.5 whitespace-nowrap">
                    {col.exportHeader}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-2 flex items-center justify-between gap-3">
          <p className="text-[11px] text-slate-500">
            Settings take immediate effect on all Excel and PDF downloads across the platform.
          </p>

          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={saving}
            className="shadow-sm font-bold shrink-0"
          >
            Save Export Settings
          </Button>
        </div>
      </form>
    </div>
  );
};
