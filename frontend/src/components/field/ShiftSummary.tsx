import React from 'react';
import { Clock } from 'lucide-react';

interface ShiftSummaryProps {
  shiftStart: string;
  shiftEnd: string;
  totalStops: number;
  completedStops: number;
  failedStops?: number;
  totalKm: number;
  returnTime: string;
  planVersion?: string | number;
}

export const ShiftSummary: React.FC<ShiftSummaryProps> = ({
  shiftStart,
  shiftEnd,
  totalStops,
  completedStops,
  failedStops = 0,
  totalKm,
  returnTime,
  planVersion = '1.0'
}) => {
  const finished = completedStops + failedStops;
  const progressPercent = totalStops > 0 ? Math.round((finished / totalStops) * 100) : 0;

  return (
    <div className="bg-navy rounded-2xl p-4 text-white shadow-md border border-navy-deep/80 space-y-3">
      {/* Top Shift Row */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-slate-300 font-medium">
          <Clock className="w-3.5 h-3.5 text-orange" />
          <span>
            Today&apos;s Shift: <b className="text-white font-bold">{shiftStart} – {shiftEnd}</b>
          </span>
        </div>
        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/10 text-slate-300 border border-white/10">
          v{planVersion}
        </span>
      </div>

      {/* 3 Large Operational Metric Pills */}
      <div className="grid grid-cols-3 gap-2 py-1 text-center">
        {/* Metric 1: Stops */}
        <div className="bg-white/5 rounded-xl p-2.5 border border-white/5 flex flex-col justify-center">
          <div className="text-[10px] text-slate-300 uppercase font-bold tracking-wider">Stops</div>
          <div className="text-lg font-black text-white mt-0.5 tracking-tight">
            <span className="text-emerald-400">{finished}</span>
            <span className="text-xs text-slate-400 font-normal"> / {totalStops}</span>
          </div>
        </div>

        {/* Metric 2: Distance */}
        <div className="bg-white/5 rounded-xl p-2.5 border border-white/5 flex flex-col justify-center">
          <div className="text-[10px] text-slate-300 uppercase font-bold tracking-wider">Distance</div>
          <div className="text-lg font-black text-orange mt-0.5 tracking-tight">
            {totalKm} <span className="text-xs font-normal text-slate-300">km</span>
          </div>
        </div>

        {/* Metric 3: Return Home */}
        <div className="bg-white/5 rounded-xl p-2.5 border border-white/5 flex flex-col justify-center">
          <div className="text-[10px] text-slate-300 uppercase font-bold tracking-wider">Return</div>
          <div className="text-lg font-black text-teal mt-0.5 tracking-tight">
            {returnTime}
          </div>
        </div>
      </div>

      {/* Clear Progress Ratio Indicator */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
          <span>Route Progress ({finished} of {totalStops} stops)</span>
          <span className="font-mono text-orange font-bold">{progressPercent}%</span>
        </div>

        {/* Multi-segment progress visual */}
        <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden flex">
          <div 
            className="bg-emerald-500 h-full transition-all duration-300"
            style={{ width: `${totalStops > 0 ? (completedStops / totalStops) * 100 : 0}%` }}
            title={`${completedStops} successful`}
          />
          <div 
            className="bg-rose-500 h-full transition-all duration-300"
            style={{ width: `${totalStops > 0 ? (failedStops / totalStops) * 100 : 0}%` }}
            title={`${failedStops} unsuccessful`}
          />
        </div>
      </div>
    </div>
  );
};
