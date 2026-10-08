import React from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

/**
 * Universal RoutePilot Authentication Card
 * Uses clean frosted glassmorphism over the city/route background:
 * - background: rgba(255, 255, 255, 0.88)
 * - backdrop-filter: blur(16px)
 * - border: 1px solid rgba(255, 255, 255, 0.85)
 * - shadow: 0 20px 60px rgba(23, 59, 86, 0.12)
 */
export const AuthCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div className={`w-full max-w-[460px] bg-white/90 backdrop-blur-md rounded-3xl border border-white/85 p-7 sm:p-9 shadow-[0_20px_60px_rgba(23,59,86,0.12)] relative z-10 transition-all ${className}`}>
      {children}
    </div>
  );
};

/**
 * RoutePilot Brand Logo Mark for Auth Card Top
 */
export const AuthLogo: React.FC = () => {
  return (
    <div className="flex justify-center mb-4">
      <Link to="/" className="inline-flex items-center gap-2.5 font-bold tracking-[0.22em] text-sm text-[#173B56] group">
        <img src="/app-icon.png" alt="RoutePilot" className="w-8 h-8 rounded-xl object-cover shadow-[0_4px_12px_rgba(245,130,32,0.35)] group-hover:scale-105 transition duration-200 shrink-0" />
        <span>ROUTEPILOT</span>
      </Link>
    </div>
  );
};

/**
 * Reusable Form Field Wrapper with Label and optional error
 */
export const FormField: React.FC<{
  label: string;
  error?: string | null;
  children: React.ReactNode;
}> = ({ label, error, children }) => {
  return (
    <div className="space-y-1.5 text-left">
      <label className="block text-xs font-semibold text-[#173B56]">
        {label}
      </label>
      {children}
      {error && (
        <p className="text-[11px] text-[#D94B4B] font-medium pt-0.5">{error}</p>
      )}
    </div>
  );
};

/**
 * Standard White Input Component with crisp focus ring
 */
interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  hasError?: boolean;
}

export const FormInput: React.FC<FormInputProps> = ({ 
  icon, 
  hasError, 
  className = '', 
  ...props 
}) => {
  const plClass = icon ? 'pl-10' : 'pl-3.5';
  const borderClass = hasError
    ? 'border-[#D94B4B] focus:border-[#D94B4B] focus:ring-2 focus:ring-[#D94B4B]/20'
    : 'border-[#DCE8EC] focus:border-[#F58220] focus:ring-3 focus:ring-[#F58220]/15';

  return (
    <div className="relative">
      {icon && (
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#687F91] pointer-events-none">
          {icon}
        </div>
      )}
      <input
        {...props}
        className={`w-full h-[48px] rounded-xl border bg-white/95 text-xs sm:text-sm text-[#173B56] placeholder:text-[#8BA0AE] transition duration-200 focus:outline-none ${plClass} pr-3.5 ${borderClass} ${className}`}
      />
    </div>
  );
};

/**
 * Password Input with Show/Hide Toggle
 */
interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  hasError?: boolean;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({ 
  icon, 
  hasError, 
  className = '', 
  ...props 
}) => {
  const [show, setShow] = React.useState(false);
  const plClass = icon ? 'pl-10' : 'pl-3.5';
  const borderClass = hasError
    ? 'border-[#D94B4B] focus:border-[#D94B4B] focus:ring-2 focus:ring-[#D94B4B]/20'
    : 'border-[#DCE8EC] focus:border-[#F58220] focus:ring-3 focus:ring-[#F58220]/15';

  return (
    <div className="relative">
      {icon && (
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#687F91] pointer-events-none">
          {icon}
        </div>
      )}
      <input
        {...props}
        type={show ? 'text' : 'password'}
        className={`w-full h-[48px] rounded-xl border bg-white/95 text-xs sm:text-sm text-[#173B56] placeholder:text-[#8BA0AE] transition duration-200 focus:outline-none ${plClass} pr-10 ${borderClass} ${className}`}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8BA0AE] hover:text-[#173B56] p-1 rounded-md transition focus:outline-none cursor-pointer"
        tabIndex={-1}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
};

/**
 * Primary Orange RoutePilot Button
 */
interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  icon?: React.ReactNode;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({ 
  children, 
  loading, 
  icon, 
  className = '', 
  ...props 
}) => {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`inline-flex items-center justify-center gap-2 w-full h-[50px] px-6 rounded-xl text-sm font-semibold bg-[#F58220] hover:bg-[#e07216] text-white shadow-[0_12px_24px_-10px_rgba(245,130,32,0.8)] hover:shadow-[0_16px_28px_-8px_rgba(245,130,32,0.9)] hover:-translate-y-0.5 active:translate-y-0 transition duration-200 disabled:opacity-60 disabled:pointer-events-none cursor-pointer ${className}`}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Please wait...</span>
        </>
      ) : (
        <>
          <span>{children}</span>
          {icon}
        </>
      )}
    </button>
  );
};

