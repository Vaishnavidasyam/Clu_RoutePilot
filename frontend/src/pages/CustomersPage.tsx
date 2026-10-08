import React, { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Users, Search, Plus, ArrowRight, CheckCircle2, 
  X, Clock, MapPin, Upload, AlertTriangle, ArrowUpDown, 
  ChevronLeft, ChevronRight, UserCheck, ShieldAlert,
  ExternalLink, Calendar, Banknote, Navigation
} from 'lucide-react';
import { customerService, planningService, dataService } from '../services/api';
import { Customer, PlanDetail } from '../types';
import { PageHeader } from '../components/PageHeader';
import { usePlan } from '../context/PlanContext';
import { useOperationalDate } from '../context/DateTimeContext';
import { APP_LOCATION } from '../config/locale';
import { formatTime, formatTimeRange, formatLocation, formatCurrencyINR } from '../utils/formatters';

export const CustomersPage: React.FC = () => {
  const { currentPlan } = usePlan();
  const { operationalDate } = useOperationalDate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [latestPlan, setLatestPlan] = useState<PlanDetail | null>(currentPlan);
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [activeFocusFilter, setActiveFocusFilter] = useState<'ALL' | 'PTP' | 'HIGH' | 'CRITICAL' | 'SCHEDULED' | 'UNSCHEDULED' | 'ATTENTION'>('ALL');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'default' | 'priority' | 'overdue' | 'dpd' | 'window'>('default');
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Pagination (20 rows)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Manual Add Customer Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCust, setNewCust] = useState({
    id: '',
    name: '',
    area: 'Gachibowli',
    lat: APP_LOCATION.defaultCenter.lat,
    lon: APP_LOCATION.defaultCenter.lng,
    dpd: 30,
    overdue_amount: 15000,
    priority_score: 80,
    ptp_today: 1,
    window_start: '09:00 AM',
    window_end: '12:00 PM',
    service_min: 15
  });
  const [savingCust, setSavingCust] = useState(false);
  const [addNotice, setAddNotice] = useState<string | null>(null);

  const loadData = async (targetDate?: string) => {
    setLoading(true);
    const dateToQuery = targetDate || operationalDate;
    try {
      const [custRes, plansRes] = await Promise.all([
        customerService.list({ date: dateToQuery }),
        planningService.listPlans(dateToQuery).catch(() => ({ data: [] }))
      ]);
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

  useEffect(() => {
    if (currentPlan) setLatestPlan(currentPlan);
  }, [currentPlan]);

  // Build scheduled customer mapping from latest plan
  const scheduledMap = useMemo(() => {
    const map = new Map<string, { execId: string; execName: string; arrivalTime: string; seq: number }>();
    if (!latestPlan || !latestPlan.routes) return map;
    for (const r of Object.values(latestPlan.routes)) {
      if (!r.timeline) continue;
      for (const s of r.timeline) {
        map.set(s.customer_id, {
          execId: r.executive_id,
          execName: r.executive_name || r.executive_id,
          arrivalTime: s.arrival_time,
          seq: s.seq
        });
      }
    }
    return map;
  }, [latestPlan]);

  const skippedCustomerIds = useMemo(() => {
    if (!latestPlan || !latestPlan.skipped) return new Set<string>();
    return new Set(latestPlan.skipped.map((sc: any) => sc.customer_id));
  }, [latestPlan]);

  // Priority classification helpers
  const getPriorityBadge = (score: number) => {
    if (score >= 90) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
          CRITICAL {score}
        </span>
      );
    }
    if (score >= 70) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange/10 text-orange border border-orange/30">
          <span className="w-1.5 h-1.5 rounded-full bg-orange"></span>
          HIGH {score}
        </span>
      );
    }
    if (score >= 40) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          MEDIUM {score}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
        LOW {score}
      </span>
    );
  };

  // KPI Calculations
  const totalCount = customers.length;
  const ptpCount = customers.filter(c => c.ptp_today === 1).length;
  const highPriorityCount = customers.filter(c => c.priority_score >= 70).length;
  const criticalCount = customers.filter(c => c.priority_score >= 90).length;
  const scheduledCount = customers.filter(c => scheduledMap.has(c.id)).length;
  const skippedCount = customers.filter(c => skippedCustomerIds.has(c.id)).length;

  const areas = useMemo(() => {
    return Array.from(new Set(customers.map(c => c.area))).filter(Boolean);
  }, [customers]);

  // Filtering & Sorting
  const filteredAndSorted = useMemo(() => {
    let list = customers.filter(c => {
      // Area filter
      if (selectedArea !== 'all' && c.area !== selectedArea) return false;

      // Focus filter
      if (activeFocusFilter === 'PTP' && c.ptp_today !== 1) return false;
      if (activeFocusFilter === 'HIGH' && c.priority_score < 70) return false;
      if (activeFocusFilter === 'CRITICAL' && c.priority_score < 90) return false;
      if (activeFocusFilter === 'SCHEDULED' && !scheduledMap.has(c.id)) return false;
      if (activeFocusFilter === 'UNSCHEDULED' && scheduledMap.has(c.id)) return false;
      if (activeFocusFilter === 'ATTENTION' && !skippedCustomerIds.has(c.id)) return false;

      // Search term
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          c.id.toLowerCase().includes(term) ||
          (c.name && c.name.toLowerCase().includes(term)) ||
          c.area.toLowerCase().includes(term)
        );
      }
      return true;
    });

    // Sorting
    list = [...list].sort((a, b) => {
      if (sortBy === 'priority') {
        return b.priority_score - a.priority_score;
      }
      if (sortBy === 'overdue') {
        return b.overdue_amount - a.overdue_amount;
      }
      if (sortBy === 'dpd') {
        return b.dpd - a.dpd;
      }
      if (sortBy === 'window') {
        return a.window_start.localeCompare(b.window_start);
      }
      // Default: PTP Today first, then Priority descending
      if (a.ptp_today !== b.ptp_today) {
        return b.ptp_today - a.ptp_today;
      }
      return b.priority_score - a.priority_score;
    });

    return list;
  }, [customers, selectedArea, activeFocusFilter, searchTerm, sortBy, scheduledMap, skippedCustomerIds]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedArea, activeFocusFilter, searchTerm, sortBy]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / pageSize));
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSorted.slice(start, start + pageSize);
  }, [filteredAndSorted, currentPage, pageSize]);

  // Handle manual customer save
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCust.id.trim() || !newCust.name.trim()) {
      setAddNotice('Please provide a valid Customer ID and Name.');
      return;
    }
    setSavingCust(true);
    setAddNotice(null);
    try {
      await customerService.create({
        id: newCust.id.trim(),
        name: newCust.name.trim(),
        area: newCust.area,
        lat: Number(newCust.lat),
        lon: Number(newCust.lon),
        dpd: Number(newCust.dpd),
        overdue_amount: Number(newCust.overdue_amount),
        priority_score: Number(newCust.priority_score),
        ptp_today: Number(newCust.ptp_today),
        window_start: newCust.window_start,
        window_end: newCust.window_end,
        service_min: Number(newCust.service_min)
      });
      setShowAddModal(false);
      // Reset form
      setNewCust({
        id: '',
        name: '',
        area: 'Gachibowli',
        lat: APP_LOCATION.defaultCenter.lat,
        lon: APP_LOCATION.defaultCenter.lng,
        dpd: 30,
        overdue_amount: 15000,
        priority_score: 80,
        ptp_today: 1,
        window_start: '09:00 AM',
        window_end: '12:00 PM',
        service_min: 15
      });
      await loadData();
    } catch (err: any) {
      setAddNotice(err?.response?.data?.detail || 'Failed to add customer. Ensure ID is unique.');
    } finally {
      setSavingCust(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* 1. Standard Page Header */}
      <PageHeader
        breadcrumbs={[{ label: 'Operations', to: '/app/overview' }, { label: 'Customers' }]}
        title="Customer Portfolio"
        subtitle="Manage field accounts, priority scores, and promise-to-pay appointments for today's routing."
        statusBadge={{ 
          label: latestPlan ? 'PLAN ACTIVE' : 'DATA READY', 
          variant: latestPlan ? 'success' : 'info' 
        }}
        primaryAction={
          latestPlan ? {
            label: "VIEW TODAY'S PLAN",
            to: '/app/plan',
            icon: <ArrowRight className="w-4 h-4" />
          } : {
            label: "REVIEW TODAY'S DATA",
            to: '/app/data',
            icon: <ArrowRight className="w-4 h-4" />
          }
        }
        secondaryActions={[
          {
            label: '+ Add Customer',
            onClick: () => setShowAddModal(true),
            icon: <Plus className="w-3.5 h-3.5" />,
            variant: 'outline'
          },
          {
            label: 'Import CSV',
            to: '/app/data/import',
            icon: <Upload className="w-3.5 h-3.5" />,
            variant: 'outline'
          }
        ]}
      />

      {/* 2. Top Summary Strip (Manager Portfolio KPIs) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Customers</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-navy mt-1">{totalCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Across {areas.length} operational zones</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">PTP Today</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange/10 text-orange">PROTECTED</span>
          </div>
          <div className="text-2xl font-bold text-orange mt-1">{ptpCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Mandatory promise-to-pay visits</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">High Priority</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800">SCORE ≥ 70</span>
          </div>
          <div className="text-2xl font-bold text-navy mt-1">{highPriorityCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">{criticalCount} critical accounts (score ≥ 90)</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Routing Status</span>
            {latestPlan ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <Clock className="w-4 h-4 text-slate-400" />
            )}
          </div>
          <div className="text-2xl font-bold text-navy mt-1">
            {latestPlan ? `${scheduledCount} / ${totalCount}` : `${totalCount} Ready`}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {latestPlan ? `${skippedCount} unscheduled exceptions` : 'Pending plan generation'}
          </div>
        </div>
      </div>

      {/* 3. Today's Customer Status Strip */}
      <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-emerald-900 font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            {totalCount} customers ready for planning · {ptpCount} PTP · {highPriorityCount} High Priority · 0 data issues
          </span>
        </div>
        <div className="flex items-center gap-2">
          {latestPlan ? (
            <Link
              to="/app/plan"
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 underline underline-offset-2 flex items-center gap-1"
            >
              View Active Plan ({scheduledCount} scheduled)
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <Link
              to="/app/data"
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 underline underline-offset-2 flex items-center gap-1"
            >
              View Data Center & Validation
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* 4. Today's Focus Quick Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Focus:</span>
        <button
          onClick={() => setActiveFocusFilter('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeFocusFilter === 'ALL'
              ? 'bg-navy text-white shadow-2xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          All ({totalCount})
        </button>
        <button
          onClick={() => setActiveFocusFilter('PTP')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
            activeFocusFilter === 'PTP'
              ? 'bg-orange text-white shadow-2xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-orange"></span>
          PTP Today ({ptpCount})
        </button>
        <button
          onClick={() => setActiveFocusFilter('HIGH')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeFocusFilter === 'HIGH'
              ? 'bg-amber-600 text-white shadow-2xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          High Priority ({highPriorityCount})
        </button>
        {criticalCount > 0 && (
          <button
            onClick={() => setActiveFocusFilter('CRITICAL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeFocusFilter === 'CRITICAL'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            Critical ({criticalCount})
          </button>
        )}
        {latestPlan && (
          <>
            <button
              onClick={() => setActiveFocusFilter('SCHEDULED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeFocusFilter === 'SCHEDULED'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              Scheduled ({scheduledCount})
            </button>
            <button
              onClick={() => setActiveFocusFilter('ATTENTION')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeFocusFilter === 'ATTENTION'
                  ? 'bg-rose-700 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              {skippedCount > 0 && <span className="w-2 h-2 rounded-full bg-rose-500"></span>}
              Needs Attention ({skippedCount})
            </button>
          </>
        )}
      </div>

      {/* 5. Filter & Search Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex-1 min-w-[240px] max-w-sm relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, account ID, area..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-navy"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-500">Zone:</span>
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-navy focus:outline-none"
            >
              <option value="all">All Zones ({areas.length})</option>
              {areas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-500">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-navy focus:outline-none"
            >
              <option value="default">PTP First + Priority</option>
              <option value="priority">Priority (Highest first)</option>
              <option value="overdue">Overdue Amount (Highest first)</option>
              <option value="dpd">DPD (Highest first)</option>
              <option value="window">Visit Window (Earliest)</option>
            </select>
          </div>

          <div className="text-slate-400 font-medium ml-2">
            Showing <b className="text-navy">{filteredAndSorted.length}</b> matches
          </div>
        </div>
      </div>

      {/* 6. Clean Customer Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5">Area</th>
                <th className="p-3.5">Priority</th>
                <th className="p-3.5">PTP</th>
                <th className="p-3.5">Visit Window</th>
                <th className="p-3.5">Plan Status</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Loading customer portfolio...
                  </td>
                </tr>
              ) : paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <div className="text-sm font-semibold text-navy">No customers match this filter</div>
                    <div className="text-xs text-slate-400 mt-1">Try resetting the focus pills or search term</div>
                    <button
                      onClick={() => {
                        setActiveFocusFilter('ALL');
                        setSelectedArea('all');
                        setSearchTerm('');
                      }}
                      className="mt-3 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-navy"
                    >
                      Clear Filters
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((c) => {
                  const scheduleInfo = scheduledMap.get(c.id);
                  const isSkipped = skippedCustomerIds.has(c.id);

                  return (
                    <tr 
                      key={c.id} 
                      onClick={() => setSelectedCustomer(c)}
                      className="hover:bg-slate-50/80 transition cursor-pointer"
                    >
                      <td className="p-3.5">
                        <div className="font-bold text-navy">{c.name || `Account ${c.id}`}</div>
                        <div className="font-mono text-[11px] text-slate-400">{c.id}</div>
                      </td>
                      <td className="p-3.5 text-slate-600 font-medium">
                        {formatLocation(c.area)}
                      </td>
                      <td className="p-3.5">
                        {getPriorityBadge(c.priority_score)}
                      </td>
                      <td className="p-3.5">
                        {c.ptp_today === 1 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange/15 text-orange border border-orange/30">
                            PTP TODAY
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Regular</span>
                        )}
                      </td>
                      <td className="p-3.5 font-mono text-slate-600">
                        {formatTimeRange(c.window_start, c.window_end)}
                      </td>
                      <td className="p-3.5">
                        {scheduleInfo ? (
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              SCHEDULED
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">
                              ({scheduleInfo.execName || scheduleInfo.execId} · {formatTime(scheduleInfo.arrivalTime)})
                            </span>
                          </div>
                        ) : isSkipped ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            UNSCHEDULED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                            READY
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCustomer(c);
                          }}
                          className="px-2.5 py-1 rounded-lg text-slate-500 hover:text-navy hover:bg-slate-100 text-[11px] font-semibold transition"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div className="text-center sm:text-left">
              Showing <b className="text-navy">{(currentPage - 1) * pageSize + 1}</b> to <b className="text-navy">{Math.min(currentPage * pageSize, filteredAndSorted.length)}</b> of <b className="text-navy">{filteredAndSorted.length}</b> accounts
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4 text-navy" />
              </button>
              <span className="px-2 font-bold text-navy">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-4 h-4 text-navy" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 7. Customer Details Drawer */}
      {selectedCustomer && (() => {
        const scheduleInfo = scheduledMap.get(selectedCustomer.id);
        const isSkipped = skippedCustomerIds.has(selectedCustomer.id);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-navy-darkest/50 backdrop-blur-xs animate-in fade-in duration-150">
            <div 
              className="w-full max-w-md h-full bg-white shadow-2xl p-6 overflow-y-auto space-y-6 flex flex-col justify-between"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Account File</div>
                    <h2 className="text-lg font-bold text-navy mt-0.5">Customer Details</h2>
                  </div>
                  <button
                    onClick={() => setSelectedCustomer(null)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-navy hover:bg-slate-100 transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Identity banner */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-orange px-2 py-0.5 rounded bg-orange/10">
                      {selectedCustomer.id}
                    </span>
                    {getPriorityBadge(selectedCustomer.priority_score)}
                  </div>
                  <div className="text-base font-bold text-navy mt-1">
                    {selectedCustomer.name || `Account ${selectedCustomer.id}`}
                  </div>
                  <div className="text-xs text-slate-500">
                    Zone: <b className="text-navy">{formatLocation(selectedCustomer.area)}</b>
                  </div>
                </div>

                {/* Today's Schedule Card */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Today's Schedule Status</div>
                  {scheduleInfo ? (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          SCHEDULED · STOP #{scheduleInfo.seq}
                        </span>
                        <span className="font-mono text-xs font-bold text-navy">
                          Arrival ~ {formatTime(scheduleInfo.arrivalTime)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600">
                        Assigned Executive: <b className="text-navy">{scheduleInfo.execName || scheduleInfo.execId}</b>
                      </div>
                      <Link
                        to={`/routes/${scheduleInfo.execId}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-orange hover:underline pt-1"
                      >
                        View in Executive Route
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  ) : isSkipped ? (
                    <div className="space-y-2 pt-1">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        NOT IN TODAY'S PLAN
                      </span>
                      <p className="text-xs text-rose-800">
                        This customer was unassigned due to shift capacity or time window tightness.
                      </p>
                      <Link
                        to="/exceptions"
                        className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 hover:underline pt-1"
                      >
                        View in Exceptions Page
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 pt-1">
                      Ready for next optimization run. No active assignment yet.
                    </div>
                  )}
                </div>

                {/* Financial & Operational Attributes */}
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">PTP Today</span>
                    <span className={`font-bold ${selectedCustomer.ptp_today === 1 ? 'text-orange' : 'text-slate-700'}`}>
                      {selectedCustomer.ptp_today === 1 ? 'Yes (Mandatory)' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Days Past Due (DPD)</span>
                    <span className="font-bold text-navy">{selectedCustomer.dpd} days</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Overdue Amount</span>
                    <span className="font-bold text-navy font-mono">{formatCurrencyINR(selectedCustomer.overdue_amount)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Visit Window</span>
                    <span className="font-bold text-navy font-mono">{formatTimeRange(selectedCustomer.window_start, selectedCustomer.window_end)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Service Time</span>
                    <span className="font-bold text-navy">{selectedCustomer.service_min} min</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100 items-center">
                    <span className="text-slate-500">GPS Coordinates</span>
                    <a
                      href={`https://maps.google.com/?q=${selectedCustomer.lat},${selectedCustomer.lon}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-orange hover:underline text-[11px] flex items-center gap-1"
                    >
                      <MapPin className="w-3 h-3" />
                      {selectedCustomer.lat.toFixed(4)}, {selectedCustomer.lon.toFixed(4)}
                    </a>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-navy font-bold text-xs transition cursor-pointer"
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 8. Manual Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-darkest/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-navy">Add Field Customer</h3>
                <p className="text-xs text-slate-500 mt-0.5">Manually add an account to today's customer portfolio</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-navy hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {addNotice && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                {addNotice}
              </div>
            )}

            <form onSubmit={handleSaveCustomer} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Customer ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CUST_099"
                    value={newCust.id}
                    onChange={(e) => setNewCust({ ...newCust, id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rajiv Menon"
                    value={newCust.name}
                    onChange={(e) => setNewCust({ ...newCust, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Area / Zone</label>
                  <input
                    type="text"
                    value={newCust.area}
                    onChange={(e) => setNewCust({ ...newCust, area: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Priority Score (1-100)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={newCust.priority_score}
                    onChange={(e) => setNewCust({ ...newCust, priority_score: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Overdue Amount (₹)</label>
                  <input
                    type="number"
                    value={newCust.overdue_amount}
                    onChange={(e) => setNewCust({ ...newCust, overdue_amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Days Past Due (DPD)</label>
                  <input
                    type="number"
                    value={newCust.dpd}
                    onChange={(e) => setNewCust({ ...newCust, dpd: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Window Start</label>
                  <input
                    type="text"
                    placeholder="09:00"
                    value={newCust.window_start}
                    onChange={(e) => setNewCust({ ...newCust, window_start: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Window End</label>
                  <input
                    type="text"
                    placeholder="13:00"
                    value={newCust.window_end}
                    onChange={(e) => setNewCust({ ...newCust, window_end: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Service Min</label>
                  <input
                    type="number"
                    value={newCust.service_min}
                    onChange={(e) => setNewCust({ ...newCust, service_min: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={newCust.lat}
                    onChange={(e) => setNewCust({ ...newCust, lat: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={newCust.lon}
                    onChange={(e) => setNewCust({ ...newCust, lon: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700 pt-2">
                  <input
                    type="checkbox"
                    checked={newCust.ptp_today === 1}
                    onChange={(e) => setNewCust({ ...newCust, ptp_today: e.target.checked ? 1 : 0 })}
                    className="rounded border-slate-300 text-orange focus:ring-orange w-4 h-4"
                  />
                  <span>Mark as Promise-to-Pay (PTP) Today (Protected visit)</span>
                </label>
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
                  disabled={savingCust}
                  className="px-5 py-2 rounded-xl bg-orange hover:bg-orange-dark text-white font-bold transition shadow-xs disabled:opacity-50"
                >
                  {savingCust ? 'Saving...' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
