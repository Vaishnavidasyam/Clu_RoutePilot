import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ArrowLeft } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export interface PageHeaderProps {
  breadcrumbs?: BreadcrumbItem[];
  title: string;
  subtitle?: string;
  backTo?: {
    label: string;
    to: string;
  };
  statusBadge?: {
    label: string;
    variant?: 'success' | 'warning' | 'info' | 'neutral' | 'danger';
  };
  primaryAction?: {
    label: string;
    onClick?: () => void;
    to?: string;
    icon?: React.ReactNode;
    disabled?: boolean;
    loading?: boolean;
  };
  secondaryActions?: Array<{
    label: string;
    onClick?: () => void;
    to?: string;
    icon?: React.ReactNode;
    variant?: 'outline' | 'subtle';
  }>;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  breadcrumbs,
  title,
  subtitle,
  backTo,
  statusBadge,
  primaryAction,
  secondaryActions = [],
}) => {
  const getBadgeStyle = (variant = 'neutral') => {
    switch (variant) {
      case 'success':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'warning':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'danger':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'info':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="space-y-1.5 min-w-0">
        {backTo ? (
          <Link
            to={backTo.to}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-navy transition -ml-1 py-0.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{backTo.label}</span>
          </Link>
        ) : breadcrumbs && breadcrumbs.length > 0 ? (
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-300" />}
                {crumb.to ? (
                  <Link to={crumb.to} className="hover:text-navy transition">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-slate-600 font-semibold">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        ) : null}

        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-bold text-navy tracking-tight truncate">{title}</h1>
          {statusBadge && (
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getBadgeStyle(
                statusBadge.variant
              )}`}
            >
              {statusBadge.label}
            </span>
          )}
        </div>

        {subtitle && <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">{subtitle}</p>}
      </div>

      {(primaryAction || secondaryActions.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
          {secondaryActions.map((action, idx) => {
            const className =
              action.variant === 'outline'
                ? 'px-4 py-2.5 rounded-full text-xs font-semibold bg-white border border-slate-200 text-navy hover:bg-slate-50 shadow-sm transition flex items-center gap-1.5'
                : 'px-4 py-2.5 rounded-full text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-navy transition flex items-center gap-1.5';

            if (action.to) {
              return (
                <Link key={idx} to={action.to} className={className}>
                  {action.icon}
                  <span>{action.label}</span>
                </Link>
              );
            }
            return (
              <button key={idx} onClick={action.onClick} className={className}>
                {action.icon}
                <span>{action.label}</span>
              </button>
            );
          })}

          {primaryAction &&
            (primaryAction.to ? (
              <Link
                to={primaryAction.to}
                className="px-6 py-2.5 rounded-full text-xs font-bold bg-[#ee822a] text-white hover:bg-orange-dark shadow-[0_4px_14px_rgba(238,130,42,0.35)] hover:-translate-y-0.5 transition duration-200 flex items-center gap-2"
              >
                {primaryAction.icon}
                <span>{primaryAction.label}</span>
              </Link>
            ) : (
              <button
                onClick={primaryAction.onClick}
                disabled={primaryAction.disabled || primaryAction.loading}
                className="px-6 py-2.5 rounded-full text-xs font-bold bg-[#ee822a] text-white hover:bg-orange-dark shadow-[0_4px_14px_rgba(238,130,42,0.35)] hover:-translate-y-0.5 transition duration-200 flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                {primaryAction.icon}
                <span>{primaryAction.loading ? 'Processing...' : primaryAction.label}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
};
