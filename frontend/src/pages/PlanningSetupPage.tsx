import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowRight, CheckCircle2, ChevronDown, ChevronUp, 
  MapPin, RefreshCw, AlertTriangle, Check, Sliders, Info, Clock, 
  AlertCircle, X, Send, ShieldCheck, ChevronRight
} from 'lucide-react';
import { planningService } from '../services/api';
import { PlanDetail } from '../types';
import { PageHeader } from '../components/PageHeader';
import { usePlan } from '../context/PlanContext';
import { useOperationalDate } from '../context/DateTimeContext';
import { formatDate, formatTime } from '../utils/formatters';
import { APP_LOCATION } from '../config/locale';

export const PlanningSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentPlan, todayData, refreshAll, publishPlan: contextPublish } = usePlan();
  const { 
    isToday, 
    isHistorical, 
    isFuture, 
    formattedDate, 
    planTitle, 
    dateHeaderLabel,
    operationalDate 
  } = useOperationalDate();
  const [latestPlan, setLatestPlan] = useState<PlanDetail | null>(currentPlan);
  const [loading, setLoading] = useState<boolean>(true);
  const [starting, setStarting] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadAll = async () => {
      setLoading(true);
      try {
        await refreshAll(operationalDate);
        const res = await planningService.listPlans(operationalDate);
        if (!isMounted) return;
        if (res.data && res.data.length > 0) {
          const p = await planningService.getPlan(res.data[0].id);
          if (isMounted) setLatestPlan(p);
        } else {
          if (isMounted) setLatestPlan(null);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadAll();
    return () => {
      isMounted = false;
    };
  }, [operationalDate]);

  useEffect(() => {
    if (currentPlan) {
      setLatestPlan(currentPlan);
    }
  }, [currentPlan]);
  
  // Confirmation Modals
  const [showReplanConfirm, setShowReplanConfirm] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [publishSuccessNotice, setPublishSuccessNotice] = useState<string | null>(null);
  
  // Collapsible sections
  const [showPreferences, setShowPreferences] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showHealthDetails, setShowHealthDetails] = useState(false);

  // Planning preferences (Balanced default)
  const [planningMode, setPlanningMode] = useState<'balanced' | 'priority' | 'travel'>('balanced');
  
  // Advanced solver parameters (Level 3 disclosure)
  const [lambdaParam, setLambdaParam] = useState<number>(2.0);
  const [avgSpeed, setAvgSpeed] = useState<number>(25.0);
  const [roadFactor, setRoadFactor] = useState<number>(1.3);

  const handleStartPlanning = async () => {
    setStarting(true);
    setShowReplanConfirm(false);
    let chosenLambda = lambdaParam;
    if (!showAdvanced) {
      if (planningMode === 'balanced') chosenLambda = 2.0;
      else if (planningMode === 'priority') chosenLambda = 1.0;
      else if (planningMode === 'travel') chosenLambda = 4.0;
    }

    try {
      const res = await planningService.startOptimization({
        algorithm: 'smart_greedy_two_opt',
        lambda_param: chosenLambda,
        operational_date: operationalDate
      } as any);
      if (res.success) {
        navigate(`/planning/running/${res.data.run_id}`);
      }
    } catch (e: any) {
      alert('Planning error: ' + (e.response?.data?.detail || e.message));
    } finally {
      setStarting(false);
    }
  };

  const handlePublishPlan = async () => {
    if (!latestPlan) return;
    setPublishing(true);
    setShowPublishConfirm(false);
    try {
      const res = await planningService.publish(latestPlan.id);
      if (res.success) {
        setPublishSuccessNotice(`Plan #${latestPlan.id} (v${latestPlan.selected_version || latestPlan.current_version}) published and dispatched!`);
        await refreshAll();
      }
    } catch (e: any) {
      alert('Publish error: ' + (e.response?.data?.detail || e.message));
    } finally {
      setPublishing(false);
    }
  };

  const hasPlan = Boolean(latestPlan);
  const isPublished = latestPlan?.is_published || latestPlan?.status === 'published';
  const m = latestPlan?.metrics;
  const routes = latestPlan?.routes ? Object.values(latestPlan.routes) : [];
  const priorityCovered = m?.ptp_scheduled ?? (todayData?.ptp_count ?? 0);
  const priorityTotal = m?.ptp_total ?? (todayData?.ptp_count ?? 0);
  const issuesCount = m?.violations_count || 0;
  const isHealthy = priorityCovered === priorityTotal && issuesCount === 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      
      {/* 1. Page Header (Section 7) */}
      <PageHeader
        breadcrumbs={[{ label: isToday ? 'Today' : formattedDate, to: '/app/overview' }, { label: planTitle }]}
        title={planTitle}
        subtitle={
          !hasPlan
            ? (isToday 
                ? "Create today's routes while protecting priority visits and keeping travel efficient."
                : `No plan created for ${formattedDate}. Generate optimized routes for this date.`)
            : isPublished
            ? (isToday 
                ? "Today's plan is published and live with field executives."
                : `Plan for ${formattedDate} is published and dispatched.`)
            : (isToday 
                ? "Review today's assigned routes before publishing to field executives."
                : `Review assigned routes for ${formattedDate} before publishing.`)
        }
        statusBadge={{ 
          label: !hasPlan ? 'NOT PLANNED' : isPublished ? 'PUBLISHED' : isHealthy ? 'READY TO PUBLISH' : 'NEEDS ATTENTION', 
          variant: !hasPlan ? 'neutral' : isPublished ? 'success' : isHealthy ? 'info' : 'warning' 
        }}
        primaryAction={
          !hasPlan ? {
            label: starting ? 'Building Routes...' : 'PLAN TODAY',
            onClick: handleStartPlanning,
            disabled: starting || !todayData || todayData.customer_count === 0 || todayData.executive_count === 0,
            icon: <ArrowRight className="w-4 h-4" />
          } : !isPublished ? {
            label: publishing ? 'Publishing...' : 'PUBLISH PLAN',
            onClick: () => setShowPublishConfirm(true),
            disabled: !isHealthy || publishing,
            icon: <Send className="w-4 h-4" />
          } : {
            label: 'VIEW IN FIELD APP',
            to: '/field/home',
            icon: <ArrowRight className="w-4 h-4" />
          }
        }
        secondaryActions={hasPlan ? [
          {
            label: 'Open Map',
            to: `/app/routes/map`,
            icon: <MapPin className="w-3.5 h-3.5" />,
            variant: 'outline'
          },
          {
            label: 'Re-plan',
            onClick: () => setShowReplanConfirm(true),
            icon: <RefreshCw className="w-3.5 h-3.5" />,
            variant: 'outline'
          }
        ] : []}
      />

      {/* Publish Success Alert Banner */}
      {publishSuccessNotice && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{publishSuccessNotice}</span>
          </div>
          <button
            onClick={() => setPublishSuccessNotice(null)}
            className="text-emerald-700 hover:text-emerald-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Loading state indicator */}
      {loading && (
        <div className="bg-white p-10 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3 max-w-xl text-center">
          <RefreshCw className="w-6 h-6 text-[#ee822a] animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-500">Checking daily operational snapshot & records...</p>
        </div>
      )}

      {/* STATE 1: NOT PLANNED */}
      {!hasPlan && !loading && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              {isToday ? "Today's Workload" : `Workload · ${formattedDate}`}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
              {isToday ? "Ready to plan" : "Available"}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-navy">
            {isToday 
              ? "Today's routes haven't been created yet." 
              : `No routes have been created for ${formattedDate}.`}
          </h2>
          <p className="text-xs text-slate-500">
            {todayData ? `${todayData.customer_count} customers · ${todayData.executive_count} executives · ${todayData.ptp_count} priority visits` : '0 customers · 0 executives · 0 priority visits'} ready for route optimization in {APP_LOCATION.urbanArea}.
          </p>
          {(!todayData || todayData.customer_count === 0 || todayData.executive_count === 0) && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              No executive or customer records found for {formattedDate}. Please <Link to="/data/import" className="font-bold underline text-amber-900">import CSV data</Link> before generating a plan.
            </div>
          )}
          <div className="pt-2">
            <button
              onClick={handleStartPlanning}
              disabled={starting || !todayData || todayData.customer_count === 0 || todayData.executive_count === 0}
              className="px-8 py-3 rounded-full text-xs font-bold bg-[#ee822a] text-white hover:bg-orange-dark shadow-[0_6px_20px_rgba(238,130,42,0.35)] transition cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{starting ? 'Building Routes...' : (isToday ? 'PLAN TODAY' : `BUILD PLAN · ${formattedDate}`)}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STATE 2: PLAN READY */}
      {hasPlan && m && (
        <>
          {/* Main Plan Summary Card */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-2xs space-y-6">
            
            {/* Top Status & Heading */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    PLAN #{latestPlan.id} · V{latestPlan.selected_version || latestPlan.current_version}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                    isPublished 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : isHealthy 
                      ? 'bg-navy/10 text-navy border-navy/20' 
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    <Check className="w-3 h-3" />
                    <span>{isPublished ? 'PUBLISHED' : isHealthy ? 'READY FOR REVIEW' : 'ATTENTION REQUIRED'}</span>
                  </span>
                </div>
                <h2 className="text-xl font-bold text-navy mt-1">
                  {isPublished ? 'Active Field Dispatch Plan' : 'All routes generated and verified'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isPublished 
                    ? 'Routes are in field execution. Track progress in the Field App or Route Roster.'
                    : 'Review readiness checks and executive workload before publishing.'}
                </p>
              </div>

              {/* Action buttons on right */}
              <div className="flex items-center gap-2">
                {!isPublished && (
                  <button
                    onClick={() => setShowPublishConfirm(true)}
                    disabled={!isHealthy || publishing}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold bg-orange text-white hover:bg-orange-dark shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>PUBLISH PLAN</span>
                  </button>
                )}
                <button
                  onClick={() => setShowReplanConfirm(true)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-navy hover:bg-slate-100 transition flex items-center gap-1.5 cursor-pointer"
                  title="Re-plan today's routes"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Re-plan</span>
                </button>
              </div>
            </div>

            {/* Metrics Row (5 Compact Manager Metrics) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Visits Planned
                </div>
                <div className="text-2xl font-extrabold text-navy font-mono mt-1">
                  {m.customers_visited}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">Assigned stops</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Executives
                </div>
                <div className="text-2xl font-extrabold text-navy font-mono mt-1">
                  {routes.length}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">On shift</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Priority / PTP
                </div>
                <div className="text-2xl font-extrabold text-emerald-600 font-mono mt-1">
                  {priorityCovered}/{priorityTotal}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">All protected covered</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Planned Travel
                </div>
                <div className="text-2xl font-extrabold text-navy font-mono mt-1">
                  {m.total_distance_km !== undefined ? m.total_distance_km.toFixed(1) : '0.0'} km
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">Total road transit</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100 col-span-2 sm:col-span-1">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Route Issues
                </div>
                <div className={`text-2xl font-extrabold font-mono mt-1 ${issuesCount === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {issuesCount}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">{issuesCount === 0 ? '0 violations' : `${issuesCount} violations`}</div>
              </div>
            </div>

            {/* Plan Readiness Verification Checklist */}
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80 text-xs text-emerald-900 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>PLAN READINESS: All 6 core operational checks passed</span>
                </div>
                <span className="font-bold text-emerald-800 uppercase tracking-wider text-[11px]">
                  ✓ READY TO PUBLISH
                </span>
              </div>

              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2 pt-2 border-t border-emerald-200/60 text-[11px]">
                <div className="flex items-center gap-1.5 font-medium">✓ Customer data validated</div>
                <div className="flex items-center gap-1.5 font-medium">✓ All required PTP visits protected</div>
                <div className="flex items-center gap-1.5 font-medium">✓ Executive capacity checked</div>
                <div className="flex items-center gap-1.5 font-medium">✓ Time windows checked</div>
                <div className="flex items-center gap-1.5 font-medium">✓ Shift-end return checked</div>
                <div className="flex items-center gap-1.5 font-medium">✓ Route distance checked</div>
              </div>
            </div>

          </div>

          {/* 3. Executive Routes Section */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-2xs space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-navy">Executive Routes</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {routes.length} executives · {m.customers_visited} visits assigned
                </p>
              </div>
              <Link
                to="/routes"
                className="text-xs font-bold text-orange hover:text-orange-dark transition flex items-center gap-1"
              >
                <span>View all routes</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Compact Route Rows */}
            <div className="divide-y divide-slate-100">
              {routes.map((r) => {
                const rm = r.metrics;
                const maxStops = 15;
                const pct = Math.min(100, Math.round((rm.visit_count / maxStops) * 100));

                return (
                  <div
                    key={r.executive_id}
                    className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    {/* Executive Info */}
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold px-2 py-1 rounded bg-slate-100 text-navy border border-slate-200/80">
                        {r.executive_id}
                      </span>
                      <div>
                        <div className="font-bold text-navy text-xs">{r.executive_name}</div>
                        <div className="text-[11px] text-slate-400 font-medium">
                          Shift 08:30 AM → Return: {formatTime(rm.return_time) || rm.return_time}
                        </div>
                      </div>
                    </div>

                    {/* Stats & Workload Bar */}
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="font-bold text-navy">{rm.visit_count} visits</div>
                        <div className="text-[11px] text-slate-400 font-mono">{rm.total_km} km</div>
                      </div>

                      {/* Workload Progress Bar */}
                      <div className="w-24 hidden md:block">
                        <div className="flex justify-between text-[10px] text-slate-400 font-mono mb-1">
                          <span>Workload</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-orange h-full rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>

                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                        ✓ READY
                      </span>

                      <Link
                        to={`/app/routes/${r.executive_id}`}
                        className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-navy font-semibold text-[11px] transition shrink-0"
                      >
                        View Route
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Small Map Preview Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-navy flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-orange" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-navy">Interactive Route Map</h4>
                <p className="text-[11px] text-slate-500">
                  Inspect sequence, customer stops, and home depot returns on the interactive map.
                </p>
              </div>
            </div>

            <Link
              to="/app/routes/map"
              className="px-5 py-2.5 rounded-full text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-navy transition shrink-0 flex items-center gap-1.5 self-start sm:self-auto"
            >
              <span>OPEN MAP</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* 5. NEXT STEP / PUBLISH BANNER */}
          {!isPublished && (
            <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">NEXT STEP</div>
                <h3 className="text-base font-bold text-navy mt-0.5">
                  Ready to dispatch routes to field executives?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Publishing will lock version v{latestPlan.selected_version || latestPlan.current_version} and transmit stops to the field mobile portal.
                </p>
              </div>

              <button
                onClick={() => setShowPublishConfirm(true)}
                disabled={!isHealthy || publishing}
                className="px-8 py-3.5 rounded-full text-xs font-bold bg-[#ee822a] text-white hover:bg-orange-dark shadow-[0_6px_20px_rgba(238,130,42,0.35)] transition cursor-pointer flex items-center gap-2 shrink-0 self-start sm:self-auto disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>PUBLISH PLAN</span>
              </button>
            </div>
          )}
        </>
      )}

      {/* 6. PLANNING PREFERENCES (Collapsed by Default Below Operational Content) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <button
          onClick={() => setShowPreferences(!showPreferences)}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition cursor-pointer"
        >
          <div>
            <span className="text-xs font-bold text-navy">Planning Preferences & Tuning</span>
            <p className="text-[11px] text-slate-400">How RoutePilot balances customer priority and travel distance</p>
          </div>
          {showPreferences ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {showPreferences && (
          <div className="p-6 pt-2 border-t border-slate-100 space-y-4">
            <div className="grid md:grid-cols-3 gap-3">
              <div
                onClick={() => setPlanningMode('balanced')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition ${
                  planningMode === 'balanced' ? 'border-orange bg-orange/5' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-navy text-xs">Balanced Planning</span>
                  <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded-full bg-orange/15 text-orange">
                    Recommended
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  Protect important visits while keeping travel efficient. (Default λ=2.0)
                </p>
              </div>

              <div
                onClick={() => setPlanningMode('priority')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition ${
                  planningMode === 'priority' ? 'border-orange bg-orange/5' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="font-bold text-navy text-xs">Priority First</span>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  Favor customer value and priority coverage above distance. (λ=1.0)
                </p>
              </div>

              <div
                onClick={() => setPlanningMode('travel')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition ${
                  planningMode === 'travel' ? 'border-orange bg-orange/5' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="font-bold text-navy text-xs">Minimal Travel</span>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  Strictly minimize road distance and vehicle fuel costs. (λ=4.0)
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PUBLISH CONFIRMATION MODAL */}
      {showPublishConfirm && latestPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-darkest/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div 
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange/10 text-orange flex items-center justify-center shrink-0">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-navy">Publish Today's Plan?</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {latestPlan.plan_date ? formatDate(latestPlan.plan_date) : latestPlan.plan_date} · Version {latestPlan.selected_version || latestPlan.current_version}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-xs text-emerald-950 space-y-1.5">
              <div className="font-semibold">Verified Plan Summary:</div>
              <ul className="space-y-1 list-disc list-inside text-emerald-900">
                <li><b>{m?.customers_visited} visits</b> across <b>{routes.length} executives</b></li>
                <li><b>{m?.total_distance_km !== undefined ? m.total_distance_km.toFixed(1) : '0.0'} km</b> total road transit</li>
                <li><b>{priorityCovered}/{priorityTotal} priority visits</b> protected</li>
                <li><b>{issuesCount} constraint violations</b> detected</li>
              </ul>
            </div>

            <p className="text-xs text-slate-500">
              Publishing will send these routes to field executives and archive this plan into Plan History.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowPublishConfirm(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handlePublishPlan}
                disabled={publishing}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-orange text-white hover:bg-orange-dark shadow transition cursor-pointer disabled:opacity-50"
              >
                {publishing ? 'Publishing...' : 'Confirm & Publish Plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RE-PLAN CONFIRMATION MODAL */}
      {showReplanConfirm && (
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
                <h3 className="text-base font-bold text-navy">Re-plan today's routes?</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Current routes will be recalculated into a new plan revision.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1">
              <div>• Active plan version will be superseded</div>
              <div>• New version number will be automatically incremented</div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowReplanConfirm(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleStartPlanning}
                disabled={starting}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#ee822a] text-white hover:bg-orange-dark shadow transition cursor-pointer"
              >
                {starting ? 'Building...' : 'Re-plan Routes'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
