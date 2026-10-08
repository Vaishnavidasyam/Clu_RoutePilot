import React from 'react';
import { CheckCircle2, Clock, MapPin, AlertTriangle } from 'lucide-react';
import { formatTime } from '../../utils/formatters';

export type RouteStatusType = 'NOT STARTED' | 'ON SCHEDULE' | 'RUNNING LATE' | 'COMPLETED' | 'ATTENTION NEEDED';

interface RouteSummaryBarProps {
  completedStops: number;
  totalStops: number;
  coveredKm?: number;
  totalKm: number;
  expectedReturnTime: string;
  routeStatus?: RouteStatusType;
  delayMinutes?: number;
}

export const RouteSummaryBar: React.FC<RouteSummaryBarProps> = ({
  completedStops,
  totalStops,
  coveredKm,
  totalKm,
  expectedReturnTime,
  routeStatus = 'ON SCHEDULE',
  delayMinutes = 0
}) => {
  const progressPercent = totalStops > 0 ? Math.round((completedStops / totalStops) * 100) : 0;
  const isFinished = completedStops >= totalStops && totalStops > 0;
  const activeStatus = isFinished ? 'COMPLETED' : routeStatus;

  const getStatusBadge = () => {
    switch (activeStatus) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Completed
          </span>
        );
      case 'RUNNING LATE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
            {delayMinutes > 0 ? `Running ${delayMinutes} min late` : 'Running late'}
          </span>
        );
      case 'ATTENTION NEEDED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            Attention needed
          </span>
        );
      case 'NOT STARTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Not started
          </span>
        );
      case 'ON SCHEDULE':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            On schedule
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#DDE7ED] shadow-xs p-4 sm:p-5 space-y-4">
      {/* 4 Compact Operational Metric Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: Stops Completed */}
        <div className="p-3 rounded-xl bg-[#F5F8FA] border border-[#DDE7ED]">
          <div className="text-[10px] uppercase font-bold text-[#71869A] tracking-wider">
            Stops Completed
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#123A55] font-mono mt-0.5">
            {completedStops} <span className="text-xs text-[#71869A] font-normal">/ {totalStops}</span>
          </div>
        </div>

        {/* Metric 2: Distance */}
        <div className="p-3 rounded-xl bg-[#F5F8FA] border border-[#DDE7ED]">
          <div className="text-[10px] uppercase font-bold text-[#71869A] tracking-wider">
            {coveredKm !== undefined ? 'Distance Covered' : 'Total Planned Distance'}
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#123A55] font-mono mt-0.5">
            {coveredKm !== undefined ? coveredKm.toFixed(1) : totalKm.toFixed(1)}{' '}
            <span className="text-xs text-[#71869A] font-normal">km</span>
          </div>
        </div>

        {/* Metric 3: Return Time */}
        <div className="p-3 rounded-xl bg-[#F5F8FA] border border-[#DDE7ED]">
          <div className="text-[10px] uppercase font-bold text-[#71869A] tracking-wider">
            Expected Return
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#123A55] font-mono mt-0.5">
            {formatTime(expectedReturnTime) || '01:54 PM'}
          </div>
        </div>

        {/* Metric 4: Route Status */}
        <div className="p-3 rounded-xl bg-[#F5F8FA] border border-[#DDE7ED] flex flex-col justify-between">
          <div className="text-[10px] uppercase font-bold text-[#71869A] tracking-wider">
            Route Status
          </div>
          <div className="mt-1">
            {getStatusBadge()}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-[11px] font-bold text-[#71869A]">
          <span>Route Progress</span>
          <span className="font-mono text-[#FF7A18] font-black">{progressPercent}%</span>
        </div>
        <div className="w-full bg-[#F5F8FA] rounded-full h-2 overflow-hidden border border-[#DDE7ED]">
          <div 
            className="bg-[#10A88A] h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};
