import React from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'dark' | 'secondary' | 'tertiary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  to?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  to,
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  className = '',
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-semibold transition-all select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

  const sizeClasses = {
    sm: 'h-8 px-3 text-xs rounded-lg gap-1.5',
    md: 'h-10 px-4 text-xs sm:text-sm rounded-xl gap-2',
    lg: 'h-12 px-6 text-sm sm:text-base rounded-xl gap-2.5',
  }[size];

  const variantClasses = {
    primary: 'bg-[#F58220] hover:bg-[#d96f18] text-white shadow-2xs hover:shadow-xs active:scale-[0.99]',
    dark: 'bg-[#173B56] hover:bg-[#102C41] text-white shadow-2xs hover:shadow-xs active:scale-[0.99]',
    secondary: 'bg-white hover:bg-slate-50 text-[#17324D] border border-[#E4E9EE] hover:border-slate-300 shadow-2xs',
    tertiary: 'bg-transparent hover:bg-slate-100 text-[#66788A] hover:text-[#17324D]',
    danger: 'bg-[#D94B4B] hover:bg-red-700 text-white shadow-2xs',
    success: 'bg-[#0FA968] hover:bg-emerald-700 text-white shadow-2xs',
  }[variant];

  const content = (
    <>
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>
      )}
      <span>{children}</span>
      {!loading && icon && iconPosition === 'right' && (
        <span className="shrink-0">{icon}</span>
      )}
    </>
  );

  if (to && !disabled) {
    return (
      <Link
        to={to}
        className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      disabled={disabled || loading}
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {content}
    </button>
  );
};
