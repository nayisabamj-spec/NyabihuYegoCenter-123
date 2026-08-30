import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Users,
  TrendingUp,
  UserPlus,
  FileText,
  AlertTriangle,
  Lightbulb,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Building2,
  ChevronRight,
  Sparkles,
  Layers
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { PeriodType, PeriodDateRange } from '../types';
import { getPeriodRange, computeDashboardStats, generateChallengerInsights, formatDateYYYYMMDD } from '../utils/stats';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { ServiceIcon } from '../components/common/ServiceIcon';

interface DashboardPageProps {
  onNavigate: (route: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { userProfile, isDirector } = useAuth();
  const { attendanceRecords, services, districts, activeDistrictFilter, seedRealisticData, loadingData, refreshAttendanceData } = useApp();

  const [period, setPeriod] = useState<PeriodType>('this_month');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  const currentRange: PeriodDateRange = useMemo(() => {
    return getPeriodRange(period, customStart, customEnd);
  }, [period, customStart, customEnd]);

  const stats = useMemo(() => {
    return computeDashboardStats(attendanceRecords, services, currentRange);
  }, [attendanceRecords, services, currentRange]);

  const insights = useMemo(() => {
    return generateChallengerInsights(stats, currentRange);
  }, [stats, currentRange]);

  const activeDistrictName = isDirector
    ? (activeDistrictFilter === 'all' ? 'All Districts' : (districts.find(d => d.id === activeDistrictFilter)?.name || 'Nyabihu District'))
    : (userProfile?.districtName || 'Nyabihu District');

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#3591C8]">
              Nyabihu Yego Center
            </span>
            <span className="text-xs font-semibold text-[#23285E] bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#3591C8]" />
              {activeDistrictName}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#23285E]">
            Welcome, {userProfile?.fullName || 'Administrator'}
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-1.5">
            <p className="text-xs sm:text-sm text-slate-500">
              Youth Services & Attendance Monitoring Dashboard
            </p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Real-time Live Sync Active
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              • {attendanceRecords.length.toLocaleString()} total documents in Firestore
            </span>
          </div>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <Button
            variant="ghost"
            size="md"
            onClick={() => refreshAttendanceData()}
            disabled={loadingData}
            className="text-xs font-semibold text-[#3591C8] hover:bg-blue-50 border border-blue-100"
          >
            {loadingData ? 'Syncing...' : 'Sync Firestore'}
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => onNavigate('record')}
            icon={<UserPlus className="w-4 h-4 text-[#E6E65A]" />}
            className="shadow-sm"
          >
            Record Visit
          </Button>
          <Button
            variant="outline"
            size="md"
            onClick={() => onNavigate('reports')}
            icon={<FileText className="w-4 h-4 text-[#3591C8]" />}
          >
            Reports
          </Button>
        </div>
      </div>

      {/* Global Reporting Period Selector Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-[#23285E]">
          <Calendar className="w-4 h-4 text-[#3591C8]" />
          <span>Reporting Period:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'today', label: 'Today' },
            { id: 'this_week', label: 'This Week' },
            { id: 'this_month', label: 'This Month' },
            { id: 'last_month', label: 'Last Month' },
            { id: 'last_3_months', label: 'Last 3 Months' },
            { id: 'last_4_months', label: 'Last 4 Months' },
            { id: 'this_year', label: 'This Year' },
            { id: 'custom', label: 'Custom' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setPeriod(item.id as PeriodType)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                period === item.id
                  ? 'bg-[#23285E] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Inputs if custom period selected */}
      {period === 'custom' && (
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">From:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">To:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
            />
          </div>
        </div>
      )}

