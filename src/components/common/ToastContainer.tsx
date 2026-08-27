import React from 'react';
import { useNotification } from '../../context/NotificationContext';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useNotification();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      id="app-toast-container"
    >
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isWarning = toast.type === 'warning';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl shadow-lg border backdrop-blur-md transition-all animate-in slide-in-from-bottom-5 duration-200 ${
              isSuccess
                ? 'bg-[#23285E]/95 border-[#3591C8] text-white'
                : isWarning
                ? 'bg-amber-900/95 border-amber-500 text-amber-50'
                : 'bg-slate-900/95 border-slate-700 text-white'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {isSuccess && <CheckCircle2 className="w-4 h-4 text-[#E6E65A]" />}
              {isWarning && <AlertTriangle className="w-4 h-4 text-amber-300" />}
              {!isSuccess && !isWarning && <Info className="w-4 h-4 text-[#3591C8]" />}
            </div>

            <div className="flex-1 min-w-0">
              <h5 className="text-xs font-bold leading-tight">{toast.title}</h5>
              <p className="text-[11px] opacity-90 mt-0.5 leading-snug">{toast.message}</p>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white p-1 transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
