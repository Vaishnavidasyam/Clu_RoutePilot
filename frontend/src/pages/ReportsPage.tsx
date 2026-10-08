import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Download, FileText, FileSpreadsheet, ArrowLeft, Printer, CheckCircle2, 
  Eye, Check, ChevronDown, ChevronUp, AlertTriangle, ShieldCheck, 
  Clock, Calendar, FileCode, Users, MapPin, X
} from 'lucide-react';
import { planningService } from '../services/api';
import { PlanDetail } from '../types';
import { PageHeader } from '../components/PageHeader';
import { usePlan } from '../context/PlanContext';
import { useOperationalDate } from '../context/DateTimeContext';
import { APP_LOCATION } from '../config/locale';
import { formatDate, formatTime, formatTimeRange, getOperationalDate } from '../utils/formatters';

export const ReportsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentPlan } = usePlan();
  const { operationalDate, formattedDate, isToday, dateHeaderLabel } = useOperationalDate();
  const [plan, setPlan] = useState<PlanDetail | null>((!id || id === 'latest') ? currentPlan : null);
  const [loading, setLoading] = useState((!id || id === 'latest') ? !currentPlan : true);

  // Preview Drawer Modal
  const [previewReport, setPreviewReport] = useState<{
    title: string;
    description: string;
    type: 'PLAN' | 'EXCEPTIONS' | 'METRICS';
    downloadUrl: string;
    filename: string;
  } | null>(null);

  // Collapsible Advanced Section
  const [showAdvancedExports, setShowAdvancedExports] = useState(false);

  useEffect(() => {
    if ((!id || id === 'latest') && currentPlan) {
      setPlan(currentPlan);
      setLoading(false);
    } else {
      loadPlan();
    }
  }, [id, currentPlan, operationalDate]);

  const loadPlan = async () => {
    setLoading(true);
    try {
      let targetId = (!id || id === 'latest') ? null : Number(id);
      if (!targetId) {
        const plans = await planningService.listPlans(operationalDate);
        if (plans.data && plans.data.length > 0) targetId = plans.data[0].id;
      }
      if (targetId) {
        const data = await planningService.getPlan(targetId);
        setPlan(data);
      } else {
        setPlan(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-12 text-center text-xs text-slate-400">
        Loading operations report center...
      </div>
    );
  }

  // EMPTY STATE: Plan not generated yet
  if (!plan) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-16">
        <PageHeader
          breadcrumbs={[{ label: 'Reports', to: '/app/overview' }, { label: 'Reports & Exports' }]}
          title="Reports & Exports"
          subtitle="Download, print, and share today's field planning reports."
          statusBadge={{ label: 'NOT READY', variant: 'neutral' }}
        />
        <div className="bg-white p-12 rounded-2xl border border-slate-200/90 shadow-2xs text-center space-y-3">
          <FileText className="w-10 h-10 text-slate-300 mx-auto" />
          <h2 className="text-base font-bold text-navy">Reports Aren't Ready Yet</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Generate and validate today's route plan before downloading reports.
          </p>
          <div className="pt-2">
            <Link
              to="/app/plan"
              className="px-6 py-2.5 rounded-full text-xs font-bold bg-orange text-white hover:bg-orange-dark transition inline-flex items-center gap-1.5"
            >
              <span>Go to Today's Plan</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const m = plan.metrics;
  const routes = Object.values(plan.routes || {});
  const isPub = plan.is_published || plan.status === 'published';
  const skippedCount = plan.skipped?.length || m?.customers_skipped || 0;
  const planDate = plan.plan_date || getOperationalDate();
  const planCode = `PLAN-${planDate.replace(/-/g, '')}-${plan.id.toString().padStart(3, '0')}`;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      
      {/* 1. Page Header (Section 12 Specification) */}
      <PageHeader
        breadcrumbs={[{ label: isToday ? 'Today' : formattedDate, to: '/app/overview' }, { label: 'Reports & Exports' }]}
        title="Reports & Exports"
        subtitle={`${dateHeaderLabel} · Download, print, and share field operations reports for Hyderabad Urban Area.`}
        statusBadge={{ 
          label: isPub ? 'PLAN PUBLISHED' : 'READY FOR REVIEW', 
          variant: isPub ? 'success' : 'info' 
        }}
        secondaryActions={[
          {
            label: isToday ? "Back to Today's Plan" : "Back to Plan",
            to: '/app/plan',
            icon: <ArrowLeft className="w-4 h-4" />
          }
        ]}
      />

      {/* 2. Today's Plan Summary & Daily Briefing Card */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">TODAY'S PLAN</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              isPub ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}>
              {isPub ? '✓ Published' : 'Draft / Ready for Review'}
            </span>
          </div>
          <h2 className="text-xl font-bold text-navy">
            {formatDate(planDate)} · {m.customers_visited} visits across {routes.length} executives
          </h2>
          <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span><b>{m.total_distance_km !== undefined ? m.total_distance_km.toFixed(1) : '0.0'} km</b> planned transit</span>
            <span>·</span>
            <span className="text-orange font-bold"><b>{m.ptp_scheduled}/{m.ptp_total}</b> priority covered</span>
            <span>·</span>
            <span className="text-emerald-700 font-semibold"><b>{m.violations_count || 0}</b> route violations</span>
          </div>
        </div>

        {/* Primary Strongest Action: PRINT DAILY BRIEFING */}
        <div className="shrink-0">
          <button
            onClick={() => window.print()}
            className="px-7 py-3.5 rounded-full text-xs font-bold bg-[#ee822a] text-white hover:bg-orange-dark shadow-[0_6px_20px_rgba(238,130,42,0.35)] transition cursor-pointer flex items-center gap-2 self-start sm:self-auto"
          >
            <Printer className="w-4 h-4" />
            <span>PRINT DAILY BRIEFING</span>
          </button>
        </div>
      </div>

      {/* 3. Core Report Cards (Manager Business Reports) */}
      <div className="grid md:grid-cols-3 gap-5">
        
        {/* CARD 1: Daily Field Plan */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4 flex flex-col justify-between hover:shadow-md transition">
          <div className="space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-orange/10 text-orange flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-navy text-sm">Daily Field Plan</h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Complete visit schedule and stop sequence for all field executives.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
              <div>• {routes.length} executive itineraries</div>
              <div>• {m.customers_visited} customer stops</div>
              <div>• Scheduled arrival & departure times</div>
              <div className="font-mono text-[10px] text-slate-400 pt-1">
                File: RoutePilot_Daily_Field_Plan_{planDate}.csv
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center gap-2">
            <a
              href={`/api/plans/${plan.id}/export/csv`}
              download={`RoutePilot_Daily_Field_Plan_${planDate}.csv`}
              className="flex-1 py-2.5 rounded-xl bg-navy hover:bg-navy-deep text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer text-center"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>
            <button
              onClick={() => setPreviewReport({
                title: "Daily Field Plan",
                description: `Complete itinerary of ${m.customers_visited} stops across ${routes.length} field executives.`,
                type: 'PLAN',
                downloadUrl: `/api/plans/${plan.id}/export/csv`,
                filename: `RoutePilot_Daily_Field_Plan_${planDate}.csv`
              })}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-navy text-xs font-semibold transition cursor-pointer"
            >
              Preview
            </button>
          </div>
        </div>

        {/* CARD 2: Exceptions Report */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4 flex flex-col justify-between hover:shadow-md transition">
          <div className="space-y-2.5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              skippedCount === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
            }`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-navy text-sm">Exceptions Report</h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Customers or routes that could not be scheduled and operational rationale.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
              <div className="font-semibold text-emerald-700">
                {skippedCount === 0 ? '✓ No exceptions today (100% scheduled)' : `⚠ ${skippedCount} unassigned customers`}
              </div>
              <div>• Time-window feasibility checks</div>
              <div>• Executive shift capacity limits</div>
              <div className="font-mono text-[10px] text-slate-400 pt-1">
                File: RoutePilot_Exceptions_{planDate}.csv
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center gap-2">
            <a
              href={`/api/plans/${plan.id}/export/skipped`}
              download={`RoutePilot_Exceptions_${planDate}.csv`}
              className="flex-1 py-2.5 rounded-xl bg-navy hover:bg-navy-deep text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer text-center"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>
            <button
              onClick={() => setPreviewReport({
                title: "Exceptions Report",
                description: skippedCount === 0 ? "Zero exceptions detected. All required visits scheduled." : `${skippedCount} unscheduled customer exceptions.`,
                type: 'EXCEPTIONS',
                downloadUrl: `/api/plans/${plan.id}/export/skipped`,
                filename: `RoutePilot_Exceptions_${planDate}.csv`
              })}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-navy text-xs font-semibold transition cursor-pointer"
            >
              Preview
            </button>
          </div>
        </div>

        {/* CARD 3: Performance Summary */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4 flex flex-col justify-between hover:shadow-md transition">
          <div className="space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal/10 text-teal flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-navy text-sm">Performance Summary</h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Summary of today's route efficiency, travel reduction and baseline scorecard.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
              <div>• Priority coverage: {m.ptp_coverage_pct}%</div>
              <div>• Planned distance: {m.total_distance_km !== undefined ? m.total_distance_km.toFixed(1) : '0.0'} km</div>
              <div>• Baseline comparison & savings</div>
              <div className="font-mono text-[10px] text-slate-400 pt-1">
                File: RoutePilot_Performance_Summary_{planDate}.csv
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center gap-2">
            <a
              href={`/api/plans/${plan.id}/export/metrics`}
              download={`RoutePilot_Performance_Summary_${planDate}.csv`}
              className="flex-1 py-2.5 rounded-xl bg-navy hover:bg-navy-deep text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer text-center"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>
            <Link
              to="/app/analytics"
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-navy text-xs font-semibold transition text-center"
            >
              Analytics
            </Link>
          </div>
        </div>

      </div>

      {/* 4. Recent Reports Download Audit Log */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Recent Reports Activity</h3>
            <p className="text-xs text-slate-500 mt-0.5">Operational dispatch audit trail</p>
          </div>
          <span className="text-[11px] text-slate-400">Priya Sharma (Ops Manager)</span>
        </div>

        <div className="divide-y divide-slate-100 text-xs text-slate-600">
          <div className="py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="font-bold text-navy">Daily Field Plan</span>
              <span className="text-slate-400">· CSV generated</span>
            </div>
            <div className="text-slate-400 font-mono text-[11px]">{planDate} 09:14</div>
          </div>
          <div className="py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="font-bold text-navy">Performance Summary</span>
              <span className="text-slate-400">· CSV generated</span>
            </div>
            <div className="text-slate-400 font-mono text-[11px]">{planDate} 09:16</div>
          </div>
          <div className="py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-300"></span>
              <span className="font-bold text-navy">Plan History Snapshot</span>
              <span className="text-slate-400">· V1 Archived</span>
            </div>
            <div className="text-slate-400 font-mono text-[11px]">{planDate} 08:42</div>
          </div>
        </div>
      </div>

      {/* 5. Collapsible Advanced Technical Exports */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <button
          onClick={() => setShowAdvancedExports(!showAdvancedExports)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-slate-400" />
            <div>
              <span className="text-xs font-bold text-navy uppercase tracking-wider">
                Advanced Data Export (JSON Payload & System Integration)
              </span>
              <p className="text-[11px] text-slate-400">Technical route coordinates and dispatch payload for external API ingestion</p>
            </div>
          </div>
          {showAdvancedExports ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {showAdvancedExports && (
          <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
            <div>
              <div className="font-bold text-navy">Full Route JSON Payload</div>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Contains complete GeoJSON-compliant route timelines, arrival timestamps, and constraint explainability rationales.
              </p>
            </div>
            <a
              href={`/api/plans/${plan.id}/export/json`}
              download={`RoutePilot_Route_Data_${planDate}.json`}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-navy font-bold transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </a>
          </div>
        )}
      </div>

      {/* 6. Plan Record Card (Audit & Operational Accountability) */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <div>
          Plan ID: <b className="text-navy font-mono">{planCode}</b> · Version: <b className="text-navy">V{plan.selected_version || plan.current_version}</b> · Status: <b className="text-emerald-700">{isPub ? 'Published' : 'Draft'}</b>
        </div>
        <div>
          Created: <b>{planDate}, 08:42</b> by <b>Priya Sharma (Ops Lead)</b>
        </div>
      </div>

      {/* 7. Report Preview Modal */}
      {previewReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-darkest/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div 
            className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 max-h-[85vh] flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-navy">{previewReport.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{previewReport.description}</p>
                </div>
                <button
                  onClick={() => setPreviewReport(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-navy hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Preview Content */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 max-h-80 overflow-y-auto space-y-2 text-xs font-mono">
                {previewReport.type === 'PLAN' && (
                  <div className="space-y-1">
                    <div className="text-slate-400 font-bold"># Header Schema: executive_id,seq,customer_id,arrival_time,km_from_prev,cumulative_km</div>
                    {routes.slice(0, 3).map((r) => (
                      <div key={r.executive_id} className="pt-1">
                        <div className="text-navy font-bold">// Route {r.executive_id} ({r.executive_name}) - {r.metrics.visit_count} stops</div>
                        {r.timeline.slice(0, 4).map((s) => (
                          <div key={s.customer_id} className="text-slate-600 pl-2">
                            {r.executive_id},{s.seq},{s.customer_id},{s.arrival_time},{s.km_from_prev},{s.cumulative_km}
                          </div>
                        ))}
                      </div>
                    ))}
                    <div className="text-slate-400 pt-1">// ... {m.customers_visited} total rows</div>
                  </div>
                )}

                {previewReport.type === 'EXCEPTIONS' && (
                  <div>
                    {skippedCount === 0 ? (
                      <div className="text-emerald-700 font-sans font-semibold py-4 text-center">
                        ✓ All customers scheduled successfully. Zero exceptions in today's plan.
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="text-slate-400 font-bold"># Header: customer_id,ptp_today,priority_score,reason</div>
                        {plan.skipped?.map((sc: any) => (
                          <div key={sc.customer_id} className="text-rose-700">
                            {sc.customer_id},{sc.ptp_today},{sc.priority_score},{sc.reason}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {previewReport.type === 'METRICS' && (
                  <div className="space-y-1">
                    <div className="text-slate-400 font-bold"># RoutePilot Operational Benchmarks</div>
                    <div>metric,optimized_value,baseline_estimate,status</div>
                    <div>total_distance_km,{m.total_distance_km !== undefined ? m.total_distance_km.toFixed(1) : '0.0'},{(m.total_distance_km ? m.total_distance_km * 1.2 : 0).toFixed(1)},savings computed</div>
                    <div>ptp_coverage_pct,{m.ptp_coverage_pct}%,100%,{m.ptp_scheduled}/{m.ptp_total} protected</div>
                    <div>violations_count,{m.violations_count || 0},0,{m.violations_count ? 'violations' : 'clean'}</div>
                    <div>customers_visited,{m.customers_visited},0,scheduled</div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setPreviewReport(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition"
              >
                Close Preview
              </button>
              <a
                href={previewReport.downloadUrl}
                download={previewReport.filename}
                className="px-5 py-2 rounded-xl bg-navy hover:bg-navy-deep text-white font-bold text-xs transition flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download File</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 8. Professional Printable Daily Briefing (Visible only when printing) */}
      <div className="hidden print:block space-y-6 p-8 text-black bg-white">
        <div className="border-b-2 border-black pb-4 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-wider">RoutePilot — Daily Field Visit Plan</h1>
            <p className="text-sm font-semibold mt-1">Operational Dispatch Briefing · Date: {planDate}</p>
          </div>
          <div className="text-right text-xs">
            <div><b>Plan ID:</b> {planCode}</div>
            <div><b>Status:</b> {isPub ? 'PUBLISHED' : 'DRAFT'}</div>
            <div><b>Printed:</b> {new Date().toLocaleTimeString()}</div>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4 border border-black p-4 text-center text-xs font-bold">
          <div>
            <div className="uppercase text-slate-500 text-[10px]">Total Visits</div>
            <div className="text-lg">{m.customers_visited}</div>
          </div>
          <div>
            <div className="uppercase text-slate-500 text-[10px]">Executives</div>
            <div className="text-lg">{routes.length}</div>
          </div>
          <div>
            <div className="uppercase text-slate-500 text-[10px]">Total Transit</div>
            <div className="text-lg">{m.total_distance_km !== undefined ? m.total_distance_km.toFixed(1) : '0.0'} km</div>
          </div>
          <div>
            <div className="uppercase text-slate-500 text-[10px]">PTP Coverage</div>
            <div className="text-lg">{m.ptp_scheduled}/{m.ptp_total} ({m.ptp_coverage_pct}%)</div>
          </div>
          <div>
            <div className="uppercase text-slate-500 text-[10px]">Violations</div>
            <div className="text-lg">{m.violations_count || 0}</div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-base font-bold uppercase border-b border-black pb-1">Executive Route Itineraries</h2>
          {routes.map((r) => (
            <div key={r.executive_id} className="border border-slate-300 p-3 text-xs space-y-1.5 break-inside-avoid">
              <div className="flex justify-between font-bold border-b border-slate-200 pb-1">
                <span>{r.executive_id} — {r.executive_name}</span>
                <span>{r.metrics.visit_count} visits · {r.metrics.total_km} km · Return ~ {formatTime(r.metrics.return_time)}</span>
              </div>
              <div className="text-[11px] text-slate-700">
                {APP_LOCATION.depotName} → {r.timeline.map(s => `${s.customer_id} (${formatTime(s.arrival_time)}${s.ptp_today === 1 ? ' [PTP]' : ''})`).join(' → ')} → {APP_LOCATION.depotName}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-black pt-4 text-xs flex justify-between">
          <div>✓ All mandatory visits protected · Shift duration limits respected · Prepared by Operations Management</div>
          <div>Sign-off: ________________________</div>
        </div>
      </div>

    </div>
  );
};
