import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Database, CalendarCheck, MapPin, AlertCircle, 
  Users, UserCheck, BarChart3, History, FileText, Settings,
  ChevronLeft, ChevronRight, ShieldAlert, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { planningService } from '../services/api';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  collapsed, 
  onToggleCollapse, 
  mobileOpen = false, 
  onCloseMobile 
}) => {
  const { user } = useAuth();
  const location = useLocation();
  const [exceptionsCount, setExceptionsCount] = useState<number>(0);
  const [planReady, setPlanReady] = useState<boolean>(false);

  useEffect(() => {
    planningService.listPlans().then((res) => {
      if (res.data && res.data.length > 0) {
        setPlanReady(true);
        planningService.getPlan(res.data[0].id).then((p) => {
          if (p && p.skipped) {
            setExceptionsCount(p.skipped.length);
          }
        }).catch(() => {});
      }
    }).catch(() => {});
  }, [location.pathname]);

  const isRoleAdmin = user?.role === 'ADMIN';

  const handleNavClick = () => {
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <aside
      className={`bg-[#0F2D40] text-slate-200 flex flex-col border-r border-[#0D2536] shrink-0 select-none transition-all duration-300 z-50
        fixed inset-y-0 left-0 lg:static
        ${mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
        ${collapsed ? 'lg:w-[72px]' : 'w-[280px]'}
      `}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-[#0D2536] bg-[#0F2D40] shrink-0">
        <NavLink 
          to="/manager/overview"
          onClick={handleNavClick}
          className="flex items-center gap-2.5 text-white font-bold tracking-wider text-sm hover:opacity-90 transition overflow-hidden"
          title="RoutePilot Operations"
        >
          <img src="/app-icon.png" alt="RoutePilot" className="w-7 h-7 rounded-lg object-cover shadow-[0_2px_8px_rgba(0,0,0,0.3)] shrink-0" />
          {(!collapsed || mobileOpen) && (
            <div className="flex items-center gap-1.5 overflow-hidden">
              <span className="font-bold tracking-widest text-white text-base truncate">ROUTEPILOT</span>
              <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-[#10A88A]/20 text-[#10A88A] border border-[#10A88A]/30">
                Ops
              </span>
            </div>
          )}
        </NavLink>

        {/* Mobile Close Button (<lg) or Desktop Collapse/Expand Button (>=lg) */}
        <div className="flex items-center">
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-deep transition lg:hidden cursor-pointer"
            title="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-deep transition hidden lg:block cursor-pointer"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto custom-scrollbar text-xs">
        
        {/* TODAY GROUP */}
        <div>
          {!collapsed && (
            <div className="px-3 pb-1.5 text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Today
            </div>
          )}
          <div className="space-y-0.5">
            <NavLink 
              onClick={handleNavClick} 
              to="/manager/overview"
              end
              title={collapsed ? 'Today Overview' : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all ${
                  isActive || location.pathname === '/app/overview' || location.pathname === '/dashboard' || location.pathname === '/overview'
                    ? 'bg-[#153F59] text-white font-semibold shadow-sm border-l-4 border-[#FF7A18] pl-2.5'
                    : 'text-slate-300 hover:bg-[#153F59]/60 hover:text-white'
                } ${collapsed ? 'justify-center px-0' : ''}`
              }
            >
              <LayoutDashboard className="w-4 h-4 text-[#10A88A] shrink-0" />
              {!collapsed && <span>Overview</span>}
            </NavLink>

            <NavLink 
              onClick={handleNavClick} 
              to="/manager/data"
              title={collapsed ? "Today's Data" : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all ${
                  isActive || location.pathname.startsWith('/manager/data') || location.pathname.startsWith('/app/data') || location.pathname.startsWith('/today/data')
                    ? 'bg-[#153F59] text-white font-semibold shadow-sm border-l-4 border-[#FF7A18] pl-2.5'
                    : 'text-slate-300 hover:bg-[#153F59]/60 hover:text-white'
                } ${collapsed ? 'justify-center px-0' : ''}`
              }
            >
              <Database className="w-4 h-4 text-[#10A88A] shrink-0" />
              {!collapsed && <span>Today&apos;s Data</span>}
            </NavLink>

            <NavLink 
              onClick={handleNavClick} 
              to="/manager/plan"
              title={collapsed ? "Today's Plan" : undefined}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition-all ${
                  isActive || location.pathname.startsWith('/manager/plan') || location.pathname.startsWith('/app/plan') || location.pathname.startsWith('/today/plan')
                    ? 'bg-[#153F59] text-white font-semibold shadow-sm border-l-4 border-[#FF7A18] pl-2.5'
                    : 'text-slate-300 hover:bg-[#153F59]/60 hover:text-white'
                } ${collapsed ? 'justify-center px-0' : ''}`
              }
            >
              <div className="flex items-center gap-3">
                <CalendarCheck className="w-4 h-4 text-[#10A88A] shrink-0" />
                {!collapsed && <span>Today&apos;s Plan</span>}
              </div>
              {!collapsed && planReady && (
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Ready
                </span>
              )}
            </NavLink>

            <NavLink 
              onClick={handleNavClick} 
              to="/manager/routes"
              title={collapsed ? 'Routes & Dispatch' : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all ${
                  isActive || location.pathname.startsWith('/manager/routes') || location.pathname.startsWith('/app/routes') || location.pathname.startsWith('/routes')
                    ? 'bg-[#153F59] text-white font-semibold shadow-sm border-l-4 border-[#FF7A18] pl-2.5'
                    : 'text-slate-300 hover:bg-[#153F59]/60 hover:text-white'
                } ${collapsed ? 'justify-center px-0' : ''}`
              }
            >
              <MapPin className="w-4 h-4 text-[#10A88A] shrink-0" />
              {!collapsed && <span>Routes</span>}
            </NavLink>

            <NavLink 
              onClick={handleNavClick} 
              to="/manager/exceptions"
              title={collapsed ? 'Exceptions & Unscheduled' : undefined}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition-all ${
                  isActive || location.pathname.startsWith('/manager/exceptions') || location.pathname.startsWith('/app/exceptions') || location.pathname.startsWith('/exceptions')
                    ? 'bg-[#153F59] text-white font-semibold shadow-sm border-l-4 border-[#FF7A18] pl-2.5'
                    : 'text-slate-300 hover:bg-[#153F59]/60 hover:text-white'
                } ${collapsed ? 'justify-center px-0' : ''}`
              }
            >
              <div className="flex items-center gap-3">
                <AlertCircle className="w-4 h-4 text-[#10A88A] shrink-0" />
                {!collapsed && <span>Exceptions</span>}
              </div>
              {!collapsed && exceptionsCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#FF7A18]/20 text-[#FF7A18] border border-[#FF7A18]/30">
                  {exceptionsCount}
                </span>
              )}
            </NavLink>
          </div>
        </div>

        {/* OPERATIONS GROUP */}
        <div>
          {!collapsed && (
            <div className="px-3 pb-1.5 text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Operations
            </div>
          )}
          <div className="space-y-0.5">
            <NavLink 
              onClick={handleNavClick} 
              to="/manager/customers"
              title={collapsed ? 'Customers' : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all ${
                  isActive || location.pathname.startsWith('/manager/customers') || location.pathname.startsWith('/app/customers') || location.pathname.startsWith('/customers')
                    ? 'bg-[#153F59] text-white font-semibold shadow-sm border-l-4 border-[#FF7A18] pl-2.5'
                    : 'text-slate-300 hover:bg-[#153F59]/60 hover:text-white'
                } ${collapsed ? 'justify-center px-0' : ''}`
              }
            >
              <Users className="w-4 h-4 text-[#10A88A] shrink-0" />
              {!collapsed && <span>Customers</span>}
            </NavLink>

            <NavLink 
              onClick={handleNavClick} 
              to="/manager/executives"
              title={collapsed ? 'Executives' : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all ${
                  isActive || location.pathname.startsWith('/manager/executives') || location.pathname.startsWith('/app/executives') || location.pathname.startsWith('/executives')
                    ? 'bg-[#153F59] text-white font-semibold shadow-sm border-l-4 border-[#FF7A18] pl-2.5'
                    : 'text-slate-300 hover:bg-[#153F59]/60 hover:text-white'
                } ${collapsed ? 'justify-center px-0' : ''}`
              }
            >
              <UserCheck className="w-4 h-4 text-[#10A88A] shrink-0" />
              {!collapsed && <span>Executives</span>}
            </NavLink>
          </div>
        </div>

        {/* INSIGHTS GROUP */}
        <div>
          {!collapsed && (
            <div className="px-3 pb-1.5 text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Insights
            </div>
          )}
          <div className="space-y-0.5">
            <NavLink 
              onClick={handleNavClick} 
              to="/manager/analytics"
              title={collapsed ? 'Analytics & Performance' : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all ${
                  isActive || location.pathname.startsWith('/manager/analytics') || location.pathname.startsWith('/app/analytics') || location.pathname.startsWith('/analytics')
                    ? 'bg-[#153F59] text-white font-semibold shadow-sm border-l-4 border-[#FF7A18] pl-2.5'
                    : 'text-slate-300 hover:bg-[#153F59]/60 hover:text-white'
                } ${collapsed ? 'justify-center px-0' : ''}`
              }
            >
              <BarChart3 className="w-4 h-4 text-[#10A88A] shrink-0" />
              {!collapsed && <span>Analytics</span>}
            </NavLink>

            <NavLink 
              onClick={handleNavClick} 
              to="/manager/history"
              title={collapsed ? 'Plan History' : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all ${
                  isActive || location.pathname.startsWith('/manager/history') || location.pathname.startsWith('/app/history') || location.pathname.startsWith('/history')
                    ? 'bg-[#153F59] text-white font-semibold shadow-sm border-l-4 border-[#FF7A18] pl-2.5'
                    : 'text-slate-300 hover:bg-[#153F59]/60 hover:text-white'
                } ${collapsed ? 'justify-center px-0' : ''}`
              }
            >
              <History className="w-4 h-4 text-[#10A88A] shrink-0" />
              {!collapsed && <span>Plan History</span>}
            </NavLink>
          </div>
        </div>

        {/* REPORTS GROUP */}
        <div>
          {!collapsed && (
            <div className="px-3 pb-1.5 text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Reports
            </div>
          )}
          <div className="space-y-0.5">
            <NavLink 
              onClick={handleNavClick} 
              to="/manager/reports"
              title={collapsed ? 'Reports & Exports' : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all ${
                  isActive || location.pathname.startsWith('/manager/reports') || location.pathname.startsWith('/app/reports') || location.pathname.startsWith('/reports')
                    ? 'bg-[#153F59] text-white font-semibold shadow-sm border-l-4 border-[#FF7A18] pl-2.5'
                    : 'text-slate-300 hover:bg-[#153F59]/60 hover:text-white'
                } ${collapsed ? 'justify-center px-0' : ''}`
              }
            >
              <FileText className="w-4 h-4 text-[#10A88A] shrink-0" />
              {!collapsed && <span>Reports & Exports</span>}
            </NavLink>
          </div>
        </div>

        {/* SYSTEM GROUP */}
        <div>
          {!collapsed && (
            <div className="px-3 pb-1.5 text-[10px] uppercase font-bold tracking-wider text-slate-400">
              System
            </div>
          )}
          <div className="space-y-0.5">
            <NavLink 
              onClick={handleNavClick} 
              to="/manager/settings"
              title={collapsed ? 'Settings' : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all ${
                  isActive || location.pathname.startsWith('/manager/settings') || location.pathname.startsWith('/app/settings') || location.pathname.startsWith('/settings')
                    ? 'bg-[#153F59] text-white font-semibold shadow-sm border-l-4 border-[#FF7A18] pl-2.5'
                    : 'text-slate-300 hover:bg-[#153F59]/60 hover:text-white'
                } ${collapsed ? 'justify-center px-0' : ''}`
              }
            >
              <Settings className="w-4 h-4 text-[#10A88A] shrink-0" />
              {!collapsed && <span>Settings</span>}
            </NavLink>

            {isRoleAdmin && (
              <NavLink 
                onClick={handleNavClick} 
                to="/manager/admin"
                title={collapsed ? 'Admin Console' : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all ${
                    isActive || location.pathname.startsWith('/manager/admin') || location.pathname.startsWith('/app/admin') || location.pathname.startsWith('/admin')
                      ? 'bg-[#153F59] text-white font-semibold shadow-sm border-l-4 border-[#FF7A18] pl-2.5'
                      : 'text-slate-300 hover:bg-[#153F59]/60 hover:text-white'
                  } ${collapsed ? 'justify-center px-0' : ''}`
                }
              >
                <ShieldAlert className="w-4 h-4 text-[#10A88A] shrink-0" />
                {!collapsed && <span>Admin Console</span>}
              </NavLink>
            )}
          </div>
        </div>

      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-[#0D2536] bg-[#0F2D40] text-[11px] text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          {!collapsed && <span>System Ready</span>}
        </div>
        {!collapsed && <span className="text-[10px] text-[#10A88A] font-medium">v2.4</span>}
      </div>
    </aside>
  );
};
