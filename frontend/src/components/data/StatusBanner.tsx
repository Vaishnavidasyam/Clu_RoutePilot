import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface StatusBannerProps {
  status: 'success' | 'warning' | 'danger' | 'info';
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
  actionOnClick?: () => void;
  className?: string;
}

export const StatusBanner: React.FC<StatusBannerProps> = ({
  status,
  title,
  description,
  actionLabel,
  actionTo,
  actionOnClick,
  className = '',
}) => {
  const config = {
    success: {
      bg: 'bg-emerald-50/80 border-emerald-200/90 text-emerald-900',
      icon: <CheckCircle2 className="w-5 h-5 text-[#0FA968] shrink-0" />,
      actionColor: 'text-[#0FA968] hover:text-emerald-800',
    },
    warning: {
      bg: 'bg-amber-50/80 border-amber-200/90 text-amber-900',
      icon: <AlertTriangle className="w-5 h-5 text-[#E9A23B] shrink-0" />,
      actionColor: 'text-[#d18c28] hover:text-amber-800',
    },
    danger: {
      bg: 'bg-rose-50/80 border-rose-200/90 text-rose-900',
      icon: <AlertCircle className="w-5 h-5 text-[#D94B4B] shrink-0" />,
      actionColor: 'text-[#D94B4B] hover:text-rose-800',
    },
    info: {
      bg: 'bg-sky-50/80 border-sky-200/90 text-sky-900',
      icon: <Info className="w-5 h-5 text-[#3B82F6] shrink-0" />,
      actionColor: 'text-[#3B82F6] hover:text-sky-800',
    },
  }[status];

  return (
    <div className={`p-4 sm:p-5 rounded-2xl border flex items-center justify-between gap-4 ${config.bg} ${className}`}>
      <div className="flex items-center gap-3.5 min-w-0">
        {config.icon}
        <div className="space-y-0.5 min-w-0">
          <div className="text-xs sm:text-sm font-bold truncate">{title}</div>
          <div className="text-xs text-slate-600 truncate">{description}</div>
        </div>
      </div>

      {(actionLabel && (actionTo || actionOnClick)) && (
        <div className="shrink-0">
          {actionTo ? (
            <Link
              to={actionTo}
              className={`inline-flex items-center gap-1.5 text-xs font-bold ${config.actionColor} transition`}
            >
              <span>{actionLabel}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <button
              onClick={actionOnClick}
              className={`inline-flex items-center gap-1.5 text-xs font-bold ${config.actionColor} transition cursor-pointer`}
            >
              <span>{actionLabel}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
