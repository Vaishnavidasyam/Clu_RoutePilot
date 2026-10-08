import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Users, Search, Plus, ArrowRight, CheckCircle2, 
  X, Clock, MapPin, AlertTriangle, ArrowUpDown, 
  ChevronRight, Bike, ShieldAlert, Edit2, AlertCircle,
  TrendingUp, Compass, Calendar, ChevronDown, Check,
  UserX, RefreshCw, ExternalLink
} from 'lucide-react';
import { executiveService, planningService, customerService } from '../services/api';
import { Executive, PlanDetail, RouteData, Customer } from '../types';
import { PageHeader } from '../components/PageHeader';
import { usePlan } from '../context/PlanContext';
import { useOperationalDate } from '../context/DateTimeContext';
import { APP_LOCATION } from '../config/locale';
import { formatTime, formatTimeRange, formatLocation } from '../utils/formatters';

export const ExecutivesPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentPlan } = usePlan();
  const { operationalDate } = useOperationalDate();
  const [executives, setExecutives] = useState<Executive[]>([]);
  const [latestPlan, setLatestPlan] = useState<PlanDetail | null>(currentPlan);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'READY' | 'ON_ROUTE' | 'COMPLETED' | 'ATTENTION' | 'UNAVAILABLE'>('ALL');
  const [sortBy, setSortBy] = useState<'default' | 'visits' | 'distance' | 'capacity' | 'priority' | 'id'>('default');

  // Drawer & Modal States
  const [selectedExec, setSelectedExec] = useState<Executive | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExec, setEditingExec] = useState<Executive | null>(null);
  const [unavailableImpact, setUnavailableImpact] = useState<{
    exec: Executive;
    affectedVisits: number;
    affectedPtp: number;
    affectedHighPriority: number;
    affectedKm: number;
  } | null>(null);

  // Add Executive Form State
  const [newExec, setNewExec] = useState<Executive>({
    id: '',
    name: '',
    home_lat: APP_LOCATION.defaultCenter.lat,
    home_lon: APP_LOCATION.defaultCenter.lng,
    shift_start: '08:30 AM',
    shift_end: '05:30 PM',
    max_visits: 15,
    max_km: 65,
    status: 'active'
  });
  const [formNotice, setFormNotice] = useState<string | null>(null);
  const [savingExec, setSavingExec] = useState(false);

  const loadData = async (targetDate?: string) => {
    setLoading(true);
    const dateToQuery = targetDate || operationalDate;
    try {
      const [execRes, plansRes, custRes] = await Promise.all([
        executiveService.list({ date: dateToQuery }),
        planningService.listPlans(dateToQuery).catch(() => ({ data: [] })),
        customerService.list({ date: dateToQuery }).catch(() => ({ data: [] }))
      ]);

      setExecutives(execRes.data || []);
      setCustomers(custRes.data || []);

      const plans = plansRes.data || [];
      if (plans.length > 0) {
        const sorted = [...plans].sort((a: any, b: any) => 
          new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        );
        const detailed: any = await planningService.getPlan(sorted[0].id).catch(() => null);
        if (detailed) {
          setLatestPlan(detailed.routes ? detailed : (detailed.data || null));
        }
      } else if (currentPlan) {
        setLatestPlan(currentPlan);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(operationalDate);
  }, [operationalDate]);

  // Helper map from executive ID to RouteData
  const routesByExec = useMemo(() => {
    const map = new Map<string, RouteData>();
    if (!latestPlan || !latestPlan.routes) return map;
    for (const r of Object.values(latestPlan.routes)) {
      map.set(r.executive_id, r);
    }
    return map;
  }, [latestPlan]);

  // Derive active / unavailable counts
  const activeExecs = useMemo(() => executives.filter(e => e.status === 'active'), [executives]);
  const unavailableExecs = useMemo(() => executives.filter(e => e.status === 'unavailable'), [executives]);

  // Overall Workforce Totals
  const totalAssignedVisits = useMemo(() => {
    if (!latestPlan || !latestPlan.routes) return 0;
    return Object.values(latestPlan.routes).reduce((sum, r) => sum + (r.metrics?.visit_count || r.timeline?.length || 0), 0);
  }, [latestPlan]);

  const totalPlannedKm = useMemo(() => {
    if (!latestPlan || !latestPlan.routes) return 0;
    const km = Object.values(latestPlan.routes).reduce((sum, r) => sum + (r.metrics?.total_km || 0), 0);
    return Math.round(km * 10) / 10;
  }, [latestPlan]);

  const totalPriorityVisits = useMemo(() => {
    if (!latestPlan || !latestPlan.routes) return 0;
    let count = 0;
    for (const r of Object.values(latestPlan.routes)) {
      if (r.timeline) {
        count += r.timeline.filter(s => s.ptp_today === 1).length;
      }
    }
    return count;
  }, [latestPlan]);

  // Check for capacity issues (> 100% visits or km)
  const overloadedExecs = useMemo(() => {
    return executives.filter(ex => {
      const route = routesByExec.get(ex.id);
      if (!route) return false;
      const visits = route.timeline?.length || 0;
      const km = route.metrics?.total_km || 0;
      return (visits > ex.max_visits) || (km > ex.max_km) || (!route.valid);
    });
  }, [executives, routesByExec]);

  // Workload balance difference
  const workloadSpread = useMemo(() => {
    if (!latestPlan || !latestPlan.routes) return null;
    const routeList = Object.values(latestPlan.routes);
    if (routeList.length < 2) return null;
    let minVisits = Infinity;
    let maxVisits = -Infinity;
    let maxExecName = '';
    let minExecName = '';

    for (const r of routeList) {
      const v = r.timeline?.length || 0;
      if (v > maxVisits) {
        maxVisits = v;
        maxExecName = r.executive_name || r.executive_id;
      }
      if (v < minVisits) {
        minVisits = v;
        minExecName = r.executive_name || r.executive_id;
      }
    }

    if (maxVisits - minVisits >= 7) {
      return {
        spread: maxVisits - minVisits,
        maxVisits,
        minVisits,
        maxExecName,
        minExecName
      };
    }
    return null;
  }, [latestPlan]);

  // Executive Operational Classification
  const getExecStatus = (ex: Executive) => {
    if (ex.status === 'unavailable') {
      return { label: '— UNAVAILABLE', color: 'bg-slate-100 text-slate-500 border-slate-200', type: 'UNAVAILABLE' };
    }
    const route = routesByExec.get(ex.id);
    if (route) {
      const visits = route.timeline?.length || 0;
      const km = route.metrics?.total_km || 0;
      if (visits > ex.max_visits || km > ex.max_km || !route.valid) {
        return { label: '⚠ NEEDS ATTENTION', color: 'bg-rose-50 text-rose-700 border-rose-200', type: 'ATTENTION' };
      }
    }
    return { label: '✓ READY', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', type: 'READY' };
  };

  // Executive capacity status helper
  const getCapacityStatus = (visits: number, maxVisits: number, km: number, maxKm: number) => {
    const vPct = maxVisits > 0 ? (visits / maxVisits) * 100 : 0;
    const kPct = maxKm > 0 ? (km / maxKm) * 100 : 0;
    const maxPct = Math.max(vPct, kPct);

    if (maxPct > 100) {
      return { label: '⚠ Over capacity', color: 'text-rose-600', badge: 'bg-rose-50 text-rose-700 border-rose-200', pct: Math.round(maxPct) };
    }
    if (maxPct >= 90) {
      return { label: 'Near capacity', color: 'text-amber-600', badge: 'bg-amber-50 text-amber-800 border-amber-200', pct: Math.round(maxPct) };
    }
    if (maxPct >= 70) {
      return { label: 'High workload', color: 'text-orange', badge: 'bg-orange/10 text-orange border-orange/30', pct: Math.round(maxPct) };
    }
    return { label: 'Comfortable', color: 'text-emerald-600', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', pct: Math.round(maxPct) };
  };

  // Filtering and Sorting
  const filteredAndSorted = useMemo(() => {
    let list = executives.filter(ex => {
      // Search
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matches = ex.id.toLowerCase().includes(q) || ex.name.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // Status Filter
      if (statusFilter !== 'ALL') {
        const st = getExecStatus(ex);
        if (statusFilter === 'READY' && st.type !== 'READY') return false;
        if (statusFilter === 'ATTENTION' && st.type !== 'ATTENTION') return false;
        if (statusFilter === 'UNAVAILABLE' && st.type !== 'UNAVAILABLE') return false;
      }

      return true;
    });

    // Sorting
    list = [...list].sort((a, b) => {
      const routeA = routesByExec.get(a.id);
      const routeB = routesByExec.get(b.id);
      const vA = routeA?.timeline?.length || 0;
      const vB = routeB?.timeline?.length || 0;
      const kmA = routeA?.metrics?.total_km || 0;
      const kmB = routeB?.metrics?.total_km || 0;

      if (sortBy === 'id') {
        return a.id.localeCompare(b.id);
      }
      if (sortBy === 'visits') {
        return vB - vA;
      }
      if (sortBy === 'distance') {
        return kmB - kmA;
      }
      if (sortBy === 'capacity') {
        const remA = Math.max(0, a.max_visits - vA);
        const remB = Math.max(0, b.max_visits - vB);
        return remB - remA; // Most remaining capacity first
      }
      if (sortBy === 'priority') {
        const ptpA = routeA?.timeline?.filter(s => s.ptp_today === 1).length || 0;
        const ptpB = routeB?.timeline?.filter(s => s.ptp_today === 1).length || 0;
        return ptpB - ptpA;
      }

      // Default Operational Relevance: Needs Attention first, then Near Capacity, then Active, then Unavailable
      const stA = getExecStatus(a);
      const stB = getExecStatus(b);
      const rank = (type: string) => {
        if (type === 'ATTENTION') return 4;
        if (type === 'READY') return 3;
        if (type === 'UNAVAILABLE') return 1;
        return 2;
      };
      if (rank(stA.type) !== rank(stB.type)) {
        return rank(stB.type) - rank(stA.type);
      }
      return vB - vA;
    });

    return list;
  }, [executives, searchTerm, statusFilter, sortBy, routesByExec]);

  // Save new executive
  const handleSaveExecutive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExec.id.trim() || !newExec.name.trim()) {
      setFormNotice('Executive ID and Full Name are required.');
      return;
    }
    setSavingExec(true);
    setFormNotice(null);
    try {
      await executiveService.create({
        ...newExec,
        id: newExec.id.trim(),
        name: newExec.name.trim(),
        max_visits: Number(newExec.max_visits),
        max_km: Number(newExec.max_km),
        home_lat: Number(newExec.home_lat),
        home_lon: Number(newExec.home_lon)
      });
      setShowAddModal(false);
      setNewExec({
        id: '',
        name: '',
        home_lat: APP_LOCATION.defaultCenter.lat,
        home_lon: APP_LOCATION.defaultCenter.lng,
        shift_start: '08:30 AM',
        shift_end: '05:30 PM',
        max_visits: 15,
        max_km: 65,
        status: 'active'
      });
      await loadData();
    } catch (err: any) {
      setFormNotice(err?.response?.data?.detail || 'Failed to save executive. Ensure ID is unique.');
    } finally {
      setSavingExec(false);
    }
  };

  // Update executive edit
  const handleUpdateExecutive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExec) return;
    setSavingExec(true);
    setFormNotice(null);
    try {
      await executiveService.update(editingExec.id, {
        ...editingExec,
        max_visits: Number(editingExec.max_visits),
        max_km: Number(editingExec.max_km),
        home_lat: Number(editingExec.home_lat),
        home_lon: Number(editingExec.home_lon)
      });
      setEditingExec(null);
      if (selectedExec?.id === editingExec.id) {
        setSelectedExec(editingExec);
      }
      await loadData();
    } catch (err: any) {
      setFormNotice(err?.response?.data?.detail || 'Failed to update executive.');
    } finally {
      setSavingExec(false);
    }
  };

  // Toggle availability with impact modal
  const handleToggleAvailability = async (ex: Executive) => {
    const route = routesByExec.get(ex.id);
    if (ex.status === 'active') {
      // Transitioning to UNAVAILABLE
      const assignedStops = route?.timeline || [];
      const ptpCount = assignedStops.filter(s => s.ptp_today === 1).length;
      const highPrioCount = assignedStops.filter(s => s.priority_score >= 70).length;
      const km = route?.metrics?.total_km || 0;

      if (assignedStops.length > 0) {
        // Show impact warning modal
        setUnavailableImpact({
          exec: ex,
          affectedVisits: assignedStops.length,
          affectedPtp: ptpCount,
          affectedHighPriority: highPrioCount,
          affectedKm: km
        });
        return;
      }
    }

    // Direct toggle if no active route or transitioning back to active
    const nextStatus = ex.status === 'active' ? 'unavailable' : 'active';
    try {
      await executiveService.update(ex.id, { ...ex, status: nextStatus });
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Confirm Mark Unavailable
  const confirmMarkUnavailable = async () => {
    if (!unavailableImpact) return;
    try {
      await executiveService.update(unavailableImpact.exec.id, {
        ...unavailableImpact.exec,
        status: 'unavailable'
      });
      const affected = unavailableImpact;
      setUnavailableImpact(null);
      await loadData();
      // Navigate to Exceptions page to re-plan with alert state
      navigate('/exceptions');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* 1. Page Header */}
      <PageHeader
        breadcrumbs={[{ label: 'Operations', to: '/app/overview' }, { label: 'Executives' }]}
        title="Field Executives"
        subtitle="Manage today's field team, capacity and route assignments."
        statusBadge={{ 
          label: `${activeExecs.length} ACTIVE`, 
          variant: activeExecs.length > 0 ? 'success' : 'neutral' 
        }}
        primaryAction={
          latestPlan ? {
            label: "VIEW TODAY'S ROUTES",
            to: '/app/routes',
            icon: <ArrowRight className="w-4 h-4" />
          } : {
            label: "PLAN TODAY",
            to: '/app/plan',
            icon: <ArrowRight className="w-4 h-4" />
          }
        }
        secondaryActions={[
          {
            label: '+ Add Executive',
            onClick: () => setShowAddModal(true),
            icon: <Plus className="w-3.5 h-3.5" />,
            variant: 'outline'
          }
        ]}
      />

      {/* 2. Team Capacity & Availability Metrics (Specific to Workforce Management) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Field Roster</div>
          <div className="text-2xl font-bold text-navy mt-1">
            {activeExecs.length} <span className="text-xs font-semibold text-emerald-600">ON DUTY</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">{unavailableExecs.length} scheduled off duty</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Team Capacity</div>
          <div className="text-2xl font-bold text-navy mt-1">
            {executives.reduce((acc, e) => acc + (e.status === 'active' ? e.max_visits : 0), 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Maximum visit slots today</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Shift Commitment</div>
          <div className="text-2xl font-bold text-navy mt-1 font-mono">08:30 – 17:30</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Standard 9.0h field shifts</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Capacity Health</div>
          <div className={`text-2xl font-bold mt-1 ${overloadedExecs.length > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {overloadedExecs.length === 0 ? '100% Balanced' : `${overloadedExecs.length} Overloaded`}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {overloadedExecs.length > 0 ? 'Capacity overrun alerts' : 'Within maximum km & stop limits'}
          </div>
        </div>
      </div>

      {/* 3. Workforce Status Banner */}
      {overloadedExecs.length > 0 ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-rose-900 font-semibold">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              ⚠ {overloadedExecs.length} executive{overloadedExecs.length > 1 ? 's are' : ' is'} over capacity or has route constraint violations
            </span>
          </div>
          <Link
            to="/app/routes"
            className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition shadow-2xs inline-flex items-center gap-1.5"
          >
            <span>REVIEW WORKLOAD</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-emerald-900 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              ✓ {activeExecs.length} executives available · {totalAssignedVisits} visits assigned · {totalPriorityVisits} priority visits covered · No capacity issues
            </span>
          </div>
          {latestPlan ? (
            <Link
              to="/app/routes"
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 underline underline-offset-2 flex items-center gap-1"
            >
              View Route Roster
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <Link
              to="/app/plan"
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 underline underline-offset-2 flex items-center gap-1"
            >
              Generate Today's Routes
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      )}

      {/* 4. Workload Balance Warning (if uneven) */}
      {workloadSpread && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <b>Team Balance Notice:</b> Workload is uneven ({workloadSpread.maxExecName}: {workloadSpread.maxVisits} visits vs. {workloadSpread.minExecName}: {workloadSpread.minVisits} visits).
            </span>
          </div>
          <Link
            to="/today/plan"
            className="text-xs font-bold text-amber-800 hover:text-amber-950 underline underline-offset-2 flex items-center gap-1"
          >
            Adjust Balance Settings
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* 5. Team Capacity Overview Comparison Strip */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Today's Team Capacity</h3>
            <p className="text-[11px] text-slate-400">Available capacity and distance balance across all active executives</p>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-500">
            {totalAssignedVisits} / {executives.reduce((sum, e) => sum + e.max_visits, 0)} total visits
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          {executives.map(ex => {
            const route = routesByExec.get(ex.id);
            const visits = route?.timeline?.length || 0;
            const km = Math.round((route?.metrics?.total_km || 0) * 10) / 10;
            const remaining = Math.max(0, ex.max_visits - visits);
            const vPct = Math.min(100, Math.round((visits / (ex.max_visits || 1)) * 100));

            return (
              <div 
                key={ex.id}
                onClick={() => setSelectedExec(ex)}
                className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition cursor-pointer text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-navy truncate max-w-[140px]">{ex.name}</div>
                  <span className="text-[11px] font-mono font-semibold text-slate-600">
                    {visits} / {ex.max_visits} ({remaining} left)
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${
                      vPct > 100 ? 'bg-rose-600' : vPct >= 90 ? 'bg-amber-500' : 'bg-orange'
                    }`}
                    style={{ width: `${Math.min(100, vPct)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Distance: {km} / {ex.max_km} km</span>
                  <span className="font-semibold text-slate-500">{vPct}% capacity</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Filter, Search & Sort Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex-1 min-w-[220px] max-w-sm relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search executive name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-navy"
          />
        </div>

        {/* Status quick filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-navy text-white shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            All ({executives.length})
          </button>
          <button
            onClick={() => setStatusFilter('READY')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              statusFilter === 'READY'
                ? 'bg-emerald-700 text-white shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            Ready ({activeExecs.length})
          </button>
          {overloadedExecs.length > 0 && (
            <button
              onClick={() => setStatusFilter('ATTENTION')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1 ${
                statusFilter === 'ATTENTION'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              Needs Attention ({overloadedExecs.length})
            </button>
          )}
          {unavailableExecs.length > 0 && (
            <button
              onClick={() => setStatusFilter('UNAVAILABLE')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                statusFilter === 'UNAVAILABLE'
                  ? 'bg-slate-600 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              Unavailable ({unavailableExecs.length})
            </button>
          )}
        </div>

        {/* Sort drop down */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-500">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-navy focus:outline-none"
          >
            <option value="default">Operational Relevance</option>
            <option value="visits">Visits (Highest first)</option>
            <option value="distance">Distance (Highest first)</option>
            <option value="capacity">Available Capacity (Most left)</option>
            <option value="priority">Priority Visits (Most first)</option>
            <option value="id">Executive ID (A-Z)</option>
          </select>
        </div>
      </div>

      {/* 7. Executive Cards Grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 animate-pulse space-y-4">
              <div className="flex justify-between items-center">
                <div className="h-4 bg-slate-200 rounded w-20"></div>
                <div className="h-4 bg-slate-200 rounded w-16"></div>
              </div>
              <div className="h-6 bg-slate-200 rounded w-36"></div>
              <div className="h-16 bg-slate-100 rounded-xl"></div>
              <div className="h-8 bg-slate-200 rounded-xl"></div>
            </div>
          ))}
        </div>
      ) : filteredAndSorted.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200/90 text-center space-y-3">
          <UserX className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-sm font-bold text-navy">No field executives found</h3>
          <p className="text-xs text-slate-500">Try adjusting your search query or status filter.</p>
          <button
            onClick={() => { setSearchTerm(''); setStatusFilter('ALL'); }}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-navy font-bold text-xs"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAndSorted.map((ex) => {
            const route = routesByExec.get(ex.id);
            const status = getExecStatus(ex);
            const visits = route?.timeline?.length || 0;
            const km = Math.round((route?.metrics?.total_km || 0) * 10) / 10;
            const remainingVisits = Math.max(0, ex.max_visits - visits);
            const remainingKm = Math.max(0, Math.round((ex.max_km - km) * 10) / 10);
            const cap = getCapacityStatus(visits, ex.max_visits, km, ex.max_km);
            const vPct = Math.round((visits / (ex.max_visits || 1)) * 100);
            
            // Priority counts
            const ptpStops = route?.timeline?.filter(s => s.ptp_today === 1).length || 0;
            const highPrioStops = route?.timeline?.filter(s => s.priority_score >= 70).length || 0;
            const routeEnd = route?.metrics?.return_time || (route?.timeline && route.timeline.length > 0 ? route.timeline[route.timeline.length - 1].departure_time : null);

            return (
              <div 
                key={ex.id}
                onClick={() => setSelectedExec(ex)}
                className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition flex flex-col justify-between space-y-4 cursor-pointer"
              >
                {/* Header: ID, Name, Status, Shift */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-orange px-2 py-0.5 rounded bg-orange/10">
                        {ex.id}
                      </span>
                      <h3 className="font-bold text-navy text-base mt-1">{ex.name}</h3>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Shift {formatTimeRange(ex.shift_start, ex.shift_end)}</span>
                      </div>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${status.color}`}>
                      {status.label}
                    </span>
                  </div>

                  {/* Workload & Separated Capacities */}
                  <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-bold text-navy">
                      <span>Today's Workload</span>
                      <span className={`text-[11px] font-semibold ${cap.color}`}>
                        {cap.label} ({cap.pct}%)
                      </span>
                    </div>

                    {/* Visits bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-600">
                        <span>Visits: <b>{visits} / {ex.max_visits}</b></span>
                        <span className="text-slate-400">{remainingVisits} remaining</span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            vPct > 100 ? 'bg-rose-600' : vPct >= 90 ? 'bg-amber-500' : 'bg-orange'
                          }`}
                          style={{ width: `${Math.min(100, vPct)}%` }}
                        />
                      </div>
                    </div>

                    {/* Distance indicator */}
                    <div className="flex justify-between text-[11px] text-slate-600 pt-0.5 border-t border-slate-200/50">
                      <span>Distance: <b>{km} / {ex.max_km} km</b></span>
                      <span className="text-slate-400">{remainingKm} km remaining</span>
                    </div>
                  </div>

                  {/* Priority Breakdown */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-xl bg-orange/5 border border-orange/15 text-navy">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-orange">PTP Today</div>
                      <div className="font-bold text-xs mt-0.5">{ptpStops} mandatory</div>
                    </div>
                    <div className="p-2 rounded-xl bg-amber-50/70 border border-amber-200/60 text-navy">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800">High Priority</div>
                      <div className="font-bold text-xs mt-0.5">{highPrioStops} accounts</div>
                    </div>
                  </div>

                  {/* Route Status Summary */}
                  <div className="flex items-center justify-between text-xs pt-1 px-1">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Compass className="w-3.5 h-3.5 text-slate-400" />
                      {routeEnd ? `Route ends ~ ${formatTime(routeEnd)}` : 'No active route'}
                    </span>
                    {route ? (
                      <span className="text-emerald-700 font-semibold text-[11px] flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" /> Route valid
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">Unscheduled</span>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleAvailability(ex);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      ex.status === 'active' 
                        ? 'text-slate-600 hover:text-rose-600 hover:bg-rose-50' 
                        : 'text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    {ex.status === 'active' ? 'Mark Unavailable' : 'Mark Available'}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <Link
                      to={`/executive/home?preview=${ex.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="px-2.5 py-1.5 rounded-xl border border-orange/30 bg-orange/10 hover:bg-orange hover:text-white text-orange font-bold text-xs transition inline-flex items-center gap-1"
                      title={`Preview field cockpit as ${ex.name}`}
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Preview</span>
                    </Link>
                    <Link
                      to={`/manager/routes/${ex.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-navy hover:text-white text-navy font-bold text-xs transition inline-flex items-center gap-1"
                    >
                      <span>ROUTE</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 8. Slide-Out Executive Details Drawer */}
      {selectedExec && (() => {
        const route = routesByExec.get(selectedExec.id);
        const status = getExecStatus(selectedExec);
        const visits = route?.timeline?.length || 0;
        const km = Math.round((route?.metrics?.total_km || 0) * 10) / 10;
        const remainingVisits = Math.max(0, selectedExec.max_visits - visits);
        const remainingKm = Math.max(0, Math.round((selectedExec.max_km - km) * 10) / 10);
        const ptpStops = route?.timeline?.filter(s => s.ptp_today === 1).length || 0;
        const highPrioStops = route?.timeline?.filter(s => s.priority_score >= 70).length || 0;
        const vPct = Math.round((visits / (selectedExec.max_visits || 1)) * 100);
        const kPct = Math.round((km / (selectedExec.max_km || 1)) * 100);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-navy-darkest/50 backdrop-blur-xs animate-in fade-in duration-150">
            <div 
              className="w-full max-w-md h-full bg-white shadow-2xl p-6 overflow-y-auto space-y-6 flex flex-col justify-between"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-5">
                {/* Drawer Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Workforce File</div>
                    <h2 className="text-lg font-bold text-navy mt-0.5">{selectedExec.name}</h2>
                  </div>
                  <button
                    onClick={() => setSelectedExec(null)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-navy hover:bg-slate-100 transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Identity Card */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-orange px-2 py-0.5 rounded bg-orange/10">
                      {selectedExec.id}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    Shift Window: <b className="text-navy">{selectedExec.shift_start} – {selectedExec.shift_end}</b>
                  </div>
                </div>

                {/* Workload & Remaining Capacity */}
                <div className="p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Today's Workload & Capacity</div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-slate-500">Visit Capacity</div>
                      <div className="font-bold text-navy text-sm mt-0.5">{visits} / {selectedExec.max_visits}</div>
                      <div className="text-[11px] text-emerald-700 font-semibold">{remainingVisits} visits remaining</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Distance Capacity</div>
                      <div className="font-bold text-navy text-sm mt-0.5">{km} / {selectedExec.max_km} km</div>
                      <div className="text-[11px] text-emerald-700 font-semibold">{remainingKm} km remaining</div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-3 text-[11px] text-slate-500">
                    <div>Visit Load: <b className="text-navy">{vPct}%</b></div>
                    <div>Distance Load: <b className="text-navy">{kPct}%</b></div>
                  </div>
                </div>

                {/* Assignment & Priority Breakdown */}
                <div className="space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Today's Assignment</div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Total Visits</span>
                      <span className="font-bold text-navy">{visits} stops</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Protected PTP Visits</span>
                      <span className="font-bold text-orange">{ptpStops} accounts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">High Priority Visits</span>
                      <span className="font-bold text-amber-700">{highPrioStops} accounts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Route Duration</span>
                      <span className="font-bold text-navy">{route?.metrics?.total_duration_minutes || 0} min</span>
                    </div>
                  </div>
                </div>

                {/* Stops List (Clickable to Customer File) */}
                {route && route.timeline && route.timeline.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Today's Stop Timeline</div>
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                      {route.timeline.map((stop) => (
                        <Link
                          key={stop.customer_id}
                          to={`/customers?search=${stop.customer_id}`}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/60 transition text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-navy text-white text-[10px] font-bold flex items-center justify-center">
                              {stop.seq}
                            </span>
                            <div>
                              <div className="font-bold text-navy">{stop.customer_name || stop.customer_id}</div>
                              <div className="text-[10px] text-slate-400 font-mono">Arr: {stop.arrival_time}</div>
                            </div>
                          </div>
                          {stop.ptp_today === 1 && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange/15 text-orange">PTP</span>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Technical / Operational Details */}
                <div className="space-y-2 text-xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Depot & Parameters</div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Depot GPS</span>
                    <a
                      href={`https://maps.google.com/?q=${selectedExec.home_lat},${selectedExec.home_lon}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-orange hover:underline text-[11px] flex items-center gap-1"
                    >
                      <MapPin className="w-3 h-3" />
                      {selectedExec.home_lat.toFixed(4)}, {selectedExec.home_lon.toFixed(4)}
                    </a>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Daily Visit Limit</span>
                    <span className="font-bold text-navy">{selectedExec.max_visits} visits/day</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Daily Distance Cap</span>
                    <span className="font-bold text-navy">{selectedExec.max_km} km/day</span>
                  </div>
                </div>
              </div>

              {/* Drawer Bottom Actions */}
              <div className="pt-4 border-t border-slate-100 space-y-2">
                {/* Prominent Preview Executive Workspace Action per Section 10 */}
                <Link
                  to={`/executive/home?preview=${selectedExec.id}`}
                  className="w-full py-2.5 rounded-xl bg-orange hover:bg-orange/90 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Preview Executive Workspace ({selectedExec.id})</span>
                </Link>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingExec(selectedExec);
                    }}
                    className="flex-1 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-navy font-bold text-xs transition inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Limits</span>
                  </button>

                  <Link
                    to={`/manager/routes/${selectedExec.id}`}
                    className="flex-1 py-2 rounded-xl bg-navy hover:bg-navy/90 text-white font-bold text-xs transition inline-flex items-center justify-center gap-1.5"
                  >
                    <span>View Route</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <button
                  onClick={() => setSelectedExec(null)}
                  className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 9. Impact Reassignment Modal (When marking active executive with visits unavailable) */}
      {unavailableImpact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-darkest/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-rose-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-navy">Mark Executive Unavailable?</h3>
                <p className="text-xs text-slate-500">Operational impact on today's route plan</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200/70 space-y-2.5 text-xs text-rose-950">
              <div className="font-semibold">
                {unavailableImpact.exec.name} ({unavailableImpact.exec.id}) currently has an active route:
              </div>
              <ul className="space-y-1.5 list-disc list-inside text-rose-900">
                <li><b>{unavailableImpact.affectedVisits} visits</b> need reassignment.</li>
                <li><b>{unavailableImpact.affectedPtp} protected PTP visits</b> affected.</li>
                <li><b>{unavailableImpact.affectedHighPriority} high priority visits</b> affected.</li>
                <li><b>{Math.round(unavailableImpact.affectedKm)} km</b> of scheduled route will be dropped.</li>
              </ul>
            </div>

            <p className="text-xs text-slate-600">
              Marking this executive unavailable will flag these stops in <b>Exceptions</b> so you can trigger an automatic re-plan across the remaining active team.
            </p>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setUnavailableImpact(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmMarkUnavailable}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition shadow-xs"
              >
                Confirm & Review Exceptions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. Add Executive Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-darkest/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-navy">Add Field Executive</h3>
                <p className="text-xs text-slate-500 mt-0.5">Register a new field agent to today's workforce</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-navy hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formNotice && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                {formNotice}
              </div>
            )}

            <form onSubmit={handleSaveExecutive} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Executive ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. E07"
                    value={newExec.id}
                    onChange={(e) => setNewExec({ ...newExec, id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-navy focus:outline-none focus:ring-1 focus:ring-navy font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Meera Reddy"
                    value={newExec.name}
                    onChange={(e) => setNewExec({ ...newExec, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Shift Start</label>
                  <input
                    type="text"
                    placeholder="08:30"
                    value={newExec.shift_start}
                    onChange={(e) => setNewExec({ ...newExec, shift_start: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Shift End</label>
                  <input
                    type="text"
                    placeholder="17:30"
                    value={newExec.shift_end}
                    onChange={(e) => setNewExec({ ...newExec, shift_end: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Daily Visits</label>
                  <input
                    type="number"
                    min="1"
                    max="40"
                    value={newExec.max_visits}
                    onChange={(e) => setNewExec({ ...newExec, max_visits: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Distance (km)</label>
                  <input
                    type="number"
                    min="10"
                    max="200"
                    value={newExec.max_km}
                    onChange={(e) => setNewExec({ ...newExec, max_km: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Home Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={newExec.home_lat}
                    onChange={(e) => setNewExec({ ...newExec, home_lat: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Home Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={newExec.home_lon}
                    onChange={(e) => setNewExec({ ...newExec, home_lon: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingExec}
                  className="px-5 py-2 rounded-xl bg-orange hover:bg-orange-dark text-white font-bold transition shadow-xs disabled:opacity-50"
                >
                  {savingExec ? 'Saving...' : 'Save Executive'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 11. Edit Executive Modal */}
      {editingExec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-darkest/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-navy">Edit Executive: {editingExec.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Update shift hours, visit limits, or home location</p>
              </div>
              <button
                onClick={() => setEditingExec(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-navy hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              ⚠ <b>Notice:</b> Changing capacity or shift hours for an active executive may affect today's route feasibility.
            </div>

            <form onSubmit={handleUpdateExecutive} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Shift Start</label>
                  <input
                    type="text"
                    value={editingExec.shift_start}
                    onChange={(e) => setEditingExec({ ...editingExec, shift_start: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Shift End</label>
                  <input
                    type="text"
                    value={editingExec.shift_end}
                    onChange={(e) => setEditingExec({ ...editingExec, shift_end: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Daily Visits</label>
                  <input
                    type="number"
                    min="1"
                    max="40"
                    value={editingExec.max_visits}
                    onChange={(e) => setEditingExec({ ...editingExec, max_visits: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Distance (km)</label>
                  <input
                    type="number"
                    min="10"
                    max="200"
                    value={editingExec.max_km}
                    onChange={(e) => setEditingExec({ ...editingExec, max_km: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingExec(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingExec}
                  className="px-5 py-2 rounded-xl bg-orange hover:bg-orange-dark text-white font-bold transition shadow-xs disabled:opacity-50"
                >
                  {savingExec ? 'Saving...' : 'Save & Review Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
