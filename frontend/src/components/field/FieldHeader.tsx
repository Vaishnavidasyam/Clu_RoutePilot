import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw, Bike, ShieldCheck, ChevronDown, User, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { APP_LOCATION } from '../../config/locale';
import { useDateTime } from '../../context/DateTimeContext';
import { useAuth } from '../../context/AuthContext';

interface FieldHeaderProps {
  executiveId: string;
  executiveName: string;
  pageTitle?: string;
  areaText?: string;
  vehicleText?: string;
  isOnDuty?: boolean;
  syncState?: 'synced' | 'syncing' | 'offline' | 'error';
  onRefresh?: () => void;
  isRefreshing?: boolean;
  // Executive Preview Mode (Admins / Managers only)
  isDemoUser?: boolean;
  availableExecutives?: Array<{ id: string; name: string }>;
  onSelectExecutive?: (id: string) => void;
  onExitPreview?: () => void;
  onNavigateProfile?: () => void;
}

export const FieldHeader: React.FC<FieldHeaderProps> = ({
  executiveId,
  executiveName,
  pageTitle = "Today's Field Operation",
  areaText = APP_LOCATION.urbanArea,
  vehicleText = "Two-Wheeler",
  isOnDuty = true,
  syncState = 'synced',
  onRefresh,
  isRefreshing = false,
  isDemoUser = false,
  availableExecutives = [],
  onSelectExecutive,
  onExitPreview,
  onNavigateProfile
}) => {
  const { currentDateWithDay, liveClock } = useDateTime();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = user?.full_name || executiveName || `Executive ${executiveId}`;
  const displayEmail = user?.email || `${executiveId.toLowerCase()}@routepilot.io`;

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-[#DDE7ED] shadow-2xs">
      {/* Role-Aware Top Banner for Manager/Admin Preview Mode */}
      {isDemoUser && (
        <div className="bg-[#123A55] text-white px-4 sm:px-8 py-2 flex flex-wrap items-center justify-between gap-2 text-xs border-b border-navy-light/40">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-orange text-white shadow-2xs">
              EXECUTIVE PREVIEW
            </span>
            <span className="text-slate-200 hidden sm:inline">
              Testing field cockpit as <b>{executiveId} · {executiveName}</b>. Read-only preview without modifying field session.
            </span>
            <span className="text-slate-200 sm:hidden">
              Viewing as <b>{executiveId}</b>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {availableExecutives.length > 1 && onSelectExecutive && (
              <select
                value={executiveId}
                onChange={(e) => onSelectExecutive(e.target.value)}
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg px-2.5 py-1 text-xs font-bold focus:outline-none cursor-pointer"
                title="Switch executive preview"
              >
                {availableExecutives.map((ex) => (
                  <option key={ex.id} value={ex.id} className="text-[#12324A] bg-white">
                    Preview {ex.id} – {ex.name}
                  </option>
                ))}
              </select>
            )}

            {onExitPreview && (
              <button
                type="button"
                onClick={onExitPreview}
                className="px-2.5 py-1 rounded-lg bg-white text-[#123A55] hover:bg-slate-100 font-bold text-xs transition cursor-pointer"
              >
                Exit Preview
              </button>
            )}
          </div>
        </div>
      )}

      {/* DESKTOP HEADER (>=1024px) - Aligned with Manager Navbar h-16 */}
      <div className="hidden lg:flex h-16 items-center justify-between px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-bold text-[#123A55] tracking-tight">
                {pageTitle}
              </h1>
              {isOnDuty && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10A88A] animate-pulse" />
                  ON DUTY
                </span>
              )}
            </div>
            <p className="text-xs text-[#71869A]">
              {currentDateWithDay} · {areaText} · Vehicle: {vehicleText} · <span className="font-semibold text-[#123A55]">{executiveId} · {executiveName}</span>
            </p>
          </div>
        </div>

        {/* Right side: Sync status, Refresh, and User Profile Menu */}
        <div className="flex items-center gap-3">
          {/* Sync status */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F5F8FA] border border-[#DDE7ED] text-xs">
            <span className={`w-2 h-2 rounded-full ${syncState === 'synced' ? 'bg-[#10A88A]' : 'bg-amber-400 animate-ping'}`} />
            <span className="font-bold text-[#12324A] capitalize">
              {syncState === 'synced' ? '● Synced' : syncState}
            </span>
          </div>

          {/* Refresh button */}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-[#F5F8FA] hover:bg-slate-100 border border-[#DDE7ED] text-[#12324A] hover:text-[#FF7A18] transition cursor-pointer active:scale-95"
              title="Sync latest route data"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#FF7A18]' : ''}`} />
            </button>
          )}

          {/* User Profile Menu (same like manager and admin) */}
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-2 pl-2 p-1 rounded-xl hover:bg-slate-50 transition border border-transparent hover:border-slate-200 cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-[#123A55] text-white flex items-center justify-center font-bold text-xs ring-2 ring-slate-100">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:block text-left">
                <div className="text-xs font-bold text-[#123A55] leading-tight truncate max-w-[130px]">
                  {displayName}
                </div>
                <div className="text-[10px] font-medium text-slate-400 capitalize">
                  Field Exec · {executiveId}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {/* Dropdown Menu */}
            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in duration-150 text-xs">
                {/* User info banner */}
                <div className="p-4 bg-slate-50 border-b border-slate-100 space-y-0.5 text-left">
                  <div className="font-bold text-[#123A55] text-sm">{displayName}</div>
                  <div className="text-slate-400 text-[11px] truncate">{displayEmail}</div>
                  <div className="pt-1 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FF7A18]/15 text-[#FF7A18]">
                      Field Executive ({executiveId})
                    </span>
                  </div>
                </div>

                {/* Profile actions */}
                <div className="p-2 space-y-0.5 text-left">
                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      if (onNavigateProfile) {
                        onNavigateProfile();
                      } else {
                        navigate('/executive/profile');
                      }
                    }}
                    className="w-full p-2 rounded-xl text-left flex items-center gap-2.5 text-slate-700 hover:text-[#123A55] hover:bg-slate-50 transition cursor-pointer"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="font-medium">My Profile</span>
                  </button>

                  <div className="border-t border-slate-100 pt-1 mt-1">
                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        logout();
                        navigate('/login');
                      }}
                      className="w-full p-2 rounded-xl text-left flex items-center gap-2.5 text-rose-600 hover:bg-rose-50 transition font-medium cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE / TABLET HEADER (<1024px) */}
      <div className="lg:hidden px-4 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <img src="/app-icon.png" alt="RoutePilot" className="w-8 h-8 rounded-xl object-cover shrink-0 shadow-2xs" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-sm text-[#123A55] truncate">
                {pageTitle}
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[#123A55]/10 text-[#123A55]">
                {executiveId}
              </span>
            </div>
            <div className="text-[11px] text-[#71869A] truncate">
              {executiveName} · {vehicleText}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="hidden sm:inline">Synced</span>
          </div>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-1.5 rounded-lg bg-[#F5F8FA] border border-[#DDE7ED] text-[#12324A] active:scale-95 cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#FF7A18]' : ''}`} />
            </button>
          )}

          {/* Profile Menu for Mobile */}
          <div className="relative">
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="w-8 h-8 rounded-full bg-[#123A55] text-white flex items-center justify-center font-bold text-xs ring-2 ring-slate-100 cursor-pointer"
              title="Profile Menu"
            >
              {displayName.charAt(0).toUpperCase()}
            </button>

            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in duration-150 text-xs">
                <div className="p-3 bg-slate-50 border-b border-slate-100 text-left">
                  <div className="font-bold text-[#123A55] text-xs truncate">{displayName}</div>
                  <div className="text-slate-400 text-[10px] truncate">{displayEmail}</div>
                  <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#FF7A18]/15 text-[#FF7A18]">
                    Field Executive ({executiveId})
                  </span>
                </div>
                <div className="p-1.5 space-y-0.5 text-left">
                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      if (onNavigateProfile) {
                        onNavigateProfile();
                      } else {
                        navigate('/executive/profile');
                      }
                    }}
                    className="w-full p-2 rounded-xl text-left flex items-center gap-2 text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>My Profile</span>
                  </button>
                  <div className="border-t border-slate-100 pt-1 mt-1">
                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        logout();
                        navigate('/login');
                      }}
                      className="w-full p-2 rounded-xl text-left flex items-center gap-2 text-rose-600 hover:bg-rose-50 transition font-medium cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-500" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
