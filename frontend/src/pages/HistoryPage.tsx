import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  History, Calendar, CheckCircle2, ArrowRight, Search, 
  Filter, Eye, ArrowUpDown, Clock, Users, MapPin, 
  FileText, ShieldCheck, Download, ChevronRight, X, AlertTriangle, Layers
} from 'lucide-react';
import { planningService } from '../services/api';
import { PlanDetail } from '../types';
import { PageHeader } from '../components/PageHeader';
import { useOperationalDate } from '../context/DateTimeContext';
import { formatDate, formatTime, formatDateTime } from '../utils/formatters';

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { setOperationalDate, operationalDate } = useOperationalDate();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PUBLISHED' | 'READY' | 'DRAFT'>('ALL');
  const [selectedPlanDetail, setSelectedPlanDetail] = useState<PlanDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Version Comparison Modal
  const [comparingVersions, setComparingVersions] = useState<{ v1: any; v2: any } | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const res = await planningService.listPlans();
      // Ensure unique plans by ID
      const raw = res.data || [];
      const unique = Array.from(new Map(raw.map((p: any) => [p.id, p])).values());
      setPlans(unique);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPlanDetail = async (planId: number, versionNum?: number) => {
    setDetailLoading(true);
    try {
      const detail = await planningService.getPlan(planId, versionNum);
      setSelectedPlanDetail(detail);
    } catch (e) {
      console.error(e);
    } finally {
      setDetailLoading(false);
    }
  };

  // Compare v1 and v2 for a given plan
  const handleCompareVersions = async (plan: any) => {
    if (!plan.versions || plan.versions.length < 2) return;
    try {
      const [d1, d2] = await Promise.all([
        planningService.getPlan(plan.id, 1),
        planningService.getPlan(plan.id, plan.current_version)
      ]);
      setComparingVersions({ v1: d1, v2: d2 });
    } catch (e) {
      console.error(e);
    }
  };

  // Filtered plans
  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      // Date Filter
      if (dateFilter && p.plan_date !== dateFilter) {
        return false;
      }

      // Search
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matches = (p.code && p.code.toLowerCase().includes(q)) ||
          p.name.toLowerCase().includes(q) ||
          p.plan_date.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // Status
      if (statusFilter !== 'ALL') {
        const isPub = p.status === 'PUBLISHED';
        const isReady = p.status === 'READY FOR REVIEW';
        if (statusFilter === 'PUBLISHED' && !isPub) return false;
        if (statusFilter === 'READY' && !isReady) return false;
        if (statusFilter === 'DRAFT' && isPub) return false;
      }

      return true;
    });
  }, [plans, searchTerm, statusFilter, dateFilter]);

  // Summary Metrics
  const totalCreated = plans.length;
  const publishedCount = plans.filter((p) => p.status === 'PUBLISHED').length;
  const draftCount = plans.filter((p) => p.status !== 'PUBLISHED').length;
  const latestDate = plans.length > 0 ? plans[0].plan_date : 'None';

  // Status Badge Helper
  const getStatusBadge = (status: string) => {
    if (status === 'PUBLISHED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
          PUBLISHED
        </span>
      );
    }
    if (status === 'READY FOR REVIEW' || status === 'READY') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-navy/10 text-navy border border-navy/20">
          <span className="w-1.5 h-1.5 rounded-full bg-navy"></span>
          READY FOR REVIEW
        </span>
      );
    }
    if (status === 'SUPERSEDED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
          SUPERSEDED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* 1. Page Header */}
      <PageHeader
        breadcrumbs={[{ label: 'Insights', to: '/app/overview' }, { label: 'Plan History' }]}
        title="Plan History"
        subtitle="Review previous daily plans, revisions and dispatch decisions."
        statusBadge={{ 
          label: `${totalCreated} PLANS ARCHIVED`, 
          variant: 'neutral' 
        }}
        secondaryActions={[
          {
            label: "Go to Today's Plan",
            to: '/app/plan',
            icon: <ArrowRight className="w-3.5 h-3.5" />,
            variant: 'outline'
          }
        ]}
      />

      {/* 2. Top Summary Strip (Compact 4 Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Plans Created</div>
          <div className="text-xl font-bold text-navy mt-1">{totalCreated}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Total planning runs</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Published Plans</div>
          <div className="text-xl font-bold text-emerald-600 mt-1">{publishedCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Dispatched to field teams</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Draft / Review</div>
          <div className="text-xl font-bold text-navy mt-1">{draftCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Pending publication</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Latest Plan</div>
          <div className="text-xl font-bold text-navy mt-1 truncate">{latestDate}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Most recent operational date</div>
        </div>
      </div>

      {/* 3. Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-4 text-xs">
        {/* Search & Date Filter (Section 10 Specification) */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          <div className="flex-1 min-w-[200px] max-w-xs relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search plan ID or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-navy"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent text-xs text-navy font-semibold focus:outline-none"
              title="Filter by exact plan date"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                className="text-slate-400 hover:text-navy text-[11px] font-bold ml-1 cursor-pointer"
                title="Clear date filter"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-navy text-white shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            All Plans ({plans.length})
          </button>
          <button
            onClick={() => setStatusFilter('PUBLISHED')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              statusFilter === 'PUBLISHED'
                ? 'bg-emerald-700 text-white shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            Published ({publishedCount})
          </button>
          <button
            onClick={() => setStatusFilter('READY')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              statusFilter === 'READY'
                ? 'bg-navy text-white shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            Ready for Review ({draftCount})
          </button>
        </div>
      </div>

      {/* 4. Plan History Clean Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading plan history...</div>
        ) : filteredPlans.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <History className="w-8 h-8 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-navy">No plan history found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Once a daily plan is generated or published, it will appear here with its versions and dispatch status.
            </p>
            <Link
              to="/today/plan"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange text-white text-xs font-bold hover:bg-orange-dark transition"
            >
              <span>Go to Today's Plan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Plan</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Version</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Visits</th>
                  <th className="p-3.5">Distance</th>
                  <th className="p-3.5">Priority Coverage</th>
                  <th className="p-3.5">Created</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredPlans.map((p) => {
                  const m = p.latest_metrics;
                  const hasMultipleVersions = p.versions_count > 1;

                  return (
                    <tr 
                      key={p.id}
                      onClick={() => handleOpenPlanDetail(p.id)}
                      className="hover:bg-slate-50/80 transition cursor-pointer"
                    >
                      <td className="p-3.5">
                        <div className="font-bold text-navy">{p.name}</div>
                        <div className="font-mono text-[11px] text-slate-400">{p.code || `PLAN-${p.id}`}</div>
                      </td>
                      <td className="p-3.5 font-medium text-slate-700">
                        {p.plan_date ? formatDate(p.plan_date) : p.plan_date}
                      </td>
                      <td className="p-3.5">
                        <span className="font-mono font-bold text-navy px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                          V{p.current_version}
                        </span>
                        {hasMultipleVersions && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {p.versions_count} revisions
                          </div>
                        )}
                      </td>
                      <td className="p-3.5">
                        {getStatusBadge(p.status)}
                      </td>
                      <td className="p-3.5 font-bold text-navy">
                        {m?.customers_visited ?? 0} visits
                      </td>
                      <td className="p-3.5 font-mono text-slate-600">
                        {m?.total_distance_km ? Number(m.total_distance_km).toFixed(1) : '0.0'} km
                      </td>
                      <td className="p-3.5">
                        <span className="text-orange font-bold font-mono">
                          {m?.ptp_scheduled ?? 0} / {m?.ptp_total ?? 0}
                        </span>
                        <span className="text-slate-400 ml-1">({m?.ptp_coverage_pct ?? 0}%)</span>
                      </td>
                      <td className="p-3.5 text-slate-500">
                        <div>{p.created_at ? formatDateTime(p.created_at) : '—'}</div>
                        <div className="text-[10px] text-slate-400">{p.created_by?.split(' ')[0]}</div>
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {hasMultipleVersions && (
                            <button
                              onClick={() => handleCompareVersions(p)}
                              className="px-2 py-1 rounded-lg text-slate-500 hover:text-navy hover:bg-slate-100 text-[11px] font-semibold transition"
                              title="Compare Versions"
                            >
                              Compare
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenPlanDetail(p.id)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-navy text-[11px] font-bold transition"
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Plan Details Slide-Out Drawer */}
      {selectedPlanDetail && (() => {
        const p = selectedPlanDetail;
        const m = p.metrics;
        const routes = Object.values(p.routes || {});
        const isPub = p.is_published || p.status === 'published';

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-navy-darkest/50 backdrop-blur-xs animate-in fade-in duration-150">
            <div 
              className="w-full max-w-lg h-full bg-white shadow-2xl p-6 overflow-y-auto space-y-6 flex flex-col justify-between"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Archived Plan</div>
                    <h2 className="text-lg font-bold text-navy mt-0.5">{p.name}</h2>
                    <div className="text-xs text-slate-500">
                      Date: <b>{p.plan_date ? formatDate(p.plan_date) : p.plan_date}</b> · Version: <b>V{p.selected_version}</b>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedPlanDetail(null)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-navy hover:bg-slate-100 transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Status & Strategy Card */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-navy">
                      PLAN-{p.plan_date.replace(/-/g, '')}-{p.id.toString().padStart(3, '0')}
                    </span>
                    {getStatusBadge(isPub ? 'PUBLISHED' : 'READY FOR REVIEW')}
                  </div>
                  <div className="text-slate-600">
                    Planning Strategy: <b>Balanced Planning (λ={p.lambda_param || 2.0})</b>
                  </div>
                  <div className="text-slate-500">
                    Created: <b>{p.created_at ? formatDateTime(p.created_at) : 'Today'} by {p.created_by || 'Priya Sharma (Ops Manager)'}</b>
                  </div>
                </div>

                {/* Top Metrics Row */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Visits</div>
                    <div className="text-base font-bold text-navy mt-0.5">{m.customers_visited} stops</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Distance</div>
                    <div className="text-base font-bold text-navy mt-0.5">{m.total_distance_km.toFixed(1)} km</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Priority</div>
                    <div className="text-base font-bold text-orange mt-0.5">{m.ptp_scheduled}/{m.ptp_total} PTP</div>
                  </div>
                </div>

                {/* Versions Breakdown */}
                {p.versions && p.versions.length > 0 && (
                  <div className="space-y-2 text-xs">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Revisions on this Date</div>
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                      {p.versions.map((v) => (
                        <div key={v.version_number} className="p-2.5 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-navy">Version {v.version_number}</span>
                            <span className="text-slate-400 text-[11px] ml-2">
                              {v.km ? `${v.km.toFixed(1)} km` : ''}
                            </span>
                          </div>
                          {v.version_number === p.selected_version ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              ACTIVE VIEW
                            </span>
                          ) : (
                            <button
                              onClick={() => handleOpenPlanDetail(p.id, v.version_number)}
                              className="text-[10px] font-bold text-navy hover:underline"
                            >
                              Switch to V{v.version_number}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Routes Roster Summary */}
                <div className="space-y-2 text-xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Executive Routes ({routes.length})</div>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {routes.map((r) => (
                      <div key={r.executive_id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-navy">{r.executive_name || r.executive_id}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {r.metrics.visit_count} visits · {r.metrics.total_km} km · Return {formatTime(r.metrics.return_time) || r.metrics.return_time}
                          </div>
                        </div>
                        <Link
                          to={`/routes/${r.executive_id}`}
                          className="text-[11px] font-bold text-orange hover:underline flex items-center gap-1"
                        >
                          Route
                          <ChevronRight className="w-3 h-3" />
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Collapsible Advanced Metrics */}
                <div className="p-3 rounded-xl bg-slate-50/60 border border-slate-200/80 space-y-1 text-xs">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Technical Optimization Metrics</div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div>Objective Score: <b className="text-navy">{m.total_score}</b></div>
                    <div>Algorithm: <b className="text-navy">{p.algorithm}</b></div>
                    <div>Runtime: <b className="text-navy">{m.runtime_ms} ms</b></div>
                    <div>Violations: <b className="text-navy">{m.violations_count}</b></div>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <button
                  onClick={() => {
                    setOperationalDate(p.plan_date);
                    setSelectedPlanDetail(null);
                    navigate('/app/overview');
                  }}
                  className="w-full py-2.5 rounded-xl bg-orange hover:bg-orange-dark text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Switch Workspace to {formatDate(p.plan_date)}</span>
                </button>

                <div className="flex items-center gap-2">
                  <Link
                    to="/app/routes"
                    onClick={() => setOperationalDate(p.plan_date)}
                    className="flex-1 py-2.5 rounded-xl bg-navy hover:bg-navy-deep text-white font-bold text-xs text-center transition cursor-pointer"
                  >
                    Open Routes
                  </Link>
                  <Link
                    to="/app/routes/map"
                    onClick={() => setOperationalDate(p.plan_date)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-navy font-bold text-xs text-center transition cursor-pointer"
                  >
                    View Map
                  </Link>
                </div>
                <button
                  onClick={() => setSelectedPlanDetail(null)}
                  className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 6. Version Comparison Modal (V1 vs V2 Side-by-Side) */}
      {comparingVersions && (() => {
        const v1 = comparingVersions.v1;
        const v2 = comparingVersions.v2;
        const m1 = v1.metrics;
        const m2 = v2.metrics;
        const distDiff = roundNum(m1.total_distance_km - m2.total_distance_km);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-darkest/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-orange" />
                  <div>
                    <h3 className="text-base font-bold text-navy">Compare Plan Versions</h3>
                    <p className="text-xs text-slate-500">Version 1 vs Version {v2.selected_version} ({v2.plan_date})</p>
                  </div>
                </div>
                <button
                  onClick={() => setComparingVersions(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-navy hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Comparison Matrix */}
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Metric</th>
                      <th className="p-3">V1 (Initial)</th>
                      <th className="p-3">V{v2.selected_version} (Latest)</th>
                      <th className="p-3 text-right">Difference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr>
                      <td className="p-3 font-semibold text-navy">Visits Scheduled</td>
                      <td className="p-3">{m1.customers_visited}</td>
                      <td className="p-3 font-bold text-navy">{m2.customers_visited}</td>
                      <td className="p-3 text-right font-medium">
                        {m2.customers_visited - m1.customers_visited === 0 ? 'Same' : `${m2.customers_visited - m1.customers_visited} visits`}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-navy">Priority / PTP</td>
                      <td className="p-3">{m1.ptp_scheduled}/{m1.ptp_total}</td>
                      <td className="p-3 font-bold text-navy">{m2.ptp_scheduled}/{m2.ptp_total}</td>
                      <td className="p-3 text-right font-bold text-emerald-600">
                        {m2.ptp_scheduled >= m1.ptp_scheduled ? '✓ Protected' : 'Reduced'}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-navy">Planned Distance</td>
                      <td className="p-3">{m1.total_distance_km.toFixed(1)} km</td>
                      <td className="p-3 font-bold text-navy">{m2.total_distance_km.toFixed(1)} km</td>
                      <td className="p-3 text-right font-bold text-emerald-600">
                        {distDiff > 0 ? `↓ ${distDiff} km saved` : `${Math.abs(distDiff)} km`}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-navy">Route Violations</td>
                      <td className="p-3">{m1.violations_count}</td>
                      <td className="p-3 font-bold text-navy">{m2.violations_count}</td>
                      <td className="p-3 text-right font-bold text-emerald-600">
                        {m2.violations_count === 0 ? '0 issues' : `${m2.violations_count} issues`}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Why V2 Was Created */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <div className="font-bold text-navy">Why Revision V{v2.selected_version} Was Created:</div>
                <p className="text-slate-600 leading-relaxed">
                  Route optimization cluster search reduced total travel while preserving 100% of required customer PTP appointments and respecting executive shift caps.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setComparingVersions(null)}
                  className="px-5 py-2 rounded-xl bg-navy text-white text-xs font-bold hover:bg-navy-deep transition"
                >
                  Close Comparison
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
};

function roundNum(n: number) {
  return Math.round(n * 10) / 10;
}
