import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowRight, CheckCircle2, AlertTriangle, Users, 
  MapPin, CalendarCheck, Clock, ShieldCheck, ChevronRight
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { usePlan } from '../context/PlanContext';
import { useOperationalDate } from '../context/DateTimeContext';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentPlan, todayData, loading, refreshAll } = usePlan();
  const { 
    isToday, 
    isHistorical, 
    isFuture, 
    formattedDate, 
    dashboardTitle, 
    dateHeaderLabel,
    operationalDate 
  } = useOperationalDate();

  useEffect(() => {
    refreshAll(operationalDate);
  }, [operationalDate, refreshAll]);

  const latestPlan = currentPlan;
  const hasPlan = Boolean(latestPlan);
  const isPublished = Boolean(latestPlan?.is_published || latestPlan?.status === 'published');

  // Metrics from todayData and latestPlan
  const customersCount = todayData?.customer_count ?? todayData?.customers?.length ?? 0;
  const execCount = todayData?.executive_count ?? todayData?.executives?.length ?? 0;
  const priorityCount = todayData?.ptp_count ?? todayData?.customers?.filter(c => c.ptp_today === 1).length ?? 0;
  const hasData = customersCount > 0 && execCount > 0;

  // Plan metrics
  const m = latestPlan?.metrics;
  const plannedVisits = m?.customers_visited ?? 0;
  const plannedKm = m?.total_distance_km ? m.total_distance_km.toFixed(1) : '0.0';
  const ptpCovered = m?.ptp_scheduled ?? 0;
  const ptpTotal = m?.ptp_total ?? priorityCount;
  const routeIssues = m?.violations_count || 0;

  // Active executive routes
  const executiveRoutes = latestPlan?.routes ? Object.values(latestPlan.routes) : [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* 1. Universal Page Header - Dynamic operational date title (Section 5) */}
      <PageHeader
        title={dashboardTitle}
        subtitle={
          isToday
            ? "Daily field visit overview, plan authorization, and dispatch status for Hyderabad Urban Area."
            : isHistorical
            ? `Archived field operations, completed routes, and historical visit records for ${formattedDate}.`
            : `Planned operations and scheduled dispatch forecast for ${formattedDate}.`
        }
        statusBadge={{ 
          label: isToday 
            ? (!hasData ? 'NO DATA' : !hasPlan ? 'DATA READY' : isPublished ? 'PUBLISHED' : 'PLAN READY')
            : (hasPlan ? (isPublished ? 'COMPLETED' : 'ARCHIVED') : 'NO PLAN'), 
          variant: isPublished ? 'info' : hasPlan ? 'success' : !hasData ? 'neutral' : 'neutral' 
        }}
      />

      {/* 2. Key Operational Summary (4 Core Metric Strips) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#DDE7ED] shadow-2xs">
          <div className="text-[10px] uppercase font-bold tracking-wider text-[#71869A]">Customers</div>
          <div className="text-3xl font-extrabold text-[#12324A] font-mono mt-1.5">{customersCount}</div>
          <div className="text-xs text-[#71869A] mt-1">To visit today</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#DDE7ED] shadow-2xs">
          <div className="text-[10px] uppercase font-bold tracking-wider text-[#71869A]">Executives</div>
          <div className="text-3xl font-extrabold text-[#12324A] font-mono mt-1.5">{execCount}</div>
          <div className="text-xs text-[#71869A] mt-1">Available on shift</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#DDE7ED] shadow-2xs">
          <div className="text-[10px] uppercase font-bold tracking-wider text-[#71869A]">Priority</div>
          <div className="text-3xl font-extrabold text-[#FF7A18] font-mono mt-1.5">{priorityCount}</div>
          <div className="text-xs text-[#71869A] mt-1">PTP protected</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#DDE7ED] shadow-2xs">
          <div className="text-[10px] uppercase font-bold tracking-wider text-[#71869A]">Input Data</div>
          {hasData ? (
            <>
              <div className="text-2xl font-bold text-[#10A88A] mt-1.5 flex items-center gap-1.5">
                <CheckCircle2 className="w-6 h-6 shrink-0" />
                <span>Ready</span>
              </div>
              <div className="text-xs text-[#71869A] mt-1">All records validated</div>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold text-amber-600 mt-1.5 flex items-center gap-1.5">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <span>No Data</span>
              </div>
              <div className="text-xs text-[#71869A] mt-1">Import CSV to begin</div>
            </>
          )}
        </div>
      </div>

      {/* 3. Today's Plan Decision Card (Canonical focal point with single clear action) */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl border border-[#DDE7ED] shadow-2xs space-y-5">
        {!hasPlan ? (
          <div className="space-y-4 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#71869A]">
                {isToday ? "Today's Plan" : `Plan · ${formattedDate}`}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-[#71869A]">
                {!hasData ? "Awaiting Data" : isToday ? "Not created yet" : "No saved plan"}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-[#12324A]">
              {!hasData 
                ? "No operational data imported yet. Upload your executives and customers CSV to begin."
                : isToday 
                ? `Your data is ready. Create today's routes across ${execCount} executives.` 
                : `No optimization plan was generated for ${formattedDate}.`}
            </h2>
            <p className="text-xs text-[#71869A] leading-relaxed">
              {!hasData
                ? "Import Hyderabad field executive shifts and overdue customer accounts to optimize routes and protect PTP visits."
                : isToday 
                ? `Generate balanced, constraint-checked visit sequences protecting all ${priorityCount} priority accounts.`
                : `You can review completed plans in Plan History, or generate optimized routes for this operational date.`}
            </p>
            <div className="pt-1 flex items-center gap-3">
              {!hasData ? (
                <button
                  onClick={() => navigate('/manager/data/import')}
                  className="px-7 py-3 rounded-full text-xs font-bold bg-[#FF7A18] hover:bg-[#e06509] text-white shadow-sm transition flex items-center gap-2 cursor-pointer"
                >
                  <span>IMPORT DATA</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : isToday ? (
                <button
                  onClick={() => navigate('/manager/plan')}
                  className="px-7 py-3 rounded-full text-xs font-bold bg-[#FF7A18] hover:bg-[#e06509] text-white shadow-sm transition flex items-center gap-2 cursor-pointer"
                >
                  <span>PLAN TODAY</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => navigate('/manager/history')}
                  className="px-7 py-3 rounded-full text-xs font-bold bg-[#123A55] hover:bg-[#0D2536] text-white shadow-sm transition flex items-center gap-2 cursor-pointer"
                >
                  <span>EXPLORE PLAN HISTORY</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ) : !isPublished ? (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#71869A]">
                  {isToday ? "Today's Plan" : `Plan · ${formattedDate}`}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  Ready for review
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-[10px] uppercase font-bold text-[#71869A]">Planned Visits</div>
                <div className="text-xl font-extrabold text-[#12324A] mt-0.5">{plannedVisits}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-[10px] uppercase font-bold text-[#71869A]">Priority Coverage</div>
                <div className="text-xl font-extrabold text-[#10A88A] mt-0.5">{ptpCovered}/{ptpTotal}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-[10px] uppercase font-bold text-[#71869A]">Planned Travel</div>
                <div className="text-xl font-extrabold text-[#12324A] mt-0.5">{plannedKm} km</div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-[10px] uppercase font-bold text-[#71869A]">Route Issues</div>
                <div className="text-xl font-extrabold text-[#10A88A] mt-0.5">{routeIssues}</div>
              </div>
            </div>

            <div className="pt-1">
              <button
                onClick={() => navigate('/app/plan')}
                className="px-7 py-3 rounded-full text-xs font-bold bg-[#FF7A18] hover:bg-[#e06509] text-white shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{isToday ? "REVIEW TODAY'S PLAN" : `REVIEW PLAN · ${formattedDate}`}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#71869A]">
                {isToday ? "Today's Plan" : `Plan · ${formattedDate}`}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Published
              </span>
            </div>
            <h2 className="text-2xl font-bold text-[#12324A]">
              {isToday ? "Today's routes are live and dispatched." : `Routes for ${formattedDate} are published.`}
            </h2>
            <p className="text-xs text-[#71869A]">
              {execCount} executives · {plannedVisits} visits · {ptpCovered}/{ptpTotal} priority visits covered
            </p>
            <div className="pt-1">
              <button
                onClick={() => navigate('/field/home')}
                className="px-7 py-3 rounded-full text-xs font-bold bg-[#123A55] hover:bg-[#0D2536] text-white shadow transition flex items-center gap-2 cursor-pointer"
              >
                <span>MONITOR FIELD DISPATCH</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Workflow Stage Stepper (Interactive progression) */}
      <div className="bg-white p-5 rounded-2xl border border-[#DDE7ED] shadow-2xs">
        <div className="text-[10px] uppercase font-bold tracking-wider text-[#71869A] mb-3">
          {isToday ? "Today's Operational Workflow" : `Operational Workflow · ${formattedDate}`}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <Link 
            to="/app/data" 
            className="p-3 rounded-xl border bg-emerald-50/70 hover:bg-emerald-100/60 border-emerald-200 text-emerald-800 flex items-center gap-2.5 transition group"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <div className="font-bold flex items-center gap-1">
                1. CHECK
                <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
              </div>
              <div className="text-[10px] text-[#71869A] font-normal">Data validated</div>
            </div>
          </Link>

          <Link 
            to="/app/plan" 
            className={`p-3 rounded-xl border flex items-center gap-2.5 transition group ${hasPlan ? 'bg-emerald-50/70 hover:bg-emerald-100/60 border-emerald-200 text-emerald-800' : 'bg-orange-50 hover:bg-orange-100/60 border-orange-200 text-[#12324A] font-bold'}`}
          >
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${hasPlan ? 'bg-emerald-600 text-white' : 'bg-[#FF7A18] text-white'}`}>
              {hasPlan ? '✓' : '2'}
            </span>
            <div>
              <div className="font-bold flex items-center gap-1">
                2. PLAN
                <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
              </div>
              <div className="text-[10px] text-[#71869A] font-normal">Optimize routes</div>
            </div>
          </Link>

          <Link 
            to="/app/routes" 
            className={`p-3 rounded-xl border flex items-center gap-2.5 transition group ${isPublished ? 'bg-emerald-50/70 hover:bg-emerald-100/60 border-emerald-200 text-emerald-800' : hasPlan ? 'bg-orange-50 hover:bg-orange-100/60 border-orange-200 text-[#12324A] font-bold' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
          >
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${isPublished ? 'bg-emerald-600 text-white' : hasPlan ? 'bg-[#FF7A18] text-white' : 'bg-slate-200 text-slate-500'}`}>
              {isPublished ? '✓' : '3'}
            </span>
            <div>
              <div className="font-bold flex items-center gap-1">
                3. REVIEW
                <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
              </div>
              <div className="text-[10px] text-[#71869A] font-normal">Inspect stops</div>
            </div>
          </Link>

          <Link 
            to="/app/plan" 
            className={`p-3 rounded-xl border flex items-center gap-2.5 transition group ${isPublished ? 'bg-emerald-50/70 hover:bg-emerald-100/60 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
          >
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${isPublished ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
              {isPublished ? '✓' : '4'}
            </span>
            <div>
              <div className="font-bold flex items-center gap-1">
                4. PUBLISH
                <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
              </div>
              <div className="text-[10px] text-[#71869A] font-normal">Dispatch field</div>
            </div>
          </Link>
        </div>
      </div>

      {/* 5. Main Operational Area: Needs Attention (Exceptions) | Team Route Summary */}
      <div className="grid lg:grid-cols-12 gap-6">
        
        {/* Left: Needs Attention */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-[#DDE7ED] shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#12324A]">Needs Attention</h3>
              <Link 
                to="/app/exceptions" 
                className="text-xs font-bold text-[#FF7A18] hover:underline flex items-center gap-0.5"
              >
                <span>Exceptions</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-800 space-y-1">
              <div className="flex items-center gap-2 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Everything looks good</span>
              </div>
              <p className="text-[11px] text-emerald-700">
                0 route or priority exceptions require your attention today.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Team Route Summary */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-[#DDE7ED] shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#12324A]">Team Route Summary</h3>
              <Link 
                to="/app/routes" 
                className="text-xs font-bold text-[#12324A] hover:text-[#FF7A18] transition flex items-center gap-0.5"
              >
                <span>Full Roster</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-2.5">
              {executiveRoutes.slice(0, 3).map((r) => (
                <Link
                  key={r.executive_id}
                  to={`/app/routes/${r.executive_id}`}
                  className="p-3.5 rounded-xl bg-slate-50/80 hover:bg-slate-100/90 border border-slate-100 flex items-center justify-between text-xs transition group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-[#12324A] bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                      {r.executive_id}
                    </span>
                    <span className="font-semibold text-[#12324A] group-hover:text-[#FF7A18] transition">{r.executive_name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-[#71869A] font-mono text-[11px]">
                    <span>{r.metrics.visit_count} visits</span>
                    <span>{r.metrics.total_km} km</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#FF7A18] transition" />
                  </div>
                </Link>
              ))}
              {executiveRoutes.length === 0 && (
                <div className="p-4 text-center text-xs text-[#71869A]">
                  Roster ready. Generate plan to preview executive itineraries.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* 6. Route Preview Map Banner (Sole map navigation trigger) */}
      <div className="bg-white p-6 rounded-2xl border border-[#DDE7ED] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-[#12324A]">Interactive Route Map</h3>
          <p className="text-xs text-[#71869A] mt-0.5">
            Spatial geographic inspection of customer clusters, sequential stop itineraries, and depot returns.
          </p>
        </div>
        <Link
          to="/app/routes"
          className="px-6 py-2.5 rounded-full text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-[#12324A] transition self-start sm:self-auto flex items-center gap-1.5"
        >
          <MapPin className="w-3.5 h-3.5 text-[#FF7A18]" />
          <span>OPEN ROUTE MAP</span>
        </Link>
      </div>

    </div>
  );
};
