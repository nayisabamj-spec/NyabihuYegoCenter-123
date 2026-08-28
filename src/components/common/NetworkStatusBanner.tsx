import React, { useState, useEffect, useCallback } from 'react';
import { WifiOff, Wifi, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface NetworkStatusBannerProps {
  onReconnect?: () => Promise<void> | void;
}

export const NetworkStatusBanner: React.FC<NetworkStatusBannerProps> = ({ onReconnect }) => {
  const [isOnline, setIsOnline] = useState<boolean>(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [showRestored, setShowRestored] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const { toast } = useToast();

  const handleManualCheck = useCallback(async () => {
    setIsChecking(true);
    try {
      // Test actual connectivity with a fast ping
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      
      const response = await fetch('/api/health', {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      }).catch(() => null);
      
      clearTimeout(timeoutId);

      if (response && response.ok) {
        setIsOnline(true);
        setShowRestored(true);
        toast.success('Connection Restored', 'Reconnected to Nyabihu YEGO Center services.');
        if (onReconnect) {
          await onReconnect();
        }
        setTimeout(() => setShowRestored(false), 4000);
      } else if (navigator.onLine) {
        // Browser says online
        setIsOnline(true);
        setShowRestored(true);
        if (onReconnect) {
          await onReconnect();
        }
        setTimeout(() => setShowRestored(false), 4000);
      } else {
        setIsOnline(false);
        toast.error('Still Offline', 'Internet connection is not available yet. Please check your Wi-Fi or mobile data.');
      }
    } catch {
      setIsOnline(navigator.onLine);
    } finally {
      setIsChecking(false);
    }
  }, [onReconnect, toast]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowRestored(true);
      toast.success('Connection Restored', 'Internet connection has been re-established.');
      if (onReconnect) {
        try {
          onReconnect();
        } catch {}
      }
      const timer = setTimeout(() => {
        setShowRestored(false);
      }, 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowRestored(false);
      toast.warning('No Internet Connection', 'Your device is currently offline. Actions requiring database persistence will be paused.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onReconnect, toast]);

  if (isOnline && !showRestored) {
    return null;
  }

  // Connection Restored Banner
  if (isOnline && showRestored) {
    return (
      <aside
        aria-label="Connection Status"
        className="bg-emerald-600 text-white px-4 py-2.5 shadow-md flex items-center justify-between text-xs font-semibold sticky top-0 z-50 animate-in slide-in-from-top duration-300"
      >
        <div className="flex items-center gap-2.5 max-w-7xl mx-auto w-full justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#E6E65A]" />
            <span>
              <strong>Connection restored.</strong> Database synchronization active.
            </span>
          </div>
          <button
            onClick={() => setShowRestored(false)}
            className="text-[11px] underline text-emerald-100 hover:text-white cursor-pointer px-2 py-0.5"
          >
            Dismiss
          </button>
        </div>
      </aside>
    );
  }

  // Offline / Connection Lost Banner
  return (
    <aside
      aria-label="Connection Status"
      className="bg-[#23285E] border-b-2 border-[#E6E65A] text-white px-4 py-3 shadow-xl sticky top-0 z-50 animate-in slide-in-from-top duration-300"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-center sm:text-left">
          <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/30 flex items-center justify-center shrink-0">
            <WifiOff className="w-4 h-4 text-[#E6E65A]" />
          </div>
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="font-extrabold text-sm text-[#E6E65A] uppercase tracking-wide">
                No Internet Connection
              </span>
              <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-slate-300">
                Nyabihu Offline Mode
              </span>
            </div>
            <p className="text-xs text-slate-200 mt-0.5">
              Your connection was lost. We are trying to reconnect automatically.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleManualCheck}
            disabled={isChecking}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#E6E65A] text-[#23285E] text-xs font-black hover:bg-[#d6d64a] active:scale-95 transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Checking...' : 'Try Again'}</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
