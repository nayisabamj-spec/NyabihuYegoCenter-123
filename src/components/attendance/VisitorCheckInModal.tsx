import React, { useState } from 'react';
import {
  User,
  Phone,
  Mail,
  CreditCard,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  X,
  RotateCcw,
  Check
} from 'lucide-react';
import { Sex, ServiceItem } from '../../types';
import { DEFAULT_DISTRICT, NYABIHU_SECTORS, ALL_RWANDA_DISTRICTS } from '../../constants/locations';
import { BRAND_CONFIG } from '../../constants/branding';
import { ServiceIcon } from '../common/ServiceIcon';
import { Button } from '../common/Button';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { formatDateYYYYMMDD } from '../../utils/stats';

interface VisitorCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (recordId: string) => void;
}

export const VisitorCheckInModal: React.FC<VisitorCheckInModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { services, submitPublicVisitorAttendance } = useApp();
  const { toast } = useToast();

  // Wizard Step: 1 = Core Details, 2 = Location, 3 = Optional Contact/ID, 4 = Success
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [personName, setPersonName] = useState('');
  const [sex, setSex] = useState<Sex>('Male');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('srv-ict');

  // Location State (Default: NYABIHU)
  const [district, setDistrict] = useState<string>(DEFAULT_DISTRICT);
  const [isOtherDistrict, setIsOtherDistrict] = useState(false);
  const [sector, setSector] = useState<string>('Mukamira');
  const [customSector, setCustomSector] = useState<string>('');
  const [cell, setCell] = useState<string>('');
  const [village, setVillage] = useState<string>('');

  // Optional Contact & ID State
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [notes, setNotes] = useState('');

  // Loading & Submitting
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedRecord, setCompletedRecord] = useState<{
    id: string;
    personName: string;
    serviceName: string;
    district: string;
    sector: string;
    timestamp: string;
  } | null>(null);

  if (!isOpen) return null;

  const activeServices = services.filter((s) => s.status === 'active');

  const handleNextStep1 = () => {
    if (!personName.trim()) {
      setErrorMessage('Please enter your full name to proceed.');
      return;
    }
    setErrorMessage(null);
    setStep(2);
  };

  const handleNextStep2 = () => {
    setErrorMessage(null);
    setStep(3);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    // Format National ID
    const cleanNid = nationalId.replace(/\s+/g, '').trim();
    if (cleanNid && cleanNid.length !== 16 && !/^\d+$/.test(cleanNid)) {
      setErrorMessage('National ID must be exactly 16 numeric digits if provided.');
      setIsSubmitting(false);
      return;
    }

    const finalSector = isOtherDistrict ? customSector.trim() : (sector || customSector.trim());

    try {
      const result = await submitPublicVisitorAttendance({
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
        notes: notes.trim() || undefined,
      });

      if (result.success) {
        const srv = services.find((s) => s.id === selectedServiceId);
        setCompletedRecord({
          id: result.id || `rec-${Date.now()}`,
          personName: personName.trim(),
          serviceName: srv ? srv.name : selectedServiceId,
          district: district.toUpperCase(),
          sector: finalSector || 'Nyabihu Center',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
        setStep(4);
        toast.success('Murakoze! Visit logged successfully.', `${personName.trim()} — ${srv?.name || 'Youth Program'}`);
        if (onSuccess && result.id) {
          onSuccess(result.id);
        }
      } else {
        const err = result.error || 'Unable to record attendance. Please check network.';
        setErrorMessage(err);
        toast.error('Check-in Error', err);
      }
    } catch (err: any) {
      const msg = err.message || 'An error occurred during check-in submission.';
      setErrorMessage(msg);
      toast.error('Submission Failed', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setPersonName('');
    setSex('Male');
    setSelectedServiceId('srv-ict');
    setDistrict(DEFAULT_DISTRICT);
    setIsOtherDistrict(false);
    setSector('Mukamira');
    setCustomSector('');
    setCell('');
    setVillage('');
    setPhoneNumber('');
    setEmail('');
    setNationalId('');
    setNotes('');
    setStep(1);
    setCompletedRecord(null);
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto transition-all">
        {/* Header with Branding and Step Counter */}
        <div className="bg-[#23285E] text-white px-5 sm:px-8 py-4 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={BRAND_CONFIG.logoUrl}
                alt="Nyabihu Logo"
                className="w-10 h-10 object-contain rounded-lg bg-white/10 p-1"
                referrerPolicy="no-referrer"
              />
              <div>
                <span className="text-[11px] uppercase tracking-wider text-[#E6E65A] font-bold">
                  Nyabihu YEGO Center
                </span>
                <h2 className="text-lg sm:text-xl font-black tracking-tight leading-tight">
                  {step === 4 ? 'Attendance Confirmed' : 'Visitor Self Check-In'}
                </h2>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Stepper Progress Bar (Only during steps 1-3) */}
          {step < 4 && (
            <div className="mt-4 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between text-xs font-semibold mb-2">
                <span className={step === 1 ? 'text-[#E6E65A] font-bold' : 'text-[#DFF8F5]/70'}>
                  1. Who & Service
                </span>
                <span className={step === 2 ? 'text-[#E6E65A] font-bold' : 'text-[#DFF8F5]/70'}>
                  2. Location (Nyabihu)
                </span>
                <span className={step === 3 ? 'text-[#E6E65A] font-bold' : 'text-[#DFF8F5]/70'}>
                  3. Contact & ID (Optional)
                </span>
              </div>
              <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#E6E65A] h-full transition-all duration-300 rounded-full"
                  style={{ width: step === 1 ? '33%' : step === 2 ? '66%' : '100%' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-7 max-h-[75vh] overflow-y-auto">
          {errorMessage && (
            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium flex items-center gap-2.5">
              <span className="font-bold text-rose-700">Icyitonderwa / Error:</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: Core Details (Name, Sex, Service) */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#23285E] mb-1.5">
                  1. Your Full Name (Amazina Yombi) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    autoFocus
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                    placeholder="e.g. Mugisha Jean de Dieu or Uwase Diane"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 placeholder:font-normal focus:bg-white focus:outline-none focus:border-[#3591C8] focus:ring-4 focus:ring-[#3591C8]/10 transition-all"
                  />
                </div>
              </div>

              {/* Sex Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#23285E] mb-1.5">
                  2. Sex (Igitsina) <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSex('Male')}
                    className={`py-3 px-4 rounded-xl border-2 font-bold text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                      sex === 'Male'
                        ? 'border-[#23285E] bg-blue-50 text-[#23285E] shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center ${
                        sex === 'Male' ? 'border-[#23285E] bg-[#23285E]' : 'border-slate-300'
                      }`}
                    >
                      {sex === 'Male' && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span>Male (Gabo)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSex('Female')}
                    className={`py-3 px-4 rounded-xl border-2 font-bold text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                      sex === 'Female'
                        ? 'border-pink-600 bg-pink-50 text-pink-900 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center ${
                        sex === 'Female' ? 'border-pink-600 bg-pink-600' : 'border-slate-300'
                      }`}
                    >
                      {sex === 'Female' && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span>Female (Gore)</span>
                  </button>
                </div>
              </div>

              {/* Service Requested */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#23285E] mb-1.5">
                  3. Service Requested (Serivisi Ukeneye) <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {activeServices.map((srv) => {
                    const isSelected = selectedServiceId === srv.id;
                    return (
                      <button
                        key={srv.id}
                        type="button"
                        onClick={() => setSelectedServiceId(srv.id)}
                        className={`p-3 rounded-xl border-2 text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#23285E] bg-[#23285E] text-white shadow-xs'
                            : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-white hover:border-slate-300'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-white/20 text-[#E6E65A]'
                              : 'bg-white text-[#3591C8] shadow-2xs'
                          }`}
                        >
                          <ServiceIcon name={srv.name} size={16} />
                        </div>
                        <div className="truncate">
                          <p
                            className={`text-xs font-bold truncate ${
                              isSelected ? 'text-white' : 'text-[#1F222C]'
                            }`}
                          >
                            {srv.name}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Location Information (Nyabihu by default) */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* District default banner */}
              <div className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#23285E] text-[#E6E65A] flex items-center justify-center font-black text-xs">
                    RW
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold uppercase text-slate-500">
                      Default District (Akarere)
                    </span>
                    <p className="text-sm font-extrabold text-[#23285E]">
                      {isOtherDistrict ? district : 'NYABIHU DISTRICT (Default)'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOtherDistrict(!isOtherDistrict)}
                  className="text-xs font-bold text-[#3591C8] hover:text-[#23285E] underline cursor-pointer"
                >
                  {isOtherDistrict ? 'Reset to Nyabihu' : 'Change District'}
                </button>
              </div>

              {isOtherDistrict && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#23285E] mb-1.5">
                    Select Your District (Hitamo Akarere)
                  </label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-[#3591C8]"
                  >
                    {ALL_RWANDA_DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Sector / Umurenge */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#23285E]">
                    Sector (Umurenge)
                  </label>
                  {!isOtherDistrict && (
                    <span className="text-[11px] text-slate-500 font-medium">
                      Select your Nyabihu sector
                    </span>
                  )}
                </div>

                {!isOtherDistrict ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-2">
                    {NYABIHU_SECTORS.map((sec) => {
                      const isSelected = sector === sec;
                      return (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => {
                            setSector(sec);
                            setCustomSector('');
                          }}
                          className={`py-2 px-2 rounded-xl text-xs font-bold text-center border-2 transition-all cursor-pointer truncate ${
                            isSelected
                              ? 'border-[#23285E] bg-[#23285E] text-white shadow-xs'
                              : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                          }`}
                        >
                          {sec}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={customSector}
                    onChange={(e) => setCustomSector(e.target.value)}
                    placeholder="Enter Sector name (e.g. Gisenyi, Muhoza)"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#3591C8]"
                  />
                )}
              </div>

              {/* Optional Cell & Village */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Cell (Akagari) <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={cell}
                    onChange={(e) => setCell(e.target.value)}
                    placeholder="e.g. Kanyove, Rwinzovu"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[#3591C8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Village (Umudugudu) <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    placeholder="e.g. Rebero, Gakoro"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[#3591C8]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Optional Contact & National ID (Optional details) */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
                <span className="font-bold text-[#23285E]">Note:</span> All fields in this step are{' '}
                <strong>optional</strong> for faster entry, but help us keep in touch regarding youth training programs and opportunities.
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#23285E] mb-1.5">
                  Phone Number (Telefoni) <span className="text-slate-400 font-normal text-[11px]">(Optional)</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="e.g. 0788 123 456 / 072... / 073..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 placeholder:font-normal focus:bg-white focus:outline-none focus:border-[#3591C8]"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#23285E] mb-1.5">
                  Email Address <span className="text-slate-400 font-normal text-[11px]">(Optional)</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. youth@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 placeholder:font-normal focus:bg-white focus:outline-none focus:border-[#3591C8]"
                  />
                </div>
              </div>

              {/* National ID (16 digits) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#23285E]">
                    National ID (Indangamuntu - 16 digits){' '}
                    <span className="text-slate-400 font-normal text-[11px]">(Optional)</span>
                  </label>
                  {nationalId.replace(/\s+/g, '').length > 0 && (
                    <span
                      className={`text-[11px] font-bold ${
                        nationalId.replace(/\s+/g, '').length === 16
                          ? 'text-emerald-600'
                          : 'text-amber-600'
                      }`}
                    >
                      {nationalId.replace(/\s+/g, '').length}/16 digits
                    </span>
                  )}
                </div>
                <div className="relative">
                  <CreditCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    maxLength={16}
                    value={nationalId}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setNationalId(val);
                    }}
                    placeholder="1 1999 8 0012345 0 89 (16 digits)"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 placeholder:font-normal focus:bg-white focus:outline-none focus:border-[#3591C8]"
                  />
                </div>
              </div>

              {/* Notes / Remarks */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Purpose / Notes <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Computer lab practice, Job desk orientation"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[#3591C8]"
                />
              </div>
            </div>
          )}

          {/* STEP 4: Success / Confirmation Card */}
          {step === 4 && completedRecord && (
            <div className="text-center py-4 space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border-4 border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/70 px-3 py-1 rounded-full">
                  Murakoze! / Visit Recorded Successfully
                </span>
                <h3 className="text-xl font-extrabold text-[#23285E] mt-2">
                  {completedRecord.personName}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Welcome to Nyabihu YEGO Center. Your attendance has been logged.
                </p>
              </div>

              {/* Receipt Summary Card */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 max-w-md mx-auto text-left space-y-2 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Service Program:</span>
                  <span className="font-bold text-[#23285E]">{completedRecord.serviceName}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Origin / Location:</span>
                  <span className="font-bold text-[#23285E]">
                    {completedRecord.sector}, {completedRecord.district}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Time Recorded:</span>
                  <span className="font-bold text-[#23285E]">
                    {formatDateYYYYMMDD(new Date())} at {completedRecord.timestamp}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-3">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  icon={<RotateCcw className="w-4 h-4" />}
                >
                  Submit Another Attendance
                </Button>
                <Button variant="primary" onClick={onClose}>
                  Done (Funga)
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls (Steps 1 to 3) */}
        {step < 4 && (
          <div className="bg-slate-50 px-5 sm:px-8 py-3.5 border-t border-slate-200 flex items-center justify-between">
            {step > 1 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep((prev) => (prev - 1) as any)}
                icon={<ChevronLeft className="w-4 h-4" />}
              >
                Back
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
            )}

            {step === 1 && (
              <Button
                variant="primary"
                size="md"
                onClick={handleNextStep1}
                icon={<ChevronRight className="w-4 h-4" />}
              >
                Next: Location
              </Button>
            )}

            {step === 2 && (
              <Button
                variant="primary"
                size="md"
                onClick={handleNextStep2}
                icon={<ChevronRight className="w-4 h-4" />}
              >
                Next: Contact Details
              </Button>
            )}

            {step === 3 && (
              <Button
                variant="accent"
                size="md"
                loading={isSubmitting}
                onClick={handleSubmit}
                icon={<CheckCircle2 className="w-5 h-5 text-[#23285E]" />}
                className="font-bold"
              >
                CONFIRM ATTENDANCE
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
