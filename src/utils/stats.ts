import { AttendanceRecord, PeriodType, PeriodDateRange, DashboardStats, ServiceAttendanceSummary, ChallengerInsight, ServiceItem } from '../types';

export function formatDateYYYYMMDD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function getPeriodRange(period: PeriodType, customStart?: string, customEnd?: string, referenceDate: Date = new Date()): PeriodDateRange {
  const now = new Date(referenceDate);
  const todayStr = formatDateYYYYMMDD(now);

  switch (period) {
    case 'today':
      return {
        startDate: todayStr,
        endDate: todayStr,
        label: `Today (${now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })})`,
        periodType: 'today',
      };

    case 'yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = formatDateYYYYMMDD(y);
      return {
        startDate: yStr,
        endDate: yStr,
        label: `Yesterday (${y.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })})`,
        periodType: 'yesterday',
      };
    }

    case 'this_week': {
      const d = new Date(now);
      const day = d.getDay();
      const diffToMonday = (day + 6) % 7; // Monday as start of week
      const monday = new Date(d);
      monday.setDate(d.getDate() - diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return {
        startDate: formatDateYYYYMMDD(monday),
        endDate: formatDateYYYYMMDD(sunday),
        label: `This Week (${monday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${sunday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })})`,
        periodType: 'this_week',
      };
    }

    case 'last_week': {
      const d = new Date(now);
      const day = d.getDay();
      const diffToMonday = (day + 6) % 7;
      const lastMonday = new Date(d);
      lastMonday.setDate(d.getDate() - diffToMonday - 7);
      const lastSunday = new Date(lastMonday);
      lastSunday.setDate(lastMonday.getDate() + 6);
      return {
        startDate: formatDateYYYYMMDD(lastMonday),
        endDate: formatDateYYYYMMDD(lastSunday),
        label: `Last Week (${lastMonday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${lastSunday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })})`,
        periodType: 'last_week',
      };
    }

    case 'this_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        startDate: formatDateYYYYMMDD(start),
        endDate: formatDateYYYYMMDD(end),
        label: `This Month (${now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })})`,
        periodType: 'this_month',
      };
    }

    case 'last_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        startDate: formatDateYYYYMMDD(start),
        endDate: formatDateYYYYMMDD(end),
        label: `Last Month (${start.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })})`,
        periodType: 'last_month',
      };
    }

    case 'last_3_months': {
      const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        startDate: formatDateYYYYMMDD(start),
        endDate: formatDateYYYYMMDD(end),
        label: `Last 3 Months (${start.toLocaleDateString('en-GB', { month: 'short' })} – ${end.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })})`,
        periodType: 'last_3_months',
      };
    }

    case 'last_4_months': {
      const start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        startDate: formatDateYYYYMMDD(start),
        endDate: formatDateYYYYMMDD(end),
        label: `Last 4 Months (${start.toLocaleDateString('en-GB', { month: 'short' })} – ${end.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })})`,
        periodType: 'last_4_months',
      };
    }

    case 'this_year': {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      return {
        startDate: formatDateYYYYMMDD(start),
        endDate: formatDateYYYYMMDD(end),
        label: `This Year (${now.getFullYear()})`,
        periodType: 'this_year',
      };
    }

    case 'last_year': {
      const start = new Date(now.getFullYear() - 1, 0, 1);
      const end = new Date(now.getFullYear() - 1, 11, 31);
      return {
        startDate: formatDateYYYYMMDD(start),
        endDate: formatDateYYYYMMDD(end),
        label: `Last Year (${now.getFullYear() - 1})`,
        periodType: 'last_year',
      };
    }

    case 'custom': {
      const s = customStart || todayStr;
      const e = customEnd || todayStr;
      return {
        startDate: s,
        endDate: e,
        label: `Custom Period (${s} to ${e})`,
        periodType: 'custom',
      };
    }
  }
}

export function getPreviousPeriodRange(range: PeriodDateRange): { startDate: string; endDate: string } {
  const start = parseDate(range.startDate);
  const end = parseDate(range.endDate);
  const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - diffDays + 1);

  return {
    startDate: formatDateYYYYMMDD(prevStart),
    endDate: formatDateYYYYMMDD(prevEnd),
  };
}

export function filterAttendanceByRange(
  records: AttendanceRecord[],
  startDate: string,
  endDate: string,
  serviceIdFilter?: string,
  sexFilter?: 'Male' | 'Female'
): AttendanceRecord[] {
  return records.filter((rec) => {
    if (rec.attendanceDate < startDate || rec.attendanceDate > endDate) {
      return false;
    }
    if (serviceIdFilter && serviceIdFilter !== 'all' && rec.serviceId !== serviceIdFilter) {
      return false;
    }
    if (sexFilter && rec.sex !== sexFilter) {
      return false;
    }
    return true;
  });
}

