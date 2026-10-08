import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  Search, Menu, ChevronRight, Settings, 
  LogOut, ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useOperationalDate } from '../context/DateTimeContext';
import { NotificationCenter } from './NotificationCenter';
import { GlobalSearchModal } from './GlobalSearchModal';
import { OperationalDateSelector } from './OperationalDateSelector';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user, logout, switchRole } = useAuth();
  const { isToday } = useOperationalDate();

  const navigate = useNavigate();
  const location = useLocation();

  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Global Ctrl+K shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  // Build dynamic breadcrumbs from current pathname
  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (path.startsWith('/manager/overview') || path.startsWith('/app/overview') || path === '/dashboard' || path === '/overview') {
      return [{ label: 'Today', to: '/manager/overview' }, { label: 'Overview' }];
    }
    if (path.startsWith('/manager/data') || path.startsWith('/app/data') || path.startsWith('/today/data') || path.startsWith('/data')) {
      return [{ label: 'Today', to: '/manager/overview' }, { label: "Today's Data" }];
    }
    if (path.startsWith('/manager/plan') || path.startsWith('/app/plan') || path.startsWith('/today/plan') || path.startsWith('/planning')) {
      return [{ label: 'Today', to: '/manager/overview' }, { label: "Today's Plan" }];
    }
    if (path.startsWith('/manager/routes/map') || path.startsWith('/app/routes/map') || path.includes('/map')) {
      return [{ label: 'Today', to: '/manager/overview' }, { label: 'Routes', to: '/manager/routes' }, { label: 'Interactive Map' }];
    }
    if (path.startsWith('/manager/routes') || path.startsWith('/app/routes') || path.startsWith('/routes')) {
      return [{ label: 'Today', to: '/manager/overview' }, { label: 'Routes' }];
    }
    if (path.startsWith('/manager/exceptions') || path.startsWith('/app/exceptions') || path.startsWith('/exceptions')) {
      return [{ label: 'Today', to: '/manager/overview' }, { label: 'Exceptions' }];
    }
    if (path.startsWith('/manager/customers') || path.startsWith('/app/customers') || path.startsWith('/customers')) {
      return [{ label: 'Operations', to: '/manager/overview' }, { label: 'Customers' }];
    }
    if (path.startsWith('/manager/executives') || path.startsWith('/app/executives') || path.startsWith('/executives')) {
      return [{ label: 'Operations', to: '/manager/overview' }, { label: 'Executives' }];
    }
    if (path.startsWith('/manager/analytics') || path.startsWith('/app/analytics') || path.startsWith('/analytics')) {
      return [{ label: 'Insights', to: '/manager/overview' }, { label: 'Analytics' }];
    }
    if (path.startsWith('/manager/history') || path.startsWith('/app/history') || path.startsWith('/history') || path.startsWith('/plan-history')) {
      return [{ label: 'Insights', to: '/manager/overview' }, { label: 'Plan History' }];
    }
    if (path.startsWith('/manager/reports') || path.startsWith('/app/reports') || path.startsWith('/reports')) {
      return [{ label: 'Reports', to: '/manager/overview' }, { label: 'Reports & Exports' }];
    }
    if (path.startsWith('/executive') || path.startsWith('/field') || path.startsWith('/portal')) {
      return [{ label: 'Field Workspace', to: '/executive/home' }, { label: 'Executive Cockpit' }];
    }
    if (path.startsWith('/manager/settings') || path.startsWith('/app/settings') || path.startsWith('/settings')) {
      return [{ label: 'System', to: '/manager/overview' }, { label: 'Settings' }];
    }
    if (path.startsWith('/manager/admin') || path.startsWith('/app/admin') || path.startsWith('/admin')) {
      return [{ label: 'System', to: '/manager/overview' }, { label: 'Admin Console' }];
    }
    return [{ label: 'RoutePilot', to: '/manager/overview' }];
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-2xs relative z-20">
        
        {/* Left: Sidebar Toggle & Dynamic Breadcrumbs */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-xl text-slate-600 hover:text-navy hover:bg-slate-100 transition lg:hidden shrink-0 cursor-pointer"
              title="Toggle sidebar"
              aria-label="Toggle navigation sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Breadcrumb Navigation - Desktop */}
          <nav className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-medium truncate">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                {crumb.to ? (
                  <Link to={crumb.to} className="hover:text-navy transition truncate">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-navy font-semibold truncate">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>

          {/* Breadcrumb Navigation - Mobile (Current Page Title Only) */}
          <div className="sm:hidden text-xs font-bold text-navy truncate">
            {breadcrumbs[breadcrumbs.length - 1]?.label || 'RoutePilot'}
          </div>
        </div>

        {/* Center: Global Search Input / Trigger */}
        <div className="flex items-center gap-2">
          {/* Mobile search trigger icon button */}
          <button
            onClick={() => setIsSearchModalOpen(true)}
            className="sm:hidden p-2 rounded-xl text-slate-500 hover:text-navy hover:bg-slate-100 transition cursor-pointer"
            title="Search"
            aria-label="Search application"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Desktop full search bar */}
          <div className="hidden sm:block w-48 md:w-64 lg:w-80 mx-2 lg:mx-6">
            <button
              onClick={() => setIsSearchModalOpen(true)}
              className="w-full flex items-center justify-between pl-3 pr-3 py-1.5 bg-slate-50 border border-slate-200/90 hover:border-slate-300 rounded-xl text-xs text-slate-400 hover:text-slate-600 transition text-left cursor-pointer group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Search className="w-4 h-4 text-slate-400 group-hover:text-slate-600 shrink-0 transition" />
                <span className="truncate">Search customers, routes...</span>
              </div>
              <kbd className="hidden md:inline-block font-mono text-[10px] bg-white border border-slate-200 text-slate-400 px-1.5 py-0.5 rounded shadow-2xs shrink-0">
                Ctrl K
              </kbd>
            </button>
          </div>
        </div>

        {/* Right: Operational Status, Notifications & Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Operational Date Selector (Section 4 Specification) */}
          <OperationalDateSelector className="hidden sm:inline-block" />

          {/* Notification Center */}
          <NotificationCenter />

          {/* User Profile Menu */}
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-2 pl-2 p-1 rounded-xl hover:bg-slate-50 transition border border-transparent hover:border-slate-200 cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-navy text-white flex items-center justify-center font-bold text-xs ring-2 ring-slate-100">
                {user?.full_name ? user.full_name.charAt(0) : 'P'}
              </div>
              <div className="hidden md:block text-left">
                <div className="text-xs font-bold text-navy leading-tight truncate max-w-[120px]">
                  {user?.full_name || 'Priya Sharma'}
                </div>
                <div className="text-[10px] font-medium text-slate-400 capitalize">
                  {user?.role === 'OPERATIONS_MANAGER' ? 'Ops Manager' : user?.role?.toLowerCase()}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {/* Dropdown Menu */}
            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in duration-150 text-xs">
                
                {/* User info banner */}
                <div className="p-4 bg-slate-50 border-b border-slate-100 space-y-0.5">
                  <div className="font-bold text-navy text-sm">{user?.full_name}</div>
                  <div className="text-slate-400 text-[11px] truncate">{user?.email}</div>
                  <div className="pt-1 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-navy/10 text-navy">
                      {user?.role === 'OPERATIONS_MANAGER' ? 'Operations Manager' : user?.role}
                    </span>
                  </div>
                </div>

                {/* Profile actions */}
                <div className="p-2 space-y-0.5">
                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      navigate('/manager/settings');
                    }}
                    className="w-full p-2 rounded-xl text-left flex items-center gap-2.5 text-slate-700 hover:text-navy hover:bg-slate-50 transition cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span className="font-medium">Workspace Settings</span>
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
      </header>

      {/* Global Search Dialog Modal */}
      <GlobalSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
      />
    </>
  );
};
