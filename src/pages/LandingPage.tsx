import React, { useState } from 'react';
import {
  UserPlus,
  BarChart3,
  FileCheck2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Layers,
  Smartphone,
  Download,
  UserCheck,
  MapPin,
  ClipboardList
} from 'lucide-react';
import { Logo } from '../components/common/Logo';
import { Button } from '../components/common/Button';
import { ServiceIcon } from '../components/common/ServiceIcon';
import { PWAInstallPrompt } from '../components/common/PWAInstallPrompt';
import { VisitorCheckInModal } from '../components/attendance/VisitorCheckInModal';
import { DEFAULT_SERVICES } from '../data/initialData';
import { BRAND_CONFIG } from '../constants/branding';

interface LandingPageProps {
  onLoginClick: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick }) => {
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col selection:bg-[#3591C8] selection:text-white">
      {/* Top Public Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-3 sm:px-8 py-3 flex items-center justify-between shadow-xs">
        <Logo size="md" />
        <div className="flex items-center gap-1.5 sm:gap-3">
          <PWAInstallPrompt variant="button" />
          <Button
            variant="accent"
            size="sm"
            onClick={() => setIsCheckInModalOpen(true)}
            icon={<UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#23285E]" />}
            className="font-bold shadow-xs px-2.5 sm:px-4 text-xs"
          >
            <span className="hidden xs:inline">Visitor </span>Check-In
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onLoginClick}
            icon={<ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            className="px-2.5 sm:px-4 text-xs"
          >
            Staff Login
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#23285E] to-[#1b1f4a] text-white py-14 sm:py-20 px-4 sm:px-8">
        {/* Subtle decorative background circles */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-[#3591C8]/10 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 rounded-full bg-[#E6E65A]/10 blur-3xl pointer-events-none"></div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          {/* Centered Large Logo Emblem Display */}
          <div className="mb-5 flex justify-center">
            <div className="p-3 bg-white/95 rounded-2xl shadow-xl border border-white/20 inline-flex items-center justify-center">
              <img
                src={BRAND_CONFIG.logoUrl}
                alt="Nyabihu YEGO Center Logo"
                className="w-20 h-20 sm:w-24 sm:h-24 object-contain drop-shadow-md"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-[#DFF8F5] mb-4">
            Official Youth Services Attendance & Management Platform
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
            NYABIHU YEGO CENTER
          </h1>
          <p className="text-lg sm:text-2xl font-medium text-[#DFF8F5] mt-2 max-w-2xl mx-auto">
            Youth Services & Attendance System
          </p>

          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto mt-4 leading-relaxed">
            Record daily youth visits, track program participation across Nyabihu sectors, and generate instant reports.
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4">
            <Button
              variant="accent"
              size="xl"
              onClick={() => setIsCheckInModalOpen(true)}
              icon={<UserCheck className="w-6 h-6 text-[#23285E]" />}
              className="w-full sm:w-auto shadow-2xl font-black text-base px-8 py-4"
            >
              SUBMIT ATTENDANCE (CHECK-IN)
            </Button>
            <Button
              variant="outline-white"
              size="xl"
              onClick={onLoginClick}
              icon={<ArrowRight className="w-5 h-5 text-white" />}
              className="w-full sm:w-auto font-bold text-base px-7 py-4"
            >
              Staff Portal Sign In
            </Button>
          </div>

          {/* Quick info badges */}
          <div className="mt-8 inline-flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-slate-300 bg-white/5 py-2.5 px-6 rounded-full border border-white/10">
            <span className="flex items-center gap-1.5 font-medium">
              <MapPin className="w-3.5 h-3.5 text-[#E6E65A]" /> Default District: NYABIHU
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#E6E65A]" /> 3-Step Fast Check-In
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-[#E6E65A]" /> Confidential & Secure
            </span>
          </div>
        </div>
      </section>

      {/* Visitor Self Check-In Hero Card & PWA Install Banner */}
      <section className="px-4 sm:px-8 max-w-4xl mx-auto w-full -mt-6 relative z-20 space-y-4">
        {/* Fast Check-In Interactive Card */}
        <div className="bg-white rounded-2xl border-2 border-[#3591C8]/40 shadow-xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-[#23285E] flex items-center justify-center shrink-0">
              <ClipboardList className="w-6 h-6 text-[#23285E]" />
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider font-extrabold text-[#3591C8]">
                Self Attendance Kiosk
              </span>
              <h3 className="text-base sm:text-lg font-black text-[#23285E]">
                Visiting Nyabihu YEGO Center Today?
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Submit your attendance in 3 simple steps: Name & Service → Location (Nyabihu) → Contact info.
              </p>
            </div>
          </div>

          <Button
            variant="accent"
            size="md"
            onClick={() => setIsCheckInModalOpen(true)}
            icon={<UserCheck className="w-4 h-4 text-[#23285E]" />}
            className="w-full sm:w-auto font-black shrink-0 shadow-md"
          >
            Start Check-In
          </Button>
        </div>

        {/* PWA Install Banner */}
        <PWAInstallPrompt variant="card" />
      </section>

      {/* 3 Simple Steps: Record -> Track -> Report */}
      <section id="how-it-works" className="py-16 px-4 sm:px-8 max-w-6xl mx-auto w-full">
        <div className="text-center mb-12">
          <p className="text-xs font-bold uppercase tracking-wider text-[#3591C8]">The Core Principle</p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#23285E] mt-1">
            RECORD ONCE. UNDERSTAND AUTOMATICALLY.
          </h2>
          <p className="text-sm text-slate-600 max-w-lg mx-auto mt-2">
            A staff member records a visit once, and the system automatically handles counting, categorization, sex totals, service rankings, and period reports.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-[#3591C8] transition-colors">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#3591C8] flex items-center justify-center mb-4">
              <UserPlus className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-[#3591C8] uppercase tracking-wider">Step 1</span>
            <h3 className="text-lg font-bold text-[#23285E] mt-1">Record Visits</h3>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              Record the name and sex of every young person requesting a service in a fast, mobile-friendly check-in form.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-[#3591C8] transition-colors">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-[#23285E] flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-[#3591C8] uppercase tracking-wider">Step 2</span>
            <h3 className="text-lg font-bold text-[#23285E] mt-1">Track Services</h3>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              Understand which of the 9 youth services are most requested. Track gender participation and spot changing demand trends.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-[#3591C8] transition-colors">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-[#3591C8] uppercase tracking-wider">Step 3</span>
            <h3 className="text-lg font-bold text-[#23285E] mt-1">Generate Reports</h3>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              Generate daily, weekly, monthly, 3-month, 4-month, and yearly reports with one click. Export official PDFs and CSVs instantly.
            </p>
          </div>
        </div>
      </section>

      {/* Services Catalogue */}
      <section className="bg-slate-100/70 py-16 px-4 sm:px-8 border-y border-slate-200">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-wider text-[#3591C8]">Programs & Facilities</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#23285E] mt-1">
              Supported Youth Services
            </h2>
            <p className="text-sm text-slate-600 max-w-lg mx-auto mt-2">
              The 9 official youth development services tracked across Nyabihu Yego Center and district locations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DEFAULT_SERVICES.map((srv, index) => (
              <div key={srv.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-[#3591C8] flex items-center justify-center shrink-0 mt-0.5">
                  <ServiceIcon name={srv.name} size={20} />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400">0{index + 1}</span>
                  <h4 className="text-sm font-bold text-[#23285E]">{srv.name}</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{srv.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security & Multi-District Callout */}
      <section className="py-16 px-4 sm:px-8 max-w-4xl mx-auto text-center">
        <div className="inline-flex p-3 rounded-2xl bg-blue-50 text-[#3591C8] mb-4">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-extrabold text-[#23285E]">
          Secure Multi-District Data Isolation
        </h2>
        <p className="text-sm text-slate-600 mt-2 max-w-xl mx-auto leading-relaxed">
          Each administrator manages their own district's attendance records with role-based access control and confidentiality safeguards for young visitors.
        </p>

        <div className="mt-8">
          <Button variant="primary" size="lg" onClick={onLoginClick} icon={<ArrowRight className="w-5 h-5" />}>
            Sign In to Nyabihu Yego Center
          </Button>
        </div>
      </section>

      {/* Institutional Footer */}
      <footer className="bg-[#23285E] text-white py-10 px-4 sm:px-8 border-t border-[#1b1f4a] mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div>
            <Logo size="sm" variant="white" />
            <p className="text-xs text-slate-400 mt-2">
              Youth Services Attendance, Management & Reporting Platform
            </p>
            <p className="text-xs text-slate-400">
              Nyabihu District, Western Province, Republic of Rwanda
            </p>
          </div>
          <div className="text-xs text-slate-400 text-center sm:text-right">
            <p>© {new Date().getFullYear()} NYABIHU YEGO CENTER</p>
            <p className="mt-1 text-slate-500">Record Once. Understand Automatically.</p>
          </div>
        </div>
      </footer>

      {/* Visitor Self Check-In Stepper Modal */}
      <VisitorCheckInModal
        isOpen={isCheckInModalOpen}
        onClose={() => setIsCheckInModalOpen(false)}
      />
    </div>
  );
};
