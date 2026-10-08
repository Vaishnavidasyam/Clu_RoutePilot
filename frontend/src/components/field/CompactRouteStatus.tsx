import React from 'react';
import { RouteStatusType } from './RouteSummaryBar';
import { formatTime } from '../../utils/formatters';

interface CompactRouteStatusProps {
  completedStops: number;
  totalStops: number;
  coveredKm?: number;
  expectedReturnTime: string;
  routeStatus?: RouteStatusType;
}

export const CompactRouteStatus: React.FC<CompactRouteStatusProps> = ({
  completedStops,
  totalStops,
  coveredKm = 0,
  expectedReturnTime,
  routeStatus = 'NOT STARTED'
}) => {
  const getStatusBadge = () => {
    switch (routeStatus) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10A88A]" />
            Completed
          </span>
        );
      case 'RUNNING LATE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
            Running Late
          </span>
        );
      case 'ATTENTION NEEDED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Attention Needed
          </span>
        );
      case 'NOT STARTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Not Started
          </span>
        );
      case 'ON SCHEDULE':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10A88A]" />
            On Schedule
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#DDE7ED] shadow-2xs px-5 py-3.5 flex flex-wrap items-center justify-between gap-4">
      {/* 4 Compact Inline Elements */}
      <div className="flex items-center gap-6 sm:gap-8 flex-wrap">
        {/* Stops */}
        <div>
          <span className="text-[10px] uppercase font-bold text-[#71869A] tracking-wider block">
            Stops
          </span>
          <div className="text-base sm:text-lg font-black text-[#123A55] font-mono mt-0.5">
            {completedStops} <span className="text-xs text-[#71869A] font-normal">/ {totalStops}</span>
          </div>
        </div>

        {/* Distance */}
        <div>
          <span className="text-[10px] uppercase font-bold text-[#71869A] tracking-wider block">
            Distance
          </span>
          <div className="text-base sm:text-lg font-black text-[#123A55] font-mono mt-0.5">
            {coveredKm.toFixed(1)} <span className="text-xs text-[#71869A] font-normal">km</span>
          </div>
        </div>

        {/* Expected Return */}
        <div>
          <span className="text-[10px] uppercase font-bold text-[#71869A] tracking-wider block">
            Expected Return
          </span>
          <div className="text-base sm:text-lg font-black text-[#123A55] font-mono mt-0.5">
            {formatTime(expectedReturnTime) || '01:54 PM'}
          </div>
        </div>
      </div>

      {/* Status Pill */}
      <div>
        <span className="text-[10px] uppercase font-bold text-[#71869A] tracking-wider block mb-1">
          Status
        </span>
        {getStatusBadge()}
      </div>
    </div>
  );
};
