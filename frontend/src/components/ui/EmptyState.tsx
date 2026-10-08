import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
  actionOnClick?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  actionTo,
  actionOnClick,
  className = '',
}) => {
  return (
    <div className={`p-8 sm:p-12 text-center bg-white rounded-2xl border border-[#E4E9EE] shadow-2xs space-y-3 ${className}`}>
      {icon && (
        <div className="w-12 h-12 rounded-full bg-slate-100 text-[#66788A] flex items-center justify-center mx-auto">
          {icon}
        </div>
      )}
      <h3 className="text-base sm:text-lg font-bold text-[#17324D]">{title}</h3>
      <p className="text-xs sm:text-sm text-[#66788A] max-w-sm mx-auto leading-relaxed">
        {description}
      </p>
      {(actionLabel && (actionTo || actionOnClick)) && (
        <div className="pt-2">
          <Button
            variant="primary"
            to={actionTo}
            onClick={actionOnClick}
          >
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
