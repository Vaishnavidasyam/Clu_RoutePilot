import React from 'react';
import { Check, MapPin, Navigation, Clock, Phone, ChevronRight } from 'lucide-react';
import { NextStopData } from './NextStopCard';
import { formatLocation, formatTime, formatTimeRange, formatCurrencyINR } from '../../utils/formatters';

interface ItineraryListProps {
  stops: NextStopData[];
  currentStopId?: number;
  onSelectStop?: (stop: NextStopData) => void;
  selectedStopId?: number;
}

export const ItineraryList: React.FC<ItineraryListProps> = ({
  stops,
  currentStopId,
  onSelectStop,
  selectedStopId
}) => {
  return (
    <div className="space-y-3">
      {stops.map((stop) => {
        const isCurrent = stop.stop_id === currentStopId;
        const isCompleted = stop.status === 'completed';
        const isFailed = stop.status === 'failed';
        const isSelected = stop.stop_id === selectedStopId;

        return (
          <div
            key={stop.stop_id || stop.seq}
            onClick={() => onSelectStop && onSelectStop(stop)}
            className={`p-4 rounded-2xl border transition duration-150 cursor-pointer ${
              isSelected
                ? 'border-[#FF7A18] bg-orange/5 ring-2 ring-[#FF7A18]/20 shadow-xs'
                : isCompleted
                ? 'border-emerald-200 bg-emerald-50/30'
                : isCurrent
                ? 'border-[#FF7A18] bg-white shadow-xs'
                : 'border-[#DDE7ED] bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Sequence + Details */}
              <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl font-mono font-black text-xs flex items-center justify-center shrink-0 ${
                    isCompleted
                      ? 'bg-[#10A88A] text-white'
                      : isCurrent
                      ? 'bg-[#FF7A18] text-white shadow-xs'
                      : 'bg-[#F5F8FA] text-[#123A55] border border-[#DDE7ED]'
                  }`}
                >
                  {isCompleted ? <Check className="w-5 h-5" /> : stop.seq}
                </div>

                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-sm sm:text-base text-[#12324A] truncate">
                      {stop.customer_name || stop.customer_id}
                    </h4>
                    {stop.ptp_today === 1 && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[#FF7A18]/15 text-[#FF7A18] border border-[#FF7A18]/20 shrink-0">
                        ★ PTP
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-[#71869A] flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatLocation(stop.area)}</span>
                    </span>
                    <span>•</span>
                    <span className="font-mono font-bold text-[#123A55]">
                      ETA {formatTime(stop.arrival_time)}
                    </span>
                    <span>•</span>
                    <span>Window: {formatTimeRange(stop.service_start, stop.service_end)}</span>
                  </div>
                </div>
              </div>

              {/* Status and Overdue Amount */}
              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <div className="text-left sm:text-right">
                  <div className="font-mono font-black text-xs sm:text-sm text-[#10A88A]">
                    {formatCurrencyINR(stop.overdue_amount)}
                  </div>
                  <div className="text-[10px] text-slate-400">Overdue balance</div>
                </div>

                <span
                  className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                    isCompleted
                      ? 'bg-emerald-100 text-emerald-800'
                      : isCurrent
                      ? 'bg-[#FF7A18] text-white'
                      : isFailed
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-[#F5F8FA] text-[#71869A] border border-[#DDE7ED]'
                  }`}
                >
                  {isCompleted
                    ? 'COMPLETED'
                    : isCurrent
                    ? 'NEXT'
                    : stop.status === 'in_progress'
                    ? 'IN VISIT'
                    : 'UPCOMING'}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
