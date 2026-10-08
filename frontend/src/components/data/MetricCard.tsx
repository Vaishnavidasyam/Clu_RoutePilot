import React from 'react';

export interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  badge,
  icon,
  onClick,
  className = '',
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white border border-[#E4E9EE] rounded-2xl p-5 shadow-2xs flex flex-col justify-between transition-all ${
        onClick ? 'cursor-pointer hover:border-slate-300 hover:shadow-xs' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold tracking-wider text-[#66788A] uppercase truncate">
          {label}
        </span>
        {icon && <div className="text-[#66788A] shrink-0">{icon}</div>}
      </div>

      <div className="my-2.5 flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-bold text-[#17324D] tracking-tight">
          {value}
        </span>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>

      {subtext && (
        <span className="text-xs text-[#66788A] truncate font-medium">
          {subtext}
        </span>
      )}
    </div>
  );
};
