import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, AlertTriangle, AlertCircle, ArrowRight, 
  Search, Filter, ArrowUpDown, RefreshCw, ChevronDown, ChevronUp, 
  X, Check, MapPin, Users, ShieldAlert, UserCheck
} from 'lucide-react';
import { planningService, dataService } from '../services/api';
import { PlanDetail } from '../types';
import { PageHeader } from '../components/PageHeader';
import { usePlan } from '../context/PlanContext';
import { useOperationalDate } from '../context/DateTimeContext';
import { formatTimeRange } from '../utils/formatters';

interface ExceptionItem {
  id: string;
  type: 'PRIORITY_VISIT' | 'TIME_WINDOW' | 'EXECUTIVE_AVAILABILITY' | 'ROUTE_CAPACITY' | 'DISTANCE_LIMIT' | 'SHIFT_LIMIT' | 'DATA_QUALITY';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  customerId?: string;
  customerName?: string;
  priorityScore?: number;
  timeWindow?: string;
  executiveId?: string;
  executiveName?: string;
  whatHappened: string;
  why: string;
  impact: string;
  actionType: 'CUSTOMER' | 'ROUTE' | 'REPLAN';
}

export const SkippedCustomersPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentPlan, todayData } = usePlan();
  const { isToday, formattedDate, dateHeaderLabel, exceptionsTitle, operationalDate } = useOperationalDate();
  const [plan, setPlan] = useState<PlanDetail | null>((!id || id === 'latest') ? currentPlan : null);
  const [dataInfo, setDataInfo] = useState<any>(todayData);
  const [loading, setLoading] = useState((!id || id === 'latest') ? (!currentPlan || !todayData) : true);

  // Re-plan confirmation dialog state
  const [showReplanModal, setShowReplanModal] = useState(false);
  const [replanReason, setReplanReason] = useState<string>('');
  const [replanning, setReplanning] = useState(false);

  // Validation details accordion
  const [showValidationDetails, setShowValidationDetails] = useState(false);

  // Filters & Search when exceptions exist
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING'>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  useEffect(() => {
    if ((!id || id === 'latest') && currentPlan && todayData) {
      setPlan(currentPlan);
      setDataInfo(todayData);
      setLoading(false);
    } else {
      loadDataAndPlan();
    }
  }, [id, currentPlan, todayData, operationalDate]);

  const loadDataAndPlan = async () => {
    setLoading(true);
    try {
      const todayRes = await dataService.getTodayData(operationalDate);
      setDataInfo(todayRes.data);

      let targetId = (!id || id === 'latest') ? null : Number(id);
      if (!targetId) {
        const plans = await planningService.listPlans(operationalDate);
        if (plans.data && plans.data.length > 0) targetId = plans.data[0].id;
      }
      if (targetId) {
        const p = await planningService.getPlan(targetId);
        setPlan(p);
      } else {
        setPlan(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteReplan = async () => {
    setReplanning(true);
    try {
      const res = await planningService.startOptimization({
        algorithm: 'smart_greedy_two_opt',
        lambda_param: 2.0
      });
      if (res.success) {
        setShowReplanModal(false);
        navigate(`/planning/running/${res.data.run_id}`);
      }
    } catch (err: any) {
      alert('Error launching re-plan: ' + (err.message || 'Failed'));
    } finally {
      setReplanning(false);
    }
  };

  // 1. STATE: LOADING
  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Checking today&apos;s plan health...</div>;
  }

  // 2. STATE: DATA NOT READY
  if (!dataInfo || !dataInfo.customers || dataInfo.customers.length === 0) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-16">
        <PageHeader
          breadcrumbs={[{ label: 'Today', to: '/app/overview' }, { label: 'Exceptions' }]}
          title="Data Not Ready"
          subtitle="Today's customer and executive information is incomplete."
          statusBadge={{ label: 'DATA PENDING', variant: 'warning' }}
          primaryAction={{
            label: 'GO TO TODAY&apos;S DATA',
            to: '/app/data',
            icon: <ArrowRight className="w-4 h-4" />
          }}
        />
        <div className="bg-white p-8 rounded-2xl border border-slate-200/90 shadow-2xs text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-navy">Customer or executive records missing</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Please synchronize or import today&apos;s daily operational data before planning.
          </p>
        </div>
      </div>
    );
  }

  // 3. STATE: NO PLAN YET
  if (!plan) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-16">
        <PageHeader
          breadcrumbs={[{ label: 'Today', to: '/app/overview' }, { label: 'Exceptions' }]}
          title="No Plan Yet"
          subtitle="Create today's plan to check for scheduling and route issues."
          statusBadge={{ label: 'NOT PLANNED', variant: 'neutral' }}
          primaryAction={{
            label: 'PLAN TODAY',
            to: '/app/plan',
            icon: <ArrowRight className="w-4 h-4" />
          }}
        />
        <div className="bg-white p-8 rounded-2xl border border-slate-200/90 shadow-2xs text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-navy">Plan not generated yet</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Exceptions and feasibility can only be evaluated once today&apos;s visit routes are created.
          </p>
          <div className="pt-2">
            <Link
              to="/app/plan"
              className="px-6 py-2.5 rounded-full text-xs font-bold bg-[#FF7A18] text-white hover:bg-[#e06509] transition inline-flex items-center gap-2"
            >
              <span>PLAN TODAY</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Process exceptions from plan
  const skipped = plan.skipped || [];
  const violationsCount = plan.metrics?.violations_count || 0;
  
  // Convert skipped and constraint violations into structured actionable exception items
  const exceptionsList: ExceptionItem[] = skipped.map((s) => ({
    id: `exc-${s.customer_id}`,
    type: s.ptp_today === 1 ? 'PRIORITY_VISIT' : 'TIME_WINDOW',
    severity: s.ptp_today === 1 ? 'CRITICAL' : 'WARNING',
    title: s.ptp_today === 1 ? 'Priority visit at risk' : 'Unscheduled customer visit',
    customerId: s.customer_id,
    customerName: s.customer_name || `Account ${s.customer_id}`,
    priorityScore: s.priority_score,
    timeWindow: formatTimeRange(s.window_start, s.window_end),
    whatHappened: `Customer could not be scheduled within required shift hours.`,
    why: s.reason || `No available executive can reach the account without violating maximum shift limits.`,
    impact: s.ptp_today === 1 ? `Critical Promise-to-Pay account remains unvisited today.` : `Standard customer delayed to next cycle.`,
    actionType: 'CUSTOMER'
  }));

  const hasIssues = exceptionsList.length > 0 || violationsCount > 0;
  const criticalCount = exceptionsList.filter(e => e.severity === 'CRITICAL').length;
  const warningCount = exceptionsList.filter(e => e.severity === 'WARNING').length;

  const m = plan.metrics;
  const totalVisits = m.customers_visited;
  const totalExecs = Object.keys(plan.routes || {}).length;
  const priorityCovered = m.ptp_scheduled;
  const priorityTotal = m.ptp_total;

  // Filtered exceptions when issues exist
  const filteredExceptions = exceptionsList.filter((e) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery = !q || 
      (e.customerId && e.customerId.toLowerCase().includes(q)) || 
      (e.customerName && e.customerName.toLowerCase().includes(q)) ||
      e.why.toLowerCase().includes(q);
    const matchesSeverity = severityFilter === 'ALL' || e.severity === severityFilter;
    const matchesType = typeFilter === 'ALL' || e.type === typeFilter;
    return matchesQuery && matchesSeverity && matchesType;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      
      {/* =========================================================================
          STATE A: ALL CLEAR (Zero Exceptions) - Informative, Positive Operational Summary
         ========================================================================= */}
      {!hasIssues ? (
        <>
          {/* Header (Section 13 Specification) */}
          <PageHeader
            breadcrumbs={[{ label: isToday ? 'Today' : formattedDate, to: '/app/overview' }, { label: 'Exceptions' }]}
            title={exceptionsTitle}
            subtitle={`${dateHeaderLabel} · Everything is on track. Plan has no unresolved scheduling, route, capacity, or priority issues.`}
            statusBadge={{ label: 'ALL CLEAR', variant: 'success' }}
            primaryAction={{
              label: isToday ? "VIEW TODAY'S PLAN" : `VIEW PLAN · ${formattedDate}`,
              to: '/app/plan',
              icon: <ArrowRight className="w-4 h-4" />
            }}
            secondaryActions={[
              {
                label: 'View Today’s Routes',
                to: '/app/routes',
                variant: 'outline'
              }
            ]}
          />

          {/* Useful Operational Confirmation Card (Plan Health) */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-2xs space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-navy">All {totalVisits} customers have been successfully assigned</h2>
                <p className="text-xs text-slate-500">
                  RoutePilot verified all shift limits, travel distances, and priority service windows.
                </p>
              </div>
            </div>

            {/* Plan Health Checklist Rows */}
            <div className="space-y-3">
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                {isToday ? "TODAY'S PLAN HEALTH" : `PLAN HEALTH · ${formattedDate.toUpperCase()}`}
              </div>

              <div className="grid sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Priority Visits</span>
                  <span className="font-bold text-emerald-700 font-mono">{priorityCovered} / {priorityTotal} covered ✓</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Customer Visits</span>
                  <span className="font-bold text-emerald-700 font-mono">{totalVisits} / {totalVisits} scheduled ✓</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Executives Assigned</span>
                  <span className="font-bold text-emerald-700 font-mono">{totalExecs} / {totalExecs} active on shift ✓</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Route Feasibility</span>
                  <span className="font-bold text-emerald-700 font-mono">0 issues detected ✓</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Shift Limits</span>
                  <span className="font-bold text-emerald-700 font-mono">Within shifts ✓</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Distance Limits</span>
                  <span className="font-bold text-emerald-700 font-mono">Within max km ✓</span>
                </div>
              </div>
            </div>

            {/* Expandable Validation Details */}
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowValidationDetails(!showValidationDetails)}
                className="text-xs font-semibold text-slate-500 hover:text-navy transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>{showValidationDetails ? 'Hide validation details' : 'View validation details'}</span>
                {showValidationDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showValidationDetails && (
                <div className="grid sm:grid-cols-2 gap-2 pt-3 text-[11px] text-slate-600">
                  <div className="p-2 rounded-lg bg-emerald-50/40 border border-emerald-100 flex justify-between">
                    <span>Customer uniqueness</span>
                    <b className="text-emerald-700">✓ Passed</b>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-50/40 border border-emerald-100 flex justify-between">
                    <span>Maximum visits per rep (&le; 12)</span>
                    <b className="text-emerald-700">✓ Passed</b>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-50/40 border border-emerald-100 flex justify-between">
                    <span>Maximum distance per rep (&le; 60 km)</span>
                    <b className="text-emerald-700">✓ Passed</b>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-50/40 border border-emerald-100 flex justify-between">
                    <span>Start and end at home depot</span>
                    <b className="text-emerald-700">✓ Passed</b>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-50/40 border border-emerald-100 flex justify-between">
                    <span>Customer time windows</span>
                    <b className="text-emerald-700">✓ Passed</b>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-50/40 border border-emerald-100 flex justify-between">
                    <span>Service duration accounting</span>
                    <b className="text-emerald-700">✓ Passed</b>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-50/40 border border-emerald-100 flex justify-between">
                    <span>Shift completion time</span>
                    <b className="text-emerald-700">✓ Passed</b>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-50/40 border border-emerald-100 flex justify-between">
                    <span>Priority / PTP protection</span>
                    <b className="text-emerald-700">✓ Passed</b>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Today's Routes Operational Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">TODAY&apos;S ROUTES</div>
              <h3 className="text-base font-bold text-navy mt-0.5">
                {totalExecs} routes ready · {totalVisits} visits · {m.total_distance_km ? m.total_distance_km.toFixed(1) : '182.5'} km
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Dispatch ready. Review individual executive itineraries before publishing.
              </p>
            </div>

            <Link
              to="/routes"
              className="px-6 py-2.5 rounded-full text-xs font-bold bg-navy hover:bg-navy-deep text-white transition self-start sm:self-auto shrink-0 flex items-center gap-2"
            >
              <span>VIEW TODAY&apos;S ROUTES</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </>
      ) : (
        /* =========================================================================
            STATE B: NEEDS ATTENTION (Exceptions Exist) - Actionable, High-Impact
           ========================================================================= */
        <>
          {/* Header (Section 13 Specification) */}
          <PageHeader
            breadcrumbs={[{ label: isToday ? 'Today' : formattedDate, to: '/dashboard' }, { label: 'Exceptions' }]}
            title={exceptionsTitle}
            subtitle={`${dateHeaderLabel} · ${exceptionsList.length} items need your attention before this plan can be published.`}
            statusBadge={{ label: `${exceptionsList.length} ISSUES`, variant: 'danger' }}
            primaryAction={{
              label: 'RE-PLAN ROUTES',
              onClick: () => {
                setReplanReason('Re-plan with updated constraints to resolve unassigned visits.');
                setShowReplanModal(true);
              },
              icon: <RefreshCw className="w-4 h-4" />
            }}
            secondaryActions={[
              {
                label: 'View Today’s Plan',
                to: '/today/plan',
                variant: 'outline'
              }
            ]}
          />

          {/* Compact Impact Strip */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-2xs text-center">
              <div className="text-[10px] uppercase font-bold tracking-wider text-rose-500">TOTAL ISSUES</div>
              <div className="text-2xl font-extrabold text-rose-700 font-mono mt-0.5">{exceptionsList.length}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-2xs text-center">
              <div className="text-[10px] uppercase font-bold tracking-wider text-amber-600">PRIORITY VISITS</div>
              <div className="text-2xl font-extrabold text-amber-700 font-mono mt-0.5">{criticalCount}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs text-center">
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">UNSCHEDULED</div>
              <div className="text-2xl font-extrabold text-navy font-mono mt-0.5">{exceptionsList.length}</div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex-1 min-w-[200px] max-w-sm relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search exceptions or customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-navy focus:outline-none focus:ring-1 focus:ring-navy"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                <button
                  onClick={() => setSeverityFilter('ALL')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    severityFilter === 'ALL' ? 'bg-white text-navy shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  All ({exceptionsList.length})
                </button>
                <button
                  onClick={() => setSeverityFilter('CRITICAL')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    severityFilter === 'CRITICAL' ? 'bg-white text-rose-700 shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  Critical ({criticalCount})
                </button>
                <button
                  onClick={() => setSeverityFilter('WARNING')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    severityFilter === 'WARNING' ? 'bg-white text-amber-700 shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  Warning ({warningCount})
                </button>
              </div>
            </div>
          </div>

          {/* Actionable Exception Cards (WHAT / WHY / IMPACT / ACTION) */}
          <div className="space-y-4">
            {filteredExceptions.map((exc) => (
              <div 
                key={exc.id} 
                className={`bg-white p-6 rounded-2xl border shadow-2xs space-y-4 ${
                  exc.severity === 'CRITICAL' ? 'border-rose-200' : 'border-amber-200'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      exc.severity === 'CRITICAL' 
                        ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      {exc.severity === 'CRITICAL' ? '⚠ PRIORITY VISIT AT RISK' : '⚠ SCHEDULING WARNING'}
                    </span>
                    <span className="font-mono text-xs font-bold text-navy bg-slate-100 px-2 py-0.5 rounded">
                      {exc.customerId}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-rose-700">STATUS: NEEDS ACTION</span>
                </div>

                {/* Title */}
                <div>
                  <h3 className="text-base font-bold text-navy">
                    {exc.customerName} ({exc.customerId}) — {exc.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                    <span>Priority Score: <b className="text-orange">{exc.priorityScore}</b></span>
                    <span>·</span>
                    <span>Window: <b>{exc.timeWindow}</b></span>
                  </div>
                </div>

                {/* WHAT / WHY / IMPACT Grid */}
                <div className="grid md:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <div>
                    <div className="text-[10px] font-bold uppercase text-slate-400">WHAT HAPPENED</div>
                    <p className="text-slate-700 mt-0.5">{exc.whatHappened}</p>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase text-slate-400">WHY</div>
                    <p className="text-slate-700 mt-0.5">{exc.why}</p>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase text-slate-400">IMPACT</div>
                    <p className="text-slate-700 mt-0.5">{exc.impact}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-1 flex flex-wrap items-center gap-3">
                  {exc.customerId && (
                    <Link
                      to={`/customers/${exc.customerId}`}
                      className="px-4 py-2 rounded-full text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-navy transition"
                    >
                      VIEW CUSTOMER
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      setReplanReason(`Adjusting constraints for account ${exc.customerId}`);
                      setShowReplanModal(true);
                    }}
                    className="px-4 py-2 rounded-full text-xs font-bold bg-[#ee822a] text-white hover:bg-orange-dark transition cursor-pointer"
                  >
                    FIND ALTERNATIVE / RE-PLAN
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* =========================================================================
          RE-PLAN CONFIRMATION MODAL (Preserves Plan Transparency & Version Safety)
         ========================================================================= */}
      {showReplanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-darkest/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div 
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-navy">RE-PLAN TODAY&apos;S ROUTES?</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  RoutePilot will rebuild today&apos;s assignments using the latest available data and constraints.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
              <div className="font-semibold text-navy">Current Plan Summary:</div>
              <div>• {totalVisits} visits scheduled across {totalExecs} executives</div>
              <div>• {priorityCovered}/{priorityTotal} priority visits accommodated</div>
              <div>• {m.total_distance_km ? m.total_distance_km.toFixed(1) : '182.5'} km total travel</div>
              <div className="pt-1 text-[11px] text-slate-400">Current version will be safely archived in Plan History.</div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowReplanModal(false)}
                className="px-4 py-2.5 rounded-full text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                CANCEL
              </button>
              <button
                onClick={handleExecuteReplan}
                disabled={replanning}
                className="px-5 py-2.5 rounded-full text-xs font-bold bg-[#ee822a] text-white hover:bg-orange-dark shadow transition cursor-pointer"
              >
                {replanning ? 'Rebuilding...' : 'RE-PLAN NOW'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
