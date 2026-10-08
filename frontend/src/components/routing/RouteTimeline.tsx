import React from 'react';
import { Home, CheckCircle2 } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { RouteStop } from '../../types';

export interface RouteTimelineProps {
  stops: RouteStop[];
  depotAddress?: string;
  startTime?: string;
  endTime?: string;
  className?: string;
}

export const RouteTimeline: React.FC<RouteTimelineProps> = ({
  stops,
  depotAddress = 'Home Base / Starting Location',
  startTime = '09:00',
  endTime = '16:00',
  className = '',
}) => {
  return (
    <div className={`space-y-3 font-sans ${className}`}>
      {/* 1. Depart Home */}
      <div className="flex items-start gap-3.5">
        <div className="flex flex-col items-center">
          <div className="w-7 h-7 rounded-full bg-[#173B56] text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Home className="w-3.5 h-3.5" />
          </div>
          <div className="w-0.5 h-8 bg-slate-200 mt-1" />
        </div>
        <div className="pt-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-[#173B56]">{startTime}</span>
            <span className="text-xs font-semibold text-[#17324D]">Depart Home Depot</span>
          </div>
          <p className="text-[11px] text-[#66788A] truncate">{depotAddress}</p>
        </div>
      </div>

      {/* 2. Customer Stops */}
      {stops.map((stop, idx) => {
        const isPtp = stop.ptp_today === 1;
        const isLast = idx === stops.length - 1;

        return (
          <div key={stop.customer_id || idx} className="flex items-start gap-3.5">
            <div className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border-2 ${
                  isPtp
                    ? 'bg-[#F58220] border-[#F58220] text-white shadow-2xs'
                    : 'bg-white border-[#173B56] text-[#173B56]'
                }`}
              >
                {stop.seq ?? (idx + 1)}
              </div>
              {!isLast && <div className="w-0.5 h-10 bg-slate-200 mt-1" />}
            </div>

            <div className="pt-0.5 pb-2 min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-xs font-bold text-[#17324D]">{stop.arrival_time}</span>
                  <span className="text-xs font-semibold text-[#17324D] truncate">{stop.customer_name || stop.customer_id}</span>
                </div>
                {isPtp && <Badge variant="ptp" size="sm" label="PTP TODAY" />}
              </div>

              <div className="flex items-center gap-3 text-[11px] text-[#66788A] mt-0.5 flex-wrap">
                <span>{stop.area || 'Metro Area'}</span>
                <span>•</span>
                <span>Window: {stop.window_start || '09:00'} - {stop.window_end || '18:00'}</span>
                <span>•</span>
                <span>Service: {stop.service_min || 15}m</span>
              </div>
            </div>
          </div>
        );
      })}

      {/* 3. Return Home */}
      <div className="flex items-start gap-3.5">
        <div className="w-7 h-7 rounded-full bg-[#173B56] text-white flex items-center justify-center shrink-0 shadow-2xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#0FA968]" />
        </div>
        <div className="pt-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-[#173B56]">{endTime}</span>
            <span className="text-xs font-semibold text-[#17324D]">Return Home</span>
          </div>
          <p className="text-[11px] text-[#66788A]">Shift Completed • Shift limit validated</p>
        </div>
      </div>
    </div>
  );
};
