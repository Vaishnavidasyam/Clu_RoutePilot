import React from 'react';
import { 
  Home, Compass, Users, CheckCircle2, User, 
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { FieldTabType } from './FieldBottomNav';

interface FieldDesktopSidebarProps {
  activeTab: FieldTabType;
  onSelectTab: (tab: FieldTabType) => void;
  executiveId: string;
  executiveName: string;
  isOnDuty?: boolean;
  shiftHours?: string;
  completedStopsCount: number;
  totalStopsCount: number;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const FieldDesktopSidebar: React.FC<FieldDesktopSidebarProps> = ({
  activeTab,
  onSelectTab,
  executiveId,
  executiveName,
  isOnDuty = true,
  shiftHours = '08:30 AM – 05:30 PM',
  completedStopsCount,
  totalStopsCount,
  collapsed = false,
  onToggleCollapse
}) => {
  const isRouteComplete = totalStopsCount > 0 && completedStopsCount >= totalStopsCount;
  const routeBadgeText = totalStopsCount > 0 ? `${completedStopsCount}/${totalStopsCount}` : '0/0';

  const navSections = [
    {
      group: 'TODAY',
      items: [
        { 
          id: 'home' as FieldTabType, 
          label: 'Home', 
          icon: Home, 
          badge: null 
        },
        { 
          id: 'route' as FieldTabType, 
          label: 'My Route', 
          icon: Compass, 
          badge: routeBadgeText,
          isCompleted: isRouteComplete
        }
      ]
    },
    {
      group: 'WORK',
      items: [
        { 
          id: 'customers' as FieldTabType, 
          label: 'Customers', 
          icon: Users, 
          badge: null 
        },
        { 
          id: 'activity' as FieldTabType, 
          label: 'Activity', 
          icon: CheckCircle2, 
          badge: null 
        }
      ]
    },
    {
      group: 'ACCOUNT',
      items: [
        { 
          id: 'profile' as FieldTabType, 
          label: 'Profile', 
          icon: User, 
          badge: null 
        }
      ]
    }
  ];

  return (
    <aside
      className={`bg-[#0F2D40] text-slate-200 hidden lg:flex flex-col border-r border-[#0D2536] shrink-0 select-none transition-all duration-300 z-30 sticky top-0 h-screen ${
        collapsed ? 'w-[72px]' : 'w-[280px]'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-[#0D2536] bg-[#0F2D40] shrink-0">
        <div
          onClick={() => onSelectTab('home')}
          className="flex items-center gap-2.5 text-white font-bold tracking-wider text-sm hover:opacity-90 transition overflow-hidden cursor-pointer"
          title="RoutePilot Field Workspace"
        >
          {/* Unified RoutePilot Logo Mark */}
          <img src="/app-icon.png" alt="RoutePilot" className="w-7 h-7 rounded-lg object-cover shadow-[0_2px_8px_rgba(0,0,0,0.3)] shrink-0" />
          
          {!collapsed && (
            <div className="flex items-center gap-1.5 overflow-hidden">
              <span className="font-bold tracking-widest text-white text-base truncate">
                ROUTEPILOT
              </span>
              <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-[#FF7A18]/20 text-[#FF7A18] border border-[#FF7A18]/30">
                Field
              </span>
            </div>
          )}
        </div>

        {/* Desktop Collapse / Expand Toggle */}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#153F59] transition cursor-pointer"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto custom-scrollbar text-xs">
        {navSections.map((sec) => (
          <div key={sec.group}>
            {!collapsed && (
              <div className="px-3 pb-1.5 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                {sec.group}
              </div>
            )}
            <div className="space-y-0.5">
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <div key={item.id} className="relative group">
                    <button
                      type="button"
                      onClick={() => onSelectTab(item.id)}
                      title={collapsed ? item.label : undefined}
                      className={`w-full flex items-center font-medium transition-all text-xs cursor-pointer rounded-xl ${
                        collapsed 
                          ? 'justify-center px-0 py-2.5' 
                          : 'justify-between px-3 py-2.5'
                      } ${
                        isActive
                          ? 'bg-[#153F59] text-white font-semibold shadow-sm border-l-4 border-[#FF7A18] pl-2.5'
                          : 'text-slate-300 hover:bg-[#153F59]/60 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon className={`w-4 h-4 shrink-0 transition ${isActive ? 'text-[#FF7A18]' : 'text-[#10A88A]'}`} />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </div>

                      {!collapsed && item.badge && (
                        <span
                          className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-md transition ${
                            item.isCompleted
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-[#0D2536] text-slate-300 border border-white/10'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>

                    {/* Tooltip on Hover when Collapsed */}
                    {collapsed && (
                      <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-[#0D2536] text-white text-xs rounded-lg shadow-xl border border-white/10 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition z-50 flex items-center gap-2">
                        <span className="font-semibold">{item.label}</span>
                        {item.badge && (
                          <span className={`font-mono text-[10px] px-1 py-0.2 rounded ${
                            item.isCompleted ? 'text-emerald-400 bg-emerald-500/20' : 'text-[#FF7A18] bg-white/10'
                          }`}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Executive Identity / Status Area */}
      {!collapsed ? (
        <div className="p-3 border-t border-[#0D2536] bg-[#0F2D40] text-xs">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-[#10A88A] animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-wider text-[#10A88A]">
              {isOnDuty ? '● ON DUTY' : '○ OFF DUTY'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <div className="text-xs font-bold text-white truncate">{executiveName}</div>
              <div className="text-[10px] text-slate-400 font-mono">{shiftHours}</div>
            </div>
            <span className="px-2 py-0.5 rounded bg-white/10 text-[#FF7A18] font-mono text-[10px] font-bold shrink-0">
              {executiveId}
            </span>
          </div>
        </div>
      ) : (
        <div className="p-3 border-t border-[#0D2536] bg-[#0F2D40] flex flex-col items-center justify-center gap-1 group relative cursor-default">
          <span className="w-2.5 h-2.5 rounded-full bg-[#10A88A] animate-pulse" />
          <span className="text-[10px] font-mono font-bold text-[#FF7A18]">{executiveId}</span>

          {/* Hover Tooltip when Collapsed */}
          <div className="absolute left-full ml-3 bottom-2 px-3 py-2 bg-[#0D2536] text-white text-xs rounded-xl shadow-xl border border-white/10 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition z-50">
            <div className="font-bold text-[#10A88A] text-[10px] uppercase">
              ● {isOnDuty ? 'ON DUTY' : 'OFF DUTY'}
            </div>
            <div className="font-bold text-white text-xs">{executiveName}</div>
            <div className="text-[10px] text-slate-400 font-mono">
              {shiftHours} · ID: {executiveId}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