      {/* 4 Core Attendance Totals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Today's Visits"
          value={stats.todayVisits}
          sublabel="Visits recorded today"
          icon={<Users className="w-5 h-5" />}
          variant="primary"
        />
        <StatCard
          label="This Week"
          value={stats.thisWeekVisits}
          sublabel="Monday – Sunday visits"
          icon={<Calendar className="w-5 h-5" />}
          variant="sky"
        />
        <StatCard
          label="This Month"
          value={stats.thisMonthVisits}
          sublabel="Current month total"
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <StatCard
          label="This Year"
          value={stats.thisYearVisits}
          sublabel="Full year attendance"
          icon={<Building2 className="w-5 h-5" />}
        />
      </div>

      {/* Selected Period Metrics & Gender Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Total for Selected Period & Daily Average */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Selected Period Total
              </span>
              <span className="text-[11px] font-semibold text-[#3591C8] bg-blue-50 px-2 py-0.5 rounded">
                {currentRange.label}
              </span>
            </div>
            <div className="text-4xl font-black text-[#23285E] font-roboto mt-2">
              {stats.filteredTotal.toLocaleString()} <span className="text-sm font-normal text-slate-500">visits</span>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Daily Average Rate:</span>
              <span className="font-bold text-[#23285E]">{stats.dailyAverage} visits/day</span>
            </div>

            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-slate-500">vs. Prior Equivalent Period:</span>
              {stats.previousPeriodTotal > 0 ? (
                <span className={`font-bold inline-flex items-center gap-0.5 ${stats.periodChangePercent >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {stats.periodChangePercent >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  {stats.periodChangePercent >= 0 ? `+${stats.periodChangePercent}%` : `${stats.periodChangePercent}%`}
                </span>
              ) : (
                <span className="text-slate-400">Baseline</span>
              )}
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100">
            <button
              onClick={() => onNavigate('attendance')}
              className="text-xs font-bold text-[#3591C8] hover:text-[#23285E] flex items-center gap-1 cursor-pointer"
            >
              <span>View Individual Records List</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Gender Breakdown (Male vs Female) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-[#23285E]">Gender Participation Breakdown</h3>
              <p className="text-xs text-slate-500 mt-0.5">Automatic calculation for {currentRange.label}</p>
            </div>
            <div className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
              {stats.filteredTotal} Total Youths
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 my-4">
            {/* Male Box */}
            <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200/80">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-[#3591C8]">
                  Male Youths (Gabo)
                </span>
                <span className="text-xs font-extrabold text-[#23285E] font-roboto">
                  {stats.malePercentage}%
                </span>
              </div>
              <div className="text-2xl font-black text-[#23285E] font-roboto">
                {stats.maleTotal.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">registered attendees</p>
            </div>

            {/* Female Box */}
            <div className="p-4 rounded-xl bg-pink-50/70 border border-pink-200/80">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-pink-700">
                  Female Youths (Gore)
                </span>
                <span className="text-xs font-extrabold text-[#23285E] font-roboto">
                  {stats.femalePercentage}%
                </span>
              </div>
              <div className="text-2xl font-black text-[#23285E] font-roboto">
                {stats.femaleTotal.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">registered attendees</p>
            </div>
          </div>

          {/* Visual Percentage Bar */}
          <div className="space-y-1 mt-2">
            <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden flex">
              <div
                style={{ width: `${stats.malePercentage}%` }}
                className="h-full bg-[#3591C8] transition-all duration-500"
                title={`Male: ${stats.malePercentage}%`}
              />
              <div
                style={{ width: `${stats.femalePercentage}%` }}
                className="h-full bg-pink-500 transition-all duration-500"
                title={`Female: ${stats.femalePercentage}%`}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-semibold px-0.5">
              <span>Male ({stats.malePercentage}%)</span>
              <span>Female ({stats.femalePercentage}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* CHALLENGER INSIGHTS & WHAT THE DATA IS TELLING YOU */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-[#23285E]">WHAT THE DATA IS TELLING YOU</h2>
            <p className="text-xs text-slate-500">
              Deterministic operational insights derived from real attendance records
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {insights.map((ins) => (
            <div
              key={ins.id}
              className={`p-4 rounded-xl border flex flex-col justify-between ${
                ins.type === 'growth'
                  ? 'bg-blue-50/50 border-blue-200'
                  : ins.type === 'attention'
                  ? 'bg-amber-50/50 border-amber-200'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      ins.type === 'growth'
                        ? 'bg-[#3591C8] text-white'
                        : ins.type === 'attention'
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {ins.type === 'growth' ? 'High Demand' : ins.type === 'attention' ? 'Attention Point' : 'Status'}
                  </span>
                  {ins.metric && (
                    <span className="text-xs font-extrabold text-[#23285E] font-roboto">
                      {ins.metric}
                    </span>
                  )}
                </div>

                <h4 className="text-sm font-bold text-[#23285E] mt-1">{ins.headline}</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{ins.observation}</p>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-200/60 text-[11px] text-slate-500">
                <strong className="text-slate-700 font-semibold">Management action:</strong> {ins.implication}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SERVICE ACTIVITY (All 9 Services Ranked by Usage) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
          <div>
            <h2 className="text-base font-extrabold text-[#23285E]">Service Activity & Usage Ranking</h2>
            <p className="text-xs text-slate-500">
              Sorted by highest demand for {currentRange.label}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('services')}
            icon={<Layers className="w-3.5 h-3.5" />}
          >
            Manage Services
          </Button>
        </div>

        <div className="space-y-3">
          {stats.serviceBreakdown.map((srv, index) => {
            const isHighest = index === 0 && srv.totalCount > 0;
            const maxVal = stats.serviceBreakdown[0]?.totalCount || 1;
            const barWidthPercent = maxVal > 0 ? (srv.totalCount / maxVal) * 100 : 0;

            return (
              <div
                key={srv.serviceId}
                className={`p-3.5 rounded-xl border transition-all ${
                  isHighest
                    ? 'border-[#3591C8] bg-blue-50/40'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-bold text-slate-400 font-mono w-4 shrink-0">
                      {index + 1}
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-[#3591C8] flex items-center justify-center shrink-0">
                      <ServiceIcon name={srv.serviceName} size={16} />
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold text-[#23285E] truncate">{srv.serviceName}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <span>Male: {srv.maleCount}</span>
                        <span>•</span>
                        <span>Female: {srv.femaleCount}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-right">
                    {srv.changeVsPrevious !== undefined && (
                      <span className={`text-[11px] font-semibold hidden sm:inline-flex items-center gap-0.5 ${srv.changeVsPrevious >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {srv.changeVsPrevious >= 0 ? `+${srv.changeVsPrevious}%` : `${srv.changeVsPrevious}%`}
                      </span>
                    )}
                    <div>
                      <span className="text-base font-extrabold text-[#23285E] font-roboto">
                        {srv.totalCount}
                      </span>
                      <span className="text-xs text-slate-400 ml-1">({srv.percentage}%)</span>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    style={{ width: `${barWidthPercent}%` }}
                    className={`h-full rounded-full transition-all duration-300 ${
                      isHighest ? 'bg-[#23285E]' : 'bg-[#3591C8]'
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
