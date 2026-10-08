import React from 'react';
import { 
  MapPin, Navigation, Play, CheckCircle2, 
  MapPinned, ArrowRight, Clock, DollarSign,
  AlertCircle, ChevronRight
} from 'lucide-react';
import { formatTime, formatLocation, formatCurrencyINR } from '../../utils/formatters';

export type VisitLifecycleState = 
  | 'UPCOMING'
  | 'NEXT'
  | 'NAVIGATING'
  | 'ARRIVED'
  | 'IN_VISIT'
  | 'COMPLETED';

export interface NextStopData {
  stop_id: number;
  seq: number;
  customer_id: string;
  customer_name?: string;
  area?: string;
  lat: number;
  lon: number;
  arrival_time: string;
  service_start: string;
  service_end: string;
  overdue_amount?: number;
  ptp_today?: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  waiting_min?: number;
  navigation_url?: string;
  phone?: string;
  cumulative_km?: number;
  km_from_prev?: number;
}

interface NextStopCardProps {
  stop: NextStopData;
  totalStops: number;
  routeStarted: boolean;
  lifecycleState: VisitLifecycleState;
  onStartRoute: () => void;
  onStartNavigation: () => void;
  onMarkArrived: () => void;
  onStartVisit: (stopId: number) => void;
  onRecordOutcome: (stop: NextStopData) => void;
  onNavigateToNext: () => void;
  isSubmitting?: boolean;
}

