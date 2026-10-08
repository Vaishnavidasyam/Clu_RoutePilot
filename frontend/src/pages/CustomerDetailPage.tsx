import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, ShieldCheck, DollarSign, Calendar, Sparkles } from 'lucide-react';
import { customerService } from '../services/api';
import { Customer } from '../types';
import { formatCurrencyINR, formatLocation, formatTimeRange } from '../utils/formatters';

export const CustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadCustomer(id);
    }
  }, [id]);

  const loadCustomer = async (cid: string) => {
    setLoading(true);
    try {
      const res = await customerService.get(cid);
      setCustomer(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !customer) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading customer profile...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/customers" className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Customer Profile</div>
            <h1 className="text-xl font-bold text-navy">{customer.name || customer.id}</h1>
          </div>
        </div>

        {customer.ptp_today === 1 && (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange/15 text-orange border border-orange/30">
            PTP MUST-VISIT TODAY
          </span>
        )}
      </div>

      {/* Profile Details Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="grid md:grid-cols-2 gap-6 text-xs">
          
          <div className="space-y-3">
            <h3 className="font-bold text-navy text-sm border-b border-slate-100 pb-2">Account & Location</h3>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400">Customer ID:</span>
              <span className="font-mono font-bold text-navy">{customer.id}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400">Collection Area:</span>
              <span className="font-semibold text-navy">{formatLocation(customer.area)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400">Coordinates:</span>
              <span className="font-mono text-slate-600">{customer.lat}, {customer.lon}</span>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-navy text-sm border-b border-slate-100 pb-2">Recovery & Time Constraints</h3>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400">Overdue Amount:</span>
              <span className="font-bold text-navy">{formatCurrencyINR(customer.overdue_amount)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400">Days Past Due (DPD):</span>
              <span className="font-semibold text-rose-600">{customer.dpd} days</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400">Time Window:</span>
              <span className="font-mono font-bold text-navy">{formatTimeRange(customer.window_start, customer.window_end)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400">Service Duration:</span>
              <span className="font-semibold text-navy">{customer.service_min} minutes</span>
            </div>
          </div>

        </div>

        {/* Explainability Section */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-navy">
            <Sparkles className="w-3.5 h-3.5 text-gold-dark" />
            <span>Optimizer Explainability Rationale</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Prioritized by algorithm based on {customer.ptp_today === 1 ? 'PTP promise-to-pay guarantee' : 'business priority score of ' + customer.priority_score}, 
            satisfying arrival within [{formatTimeRange(customer.window_start, customer.window_end)}] window and minimal road detour under optimized road transit model.
          </p>
        </div>
      </div>

    </div>
  );
};
