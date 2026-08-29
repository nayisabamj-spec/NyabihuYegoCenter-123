import React, { useState } from 'react';
import {
  LayoutDashboard,
  UserPlus,
  ClipboardList,
  FileText,
  Layers,
  User,
  ShieldAlert,
  LogOut,
  Menu,
  X,
  Building2,
  Bell,
  Wifi,
  WifiOff,
  RefreshCw,
  Sparkles,
  Download,
  MoreHorizontal,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useNotification } from '../../context/NotificationContext';
import { usePWA } from '../../context/PWAContext';
import { Logo } from '../common/Logo';
import { PWAInstallPrompt } from '../common/PWAInstallPrompt';

interface AppLayoutProps {
  children: React.ReactNode;
  activeRoute: string;
  onRouteChange: (route: string) => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  activeRoute,
  onRouteChange,
}) => {
  const { userProfile, signOutUser, isDirector } = useAuth();
  const { districts, activeDistrictFilter, setActiveDistrictFilter, seedRealisticData, attendanceRecords, syncStatus } = useApp();
  const { unreadCount, isOnline, updateAvailable, reloadAppForUpdate } = useNotification();
  const { isInstalled, promptToInstall, isInstallable } = usePWA();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const handleNav = (route: string) => {
    onRouteChange(route);
    setMobileMenuOpen(false);
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'record', label: 'Record Visit', icon: UserPlus, highlight: true },
    { id: 'attendance', label: 'Attendance', icon: ClipboardList },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
    { id: 'services', label: 'Services', icon: Layers },
    { id: 'profile', label: 'My Profile', icon: User },
  ];

  if (isDirector) {
    navItems.push({ id: 'admin', label: 'Administration', icon: ShieldAlert });
  }

  const handleSeedData = async () => {
    if (confirm('Load realistic sample attendance data (4 months of youth visits) for analysis and report testing?')) {
      setSeeding(true);
      await seedRealisticData();
      setSeeding(false);
    }
  };

  const activeDistrictName = isDirector
    ? (activeDistrictFilter === 'all' ? 'All District Centers' : (districts.find(d => d.id === activeDistrictFilter)?.name || 'Nyabihu District'))
    : (userProfile?.districtName || 'Nyabihu District');

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row text-[#1F222C]">
      {/* Desktop Sidebar (hidden on mobile, visible md+) */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-[#23285E] text-white shrink-0 border-r border-[#1b1f4a] min-h-screen sticky top-0 h-screen z-30 shadow-md">
        {/* Sidebar Brand Header */}
        <div className="p-5 border-b border-white/10">
          <Logo variant="white" size="md" />
          
          {/* Active District Badge */}
          <div className="mt-4 px-3 py-2 rounded-xl bg-white/10 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <Building2 className="w-4 h-4 text-[#E6E65A] shrink-0" />
              <div className="truncate">
                <p className="text-[10px] text-slate-300 uppercase tracking-wider font-semibold">Location / District</p>
                <p className="text-xs font-bold text-white truncate">{activeDistrictName}</p>
              </div>
            </div>
            {isDirector && (
              <span className="text-[10px] bg-[#E6E65A] text-[#23285E] font-bold px-1.5 py-0.5 rounded">
                DIRECTOR
              </span>
            )}
          </div>

          {/* Director District Selector Dropdown */}
          {isDirector && (
            <div className="mt-2">
              <label className="text-[10px] text-white/70 block mb-1 font-semibold">View Data Scope:</label>
              <select
                value={activeDistrictFilter}
                onChange={(e) => setActiveDistrictFilter(e.target.value)}
                className="w-full bg-[#1b1f4a] text-white text-xs rounded-lg px-2.5 py-1.5 border border-white/20 focus:outline-none focus:ring-1 focus:ring-[#3591C8] cursor-pointer"
              >
                <option value="all">🌐 All Districts (Central View)</option>
                {districts.map(d => (
                  <option key={d.id} value={d.id}>📍 {d.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Primary Action Button */}
        <div className="p-4 pb-2">
          <button
            onClick={() => handleNav('record')}
            className="w-full bg-[#E6E65A] hover:bg-[#dcdc4f] active:bg-[#cece40] text-[#23285E] font-extrabold py-3 px-4 rounded-xl flex items-center justify-center gap-2.5 shadow-md transition-transform active:scale-98 cursor-pointer"
          >
            <UserPlus className="w-5 h-5 text-[#23285E]" />
            <span className="text-sm font-extrabold tracking-wide uppercase">Record Visit</span>
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-3 py-3 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeRoute === item.id;
            if (item.id === 'record') return null; // Already prominent at top
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer text-left ${
                  isActive
                    ? 'bg-[#3591C8] text-white font-bold shadow-xs'
                    : 'text-slate-200 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-300'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && item.badge > 0 ? (
                  <span className="bg-[#E6E65A] text-[#23285E] text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-xs">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}

          {/* Quick Demo Data Tool for empty states */}
          {attendanceRecords.length === 0 && (
            <div className="pt-4 px-2">
              <button
                onClick={handleSeedData}
                disabled={seeding}
                className="w-full text-left text-xs bg-white/5 hover:bg-white/10 text-white/80 p-2.5 rounded-xl border border-white/10 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#E6E65A]" />
                <span>{seeding ? 'Generating...' : 'Seed Sample Data (4 Mo)'}</span>
              </button>
            </div>
          )}
        </nav>

        {/* Desktop Sidebar Footer / Install status */}
        {!isInstalled && (
          <div className="px-4 py-2 border-t border-white/10">
            <button
              onClick={() => promptToInstall()}
              className="w-full py-2 px-3 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-[#DFF8F5] flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Download className="w-3.5 h-3.5 text-[#E6E65A]" />
                <span>Install Standalone App</span>
              </div>
              <ChevronRight className="w-3 h-3 text-slate-300" />
            </button>
          </div>
        )}

        {/* User Footer Profile */}
        <div className="p-4 border-t border-white/10 bg-[#1b1f4a]/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-[#3591C8] flex items-center justify-center font-bold text-white text-xs border border-white/30 shrink-0">
                {userProfile?.fullName?.charAt(0) || 'U'}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-white truncate">{userProfile?.fullName || 'Administrator'}</p>
                <p className="text-[10px] text-slate-300 truncate">{userProfile?.role === 'director' ? 'Main Director' : 'District Admin'}</p>
              </div>
            </div>
            <button
              onClick={signOutUser}
              title="Sign Out"
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen pb-24 md:pb-6">
        {/* PWA Update Banner if new version available */}
        {updateAvailable && (
          <div className="bg-[#23285E] text-white px-4 py-2 flex items-center justify-between text-xs border-b border-[#3591C8]/40 shadow-sm animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-[#E6E65A] animate-spin" />
              <span>A new version of NYABIHU YEGO is ready!</span>
            </div>
            <button
              onClick={reloadAppForUpdate}
              className="px-3 py-1 bg-[#E6E65A] text-[#23285E] font-bold rounded-lg hover:bg-yellow-300 transition-colors cursor-pointer"
            >
              Update Now
            </button>
          </div>
        )}

        {/* Top Header Bar (Mobile & Desktop) */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-20 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Hamburger Button for Mobile Drawer */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-700 hover:bg-slate-100 active:bg-slate-200 rounded-xl transition-colors cursor-pointer shrink-0"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-[#23285E]" /> : <Menu className="w-5 h-5 text-[#23285E]" />}
            </button>
            
            {/* Mobile Logo */}
            <div className="md:hidden flex items-center gap-2 overflow-hidden">
              <Logo size="sm" variant="full" showSubtitle={false} />
            </div>

            {/* Desktop breadcrumb / location context */}
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
              <span className="font-bold text-[#23285E]">NYABIHU YEGO CENTER</span>
              <span className="text-slate-300">/</span>
              <span className="font-medium text-[#3591C8] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 truncate max-w-[200px]">
                {activeDistrictName}
              </span>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Live Real-Time Sync Indicator */}
            {syncStatus === 'connected' && isOnline ? (
              <div
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200"
                title="Real-time Firestore synchronization active"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Live Sync</span>
              </div>
            ) : !isOnline || syncStatus === 'offline' ? (
              <div
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-900 text-[10px] sm:text-xs font-bold border border-amber-300 shrink-0"
                title="Offline mode active - visits cached locally and will sync when reconnected"
              >
                <WifiOff className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-700 shrink-0" />
                <span className="hidden xs:inline">Offline Cache</span>
              </div>
            ) : null}

            {/* Install PWA Button - Auto triggers native install prompt */}
            <PWAInstallPrompt variant="button" />

            {/* Notification Bell with Unread Badge */}
            <button
              onClick={() => handleNav('notifications')}
              id="header-notification-bell"
              className="relative p-2 text-slate-600 hover:text-[#23285E] hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="View Notifications"
              aria-label="View Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-[#23285E] text-[#E6E65A] text-[10px] font-extrabold rounded-full flex items-center justify-center border-2 border-white shadow-xs animate-in zoom-in duration-150">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* Quick Record Button for Desktop */}
            <button
              onClick={() => handleNav('record')}
              className="hidden sm:inline-flex items-center gap-1.5 bg-[#23285E] text-white hover:bg-[#1b1f4a] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <UserPlus className="w-3.5 h-3.5 text-[#E6E65A]" />
              <span>Record Visit</span>
            </button>

            {/* User Profile Avatar Link */}
            <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-slate-200">
              <button
                onClick={() => handleNav('profile')}
                className="w-8 h-8 rounded-full bg-[#23285E] text-white flex items-center justify-center text-xs font-bold hover:ring-2 hover:ring-[#3591C8] transition-all cursor-pointer shadow-xs"
                title="User Profile"
              >
                {userProfile?.fullName?.charAt(0) || 'A'}
              </button>
              <span className="hidden lg:inline text-xs font-semibold text-slate-700 truncate max-w-[120px]">
                {userProfile?.fullName?.split(' ')[0] || 'User'}
              </span>
            </div>
          </div>
        </header>

        {/* Mobile Dropdown Menu Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs top-[53px] animate-in fade-in duration-150">
            <div className="bg-[#23285E] text-white p-4 space-y-3 border-b border-white/10 shadow-2xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-top-4 duration-200">
              
              {/* User / District Header Card in Drawer */}
              <div className="p-3 rounded-2xl bg-white/10 border border-white/15">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="w-9 h-9 rounded-xl bg-[#3591C8] flex items-center justify-center font-bold text-white text-xs border border-white/30 shrink-0">
                      {userProfile?.fullName?.charAt(0) || 'U'}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold text-white truncate">{userProfile?.fullName || 'User'}</p>
                      <p className="text-[10px] text-slate-300 truncate">{userProfile?.email}</p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-[#E6E65A] text-[#23285E] font-extrabold px-2 py-0.5 rounded uppercase">
                    {userProfile?.role === 'director' ? 'Director' : 'Staff'}
                  </span>
                </div>

                <div className="mt-2.5 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-300">Active Location:</span>
                    <span className="font-bold text-[#DFF8F5] truncate">{activeDistrictName}</span>
                  </div>
                  {isDirector && (
                    <select
                      value={activeDistrictFilter}
                      onChange={(e) => setActiveDistrictFilter(e.target.value)}
                      className="w-full mt-2 bg-[#1b1f4a] text-white text-xs rounded-xl px-2.5 py-1.5 border border-white/20 focus:outline-none focus:ring-1 focus:ring-[#3591C8]"
                    >
                      <option value="all">🌐 All Districts (Central View)</option>
                      {districts.map(d => (
                        <option key={d.id} value={d.id}>📍 {d.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Install App Trigger inside Mobile Drawer */}
              {!isInstalled && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    promptToInstall();
                  }}
                  className="w-full p-3 rounded-2xl bg-gradient-to-r from-[#3591C8]/20 to-[#E6E65A]/20 border border-[#E6E65A]/30 text-white flex items-center justify-between transition-all active:scale-98 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#E6E65A] flex items-center justify-center text-[#23285E]">
                      <Download className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-white">Install Nyabihu App</p>
                      <p className="text-[10px] text-[#DFF8F5]">Add to home screen for 1-tap launch</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-[#E6E65A] underline">Install</span>
                </button>
              )}

              {/* Navigation Items List */}
              <div className="space-y-1 pt-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeRoute === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNav(item.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-[#3591C8] text-white font-bold shadow-xs'
                          : 'text-slate-200 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 text-white" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && item.badge > 0 ? (
                        <span className="bg-[#E6E65A] text-[#23285E] text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      ) : (
                        <ChevronRight className="w-4 h-4 opacity-40" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Sign Out Section in Drawer */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs text-slate-400">Account session</span>
                <button
                  onClick={signOutUser}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Page Content */}
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Fixed for phones & tablets) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-2xl"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0.5rem))' }}
      >
        {/* 1. Home / Dashboard */}
        <button
          onClick={() => handleNav('dashboard')}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-1.5 rounded-xl text-[10px] font-semibold transition-colors ${
            activeRoute === 'dashboard' ? 'text-[#23285E] font-bold bg-slate-100' : 'text-slate-500 hover:text-slate-800'
          }`}
          aria-label="Dashboard"
        >
          <LayoutDashboard className={`w-5 h-5 mb-0.5 ${activeRoute === 'dashboard' ? 'text-[#23285E]' : 'text-slate-500'}`} />
          <span className="truncate">Home</span>
        </button>

        {/* 2. Attendance List */}
        <button
          onClick={() => handleNav('attendance')}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-1.5 rounded-xl text-[10px] font-semibold transition-colors ${
            activeRoute === 'attendance' ? 'text-[#23285E] font-bold bg-slate-100' : 'text-slate-500 hover:text-slate-800'
          }`}
          aria-label="Attendance Records"
        >
          <ClipboardList className={`w-5 h-5 mb-0.5 ${activeRoute === 'attendance' ? 'text-[#23285E]' : 'text-slate-500'}`} />
          <span className="truncate">Attendance</span>
        </button>

        {/* 3. Center Elevated Primary Action: Record Visit */}
        <button
          onClick={() => handleNav('record')}
          className="flex flex-col items-center justify-center -mt-6 bg-[#23285E] hover:bg-[#1b1f4a] active:scale-95 text-white p-3.5 rounded-full shadow-xl border-4 border-white transition-all cursor-pointer"
          aria-label="Record Visit"
          title="Record Youth Visit"
        >
          <UserPlus className="w-6 h-6 text-[#E6E65A]" />
        </button>

        {/* 4. Reports */}
        <button
          onClick={() => handleNav('reports')}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-1.5 rounded-xl text-[10px] font-semibold transition-colors ${
            activeRoute === 'reports' ? 'text-[#23285E] font-bold bg-slate-100' : 'text-slate-500 hover:text-slate-800'
          }`}
          aria-label="Reports"
        >
          <FileText className={`w-5 h-5 mb-0.5 ${activeRoute === 'reports' ? 'text-[#23285E]' : 'text-slate-500'}`} />
          <span className="truncate">Reports</span>
        </button>

        {/* 5. More / Drawer Trigger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className={`relative flex flex-col items-center justify-center min-w-[56px] py-1 px-1.5 rounded-xl text-[10px] font-semibold transition-colors ${
            mobileMenuOpen || ['notifications', 'services', 'profile', 'admin'].includes(activeRoute)
              ? 'text-[#23285E] font-bold bg-slate-100'
              : 'text-slate-500 hover:text-slate-800'
          }`}
          aria-label="More Menu"
        >
          <MoreHorizontal className="w-5 h-5 mb-0.5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-3 w-2 h-2 bg-[#23285E] rounded-full ring-2 ring-white" />
          )}
          <span className="truncate">More</span>
        </button>
      </nav>
    </div>
  );
};
