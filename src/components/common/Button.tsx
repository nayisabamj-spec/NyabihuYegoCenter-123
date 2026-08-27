import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'outline-white' | 'white' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs font-medium rounded-lg gap-1.5 min-h-[36px]',
    md: 'px-4 py-2 text-sm font-semibold rounded-lg gap-2 min-h-[42px]',
    lg: 'px-5 py-2.5 text-base font-semibold rounded-xl gap-2.5 min-h-[48px]',
    xl: 'px-6 py-3.5 text-lg font-bold rounded-xl gap-3 min-h-[56px]',
  };

  const variantClasses = {
    primary: 'bg-[#23285E] text-white hover:bg-[#1b1f4a] active:bg-[#161a3e] border border-transparent shadow-sm focus:ring-2 focus:ring-[#3591C8] focus:ring-offset-2',
    secondary: 'bg-[#3591C8] text-white hover:bg-[#2c7cae] active:bg-[#256a95] border border-transparent shadow-sm focus:ring-2 focus:ring-[#3591C8] focus:ring-offset-2',
    accent: 'bg-[#E6E65A] text-[#1F222C] hover:bg-[#d8d84b] active:bg-[#caca3c] border border-transparent font-bold shadow-sm focus:ring-2 focus:ring-[#23285E] focus:ring-offset-2',
    outline: 'bg-white text-[#23285E] hover:bg-slate-50 active:bg-slate-100 border border-slate-300 shadow-sm focus:ring-2 focus:ring-[#3591C8]',
    'outline-white': 'bg-white/10 text-white hover:bg-white/20 active:bg-white/30 border-2 border-white/50 shadow-sm backdrop-blur-xs focus:ring-2 focus:ring-white/50',
    white: 'bg-white text-[#23285E] hover:bg-slate-100 active:bg-slate-200 border border-slate-200 shadow-md font-bold focus:ring-2 focus:ring-[#3591C8]',
    ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 active:bg-slate-200 border border-transparent',
    danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 border border-transparent shadow-sm focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 border border-transparent shadow-sm focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2',
  };

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center transition-colors select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses[size]} ${variantClasses[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      <span>{children}</span>
    </button>
  );
};
