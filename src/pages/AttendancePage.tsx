import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Trash2,
  Edit,
  Eye,
  Download,
  Calendar,
  UserPlus,
  AlertCircle,
  Clock,
  User,
  Building2,
  ChevronLeft,
  ChevronRight,
  Layers,
  X,
  FileSpreadsheet,
  TableProperties,
  SlidersHorizontal,
  Sliders,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { AttendanceRecord, Sex, ColumnsConfig } from '../types';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { ColumnCustomizerModal } from '../components/common/ColumnCustomizerModal';
import {
  ALL_COLUMNS,
  DEFAULT_COLUMNS_CONFIG,
  ATTENDANCE_COLS_STORAGE_KEY,
  loadSavedColumnsConfig,
  saveColumnsConfig,
} from '../constants/columns';
import { exportAttendanceToCSV } from '../utils/csvExport';
import { exportDetailedAttendanceToExcel } from '../utils/excelExport';
import { getPeriodRange } from '../utils/stats';

interface AttendancePageProps {
  onNavigateToRecord: () => void;
}

export const AttendancePage: React.FC<AttendancePageProps> = ({ onNavigateToRecord }) => {
  const { userProfile, isDirector } = useAuth();
  const {
    attendanceRecords,
    services,
    districts,
    editAttendance,
    deleteAttendance,
    loadingData,
    dbError,
    refreshAttendanceData,
  } = useApp();
  const { toast } = useToast();

  // Column Customization State
  const [columnsConfig, setColumnsConfig] = useState<ColumnsConfig>(() =>
    loadSavedColumnsConfig(ATTENDANCE_COLS_STORAGE_KEY)
  );
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);

  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [sexFilter, setSexFilter] = useState<'all' | 'Male' | 'Female'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [excelGenerating, setExcelGenerating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshAttendanceData();
      toast.success('Database Synchronized', 'Attendance records reloaded from Firestore.');
    } catch {
      toast.error('Sync Failed', 'Failed to refresh records from database.');
    } finally {
      setRefreshing(false);
    }
  };

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Modals
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Edit Form State
  const [editName, setEditName] = useState('');
  const [editSex, setEditSex] = useState<Sex>('Male');
  const [editServiceId, setEditServiceId] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const handleUpdateColumns = (newConfig: ColumnsConfig) => {
    setColumnsConfig(newConfig);
    saveColumnsConfig(ATTENDANCE_COLS_STORAGE_KEY, newConfig);
    toast.success('Column Settings Saved', 'Attendance table and export columns updated.');
  };

  const handleResetColumns = () => {
    setColumnsConfig(DEFAULT_COLUMNS_CONFIG);
    saveColumnsConfig(ATTENDANCE_COLS_STORAGE_KEY, DEFAULT_COLUMNS_CONFIG);
    toast.info('Clean Standard Restored', 'Record ID, Time, Entry Method, Recorded By, and Notes are hidden by default.');
  };

  const activeColumnCount = useMemo(() => {
    return Object.values(columnsConfig).filter(Boolean).length;
  }, [columnsConfig]);

  // Filtered dataset
  const filteredRecords = useMemo(() => {
    return attendanceRecords.filter((rec) => {
      // Name search
      if (searchTerm.trim() && !rec.personName.toLowerCase().includes(searchTerm.toLowerCase().trim())) {
        return false;
      }
      // Service filter
      if (serviceFilter !== 'all' && rec.serviceId !== serviceFilter) {
        return false;
      }
      // Sex filter
      if (sexFilter !== 'all' && rec.sex !== sexFilter) {
        return false;
      }
      // Date range filter
      if (startDate && rec.attendanceDate < startDate) {
        return false;
      }
      if (endDate && rec.attendanceDate > endDate) {
        return false;
      }
      return true;
    });
  }, [attendanceRecords, searchTerm, serviceFilter, sexFilter, startDate, endDate]);

  // Paginated records
  const totalRecords = filteredRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  const handleOpenEdit = (rec: AttendanceRecord) => {
    setEditingRecord(rec);
    setEditName(rec.personName);
    setEditSex(rec.sex);
    setEditServiceId(rec.serviceId);
    setEditDate(rec.attendanceDate);
    setEditTime(rec.attendanceTime);
    setEditNotes(rec.notes || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    setActionLoading(true);

    try {
      const result = await editAttendance(editingRecord.id, {
        personName: editName.trim(),
        sex: editSex,
        serviceId: editServiceId,
        attendanceDate: editDate,
        attendanceTime: editTime,
        notes: editNotes.trim() || undefined,
      });

      if (result.success) {
        setEditingRecord(null);
        toast.success('Amakuru Yavuguruwe / Record Updated', `${editName.trim()} updated successfully.`);
      } else {
        toast.error('Update Failed', result.error || 'Failed to update record in Firestore.');
      }
    } catch (err: any) {
      toast.error('Update Failed', err?.message || 'An error occurred while updating.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    setActionLoading(true);
    try {
      const result = await deleteAttendance(deletingId);
      if (result.success) {
        setDeletingId(null);
        toast.info('Attendance Record Deleted', 'The attendance entry was removed.');
      } else {
        toast.error('Delete Failed', result.error || 'Failed to delete record from Firestore.');
      }
    } catch (err: any) {
      toast.error('Delete Failed', err?.message || 'An error occurred while deleting.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportCSV = () => {
    const range = getPeriodRange('custom', startDate || '2026-01-01', endDate || '2026-12-31');
    const districtName = userProfile?.districtName || 'Nyabihu District';
    exportAttendanceToCSV(filteredRecords, districtName, range, columnsConfig);
    toast.success('CSV Download Started', `Exported ${filteredRecords.length} records with ${activeColumnCount} columns.`);
  };

  const handleExportExcel = async () => {
    setExcelGenerating(true);
    try {
      const range = getPeriodRange('custom', startDate || '2026-01-01', endDate || '2026-12-31');
      const districtName = userProfile?.districtName || 'Nyabihu District';
      await exportDetailedAttendanceToExcel({
        records: filteredRecords,
        range,
        districtName,
        userProfile,
        columnsConfig,
      });
      toast.success('Excel File Generated', `Exported ${filteredRecords.length} attendance records with Nyabihu YEGO summary.`);
    } catch (err) {
      console.error('Error generating Excel file:', err);
      toast.error('Excel Export Error', 'Could not generate the Excel workbook.');
    } finally {
      setExcelGenerating(false);
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setServiceFilter('all');
    setSexFilter('all');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchTerm || serviceFilter !== 'all' || sexFilter !== 'all' || startDate || endDate;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#3591C8]">Attendance Records & Export</span>
          <h1 className="text-2xl font-extrabold text-[#23285E]">Attendance Register</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational visit records for {userProfile?.districtName || 'Nyabihu District'} (Nyabihu YEGO Center)
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            loading={refreshing}
            icon={<RefreshCw className={`w-4 h-4 text-[#3591C8] ${refreshing ? 'animate-spin' : ''}`} />}
            className="border-slate-300 hover:border-[#3591C8]"
          >
            Sync
          </Button>
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
            Export Excel (.xlsx)
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onNavigateToRecord}
            icon={<UserPlus className="w-4 h-4 text-[#E6E65A]" />}
          >
            Record Visit
          </Button>
        </div>
      </div>

      {/* Database Error or Connection Warning Banner */}
      {dbError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Database alert: {dbError}</span>
          </div>
          <button
            onClick={handleRefresh}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-colors cursor-pointer shrink-0"
          >
            Retry Sync
          </button>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search by Name */}
          <div className="relative lg:col-span-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search person name..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-[#1F222C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3591C8]"
            />
          </div>

          {/* Service Filter */}
          <div>
            <select
              value={serviceFilter}
              onChange={(e) => { setServiceFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-[#1F222C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3591C8] cursor-pointer"
            >
              <option value="all">All Services (9 Total)</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Sex Filter */}
          <div>
            <select
              value={sexFilter}
              onChange={(e) => { setSexFilter(e.target.value as any); setCurrentPage(1); }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-[#1F222C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3591C8] cursor-pointer"
            >
              <option value="all">All Genders</option>
              <option value="Male">Male Youths Only</option>
              <option value="Female">Female Youths Only</option>
            </select>
          </div>

          {/* Date range filter */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              placeholder="Start Date"
              onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
              className="w-full px-2 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-[#1F222C]"
            />
            <span className="text-slate-400 text-xs">to</span>
            <input
              type="date"
              value={endDate}
              placeholder="End Date"
              onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
              className="w-full px-2 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-[#1F222C]"
            />
          </div>
        </div>

        {/* Filter metadata status */}
        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
          <div className="font-bold text-[#23285E]">
            Showing <span className="text-[#3591C8]">{filteredRecords.length}</span> records
            {hasActiveFilters && <span className="text-slate-500 font-normal"> (filtered from {attendanceRecords.length} total)</span>}
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-slate-500 hover:text-[#23285E] font-semibold cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Attendance Data Content: Mobile Cards + Desktop Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loadingData && attendanceRecords.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-10 h-10 border-4 border-[#3591C8] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <h3 className="text-sm font-bold text-[#23285E]">Loading records from Firebase...</h3>
            <p className="text-xs text-slate-500 mt-1">Retrieving persistent attendance records for Nyabihu YEGO Center.</p>
          </div>
        ) : paginatedRecords.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#23285E]">No attendance records found.</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {hasActiveFilters
                ? 'No records match your selected search filters. Try adjusting your dates or resetting filters.'
                : 'No attendance records are saved yet. Start by recording a new youth visit using the check-in form.'}
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <Button variant="primary" size="md" onClick={onNavigateToRecord} icon={<UserPlus className="w-4 h-4 text-[#E6E65A]" />}>
                Record Visit
              </Button>
              <Button variant="outline" size="md" onClick={handleRefresh} icon={<RefreshCw className="w-4 h-4 text-[#3591C8]" />}>
                Refresh Data
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Mobile Cards View (visible on mobile phones < md) */}
            <div className="md:hidden divide-y divide-slate-100">
              {paginatedRecords.map((rec, rowIdx) => {
                const globalIdx = (currentPage - 1) * pageSize + rowIdx + 1;
                return (
                  <div key={rec.id} className="p-4 space-y-2.5 hover:bg-slate-50/80 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-mono text-slate-400 font-bold">#{globalIdx}</span>
                          <h4 className="text-sm font-bold text-[#23285E] truncate">{rec.personName}</h4>
                          {rec.isSelfCheckIn && (
                            <span className="text-[9px] bg-[#E6E65A] text-[#23285E] font-black px-1.5 py-0.2 rounded uppercase">
                              Self
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {rec.attendanceDate} • <span className="font-mono">{rec.attendanceTime}</span>
                          {rec.sector ? ` • ${rec.sector}` : ''}
                        </p>
                      </div>

                      <Badge sex={rec.sex} size="sm" />
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-blue-50 text-[#23285E] font-semibold text-[11px] border border-blue-100 truncate max-w-[180px]">
                        {rec.serviceNameSnapshot}
                      </span>

                      {/* Touch-Friendly Action Buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedRecord(rec)}
                          className="p-2 text-slate-600 hover:text-[#3591C8] hover:bg-blue-50 active:bg-blue-100 rounded-lg transition-colors"
                          title="View Details"
                          aria-label="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(rec)}
                          className="p-2 text-slate-600 hover:text-amber-600 hover:bg-amber-50 active:bg-amber-100 rounded-lg transition-colors"
                          title="Edit Record"
                          aria-label="Edit Record"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingId(rec.id)}
                          className="p-2 text-slate-600 hover:text-rose-600 hover:bg-rose-50 active:bg-rose-100 rounded-lg transition-colors"
                          title="Delete Record"
                          aria-label="Delete Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (visible md+) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#23285E] text-white font-bold border-b border-[#1b1f4a]">
                    <th className="py-3.5 px-3 w-10 text-center text-slate-300">#</th>
                    {columnsConfig.recordId && <th className="py-3.5 px-3">Record ID</th>}
                    {columnsConfig.attendanceDate && <th className="py-3.5 px-3">Date</th>}
                    {columnsConfig.attendanceTime && <th className="py-3.5 px-3">Time</th>}
                    {columnsConfig.personName && <th className="py-3.5 px-4">Youth Name</th>}
                    {columnsConfig.sex && <th className="py-3.5 px-3">Sex</th>}
                    {columnsConfig.serviceName && <th className="py-3.5 px-4">Service Requested</th>}
                    {columnsConfig.districtName && <th className="py-3.5 px-3">District</th>}
                    {columnsConfig.sector && <th className="py-3.5 px-3">Sector</th>}
                    {columnsConfig.cell && <th className="py-3.5 px-3">Cell</th>}
                    {columnsConfig.village && <th className="py-3.5 px-3">Village</th>}
                    {columnsConfig.phoneNumber && <th className="py-3.5 px-3">Phone</th>}
                    {columnsConfig.email && <th className="py-3.5 px-3">Email</th>}
                    {columnsConfig.nationalId && <th className="py-3.5 px-3">National ID</th>}
                    {columnsConfig.entryMethod && <th className="py-3.5 px-3">Entry Method</th>}
                    {columnsConfig.recordedBy && <th className="py-3.5 px-3 hidden md:table-cell">Recorded By</th>}
                    {columnsConfig.notes && <th className="py-3.5 px-3">Notes</th>}
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {paginatedRecords.map((rec, rowIdx) => {
                    const globalIdx = (currentPage - 1) * pageSize + rowIdx + 1;
                    return (
                      <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                          {globalIdx}
                        </td>
                        {columnsConfig.recordId && (
                          <td className="py-3.5 px-3 font-mono text-[11px] text-slate-500">
                            {rec.id}
                          </td>
                        )}
                        {columnsConfig.attendanceDate && (
                          <td className="py-3.5 px-3 font-mono text-slate-600 font-medium whitespace-nowrap">
                            {rec.attendanceDate}
                          </td>
                        )}
                        {columnsConfig.attendanceTime && (
                          <td className="py-3.5 px-3 font-mono text-slate-500 whitespace-nowrap">
                            {rec.attendanceTime}
                          </td>
                        )}
                        {columnsConfig.personName && (
                          <td className="py-3.5 px-4 font-bold text-[#23285E]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{rec.personName}</span>
                              {rec.isSelfCheckIn && (
                                <span className="text-[10px] bg-[#E6E65A]/40 text-[#23285E] font-bold px-1.5 py-0.5 rounded">
                                  Self
                                </span>
                              )}
                              {rec.sector && !columnsConfig.sector && (
                                <span className="text-[10px] bg-slate-100 text-slate-500 font-medium px-1.5 py-0.5 rounded">
                                  {rec.sector}
                                </span>
                              )}
                            </div>
                            {rec.notes && !columnsConfig.notes && (
                              <p className="text-[10px] text-slate-400 font-normal truncate max-w-xs">{rec.notes}</p>
                            )}
                          </td>
                        )}
                        {columnsConfig.sex && (
                          <td className="py-3.5 px-3">
                            <Badge sex={rec.sex} size="sm" />
                          </td>
                        )}
                        {columnsConfig.serviceName && (
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-[#23285E] font-medium border border-slate-200">
                              {rec.serviceNameSnapshot}
                            </span>
                          </td>
                        )}
                        {columnsConfig.districtName && (
                          <td className="py-3.5 px-3 font-medium text-slate-600">
                            {rec.districtName || 'Nyabihu'}
                          </td>
                        )}
                        {columnsConfig.sector && (
                          <td className="py-3.5 px-3 text-slate-600">
                            {rec.sector || '—'}
                          </td>
                        )}
                        {columnsConfig.cell && (
                          <td className="py-3.5 px-3 text-slate-600">
                            {rec.cell || '—'}
                          </td>
                        )}
                        {columnsConfig.village && (
                          <td className="py-3.5 px-3 text-slate-600">
                            {rec.village || '—'}
                          </td>
                        )}
                        {columnsConfig.phoneNumber && (
                          <td className="py-3.5 px-3 font-mono text-slate-700">
                            {rec.phoneNumber || '—'}
                          </td>
                        )}
                        {columnsConfig.email && (
                          <td className="py-3.5 px-3 text-slate-600">
                            {rec.email || '—'}
                          </td>
                        )}
                        {columnsConfig.nationalId && (
                          <td className="py-3.5 px-3 font-mono text-slate-700">
                            {rec.nationalId || '—'}
                          </td>
                        )}
                        {columnsConfig.entryMethod && (
                          <td className="py-3.5 px-3">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                              rec.isSelfCheckIn ? 'bg-[#E6E65A]/40 text-[#23285E]' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {rec.isSelfCheckIn ? 'Self Kiosk' : 'Staff Desk'}
                            </span>
                          </td>
                        )}
                        {columnsConfig.recordedBy && (
                          <td className="py-3.5 px-3 text-slate-500 hidden md:table-cell truncate max-w-[120px]">
                            {rec.recordedBy}
                          </td>
                        )}
                        {columnsConfig.notes && (
                          <td className="py-3.5 px-3 text-slate-600 truncate max-w-xs">
                            {rec.notes || '—'}
                          </td>
                        )}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            <button
                              onClick={() => setSelectedRecord(rec)}
                              title="View Details"
                              className="p-1.5 text-slate-500 hover:text-[#3591C8] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEdit(rec)}
                              title="Edit Record"
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeletingId(rec.id)}
                              title="Delete Record"
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Page <strong className="text-[#23285E]">{currentPage}</strong> of <strong className="text-[#23285E]">{totalPages}</strong>
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-300 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-300 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Record Details Modal */}
      {selectedRecord && (
        <Modal
          isOpen={!!selectedRecord}
          onClose={() => setSelectedRecord(null)}
          title="Attendance Visit Details"
          subtitle={`Record ID: ${selectedRecord.id}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-semibold">Youth Name:</span>
                <span className="text-sm font-bold text-[#23285E]">{selectedRecord.personName}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-semibold">Sex:</span>
                <Badge sex={selectedRecord.sex} />
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-semibold">Service Requested:</span>
                <span className="font-bold text-[#3591C8]">{selectedRecord.serviceNameSnapshot}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-semibold">Date & Time:</span>
                <span className="font-mono text-slate-700">{selectedRecord.attendanceDate} at {selectedRecord.attendanceTime}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-semibold">District & Sector:</span>
                <span className="font-bold text-slate-800">
                  {selectedRecord.sector ? `${selectedRecord.sector}, ` : ''}{selectedRecord.districtName || 'NYABIHU'}
                </span>
              </div>
              {(selectedRecord.cell || selectedRecord.village) && (
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-semibold">Cell / Village:</span>
                  <span className="text-slate-700">
                    {[selectedRecord.cell && `Cell: ${selectedRecord.cell}`, selectedRecord.village && `Village: ${selectedRecord.village}`].filter(Boolean).join(' • ')}
                  </span>
                </div>
              )}
              {selectedRecord.phoneNumber && (
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-semibold">Phone Number:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedRecord.phoneNumber}</span>
                </div>
              )}
              {selectedRecord.email && (
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-semibold">Email:</span>
                  <span className="text-slate-800">{selectedRecord.email}</span>
                </div>
              )}
              {selectedRecord.nationalId && (
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-semibold">National ID (16-digit):</span>
                  <span className="font-mono font-bold text-[#23285E] bg-slate-200/70 px-2 py-0.5 rounded">
                    {selectedRecord.nationalId}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Recorded By:</span>
                <span className="text-slate-700">
                  {selectedRecord.recordedBy}
                  {selectedRecord.isSelfCheckIn && (
                    <span className="ml-1.5 px-2 py-0.5 text-[10px] font-bold rounded-md bg-[#E6E65A]/40 text-[#23285E]">
                      Kiosk Self Check-In
                    </span>
                  )}
                </span>
              </div>
            </div>

            {selectedRecord.notes && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-[10px] font-bold uppercase text-[#3591C8]">Staff Notes:</p>
                <p className="text-xs text-slate-700 mt-1">{selectedRecord.notes}</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedRecord(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Record Modal */}
      {editingRecord && (
        <Modal
          isOpen={!!editingRecord}
          onClose={() => setEditingRecord(null)}
          title="Edit Attendance Record"
          subtitle="Correct name, date, time or service requested"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
            <div>
              <label className="block text-xs font-bold text-[#23285E] mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#23285E] mb-1">Sex *</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setEditSex('Male')}
                  className={`py-2 px-4 rounded-xl border text-xs font-bold ${editSex === 'Male' ? 'border-[#3591C8] bg-blue-50 text-[#3591C8]' : 'border-slate-200 bg-white'}`}
                >
                  Male
                </button>
                <button
                  type="button"
                  onClick={() => setEditSex('Female')}
                  className={`py-2 px-4 rounded-xl border text-xs font-bold ${editSex === 'Female' ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-slate-200 bg-white'}`}
                >
                  Female
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#23285E] mb-1">Service Requested *</label>
              <select
                value={editServiceId}
                onChange={(e) => setEditServiceId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs cursor-pointer"
              >
                {services.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#23285E] mb-1">Date</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#23285E] mb-1">Time</label>
                <input
                  type="time"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#23285E] mb-1">Notes</label>
              <input
                type="text"
                placeholder="Optional session notes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setEditingRecord(null)} disabled={actionLoading}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" loading={actionLoading}>
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Attendance Record?"
        message="This record will be permanently removed from the attendance records and reports. This action cannot be undone."
        confirmText="Delete Record"
        variant="danger"
        loading={actionLoading}
      />

      {/* Column Customizer Modal */}
      <ColumnCustomizerModal
        isOpen={isColumnModalOpen}
        onClose={() => setIsColumnModalOpen(false)}
        columnsConfig={columnsConfig}
        onChangeConfig={handleUpdateColumns}
        onReset={handleResetColumns}
        title="Customize Attendance Columns"
        subtitle="Manage which fields are shown in the attendance table and downloaded reports."
      />
    </div>
  );
};
