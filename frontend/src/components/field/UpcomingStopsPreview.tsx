import React from 'react';
import { ChevronRight, ArrowRight, Check } from 'lucide-react';
import { NextStopData } from './NextStopCard';
import { formatLocation, formatTime } from '../../utils/formatters';

interface UpcomingStopsPreviewProps {
  stops: NextStopData[];
  currentStopId?: number;
  onViewCompleteRoute: () => void;
  maxPreview?: number;
}

export const UpcomingStopsPreview: React.FC<UpcomingStopsPreviewProps> = ({
  stops,
  currentStopId,
  onViewCompleteRoute,
  maxPreview = 5
}) => {
  const previewList = stops.slice(0, maxPreview);

  return (
    <div className="bg-white rounded-2xl border border-[#DDE7ED] shadow-xs p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-[#123A55] uppercase tracking-wider">
          Upcoming Stops Preview
        </h3>
        <button
          type="button"
          onClick={onViewCompleteRoute}
          className="text-xs font-bold text-[#FF7A18] hover:text-[#e0680f] flex items-center gap-1 transition cursor-pointer"
        >
          <span>Complete Itinerary</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Compact Stop Rows */}
      <div className="divide-y divide-[#DDE7ED]/60 text-xs">
        {previewList.map((stop) => {
          const isCurrent = stop.stop_id === currentStopId;
          const isCompleted = stop.status === 'completed';

          return (
            <div 
              key={stop.stop_id || stop.seq}
              className="py-3 flex items-center justify-between gap-3 hover:bg-[#F5F8FA] px-2 rounded-xl transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={`w-6 h-6 rounded-lg font-mono font-black text-xs flex items-center justify-center shrink-0 ${
                  isCompleted 
                    ? 'bg-[#10A88A] text-white' 
                    : isCurrent 
                    ? 'bg-[#FF7A18] text-white' 
                    : 'bg-[#F5F8FA] text-[#123A55] border border-[#DDE7ED]'
                }`}>
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : stop.seq}
                </span>

                <div className="min-w-0">
                  <div className="font-bold text-[#12324A] truncate">
                    {stop.customer_name || stop.customer_id}
                  </div>
                  <div className="text-[11px] text-[#71869A] truncate">
                    {formatLocation(stop.area)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {stop.ptp_today === 1 && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-[#FF7A18]/15 text-[#FF7A18]">
                    PTP
                  </span>
                )}
                {isCompleted ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                    Done
                  </span>
                ) : isCurrent ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#FF7A18] text-white">
                    NEXT
                  </span>
                ) : (
                  <span className="font-mono text-slate-500 font-semibold text-[11px]">
                    {formatTime(stop.arrival_time)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