export const NextStopCard: React.FC<NextStopCardProps> = ({
  stop,
  totalStops,
  routeStarted,
  lifecycleState,
  onStartRoute,
  onStartNavigation,
  onMarkArrived,
  onStartVisit,
  onRecordOutcome,
  onNavigateToNext,
  isSubmitting = false
}) => {
  const navUrl = stop.navigation_url || 
    `https://www.google.com/maps/dir/?api=1&destination=${stop.lat},${stop.lon}`;

  return (
    <section className="bg-white rounded-2xl border-2 border-[#FF7A18] shadow-md p-5 sm:p-6 space-y-5 relative overflow-hidden transition">
      {/* Top Tag & Sequence Badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF7A18] opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#FF7A18]" />
          </span>
          <span className="text-xs font-black uppercase tracking-wider text-[#FF7A18]">
            {lifecycleState === 'IN_VISIT' 
              ? 'VISIT IN PROGRESS' 
              : lifecycleState === 'ARRIVED'
              ? 'ARRIVED AT CUSTOMER'
              : 'NEXT STOP'}
          </span>
        </div>
        <span className="font-mono text-xs font-black px-3 py-1 rounded-lg bg-[#123A55]/10 text-[#123A55] border border-[#123A55]/20 shrink-0">
          STOP #{stop.seq} OF {totalStops}
        </span>
      </div>

      {/* Customer Name, Priority Tag & Locality */}
      <div className="space-y-1.5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-black text-[#123A55] text-2xl sm:text-3xl leading-tight tracking-tight">
            {stop.customer_name || stop.customer_id}
          </h2>
          {stop.ptp_today === 1 && (
            <span className="px-3 py-1 rounded-lg text-xs font-black bg-[#FF7A18] text-white uppercase tracking-wider shadow-xs shrink-0 inline-flex items-center gap-1">
              <span>★</span>
              <span>PTP TODAY</span>
            </span>
          )}
        </div>

        <div className="text-sm font-semibold text-[#71869A] flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-[#FF7A18] shrink-0" />
          <span className="truncate">{formatLocation(stop.area)}</span>
          <span className="text-slate-300">•</span>
          <span className="font-mono text-xs text-slate-400">ID: {stop.customer_id}</span>
        </div>
      </div>

      {/* Grouped Information Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-xl bg-[#F5F8FA] border border-[#DDE7ED]">
        {/* Expected Arrival */}
        <div>
          <span className="text-[10px] text-[#71869A] font-bold uppercase tracking-wider block">
            Expected Arrival
          </span>
          <span className="text-base sm:text-lg font-black text-[#123A55] font-mono block mt-0.5">
            {formatTime(stop.arrival_time)}
          </span>
        </div>

        {/* Target Window */}
        <div>
          <span className="text-[10px] text-[#71869A] font-bold uppercase tracking-wider block">
            Target Window
          </span>
          <span className="text-xs sm:text-sm font-bold text-[#12324A] font-mono block mt-1">
            {formatTime(stop.service_start)} – {formatTime(stop.service_end)}
          </span>
        </div>

        {/* Overdue Amount */}
        <div>
          <span className="text-[10px] text-[#71869A] font-bold uppercase tracking-wider block">
            Overdue Amount
          </span>
          <span className="text-base sm:text-lg font-black text-[#10A88A] font-mono block mt-0.5 truncate">
            {formatCurrencyINR(stop.overdue_amount)}
          </span>
        </div>

        {/* Service Duration */}
        <div>
          <span className="text-[10px] text-[#71869A] font-bold uppercase tracking-wider block">
            Service
          </span>
          <span className="text-xs sm:text-sm font-bold text-[#12324A] block mt-1">
            {stop.waiting_min ? `${stop.waiting_min}m wait + ` : ''}15 min
          </span>
        </div>
      </div>

      {/* State-Driven Status Message (if applicable) */}
      {lifecycleState === 'ARRIVED' && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-emerald-800 text-xs font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>You have arrived at customer location. Start visit when ready.</span>
        </div>
      )}

      {lifecycleState === 'IN_VISIT' && (
        <div className="p-3 bg-orange/10 border border-orange/30 rounded-xl flex items-center justify-between text-xs font-bold text-[#123A55]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#FF7A18] animate-pulse" />
            <span>Visit in progress · Discussion and payment collection underway</span>
          </div>
          <span className="font-mono text-[#FF7A18]">Active</span>
        </div>
      )}

      {/* STATE-DRIVEN PRIMARY & SECONDARY ACTIONS */}
      <div className="pt-1">
        {/* STATE 1: ROUTE NOT STARTED */}
        {!routeStarted && (
          <button
            type="button"
            onClick={onStartRoute}
            className="w-full h-14 rounded-xl bg-[#FF7A18] hover:bg-[#e0680f] active:scale-[0.98] text-white font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-md transition cursor-pointer"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>START ROUTE</span>
          </button>
        )}

        {/* STATE 2: ROUTE STARTED (Headed to next stop) */}
        {routeStarted && (lifecycleState === 'NEXT' || lifecycleState === 'NAVIGATING') && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href={navUrl}
              target="_blank"
              rel="noreferrer"
              onClick={onStartNavigation}
              className="w-full h-13 rounded-xl bg-[#123A55] hover:bg-[#0D2536] active:scale-[0.98] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
            >
              <Navigation className="w-4 h-4 text-[#FF7A18]" />
              <span>START NAVIGATION</span>
            </a>

            <button
              type="button"
              onClick={onMarkArrived}
              className="w-full h-13 rounded-xl bg-[#F5F8FA] hover:bg-slate-200 active:scale-[0.98] text-[#123A55] border border-[#DDE7ED] font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <MapPinned className="w-4 h-4 text-[#10A88A]" />
              <span>I&apos;M HERE</span>
            </button>
          </div>
        )}

        {/* STATE 3: ARRIVED AT CUSTOMER */}
        {routeStarted && lifecycleState === 'ARRIVED' && (
          <button
            type="button"
            onClick={() => onStartVisit(stop.stop_id)}
            disabled={isSubmitting}
            className="w-full h-14 rounded-xl bg-[#FF7A18] hover:bg-[#e0680f] active:scale-[0.98] text-white font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-md transition cursor-pointer"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>START VISIT</span>
          </button>
        )}

        {/* STATE 4: VISIT IN PROGRESS */}
        {routeStarted && lifecycleState === 'IN_VISIT' && (
          <button
            type="button"
            onClick={() => onRecordOutcome(stop)}
            disabled={isSubmitting}
            className="w-full h-14 rounded-xl bg-[#10A88A] hover:bg-[#0c8a70] active:scale-[0.98] text-white font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-md transition cursor-pointer"
          >
            <CheckCircle2 className="w-5 h-5 text-white" />
            <span>COMPLETE VISIT</span>
          </button>
        )}

        {/* STATE 5: VISIT COMPLETED (Ready for next stop) */}
        {routeStarted && lifecycleState === 'COMPLETED' && (
          <button
            type="button"
            onClick={onNavigateToNext}
            className="w-full h-14 rounded-xl bg-[#FF7A18] hover:bg-[#e0680f] active:scale-[0.98] text-white font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-md transition cursor-pointer"
          >
            <span>NAVIGATE TO NEXT STOP</span>
            <ArrowRight className="w-5 h-5 text-white" />
          </button>
        )}
      </div>
    </section>
  );
};
