export type UserRole = 'director' | 'admin';

export type UserStatus = 'pending' | 'approved' | 'suspended' | 'rejected' | 'deactivated';

export interface UserProfile {
  id: string; // Auth UID
  fullName: string;
  email: string;
  phone?: string;
  role: UserRole;
  districtId: string;
  districtName: string;
  status: UserStatus;
  profilePhoto?: string;
  position?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface District {
  id: string;
  name: string;
  code?: string;
  status: 'active' | 'inactive';
  location?: string;
  contactPerson?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
  icon?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export type Sex = 'Male' | 'Female';

export interface AttendanceRecord {
  id: string;
  districtId: string;
  districtName: string;
  adminId: string;
  recordedBy: string;
  personName: string;
  sex: Sex;
  serviceId: string;
  serviceNameSnapshot: string;
  attendanceDate: string; // YYYY-MM-DD
  attendanceTime: string; // HH:mm
  sector?: string;
  cell?: string;
  village?: string;
  phoneNumber?: string;
  email?: string;
  nationalId?: string; // 16 digits
  isSelfCheckIn?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  districtId?: string;
  timestamp: string;
  details?: string;
}

export interface SystemSettings {
  id: string;
  centerName: string;
  tagline: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  primaryColor: string;
  secondaryColor: string;
  updatedAt: string;
}

export type PeriodType = 
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'last_3_months'
  | 'last_4_months'
  | 'this_year'
  | 'last_year'
  | 'custom';

export interface PeriodDateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  label: string;
  periodType: PeriodType;
}

export interface ServiceAttendanceSummary {
  serviceId: string;
  serviceName: string;
  maleCount: number;
  femaleCount: number;
  totalCount: number;
  percentage: number;
  changeVsPrevious?: number; // percentage change e.g. +12 or -8
}

export interface DashboardStats {
  todayVisits: number;
  thisWeekVisits: number;
  thisMonthVisits: number;
  thisYearVisits: number;
  filteredTotal: number;
  maleTotal: number;
  femaleTotal: number;
  malePercentage: number;
  femalePercentage: number;
  serviceBreakdown: ServiceAttendanceSummary[];
  mostRequestedService?: ServiceAttendanceSummary;
  leastRequestedService?: ServiceAttendanceSummary;
  dailyAverage: number;
  previousPeriodTotal: number;
  periodChangePercent: number;
  trends: { date: string; label: string; count: number; male: number; female: number }[];
}

export type ColumnKey =
  | 'recordId'
  | 'attendanceDate'
  | 'attendanceTime'
  | 'personName'
  | 'sex'
  | 'serviceName'
  | 'districtName'
  | 'sector'
  | 'cell'
  | 'village'
  | 'phoneNumber'
  | 'email'
  | 'nationalId'
  | 'entryMethod'
  | 'recordedBy'
  | 'notes';

export interface ColumnDefinition {
  key: ColumnKey;
  label: string;
  labelKinyarwanda: string;
  category: 'core' | 'demographics' | 'system';
  defaultVisible: boolean;
  exportHeader: string;
}

export type ColumnsConfig = Record<ColumnKey, boolean>;

export interface ChallengerInsight {
  id: string;
  type: 'growth' | 'attention' | 'neutral' | 'ratio';
  headline: string;
  observation: string;
  implication: string;
  metric?: string;
  trend?: 'up' | 'down' | 'steady';
}

export type NotificationType =
  | 'new_visitor'
  | 'staff_recorded'
  | 'admin_request'
  | 'admin_approved'
  | 'admin_suspended'
  | 'report_ready'
  | 'system_alert'
  | 'service_update'
  | 'district_update';

export type NotificationPriority = 'normal' | 'important' | 'critical';

export interface AppNotification {
  id: string;
  recipientUserId: string; // Target specific user ID or 'all_approved_admins' or 'director_only'
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  relatedRecordId?: string;
  districtId: string;
  districtName?: string;
  serviceName?: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
  metadata?: Record<string, any>;
}

export interface PushSubscriptionRecord {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  deviceType: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
}

export interface NotificationSettings {
  notifyNewVisitors: boolean;
  notifyStaffAttendance: boolean;
  notifyAdminRequests: boolean;
  notifyReportsReady: boolean;
  notifySystemAlerts: boolean;
  notifyServiceUpdates: boolean;
  soundEnabled: boolean;
}

