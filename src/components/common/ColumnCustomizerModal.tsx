import React from 'react';
import {
  SlidersHorizontal,
  RotateCcw,
  CheckSquare,
  Square,
  Sparkles,
  Info,
  CheckCircle2
} from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { ALL_COLUMNS, DEFAULT_COLUMNS_CONFIG } from '../../constants/columns';
import { ColumnsConfig, ColumnKey } from '../../types';

interface ColumnCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  columnsConfig: ColumnsConfig;
  onChangeConfig: (newConfig: ColumnsConfig) => void;
  onReset: () => void;
  title?: string;
  subtitle?: string;
}

export const ColumnCustomizerModal: React.FC<ColumnCustomizerModalProps> = ({
  isOpen,
  onClose,
  columnsConfig,
  onChangeConfig,
  onReset,
  title = 'Customize Columns & Report Fields',
  subtitle = 'Choose which fields to display in your attendance table, views, and generated report exports.',
}) => {
  const activeCount = Object.values(columnsConfig).filter(Boolean).length;

  const handleToggle = (key: ColumnKey) => {
    onChangeConfig({
      ...columnsConfig,
      [key]: !columnsConfig[key],
    });
  };

  const handleSelectAll = () => {
    const allOn: ColumnsConfig = { ...columnsConfig };
    ALL_COLUMNS.forEach((col) => {
      allOn[col.key] = true;
    });
    onChangeConfig(allOn);
  };

  const handleSetMinimal = () => {
    const min: ColumnsConfig = {
      attendanceDate: true,
      personName: true,
      sex: true,
      serviceName: true,
      districtName: true,
      sector: true,
      cell: false,
      village: false,
      phoneNumber: true,
      nationalId: false,
      email: false,
      attendanceTime: false,
      recordId: false,
      entryMethod: false,
      recordedBy: false,
      notes: false,
    };
    onChangeConfig(min);
  };

  const coreCols = ALL_COLUMNS.filter((c) => c.category === 'core');
  const demoCols = ALL_COLUMNS.filter((c) => c.category === 'demographics');
  const systemCols = ALL_COLUMNS.filter((c) => c.category === 'system');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-5 text-xs text-slate-700">
        {/* Quick Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 font-bold text-[#23285E]">
            <SlidersHorizontal className="w-4 h-4 text-[#3591C8]" />
            <span>Active Columns: <strong className="text-[#3591C8]">{activeCount}</strong> / {ALL_COLUMNS.length}</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={onReset}
              className="px-2.5 py-1 text-[11px] font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
              title="Reset to clean standard (omits Record ID, Time, Entry Method, Recorded By, Notes)"
            >
              <RotateCcw className="w-3 h-3 text-[#3591C8]" />
              Clean Standard
            </button>
            <button
              onClick={handleSetMinimal}
              className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Compact View
            </button>
            <button
              onClick={handleSelectAll}
              className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Select All
            </button>
          </div>
        </div>

        {/* Clean Guidelines Info */}
        <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-start gap-2.5 text-[11px] text-[#23285E]">
          <Info className="w-4 h-4 text-[#3591C8] shrink-0 mt-0.5" />
          <p>
            By default, administrative metadata fields (<strong>Record ID, Time, Entry Method, Recorded By, and Notes</strong>) are turned off to keep attendance tables and institutional reports clean and focused. You can toggle any of them on whenever needed.
          </p>
        </div>

        {/* Category 1: Core Youth & Service Information */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#23285E] flex items-center justify-between">
            <span>1. Core Service Information</span>
            <span className="text-[10px] text-slate-400 font-normal">Primary Identity & Program</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {coreCols.map((col) => {
              const isChecked = !!columnsConfig[col.key];
              return (
                <label
                  key={col.key}
                  onClick={() => handleToggle(col.key)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                    isChecked
                      ? 'bg-blue-50/60 border-blue-200 text-[#23285E]'
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <div className="pr-2">
                    <p className="font-bold text-xs">{col.label}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{col.labelKinyarwanda}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                    isChecked ? 'bg-[#3591C8] border-[#3591C8] text-white' : 'border-slate-300 bg-white'
                  }`}>
                    {isChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Category 2: Demographics, Location & Contact */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#23285E] flex items-center justify-between">
            <span>2. Demographics, Location & Contact</span>
            <span className="text-[10px] text-slate-400 font-normal">Administrative Territory & Reach</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {demoCols.map((col) => {
              const isChecked = !!columnsConfig[col.key];
              return (
                <label
                  key={col.key}
                  onClick={() => handleToggle(col.key)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                    isChecked
                      ? 'bg-blue-50/60 border-blue-200 text-[#23285E]'
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <div className="pr-2">
                    <p className="font-bold text-xs">{col.label}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{col.labelKinyarwanda}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                    isChecked ? 'bg-[#3591C8] border-[#3591C8] text-white' : 'border-slate-300 bg-white'
                  }`}>
                    {isChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Category 3: System & Administrative Metadata */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#23285E]">
              3. System & Administrative Metadata
            </h4>
            <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-semibold border border-amber-200">
              Optional / Excluded by default
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {systemCols.map((col) => {
              const isChecked = !!columnsConfig[col.key];
              return (
                <label
                  key={col.key}
                  onClick={() => handleToggle(col.key)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                    isChecked
                      ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <div className="pr-2">
                    <p className="font-bold text-xs">{col.label}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{col.labelKinyarwanda}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                    isChecked ? 'bg-amber-600 border-amber-600 text-white' : 'border-slate-300 bg-white'
                  }`}>
                    {isChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Modal footer */}
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
          <Button variant="primary" size="md" onClick={onClose} className="px-6">
            Apply & View Table
          </Button>
        </div>
      </div>
    </Modal>
  );
};
