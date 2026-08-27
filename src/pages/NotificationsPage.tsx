import React, { useState } from 'react';
import {
  Bell,
  CheckCircle2,
  Clock,
  Trash2,
  Filter,
  CheckCheck,
  ShieldAlert,
  UserPlus,
  FileText,
  Layers,
  Building2,
  Smartphone,
  Volume2,
  VolumeX,
  Sparkles,
  Info,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { AppNotification, NotificationType } from '../types';
import { Button } from '../components/common/Button';

interface NotificationsPageProps {
  onNavigateToRoute: (route: string) => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({ onNavigateToRoute }) => {
  const { isDirector } = useAuth();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearReadNotifications,
    pushPermission,
    requestPushPermission,
    notificationSettings,
    updateNotificationSettings,
  } = useNotification();

  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'visits' | 'admin' | 'alerts' | 'settings'>('all');

  const filteredNotifications = notifications.filter((notif) => {
    if (activeTab === 'unread') return !notif.isRead;
    if (activeTab === 'visits') return notif.type === 'new_visitor' || notif.type === 'staff_recorded';
    if (activeTab === 'admin') return notif.type === 'admin_request' || notif.type === 'admin_approved' || notif.type === 'admin_suspended';
    if (activeTab === 'alerts') return notif.type === 'system_alert' || notif.priority === 'critical' || notif.priority === 'important';
    return true;
  });

  const getIconForType = (type: NotificationType) => {
    switch (type) {
      case 'new_visitor':
      case 'staff_recorded':
        return <UserPlus className="w-4 h-4 text-[#3591C8]" />;
      case 'admin_request':
      case 'admin_approved':
      case 'admin_suspended':
        return <ShieldAlert className="w-4 h-4 text-[#23285E]" />;
      case 'report_ready':
        return <FileText className="w-4 h-4 text-emerald-600" />;
      case 'service_update':
        return <Layers className="w-4 h-4 text-purple-600" />;
      case 'district_update':
        return <Building2 className="w-4 h-4 text-indigo-600" />;
      case 'system_alert':
      default:
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
    }
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.isRead) {
      await markAsRead(notif.id);
    }

    if (notif.type === 'new_visitor' || notif.type === 'staff_recorded') {
      onNavigateToRoute('attendance');
    } else if (notif.type === 'admin_request' && isDirector) {
      onNavigateToRoute('admin');
    } else if (notif.type === 'report_ready') {
      onNavigateToRoute('reports');
    } else if (notif.type === 'service_update') {
      onNavigateToRoute('services');
    }
  };

  const formatNotificationTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} min ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl shadow-xs border border-slate-200">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#23285E]/10 border border-[#23285E]/20 flex items-center justify-center text-[#23285E]">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#23285E]">Notification Center</h1>
              {unreadCount > 0 && (
                <span className="bg-[#23285E] text-[#E6E65A] text-xs font-extrabold px-2.5 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time activity, visitor check-ins, and administrative alerts for NYABIHU YEGO CENTER
            </p>
          </div>
        </div>

        {/* Global actions */}
        <div className="flex flex-wrap items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              id="mark-all-read-btn"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5 text-slate-600" />
              <span>Mark all as read</span>
            </button>
          )}

          {notifications.some((n) => n.isRead) && (
            <button
              onClick={clearReadNotifications}
              id="clear-read-btn"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear read</span>
            </button>
          )}
        </div>
      </div>

      {/* Push Notification Permission Banner / Card */}
      {pushPermission !== 'granted' && (
        <div className="bg-gradient-to-r from-[#23285E] via-[#2c3370] to-[#23285E] text-white p-5 rounded-2xl shadow-sm border border-[#3591C8]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-[#E6E65A]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Enable Web Push Notifications
                <span className="text-[10px] bg-[#E6E65A] text-[#23285E] px-2 py-0.5 rounded-full font-extrabold uppercase">
                  Staff Feature
                </span>
              </h3>
              <p className="text-xs text-slate-200 mt-1 max-w-xl leading-relaxed">
                Receive instant alerts on your desktop or mobile phone whenever a youth visitor checks in or an important administrative event occurs.
              </p>
            </div>
          </div>

          <button
            onClick={requestPushPermission}
            id="enable-push-permission-btn"
            className="px-4 py-2.5 rounded-xl bg-[#E6E65A] hover:bg-[#d8d84e] text-[#23285E] font-bold text-xs shadow-sm transition-transform active:scale-95 shrink-0 cursor-pointer"
          >
            {pushPermission === 'denied' ? 'Permission Denied in Browser' : 'Enable Push Notifications'}
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          { id: 'all', label: 'All Notifications', count: notifications.length },
          { id: 'unread', label: 'Unread', count: unreadCount },
          { id: 'visits', label: 'Visitor Check-Ins', count: notifications.filter((n) => n.type === 'new_visitor' || n.type === 'staff_recorded').length },
          { id: 'admin', label: 'Administrative', count: notifications.filter((n) => n.type === 'admin_request' || n.type === 'admin_approved' || n.type === 'admin_suspended').length },
          { id: 'alerts', label: 'Alerts', count: notifications.filter((n) => n.type === 'system_alert' || n.priority === 'critical').length },
          { id: 'settings', label: 'Settings', icon: true },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-[#23285E] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && tab.count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content: Settings */}
      {activeTab === 'settings' ? (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-[#23285E]">Notification Preferences</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Customize which alerts and notification types are delivered to this device.
            </p>
          </div>

          <div className="space-y-4 divide-y divide-slate-100">
            {/* Setting Item 1 */}
            <div className="pt-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">New Visitor Attendance</p>
                <p className="text-xs text-slate-500">Receive alert when a youth visitor logs attendance at the center</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationSettings.notifyNewVisitors}
                  onChange={(e) => updateNotificationSettings({ notifyNewVisitors: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#23285E]"></div>
              </label>
            </div>

            {/* Setting Item 2 */}
            <div className="pt-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Staff-Recorded Visits</p>
                <p className="text-xs text-slate-500">Receive notification when staff members record visitor batches</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationSettings.notifyStaffAttendance}
                  onChange={(e) => updateNotificationSettings({ notifyStaffAttendance: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#23285E]"></div>
              </label>
            </div>

            {/* Setting Item 3 */}
            <div className="pt-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Admin Account Requests & Approvals</p>
                <p className="text-xs text-slate-500">Alerts regarding pending staff registrations and role modifications</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationSettings.notifyAdminRequests}
                  onChange={(e) => updateNotificationSettings({ notifyAdminRequests: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#23285E]"></div>
              </label>
            </div>

            {/* Setting Item 4 */}
            <div className="pt-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Reports & Statistical Exports</p>
                <p className="text-xs text-slate-500">Notify when generated PDF/Excel attendance exports finish processing</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationSettings.notifyReportsReady}
                  onChange={(e) => updateNotificationSettings({ notifyReportsReady: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#23285E]"></div>
              </label>
            </div>

            {/* Setting Item 5 */}
            <div className="pt-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Audio Chime / Alert Sound</p>
                <p className="text-xs text-slate-500">Play an audible chime when new real-time alerts arrive in the app</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationSettings.soundEnabled}
                  onChange={(e) => updateNotificationSettings({ soundEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#23285E]"></div>
              </label>
            </div>
          </div>
        </div>
      ) : (
        /* Notifications List */
        <div className="space-y-2.5">
          {filteredNotifications.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
                <Bell className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-700">No notifications in this category</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                You're all caught up! When visitors check in or administrative updates occur, they will appear here in real-time.
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const isUnread = !notif.isRead;
              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-4 rounded-2xl transition-all border flex items-start gap-3.5 cursor-pointer relative ${
                    isUnread
                      ? 'bg-blue-50/70 border-blue-200/80 shadow-xs hover:bg-blue-50'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {/* Left Type Icon */}
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                      isUnread ? 'bg-white border border-blue-200' : 'bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {getIconForType(notif.type)}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center gap-2">
                      <h4 className={`text-sm font-bold truncate ${isUnread ? 'text-[#23285E]' : 'text-slate-800'}`}>
                        {notif.title}
                      </h4>
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-[#3591C8] shrink-0" title="Unread" />
                      )}
                      {notif.priority === 'important' && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded">
                          Important
                        </span>
                      )}
                      {notif.priority === 'critical' && (
                        <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.2 rounded">
                          Critical
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{notif.message}</p>

                    <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatNotificationTime(notif.createdAt)}
                      </span>
                      {notif.districtName && (
                        <>
                          <span>•</span>
                          <span>{notif.districtName}</span>
                        </>
                      )}
                      {notif.serviceName && (
                        <>
                          <span>•</span>
                          <span className="text-[#3591C8] font-medium">{notif.serviceName}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions on hover/touch */}
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {isUnread && (
                      <button
                        onClick={() => markAsRead(notif.id)}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Mark as read"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notif.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Delete notification"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-slate-300 ml-1" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
