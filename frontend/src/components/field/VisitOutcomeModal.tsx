import React from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { NextStopData } from './NextStopCard';

interface VisitOutcomeModalProps {
  isOpen: boolean;
  stop: NextStopData | null;
  outcomeType: string;
  setOutcomeType: (type: string) => void;
  amountCollected: string;
  setAmountCollected: (val: string) => void;
  visitNotes: string;
  setVisitNotes: (val: string) => void;
  nextPtpDate: string;
  setNextPtpDate: (val: string) => void;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export const VisitOutcomeModal: React.FC<VisitOutcomeModalProps> = ({
  isOpen,
  stop,
  outcomeType,
  setOutcomeType,
  amountCollected,
  setAmountCollected,
  visitNotes,
  setVisitNotes,
  nextPtpDate,
  setNextPtpDate,
  isSubmitting,
  onClose,
  onSubmit
}) => {
  if (!isOpen || !stop) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom pb-safe">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-orange">
              Visit Outcome • Stop #{stop.seq}
            </div>
            <h3 className="font-black text-navy text-lg sm:text-xl leading-tight">
              {stop.customer_name || stop.customer_id}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              ₹{stop.overdue_amount ? stop.overdue_amount.toLocaleString() : '0'} overdue
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold cursor-pointer active:scale-95 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Outcome Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 block">
            Select Visit Outcome
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setOutcomeType('payment_collected')}
              className={`p-3 rounded-xl border text-left font-bold transition cursor-pointer active:scale-98 ${
                outcomeType === 'payment_collected'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              💰 Payment Collected
            </button>

            <button
              type="button"
              onClick={() => setOutcomeType('ptp_confirmed')}
              className={`p-3 rounded-xl border text-left font-bold transition cursor-pointer active:scale-98 ${
                outcomeType === 'ptp_confirmed'
                  ? 'border-orange bg-orange/10 text-orange ring-2 ring-orange/20'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              📅 PTP Confirmed
            </button>

            <button
              type="button"
              onClick={() => setOutcomeType('customer_unavailable')}
              className={`p-3 rounded-xl border text-left font-bold transition cursor-pointer active:scale-98 ${
                outcomeType === 'customer_unavailable'
                  ? 'border-rose-500 bg-rose-50 text-rose-900 ring-2 ring-rose-500/20'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              🚪 Customer Unavailable
            </button>

            <button
              type="button"
              onClick={() => setOutcomeType('dispute')}
              className={`p-3 rounded-xl border text-left font-bold transition cursor-pointer active:scale-98 ${
                outcomeType === 'dispute'
                  ? 'border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              ⚠️ Dispute / Query
            </button>
          </div>
        </div>

        {/* Dynamic Fields */}
        {outcomeType === 'payment_collected' && (
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">
              Amount Collected (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 font-bold text-slate-400">₹</span>
              <input
                type="number"
                value={amountCollected}
                onChange={(e) => setAmountCollected(e.target.value)}
                placeholder="Enter amount collected"
                className="w-full pl-9 pr-3.5 py-3 text-sm font-bold rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 bg-slate-50"
              />
            </div>
          </div>
        )}

        {outcomeType === 'ptp_confirmed' && (
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">
              Next Promised Date (PTP)
            </label>
            <input
              type="date"
              value={nextPtpDate}
              onChange={(e) => setNextPtpDate(e.target.value)}
              className="w-full p-3 text-sm font-bold rounded-xl border border-slate-200 focus:outline-none focus:border-orange bg-slate-50"
            />
          </div>
        )}

        {/* Notes */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 block">
            Visit Notes & Feedback
          </label>
          <textarea
            rows={2}
            value={visitNotes}
            onChange={(e) => setVisitNotes(e.target.value)}
            placeholder="Remarks, check number, reason for delay, or contact details..."
            className="w-full p-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-orange bg-slate-50 leading-relaxed"
          />
        </div>

        {/* Modal Action Buttons */}
        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3.5 rounded-xl border border-slate-300 font-bold text-xs text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="flex-1 py-3.5 rounded-xl bg-orange hover:bg-orange-dark active:scale-[0.98] text-white font-black text-xs shadow-md transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'Saving...' : 'Complete Visit'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
