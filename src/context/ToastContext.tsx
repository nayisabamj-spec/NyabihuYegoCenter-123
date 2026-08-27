import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  title: string;
  message?: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  addToast: (title: string, message?: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
  toast: {
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (title: string, message?: string, type: ToastType = 'info', duration = 3500) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newToast: ToastItem = { id, title, message, type, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const toast = {
    success: (title: string, message?: string) => addToast(title, message, 'success'),
    error: (title: string, message?: string) => addToast(title, message, 'error', 4500),
    info: (title: string, message?: string) => addToast(title, message, 'info'),
    warning: (title: string, message?: string) => addToast(title, message, 'warning', 4000),
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, toast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastContainerProps {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      aria-live="polite"
    >
      {toasts.map((t) => {
        let borderClass = 'border-slate-200 bg-white text-slate-800';
        let icon = <Info className="w-5 h-5 text-[#3591C8] shrink-0" />;

        if (t.type === 'success') {
          borderClass = 'border-emerald-200 bg-white text-slate-800 shadow-emerald-900/5';
          icon = <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />;
        } else if (t.type === 'error') {
          borderClass = 'border-rose-200 bg-white text-slate-800 shadow-rose-900/5';
          icon = <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />;
        } else if (t.type === 'warning') {
          borderClass = 'border-amber-200 bg-white text-slate-800 shadow-amber-900/5';
          icon = <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />;
        }

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-lg transition-all duration-200 transform translate-y-0 ${borderClass}`}
          >
            {icon}
            <div className="flex-1 min-w-0 pr-1">
              <p className="text-xs font-bold text-[#23285E] leading-tight">{t.title}</p>
              {t.message && (
                <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">{t.message}</p>
              )}
            </div>
            <button
              onClick={() => onRemove(t.id)}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer transition-colors"
              aria-label="Close notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
