import React from 'react';
import { Sex, UserRole, UserStatus } from '../../types';

interface BadgeProps {
  children?: React.ReactNode;
  variant?: 'sex-male' | 'sex-female' | 'role' | 'status' | 'default' | 'outline' | 'yellow';
  sex?: Sex;
  role?: UserRole;
  status?: UserStatus;
  className?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  sex,
  role,
  status,
  className = '',
  size = 'md',
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs font-semibold' : 'px-2.5 py-1 text-xs font-semibold';

  if (sex) {
    if (sex === 'Male') {
      return (
        <span className={`inline-flex items-center font-bold rounded-md bg-blue-50 text-[#1D4ED8] border border-blue-200 ${sizeClasses} ${className}`}>
          Male (Gabo)
        </span>
      );
    } else {
      return (
        <span className={`inline-flex items-center font-bold rounded-md bg-pink-50 text-pink-700 border border-pink-200 ${sizeClasses} ${className}`}>
          Female (Gore)
        </span>
      );
    }
  }

  if (status) {
    const statusStyles: Record<UserStatus, { bg: string; text: string; label: string }> = {
      approved: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', label: 'Approved (Yemewe)' },
      pending: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', label: 'Pending (Gutegereza)' },
      suspended: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', label: 'Suspended' },
      rejected: { bg: 'bg-slate-100 border-slate-300', text: 'text-slate-700', label: 'Rejected' },
      deactivated: { bg: 'bg-gray-100 border-gray-200', text: 'text-gray-600', label: 'Deactivated' },
    };
    const s = statusStyles[status] || statusStyles.pending;
    return (
      <span className={`inline-flex items-center rounded-md border font-medium ${s.bg} ${s.text} ${sizeClasses} ${className}`}>
        {children || s.label}
      </span>
    );
  }

  if (role) {
    if (role === 'director') {
      return (
        <span className={`inline-flex items-center font-bold rounded-md bg-[#23285E]/10 text-[#23285E] border border-[#23285E]/20 ${sizeClasses} ${className}`}>
          Main Director
        </span>
      );
    }
    return (
      <span className={`inline-flex items-center font-medium rounded-md bg-slate-100 text-slate-700 border border-slate-200 ${sizeClasses} ${className}`}>
        District Admin
      </span>
    );
  }

  if (variant === 'yellow') {
    return (
      <span className={`inline-flex items-center rounded-md bg-[#E6E65A]/25 text-[#23285E] border border-[#E6E65A] font-bold ${sizeClasses} ${className}`}>
        {children}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center rounded-md bg-slate-100 text-slate-700 border border-slate-200 ${sizeClasses} ${className}`}>
      {children}
    </span>
  );
};
