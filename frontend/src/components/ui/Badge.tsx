import React from 'react';

export type BadgeVariant = 
  | 'success' 
  | 'warning' 
  | 'danger' 
  | 'accent' 
  | 'info' 
  | 'neutral'
  | 'ptp';

export interface BadgeProps {
  children?: React.ReactNode;
  label?: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  showDot?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  label,
  variant = 'neutral',
  size = 'md',
  showDot = false,
  icon,
  className = '',
}) => {
  const content = children || label;

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 font-bold',
    md: 'text-[11px] px-2.5 py-1 font-semibold',
  }[size];

  const variantClasses = {
    success: 'bg-emerald-50 text-[#0FA968] border-emerald-200/90',
    warning: 'bg-amber-50 text-[#d18c28] border-amber-200/90',
    danger: 'bg-rose-50 text-[#D94B4B] border-rose-200/90',
    accent: 'bg-orange-50 text-[#F58220] border-orange-200/90',
    ptp: 'bg-orange-50 text-[#F58220] border-orange-200 font-bold tracking-wider',
    info: 'bg-sky-50 text-[#3B82F6] border-sky-200/90',
    neutral: 'bg-slate-100 text-[#66788A] border-slate-200',
  }[variant];

  const dotClasses = {
    success: 'bg-[#0FA968]',
    warning: 'bg-[#E9A23B]',
    danger: 'bg-[#D94B4B]',
    accent: 'bg-[#F58220]',
    ptp: 'bg-[#F58220]',
    info: 'bg-[#3B82F6]',
    neutral: 'bg-[#94A3B8]',
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border tracking-wide uppercase ${sizeClasses} ${variantClasses} ${className}`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClasses}`} />}
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{content}</span>
    </span>
  );
};
