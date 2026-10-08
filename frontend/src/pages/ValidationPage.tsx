import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  CheckCircle2, AlertTriangle, XCircle, RefreshCw, ArrowRight, 
  ShieldCheck, Wrench
} from 'lucide-react';
import { dataService } from '../services/api';
import { ValidationReport } from '../types';
import { useOperationalDate } from '../context/DateTimeContext';
import { usePlan } from '../context/PlanContext';

export const ValidationPage: React.FC = () => {
  const { operationalDate, formattedDate } = useOperationalDate();
  const { refreshAll } = usePlan();
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    runValidation();
  }, [operationalDate]);

  const runValidation = async () => {
    setLoading(true);
    try {
      const [data] = await Promise.all([
        dataService.getValidation(operationalDate),
        refreshAll(operationalDate)
      ]);
      setReport(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const errors = report?.issues.filter(i => i.type === 'ERROR') || [];
  const warnings = report?.issues.filter(i => i.type === 'WARNING') || [];

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
      
      {/* Header */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pre-Flight Audit</div>
          <h1 className="text-xl sm:text-2xl font-bold text-navy">Data Validation Center</h1>
          <p className="text-xs text-slate-500 mt-1">
            Validating schema integrity, coordinate limits, time formats, and service window feasibility
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={runValidation}
            disabled={loading}
            className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Revalidate Data</span>
          </button>

          <Link
            to="/manager/plan"
            className={`w-full sm:w-auto px-5 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              errors.length === 0
                ? 'bg-navy text-white hover:bg-navy-deep shadow'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed pointer-events-none'
            }`}
          >
            <span>Proceed to Planning</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Summary Scorecard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <div className={`p-5 rounded-2xl border ${
          errors.length === 0 ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900' : 'bg-rose-50/50 border-rose-200 text-rose-900'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider">Blocking Errors</span>
            {errors.length === 0 ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-rose-600" />}
          </div>
          <div className="text-3xl font-extrabold mt-2">{errors.length}</div>
          <div className="text-xs mt-1 text-slate-600">
            {errors.length === 0 ? 'All records pass mandatory constraints' : 'Must be resolved before optimization'}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-amber-50/50 border border-amber-200 text-amber-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider">Warnings</span>
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-3xl font-extrabold mt-2">{warnings.length}</div>
          <div className="text-xs mt-1 text-slate-600">Non-blocking formatting notifications</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm text-navy">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Validated Entities</span>
            <ShieldCheck className="w-5 h-5 text-teal-slate" />
          </div>
          <div className="text-3xl font-extrabold mt-2">
            {(report?.customer_valid_count || 0) + (report?.executive_valid_count || 0)}
          </div>
          <div className="text-xs mt-1 text-slate-500">
            {report?.executive_valid_count} executives · {report?.customer_valid_count} customers clean
          </div>
        </div>

      </div>

      {/* Issues Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h3 className="text-sm font-bold text-navy">Validation Audit Findings</h3>

        {errors.length === 0 && warnings.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h4 className="text-sm font-bold text-navy">Clean Data Snapshot</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              All executive shift configurations, customer coordinates, and time windows are mathematically feasible. Ready to launch the optimization engine.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {errors.map((item, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-rose-50/70 border border-rose-200 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-rose-900">
                      {item.category}: {item.record_id} ({item.field})
                    </div>
                    <div className="text-xs text-rose-700 mt-0.5">{item.message}</div>
                  </div>
                </div>
                <button className="px-3 py-1 bg-white border border-rose-300 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-100 transition shrink-0">
                  Fix Record
                </button>
              </div>
            ))}

            {warnings.map((item, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-amber-900">
                      {item.category}: {item.record_id} ({item.field})
                    </div>
                    <div className="text-xs text-amber-700 mt-0.5">{item.message}</div>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-amber-700 uppercase">Auto-Handled</span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
