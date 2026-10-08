import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  footer?: React.ReactNode;
  variant?: 'default' | 'muted' | 'interactive';
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  subtitle,
  badge,
  action,
  footer,
  variant = 'default',
  onClick,
}) => {
  const baseClasses = 'bg-white border border-[#E4E9EE] rounded-2xl transition-all';
  const variantClasses = {
    default: 'shadow-2xs',
    muted: 'bg-[#F8FAFC]',
    interactive: 'shadow-2xs hover:shadow-xs hover:border-slate-300 cursor-pointer',
  }[variant];

  const hasHeader = Boolean(title || subtitle || badge || action);

  return (
    <div
      onClick={onClick}
      className={`${baseClasses} ${variantClasses} ${className}`}
    >
      {hasHeader && (
        <div className="p-5 sm:p-6 border-b border-[#E4E9EE] flex items-center justify-between gap-4">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              {title && (
                <h3 className="text-base sm:text-lg font-semibold text-[#17324D] tracking-tight truncate">
                  {title}
                </h3>
              )}
              {badge}
            </div>
            {subtitle && (
              <p className="text-xs text-[#66788A] truncate">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
        </div>
      )}
      <div className={hasHeader ? 'p-5 sm:p-6' : 'p-5 sm:p-6'}>{children}</div>
      {footer && (
        <div className="px-5 py-3.5 sm:px-6 bg-[#F8FAFC] border-t border-[#E4E9EE] rounded-b-2xl">
          {footer}
        </div>
      )}
    </div>
  );
};