import { authService } from '../../services/api';
import { formatTimeRange } from '../../utils/formatters';

export interface DemoExecutiveItem {
  id: string;
  name: string;
  shift_start: string;
  shift_end: string;
  home_lat: number;
  home_lon: number;
  max_visits: number;
  max_km: number;
  status: string;
  email: string;
  stops_count: number;
}

/**
 * Dynamic Demo Account Quick Selector
 * Dynamically queries active field executives from the uploaded operational roster.
 * Only executives included by Manager/Admin are presented and authorized.
 */
export const DemoAccountSelector: React.FC<{
  onSelect: (email: string, pass: string) => void;
  selectedEmail: string;
}> = ({ onSelect, selectedEmail }) => {
  const [roleTab, setRoleTab] = React.useState<'MANAGER' | 'ADMIN' | 'EXECUTIVE'>('MANAGER');
  const [executives, setExecutives] = React.useState<DemoExecutiveItem[]>([]);
  const [loadingExecs, setLoadingExecs] = React.useState(true);
  const [selectedExecId, setSelectedExecId] = React.useState<string>('E01');

  React.useEffect(() => {
    let isMounted = true;
    const fetchExecutives = async () => {
      try {
        setLoadingExecs(true);
        const res = await authService.getDemoExecutives();
        if (isMounted && res.data && Array.isArray(res.data)) {
          setExecutives(res.data);
          if (res.data.length > 0) {
            setSelectedExecId(res.data[0].id);
          }
        }
      } catch (err) {
        console.warn('Failed to load demo executives roster:', err);
      } finally {
        if (isMounted) setLoadingExecs(false);
      }
    };
    fetchExecutives();
    return () => {
      isMounted = false;
    };
  }, []);

  // Update tab based on selectedEmail
  React.useEffect(() => {
    const lower = selectedEmail.toLowerCase();
    if (lower.includes('admin')) {
      setRoleTab('ADMIN');
    } else if (lower.includes('manager')) {
      setRoleTab('MANAGER');
    } else if (lower.includes('executive') || /^e\d+/i.test(lower)) {
      setRoleTab('EXECUTIVE');
      // Match exec ID if present
      const match = lower.match(/^e\d+/i) || lower.match(/^(?:e\d+)/);
      if (match) {
        const eid = match[0].toUpperCase();
        setSelectedExecId(eid);
      }
    }
  }, [selectedEmail]);

  const handleRoleClick = (role: 'MANAGER' | 'ADMIN' | 'EXECUTIVE') => {
    setRoleTab(role);
    if (role === 'MANAGER') {
      onSelect('manager@routepilot.io', 'manager123');
    } else if (role === 'ADMIN') {
      onSelect('admin@routepilot.io', 'admin123');
    } else if (role === 'EXECUTIVE') {
      const targetExec = executives.find(e => e.id === selectedExecId) || executives[0];
      if (targetExec) {
        setSelectedExecId(targetExec.id);
        onSelect(targetExec.email, 'exec123');
      } else {
        onSelect('e01@routepilot.io', 'exec123');
      }
    }
  };

  const handleExecutiveSelect = (exec: DemoExecutiveItem) => {
    setSelectedExecId(exec.id);
    setRoleTab('EXECUTIVE');
    onSelect(exec.email, 'exec123');
  };

  const currentExec = executives.find(e => e.id === selectedExecId) || executives[0];

  return (
    <div className="p-3.5 bg-white/75 backdrop-blur-md border border-[#DCE8EC] rounded-2xl space-y-2.5 text-left shadow-2xs">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-[#687F91] uppercase tracking-wider">
          Demo Accounts (1-Click)
        </span>
        {executives.length > 0 && (
          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            {executives.length} Active Roster
          </span>
        )}
      </div>

      {/* Role Pill Switcher */}
      <div className="grid grid-cols-3 gap-1.5">
        <button
          type="button"
          onClick={() => handleRoleClick('MANAGER')}
          className={`text-xs font-semibold py-1.5 px-2 rounded-xl transition duration-150 cursor-pointer ${
            roleTab === 'MANAGER'
              ? 'bg-white text-[#F58220] border border-[#F58220] shadow-2xs font-bold'
              : 'bg-white/80 text-[#173B56] border border-[#DCE8EC] hover:border-[#F58220]/60 hover:text-[#F58220]'
          }`}
        >
          Manager
        </button>

        <button
          type="button"
          onClick={() => handleRoleClick('ADMIN')}
          className={`text-xs font-semibold py-1.5 px-2 rounded-xl transition duration-150 cursor-pointer ${
            roleTab === 'ADMIN'
              ? 'bg-white text-[#F58220] border border-[#F58220] shadow-2xs font-bold'
              : 'bg-white/80 text-[#173B56] border border-[#DCE8EC] hover:border-[#F58220]/60 hover:text-[#F58220]'
          }`}
        >
          Admin
        </button>

        <button
          type="button"
          onClick={() => handleRoleClick('EXECUTIVE')}
          className={`text-xs font-semibold py-1.5 px-2 rounded-xl transition duration-150 cursor-pointer flex items-center justify-center gap-1 ${
            roleTab === 'EXECUTIVE'
              ? 'bg-white text-[#F58220] border border-[#F58220] shadow-2xs font-bold'
              : 'bg-white/80 text-[#173B56] border border-[#DCE8EC] hover:border-[#F58220]/60 hover:text-[#F58220]'
          }`}
        >
          <span>Executive</span>
          {executives.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${roleTab === 'EXECUTIVE' ? 'bg-[#F58220]/15 text-[#F58220]' : 'bg-slate-100 text-slate-500'}`}>
              {executives.length}
            </span>
          )}
        </button>
      </div>

      {/* When Executive Role is chosen: Show dynamic roster list and exact details */}
      {roleTab === 'EXECUTIVE' && (
        <div className="pt-1.5 space-y-2">
          {loadingExecs ? (
            <div className="text-center py-2 text-xs text-[#687F91] flex items-center justify-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F58220]" />
              <span>Loading operational roster...</span>
            </div>
          ) : executives.length === 0 ? (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
              No field executives found for today. Upload <strong>executives.csv</strong> as Operations Manager.
            </div>
          ) : (
            <>
              {/* Executive Chips / Grid */}
              <div className="text-[11px] font-semibold text-[#173B56] flex items-center justify-between">
                <span>Select Field Executive:</span>
                <span className="text-[10px] text-[#687F91]">Only manager-approved reps have access</span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {executives.map((exc) => {
                  const isCurrent = exc.id === selectedExecId;
                  return (
                    <button
                      key={exc.id}
                      type="button"
                      onClick={() => handleExecutiveSelect(exc)}
                      className={`py-1.5 px-1 rounded-xl text-xs font-bold transition flex flex-col items-center cursor-pointer ${
                        isCurrent
                          ? 'bg-[#F58220] text-white shadow-xs scale-[1.02]'
                          : 'bg-white/90 text-[#173B56] border border-[#DCE8EC] hover:border-[#F58220]/60 hover:text-[#F58220]'
                      }`}
                    >
                      <span className="text-xs">{exc.id}</span>
                      <span className={`text-[9px] font-normal truncate max-w-full ${isCurrent ? 'text-white/90' : 'text-slate-400'}`}>
                        {exc.stops_count} visits
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Exact Information Display for Selected Executive */}
              {currentExec && (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/90 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#173B56]">
                      {currentExec.name} ({currentExec.id})
                    </span>
                    <span className="font-mono text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded border border-emerald-300">
                      Roster Verified
                    </span>
                  </div>
                  <div className="text-[11px] text-[#687F91] flex items-center justify-between">
                    <span>Shift: {formatTimeRange(currentExec.shift_start, currentExec.shift_end)}</span>
                    <span className="font-semibold text-[#173B56]">{currentExec.stops_count} stops assigned</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">
                    Home Base: {currentExec.home_lat.toFixed(4)}, {currentExec.home_lon.toFixed(4)} · Max {currentExec.max_km} km
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
