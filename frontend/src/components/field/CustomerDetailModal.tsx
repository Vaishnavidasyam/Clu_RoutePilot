import React from 'react';
import { 
  X, MapPin, Phone, Navigation, Clock, 
  DollarSign, AlertCircle, CheckCircle2, Play 
} from 'lucide-react';
import { NextStopData } from './NextStopCard';
import { formatLocation, formatTime, formatTimeRange, formatCurrencyINR } from '../../utils/formatters';

interface CustomerDetailModalProps {
  isOpen: boolean;
  customer: NextStopData | null;
  onClose: () => void;
  onStartVisit?: (stopId: number) => void;
  onRecordOutcome?: (stop: NextStopData) => void;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  isOpen,
  customer,
  onClose,
  onStartVisit,
  onRecordOutcome
}) => {
  if (!isOpen || !customer) return null;

  const navUrl = customer.navigation_url || 
    `https://www.google.com/maps/dir/?api=1&destination=${customer.lat},${customer.lon}`;

  const isCompleted = customer.status === 'completed';
  const isInProgress = customer.status === 'in_progress';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div 
        className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom pb-safe"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-start justify-between border-b border-[#DDE7ED] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#FF7A18]">
                Stop #{customer.seq}
              </span>
              {customer.ptp_today === 1 && (
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[#FF7A18] text-white">
                  ★ PTP TODAY
                </span>
              )}
            </div>
            <h3 className="font-black text-[#123A55] text-xl sm:text-2xl mt-1 leading-tight">
              {customer.customer_name || customer.customer_id}
            </h3>
            <p className="text-xs text-[#71869A] font-mono mt-0.5">
              Account ID: {customer.customer_id}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#F5F8FA] hover:bg-slate-200 text-[#123A55] flex items-center justify-center cursor-pointer transition active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Location & Quick Contact */}
        <div className="p-3.5 rounded-xl bg-[#F5F8FA] border border-[#DDE7ED] space-y-2 text-xs">
          <div className="flex items-center gap-2 text-[#12324A] font-semibold">
            <MapPin className="w-4 h-4 text-[#FF7A18] shrink-0" />
            <span>{formatLocation(customer.area)}</span>
          </div>
          
          <div className="pt-2 border-t border-[#DDE7ED]/60 flex items-center justify-between">
            <span className="text-[#71869A]">Direct Contact:</span>
            <a
              href="tel:+919876543210"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold hover:bg-emerald-100 transition"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span>+91 98765 43210</span>
            </a>
          </div>
        </div>

        {/* Operational Financials & Windows */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl border border-[#DDE7ED] bg-white">
            <div className="text-[10px] font-bold text-[#71869A] uppercase">Overdue Balance</div>
            <div className="text-lg font-black text-[#10A88A] font-mono mt-0.5">
              {formatCurrencyINR(customer.overdue_amount)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Bucket: DPD 45-60</div>
          </div>

          <div className="p-3 rounded-xl border border-[#DDE7ED] bg-white">
            <div className="text-[10px] font-bold text-[#71869A] uppercase">Expected Arrival</div>
            <div className="text-lg font-black text-[#123A55] font-mono mt-0.5">
              {formatTime(customer.arrival_time)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Window: {formatTimeRange(customer.service_start, customer.service_end)}
            </div>
          </div>
        </div>

        {/* Visit Status Badge */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <span className="text-slate-600 font-bold">Execution Status:</span>
          <span className={`px-2.5 py-1 rounded-full font-bold uppercase text-[10px] ${
            isCompleted 
              ? 'bg-emerald-100 text-emerald-800'
              : isInProgress
              ? 'bg-orange text-white'
              : 'bg-slate-200 text-slate-700'
          }`}>
            {isCompleted ? 'COMPLETED ✓' : isInProgress ? 'IN PROGRESS' : 'PENDING'}
          </span>
        </div>

        {/* Navigation & Action CTAs */}
        <div className="space-y-2 pt-2">
          <a
            href={navUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full h-12 rounded-xl bg-[#123A55] hover:bg-[#0D2536] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition"
          >
            <Navigation className="w-4 h-4 text-[#FF7A18]" />
            <span>OPEN GOOGLE MAPS NAVIGATION</span>
          </a>

          {!isCompleted && !isInProgress && onStartVisit && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onStartVisit(customer.stop_id);
              }}
              className="w-full h-12 rounded-xl bg-[#FF7A18] hover:bg-[#e0680f] text-white font-bold text-xs flex items-center justify-center gap-2 transition"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>START VISIT NOW</span>
            </button>
          )}

          {isInProgress && onRecordOutcome && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onRecordOutcome(customer);
              }}
              className="w-full h-12 rounded-xl bg-[#10A88A] hover:bg-[#0c8a70] text-white font-bold text-xs flex items-center justify-center gap-2 transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>COMPLETE & RECORD OUTCOME</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
