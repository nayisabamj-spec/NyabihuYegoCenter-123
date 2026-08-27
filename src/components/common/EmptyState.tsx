import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  actionIcon?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  actionIcon,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-xs ${className}`}>
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-[#F8FAFC] border border-slate-200 flex items-center justify-center text-[#3591C8] mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-base font-bold text-[#23285E]">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mt-1 mb-5 leading-relaxed">{description}</p>
      {actionText && onAction && (
        <Button variant="primary" size="md" onClick={onAction} icon={actionIcon}>
          {actionText}
        </Button>
      )}
    </div>
  );
};