export function computeDashboardStats(
  allRecords: AttendanceRecord[],
  servicesList: ServiceItem[],
  currentPeriodRange: PeriodDateRange
): DashboardStats {
  const todayRange = getPeriodRange('today');
  const thisWeekRange = getPeriodRange('this_week');
  const thisMonthRange = getPeriodRange('this_month');
  const thisYearRange = getPeriodRange('this_year');

  const todayVisits = allRecords.filter(r => r.attendanceDate >= todayRange.startDate && r.attendanceDate <= todayRange.endDate).length;
  const thisWeekVisits = allRecords.filter(r => r.attendanceDate >= thisWeekRange.startDate && r.attendanceDate <= thisWeekRange.endDate).length;
  const thisMonthVisits = allRecords.filter(r => r.attendanceDate >= thisMonthRange.startDate && r.attendanceDate <= thisMonthRange.endDate).length;
  const thisYearVisits = allRecords.filter(r => r.attendanceDate >= thisYearRange.startDate && r.attendanceDate <= thisYearRange.endDate).length;

  const currentRecords = filterAttendanceByRange(allRecords, currentPeriodRange.startDate, currentPeriodRange.endDate);
  const prevRange = getPreviousPeriodRange(currentPeriodRange);
  const prevRecords = filterAttendanceByRange(allRecords, prevRange.startDate, prevRange.endDate);

  const filteredTotal = currentRecords.length;
  const maleTotal = currentRecords.filter(r => r.sex === 'Male').length;
  const femaleTotal = currentRecords.filter(r => r.sex === 'Female').length;

  const malePercentage = filteredTotal > 0 ? Number(((maleTotal / filteredTotal) * 100).toFixed(1)) : 0;
  const femalePercentage = filteredTotal > 0 ? Number(((femaleTotal / filteredTotal) * 100).toFixed(1)) : 0;

  // Calculate day count
  const sDate = parseDate(currentPeriodRange.startDate);
  const eDate = parseDate(currentPeriodRange.endDate);
  const totalDays = Math.max(1, Math.round((eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const dailyAverage = filteredTotal > 0 ? Number((filteredTotal / totalDays).toFixed(1)) : 0;

  // Service breakdown
  const serviceStatsMap = new Map<string, { male: number; female: number; total: number; name: string }>();

  // Initialize with all active services
  servicesList.forEach(s => {
    serviceStatsMap.set(s.id, {
      male: 0,
      female: 0,
      total: 0,
      name: s.name,
    });
  });

  // Aggregate current
  currentRecords.forEach(rec => {
    const existing = serviceStatsMap.get(rec.serviceId) || {
      male: 0,
      female: 0,
      total: 0,
      name: rec.serviceNameSnapshot || rec.serviceId,
    };
    if (rec.sex === 'Male') existing.male += 1;
    if (rec.sex === 'Female') existing.female += 1;
    existing.total += 1;
    serviceStatsMap.set(rec.serviceId, existing);
  });

  // Calculate previous service totals for comparison
  const prevServiceTotals = new Map<string, number>();
  prevRecords.forEach(rec => {
    prevServiceTotals.set(rec.serviceId, (prevServiceTotals.get(rec.serviceId) || 0) + 1);
  });

  const serviceBreakdown: ServiceAttendanceSummary[] = Array.from(serviceStatsMap.entries()).map(([sId, data]) => {
    const pct = filteredTotal > 0 ? Number(((data.total / filteredTotal) * 100).toFixed(1)) : 0;
    const prevCount = prevServiceTotals.get(sId) || 0;
    let changeVsPrevious: number | undefined = undefined;
    if (prevCount > 0) {
      changeVsPrevious = Number((((data.total - prevCount) / prevCount) * 100).toFixed(1));
    } else if (data.total > 0 && prevRecords.length > 0) {
      changeVsPrevious = 100;
    }

    return {
      serviceId: sId,
      serviceName: data.name,
      maleCount: data.male,
      femaleCount: data.female,
      totalCount: data.total,
      percentage: pct,
      changeVsPrevious,
    };
  });

  // Sort services by highest total
  serviceBreakdown.sort((a, b) => b.totalCount - a.totalCount);

  const activeWithVisits = serviceBreakdown.filter(s => s.totalCount > 0);
  const mostRequestedService = activeWithVisits.length > 0 ? activeWithVisits[0] : serviceBreakdown[0];
  const leastRequestedService = activeWithVisits.length > 1 ? activeWithVisits[activeWithVisits.length - 1] : undefined;

  // Previous period comparison
  const previousPeriodTotal = prevRecords.length;
  let periodChangePercent = 0;
  if (previousPeriodTotal > 0) {
    periodChangePercent = Number((((filteredTotal - previousPeriodTotal) / previousPeriodTotal) * 100).toFixed(1));
  }

  // Daily or period trends
  const trendMap = new Map<string, { count: number; male: number; female: number }>();
  currentRecords.forEach(r => {
    const entry = trendMap.get(r.attendanceDate) || { count: 0, male: 0, female: 0 };
    entry.count += 1;
    if (r.sex === 'Male') entry.male += 1;
    if (r.sex === 'Female') entry.female += 1;
    trendMap.set(r.attendanceDate, entry);
  });

  const sortedDates = Array.from(trendMap.keys()).sort();
  const trends = sortedDates.map(dateStr => {
    const d = parseDate(dateStr);
    const label = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const info = trendMap.get(dateStr)!;
    return {
      date: dateStr,
      label,
      count: info.count,
      male: info.male,
      female: info.female,
    };
  });

  return {
    todayVisits,
    thisWeekVisits,
    thisMonthVisits,
    thisYearVisits,
    filteredTotal,
    maleTotal,
    femaleTotal,
    malePercentage,
    femalePercentage,
    serviceBreakdown,
    mostRequestedService,
    leastRequestedService,
    dailyAverage,
    previousPeriodTotal,
    periodChangePercent,
    trends,
  };
}

export function generateChallengerInsights(
  stats: DashboardStats,
  currentRange: PeriodDateRange
): ChallengerInsight[] {
  const insights: ChallengerInsight[] = [];

  if (stats.filteredTotal === 0) {
    insights.push({
      id: 'no-records',
      type: 'neutral',
      headline: 'No Attendance Recorded Yet',
      observation: `No visits are recorded for ${currentRange.label}.`,
      implication: 'Record visits at the reception desk to track youth participation and generate service reports.',
      trend: 'steady',
    });
    return insights;
  }

  // 1. Most requested service insight
  if (stats.mostRequestedService && stats.mostRequestedService.totalCount > 0) {
    insights.push({
      id: 'top-service',
      type: 'growth',
      headline: `${stats.mostRequestedService.serviceName} is Leading Demand`,
      observation: `${stats.mostRequestedService.serviceName} represents ${stats.mostRequestedService.percentage}% of all recorded visits (${stats.mostRequestedService.totalCount} visits).`,
      implication: 'Review facilitator resources and equipment capacity to ensure this service continues operating smoothly.',
      metric: `${stats.mostRequestedService.percentage}%`,
      trend: 'up',
    });
  }

  // 2. Gender participation insight
  if (stats.maleTotal > 0 || stats.femaleTotal > 0) {
    const femaleShare = stats.femalePercentage;
    if (femaleShare >= 45 && femaleShare <= 55) {
      insights.push({
        id: 'gender-balanced',
        type: 'ratio',
        headline: 'Balanced Gender Participation',
        observation: `Female participation is at ${femaleShare}% (${stats.femaleTotal}) and Male participation is at ${stats.malePercentage}% (${stats.maleTotal}).`,
        implication: 'Gender parity targets for youth engagement in Nyabihu District are being maintained effectively.',
        metric: `${femaleShare}% F / ${stats.malePercentage}% M`,
        trend: 'steady',
      });
    } else if (femaleShare < 40) {
      insights.push({
        id: 'female-engagement',
        type: 'attention',
        headline: 'Opportunity to Expand Female Outreach',
        observation: `Female visits comprise ${femaleShare}% (${stats.femaleTotal}) compared to Male visits at ${stats.malePercentage}% (${stats.maleTotal}).`,
        implication: 'Focus outreach and targeted girl-friendly sessions through SRH and Youth Empowerment activities.',
        metric: `${femaleShare}% F`,
        trend: 'down',
      });
    } else {
      insights.push({
        id: 'male-engagement',
        type: 'ratio',
        headline: 'High Female Engagement Rate',
        observation: `Female visits represent ${femaleShare}% of attendees during this reporting period.`,
        implication: 'Strong interest among young women across vocational, SRH, and digital library sessions.',
        metric: `${femaleShare}% F`,
        trend: 'up',
      });
    }
  }

  // 3. Significant service trends (Cost of Inaction / Service Attention)
  const growingService = stats.serviceBreakdown.find(s => s.changeVsPrevious !== undefined && s.changeVsPrevious >= 15);
  const decliningService = stats.serviceBreakdown.find(s => s.changeVsPrevious !== undefined && s.changeVsPrevious <= -12);

  if (growingService && growingService.changeVsPrevious) {
    insights.push({
      id: `growing-${growingService.serviceId}`,
      type: 'growth',
      headline: `Growing Demand in ${growingService.serviceName}`,
      observation: `${growingService.serviceName} attendance changed by +${growingService.changeVsPrevious}% compared to the prior equivalent period.`,
      implication: 'Higher youth interest may require scheduling additional workshops or expanding available time slots.',
      metric: `+${growingService.changeVsPrevious}%`,
      trend: 'up',
    });
  }

  if (decliningService && decliningService.changeVsPrevious) {
    insights.push({
      id: `declining-${decliningService.serviceId}`,
      type: 'attention',
      headline: `Service Attention: ${decliningService.serviceName}`,
      observation: `${decliningService.serviceName} attendance decreased by ${Math.abs(decliningService.changeVsPrevious)}% compared to the prior equivalent period.`,
      implication: 'Investigate if scheduling conflicts, awareness gaps, or facilitator availability contributed to lower attendance.',
      metric: `${decliningService.changeVsPrevious}%`,
      trend: 'down',
    });
  }

  return insights;
}
