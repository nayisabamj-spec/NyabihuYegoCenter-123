import React, { useState, useEffect, Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { NotificationProvider } from './context/NotificationContext';
import { ToastProvider } from './context/ToastContext';
import { PWAProvider } from './context/PWAContext';
import { ToastContainer } from './components/common/ToastContainer';
import { AppLayout } from './components/layout/AppLayout';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { RecordVisitPage } from './pages/RecordVisitPage';
import { AttendancePage } from './pages/AttendancePage';
import { Logo } from './components/common/Logo';

// Lazy load secondary pages to optimize initial bundle size & load speed
const ReportsPage = lazy(() => import('./pages/ReportsPage').then(m => ({ default: m.ReportsPage })));
const ServicesPage = lazy(() => import('./pages/ServicesPage').then(m => ({ default: m.ServicesPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const AdminManagementPage = lazy(() => import('./pages/AdminManagementPage').then(m => ({ default: m.AdminManagementPage })));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then(m => ({ default: m.NotificationsPage })));

const PageLoaderFallback = () => (
  <div className="flex items-center justify-center p-12 min-h-[300px]">
    <div className="w-8 h-8 border-3 border-[#23285E]/20 border-t-[#23285E] rounded-full animate-spin"></div>
  </div>
);

function AppContent() {
  const { userProfile, loading, isPending, isSuspendedOrRejected, isApproved, isDirector } = useAuth();
  const [authView, setAuthView] = useState<'landing' | 'login'>('landing');
  const [activeRoute, setActiveRoute] = useState<string>('dashboard');

  // Handle URL shortcut params (e.g., ?view=record from PWA shortcuts)
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const requestedView = urlParams.get('view');
      if (requestedView) {
        if (['dashboard', 'record', 'attendance', 'reports', 'services', 'profile', 'admin', 'notifications'].includes(requestedView)) {
          setActiveRoute(requestedView);
        }
      }
    } catch {}
  }, []);

  // If user signed out, return to landing or login
  useEffect(() => {
    if (!userProfile || !isApproved) {
      // keep current authView
    } else {
      // If approved user, ensure route is valid
      if (activeRoute === 'admin' && !isDirector) {
        setActiveRoute('dashboard');
      }
    }
  }, [userProfile, isApproved, isDirector, activeRoute]);

  // Global loading state while checking Firebase Auth / Session
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Logo size="lg" />
          <div className="w-8 h-8 border-3 border-[#23285E]/20 border-t-[#23285E] rounded-full animate-spin mt-4"></div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Loading Youth Services Platform...
          </p>
        </div>
      </div>
    );
  }

  // Not authenticated, pending approval, or restricted:
  if (!userProfile || !isApproved) {
    if (authView === 'login' || isPending || isSuspendedOrRejected) {
      return (
        <>
          <LoginPage onBackToLanding={() => setAuthView('landing')} />
          <ToastContainer />
        </>
      );
    }
    return (
      <>
        <LandingPage onLoginClick={() => setAuthView('login')} />
        <ToastContainer />
      </>
    );
  }

  // Authenticated & Approved view
  return (
    <AppLayout activeRoute={activeRoute} onRouteChange={setActiveRoute}>
      <Suspense fallback={<PageLoaderFallback />}>
        {activeRoute === 'dashboard' && (
          <DashboardPage onNavigate={(route) => setActiveRoute(route)} />
        )}
        {activeRoute === 'record' && <RecordVisitPage />}
        {activeRoute === 'attendance' && (
          <AttendancePage onNavigateToRecord={() => setActiveRoute('record')} />
        )}
        {activeRoute === 'reports' && <ReportsPage />}
        {activeRoute === 'notifications' && (
          <NotificationsPage onNavigateToRoute={(route) => setActiveRoute(route)} />
        )}
        {activeRoute === 'services' && <ServicesPage />}
        {activeRoute === 'profile' && <ProfilePage />}
        {activeRoute === 'admin' && isDirector && <AdminManagementPage />}
        {activeRoute === 'admin' && !isDirector && (
          <DashboardPage onNavigate={(route) => setActiveRoute(route)} />
        )}
      </Suspense>
      <ToastContainer />
    </AppLayout>
  );
}


export default function App() {
  return (
    <ToastProvider>
      <PWAProvider>
        <AuthProvider>
          <AppProvider>
            <NotificationProvider>
              <AppContent />
            </NotificationProvider>
          </AppProvider>
        </AuthProvider>
      </PWAProvider>
    </ToastProvider>
  );
}
