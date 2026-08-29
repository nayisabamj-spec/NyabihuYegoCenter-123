import React, { useState, useRef, useEffect } from 'react';
import {
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  Building2,
  User,
  History,
  Info,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { Sex } from '../types';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { ServiceIcon } from '../components/common/ServiceIcon';
import { formatDateYYYYMMDD } from '../utils/stats';
import { DEFAULT_DISTRICT, NYABIHU_SECTORS, ALL_RWANDA_DISTRICTS } from '../constants/locations';

export const RecordVisitPage: React.FC = () => {
  const { userProfile } = useAuth();
  const { services, recordVisit, attendanceRecords } = useApp();
  const { toast } = useToast();

  // Core Form State
  const [personName, setPersonName] = useState('');
  const [sex, setSex] = useState<Sex>('Male');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('srv-ict');
  
  // Location & Optional Details
  const [district, setDistrict] = useState<string>(DEFAULT_DISTRICT);
  const [isOtherDistrict, setIsOtherDistrict] = useState(false);
  const [sector, setSector] = useState<string>('Mukamira');
  const [customSector, setCustomSector] = useState<string>('');
  const [cell, setCell] = useState('');
  const [village, setVillage] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [notes, setNotes] = useState('');

  // Toggles for optional / advanced panels
  const [showOptionalDetails, setShowOptionalDetails] = useState(false);
  const [customDate, setCustomDate] = useState<string>(formatDateYYYYMMDD(new Date()));
  const [customTime, setCustomTime] = useState<string>(new Date().toTimeString().substring(0, 5));
  const [showAdvancedTime, setShowAdvancedTime] = useState(false);

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastRecordedName, setLastRecordedName] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);

  // Set default service once loaded
  useEffect(() => {
    if (services.length > 0 && !services.find(s => s.id === selectedServiceId)) {
      setSelectedServiceId(services[0].id);
    }
  }, [services, selectedServiceId]);

  // Keep live time updated if advanced time is not manually edited
  useEffect(() => {
    if (!showAdvancedTime) {
      const interval = setInterval(() => {
        const now = new Date();
        setCustomDate(formatDateYYYYMMDD(now));
        setCustomTime(now.toTimeString().substring(0, 5));
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [showAdvancedTime]);

  const activeServices = services.filter(s => s.status === 'active');

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!personName.trim()) {
      nameInputRef.current?.focus();
      return;
    }

    // Format National ID (16 digits check if provided)
    const cleanNid = nationalId.replace(/\s+/g, '').trim();
    if (cleanNid && (cleanNid.length !== 16 || !/^\d+$/.test(cleanNid))) {
      toast.warning('Invalid National ID', 'Indangamuntu must be exactly 16 numeric digits if provided.');
      return;
    }

    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const finalSector = isOtherDistrict ? customSector.trim() : (sector || customSector.trim());

    try {
      const result = await recordVisit({
        personName: personName.trim(),
        sex,
        serviceId: selectedServiceId,
        district: district.toUpperCase(),
        sector: finalSector || undefined,
        cell: cell.trim() || undefined,
        village: village.trim() || undefined,
        phoneNumber: phoneNumber.trim() || undefined,
        email: email.trim() || undefined,
        nationalId: cleanNid || undefined,
        attendanceDate: customDate,
        attendanceTime: customTime,
        notes: notes.trim() || undefined,
      });

      if (result.success) {
        const recorded = personName.trim();
        const srvObj = services.find(s => s.id === selectedServiceId);
        setLastRecordedName(recorded);
        setSuccessMessage(`Visit recorded and verified in Firebase for ${recorded}!`);
        toast.success('Byagenze Neza / Visit Recorded!', `${recorded} (${srvObj?.name || 'Service'}) saved.`);
        setPersonName('');
        setCell('');
        setVillage('');
        setPhoneNumber('');
        setEmail('');
        setNationalId('');
        setNotes('');
        // Focus back on name input for next person
        setTimeout(() => {
          nameInputRef.current?.focus();
        }, 100);

        // Auto-hide success message after 5s
        setTimeout(() => {
          setSuccessMessage(null);
        }, 5000);
      } else {
        const errorMsg = result.error || 'Failed to record visit in Firebase. Please check your internet connection.';
        setErrorMessage(errorMsg);
        toast.error('Gufata Amakuru Byanze / Error', errorMsg);
      }
    } catch (err: any) {
      const msg = err?.message || 'An unexpected error occurred while saving.';
      setErrorMessage(msg);
      toast.error('Gufata Amakuru Byanze / Error', msg);
    } finally {
      setSaving(false);
    }
  };

  // Filter today's recent visits recorded
  const todayStr = formatDateYYYYMMDD(new Date());
  const todayRecentVisits = attendanceRecords
    .filter(r => r.attendanceDate === todayStr)
    .slice(0, 5);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#3591C8]">Attendance Check-In</span>
          <h1 className="text-2xl font-extrabold text-[#23285E]">Record Today's Visit</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Default Location: <strong>NYABIHU DISTRICT</strong>. Record youth attendance and track service utilization in real time.
          </p>
        </div>

        {/* Auto metadata tag */}
        <div className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-slate-600">
          <Building2 className="w-4 h-4 text-[#3591C8]" />
          <span>
            District: <strong className="text-[#23285E]">{userProfile?.districtName || 'NYABIHU'}</strong>
          </span>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold">{successMessage}</p>
              <p className="text-xs text-emerald-700 mt-0.5">Saved and verified in Firebase. Ready for the next person.</p>
            </div>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-xs font-bold text-emerald-800 hover:text-emerald-950 px-2 py-1 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Notification Banner with Retry */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold">Persistence Failed</p>
              <p className="text-xs text-rose-700 mt-0.5">{errorMessage}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSubmit()}
              className="text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              Retry Saving
            </button>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs font-bold text-rose-800 hover:text-rose-950 px-2 py-1 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Primary Record Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-[#23285E] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[#E6E65A]" />
            <h2 className="text-sm font-bold uppercase tracking-wider">Fast Attendance Entry</h2>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#DFF8F5]">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {customDate}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {customTime}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {/* Step 1: Full Name */}
          <div>
            <label className="block text-sm font-bold text-[#23285E] mb-2">
              1. Full Name of Youth / Visitor <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
              <input
                ref={nameInputRef}
                type="text"
                required
                autoFocus
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                placeholder="Enter youth full name (e.g. Habimana Emmanuel or Uwase Diane)"
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-base font-semibold text-[#1F222C] placeholder:text-slate-400 placeholder:font-normal focus:bg-white focus:outline-none focus:border-[#3591C8] focus:ring-4 focus:ring-[#3591C8]/10 transition-all"
              />
            </div>
          </div>

          {/* Step 2: Sex Selection */}
          <div>
            <label className="block text-sm font-bold text-[#23285E] mb-2">
              2. Sex (Igitsina) <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setSex('Male')}
                className={`py-3.5 px-6 rounded-2xl border-2 font-bold text-base flex items-center justify-center gap-3 transition-all cursor-pointer ${
                  sex === 'Male'
                    ? 'border-[#23285E] bg-blue-50 text-[#23285E] shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className={`w-5 h-5 rounded border flex items-center justify-center ${sex === 'Male' ? 'border-[#23285E] bg-[#23285E]' : 'border-slate-300'}`}>
                  {sex === 'Male' && <Check className="w-3.5 h-3.5 text-white" />}
                </div>
                <span>Male (Gabo)</span>
              </button>

              <button
                type="button"
                onClick={() => setSex('Female')}
                className={`py-3.5 px-6 rounded-2xl border-2 font-bold text-base flex items-center justify-center gap-3 transition-all cursor-pointer ${
                  sex === 'Female'
                    ? 'border-pink-600 bg-pink-50 text-pink-900 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className={`w-5 h-5 rounded border flex items-center justify-center ${sex === 'Female' ? 'border-pink-600 bg-pink-600' : 'border-slate-300'}`}>
                  {sex === 'Female' && <Check className="w-3.5 h-3.5 text-white" />}
                </div>
                <span>Female (Gore)</span>
              </button>
            </div>
          </div>

          {/* Step 3: Service Requested */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-[#23285E]">
                3. Service Requested (Serivisi) <span className="text-rose-500">*</span>
              </label>
              <span className="text-xs text-slate-500">9 official youth services</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeServices.map((srv) => {
                const isSelected = selectedServiceId === srv.id;
                return (
                  <button
                    key={srv.id}
                    type="button"
                    onClick={() => setSelectedServiceId(srv.id)}
                    className={`p-3 rounded-xl border-2 text-left flex items-center gap-3 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#23285E] bg-[#23285E] text-white shadow-md'
                        : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-white/20 text-[#E6E65A]' : 'bg-white text-[#3591C8] shadow-2xs'
                      }`}
                    >
                      <ServiceIcon name={srv.name} size={18} />
                    </div>
                    <div className="truncate">
                      <p className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-[#1F222C]'}`}>
                        {srv.name}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 4: Sector Quick Pick (Default Nyabihu) */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-[#23285E] flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#3591C8]" />
                <span>Origin Sector (Umurenge wa Nyabihu)</span>
              </label>
              <span className="text-xs font-semibold text-slate-500">District: {district}</span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              {NYABIHU_SECTORS.map((sec) => {
                const isSelected = sector === sec;
                return (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => {
                      setSector(sec);
                      setIsOtherDistrict(false);
                    }}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold text-center border-2 transition-all cursor-pointer truncate ${
                      isSelected && !isOtherDistrict
                        ? 'border-[#23285E] bg-[#23285E] text-white shadow-xs'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    {sec}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Details Expandable Accordion (Cell, Village, Phone, Email, National ID) */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowOptionalDetails(!showOptionalDetails)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-xs font-bold text-[#23285E] cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-[#3591C8]" />
                <span>Optional Details (Cell / Akagari, Village / Umudugudu, Phone, 16-digit ID)</span>
              </div>
              {showOptionalDetails ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>

            {showOptionalDetails && (
              <div className="mt-3 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Cell (Akagari)</label>
                    <input
                      type="text"
                      value={cell}
                      onChange={(e) => setCell(e.target.value)}
                      placeholder="e.g. Kanyove"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Village (Umudugudu)</label>
                    <input
                      type="text"
                      value={village}
                      onChange={(e) => setVillage(e.target.value)}
                      placeholder="e.g. Rebero"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number (Telefoni)</label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="0788 123 456"
                        className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="youth@gmail.com"
                        className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      National ID (Indangamuntu - 16 digits)
                    </label>
                    {nationalId && (
                      <span className={`text-[10px] font-bold ${nationalId.length === 16 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {nationalId.length}/16 digits
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <CreditCard className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      maxLength={16}
                      value={nationalId}
                      onChange={(e) => setNationalId(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="1 1999 8 0012345 0 89 (16 numbers)"
                      className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Advanced Time Override Toggle */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAdvancedTime(!showAdvancedTime)}
              className="text-xs font-semibold text-[#3591C8] hover:text-[#23285E] flex items-center gap-1.5 cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{showAdvancedTime ? 'Hide Date & Time Adjustment' : 'Adjust Date, Time or Session Notes (Optional)'}</span>
            </button>

            {showAdvancedTime && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Attendance Date</label>
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Attendance Time</label>
                  <input
                    type="time"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Purpose (Optional)</label>
                  <input
                    type="text"
                    placeholder="Optional activity or session note"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <Button
              type="submit"
              variant="accent"
              size="xl"
              fullWidth
              loading={saving}
              icon={<CheckCircle2 className="w-6 h-6 text-[#23285E]" />}
              className="shadow-lg text-lg font-black tracking-wide"
            >
              RECORD VISIT
            </Button>
          </div>
        </form>
      </div>

      {/* Today's Recent Check-Ins Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[#3591C8]" />
            <h3 className="text-sm font-bold text-[#23285E]">Today's Recent Check-Ins ({todayRecentVisits.length})</h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">{todayStr}</span>
        </div>

        {todayRecentVisits.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">
            No visits recorded yet today. Fill the form above to record today's first visitor.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {todayRecentVisits.map((rec) => (
              <div key={rec.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-slate-400 font-medium">{rec.attendanceTime}</span>
                  <span className="font-bold text-[#23285E]">{rec.personName}</span>
                  <Badge sex={rec.sex} size="sm" />
                  {rec.sector && (
                    <span className="hidden sm:inline text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      {rec.sector}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md font-medium">
                    {rec.serviceNameSnapshot}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
