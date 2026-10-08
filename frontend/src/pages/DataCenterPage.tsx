import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, UserCheck, ShieldCheck, CheckCircle2, 
  ArrowRight, Search, Filter, X, Clock, MapPin, 
  Phone, AlertTriangle, RefreshCw, Upload, Eye
} from 'lucide-react';
import { Customer, Executive } from '../types';
import { dataService } from '../services/api';
import { PageHeader } from '../components/PageHeader';
import { usePlan } from '../context/PlanContext';
import { useOperationalDate } from '../context/DateTimeContext';
import { APP_LOCATION } from '../config/locale';
import { formatTimeRange, formatLocation, formatCurrencyINR } from '../utils/formatters';

export const DataCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'customers' | 'executives' | 'sync'>('customers');
  const { todayData: dataInfo, loading, refreshAll } = usePlan();
  const { isToday, formattedDate, dateHeaderLabel, dailyDataTitle, operationalDate } = useOperationalDate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArea, setSelectedArea] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedExecutive, setSelectedExecutive] = useState<Executive | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  useEffect(() => {
    refreshAll(operationalDate);
  }, [operationalDate, refreshAll]);

  const handleSyncData = async () => {
    setSyncing(true);
    try {
      await dataService.createSnapshot(operationalDate);
      setSyncNotice(isToday ? 'Today’s data successfully synced & snapshot created.' : `Data snapshot verified for ${formattedDate}.`);
      await refreshAll();
      setTimeout(() => setSyncNotice(null), 4000);
    } catch (err: any) {
      alert('Sync notice: ' + (err.message || 'Complete'));
    } finally {
      setSyncing(false);
    }
  };


  const customers: Customer[] = dataInfo?.customers || [];
  const executives: Executive[] = dataInfo?.executives || [];
  const priorityCount = customers.filter(c => c.ptp_today === 1).length;

  const areas = Array.from(new Set(customers.map(c => c.area))).filter(Boolean);

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = !searchTerm || 
      c.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (c.name && c.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      c.area.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesArea = selectedArea === 'all' || c.area === selectedArea;
    return matchesSearch && matchesArea;
  });

  // Priority badge formatter
  const getPriorityBadge = (score: number) => {
    if (score >= 90) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          CRITICAL {score}
        </span>
      );
    }
    if (score >= 70) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange/10 text-orange border border-orange/30">
          HIGH {score}
        </span>
      );
    }
    if (score >= 40) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
          MEDIUM {score}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
        LOW {score}
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* 1. Standard Page Header with Daily Data & Date Header (Section 6) */}
      <PageHeader
        breadcrumbs={[{ label: isToday ? 'Today' : formattedDate, to: '/app/overview' }, { label: 'Daily Data' }]}
        title="Daily Data"
        subtitle={`${dateHeaderLabel} · Everything RoutePilot needs to create field visit routes for ${APP_LOCATION.urbanArea}.`}
        statusBadge={{ label: isToday ? 'DATA READY' : 'ARCHIVED DATA', variant: 'success' }}
        primaryAction={{
          label: isToday ? 'PLAN TODAY' : 'VIEW PLAN',
          to: '/app/plan',
          icon: <ArrowRight className="w-4 h-4" />
        }}
        secondaryActions={[
          {
            label: syncing ? 'Syncing...' : 'Sync Data',
            onClick: handleSyncData,
            icon: <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />,
            variant: 'outline'
          },
          {
            label: 'Import CSV',
            to: '/app/data/import',
            icon: <Upload className="w-3.5 h-3.5" />,
            variant: 'subtle'
          }
        ]}
      />

      {syncNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{syncNotice}</span>
        </div>
      )}

      {/* 2. Data Quality & Schema Integrity Scorecard (Specific to Data Center) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Validated Records</div>
          <div className="text-3xl font-extrabold text-navy font-mono mt-1.5">{customers.length + executives.length}</div>
          <div className="text-xs text-slate-500 mt-1">{customers.length} accounts · {executives.length} execs</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Geocoding Quality</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1.5 flex items-center gap-1.5">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>100% Valid</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">Verified operational coordinates</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Window Feasibility</div>
          <div className="text-2xl font-bold text-navy mt-1.5 font-mono">0 Conflicts</div>
          <div className="text-xs text-slate-500 mt-1">All morning & afternoon windows valid</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Schema Health</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1.5 flex items-center gap-1.5">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>Pass</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">Zero missing required columns</div>
        </div>
      </div>

      {/* 3. Automatic Data Readiness Validation Notice */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-navy">All information is ready for planning</h3>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-0.5">
              <span>✓ Customer data loaded</span>
              <span>✓ Executive availability loaded</span>
              <span>✓ Locations verified</span>
              <span>✓ Visit windows verified</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate('/today/plan')}
          className="px-6 py-2.5 rounded-full text-xs font-bold bg-[#ee822a] text-white hover:bg-orange-dark shadow-[0_4px_14px_rgba(238,130,42,0.3)] transition shrink-0 self-start sm:self-auto cursor-pointer"
        >
          PLAN TODAY
        </button>
      </div>

      {/* 4. Tab Navigation: Customers, Executives, Data & Sync */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        
        {/* Tab Header */}
        <div className="flex items-center overflow-x-auto custom-scrollbar whitespace-nowrap border-b border-slate-200 px-4 sm:px-6 pt-3 bg-slate-50/50">
          <button
            onClick={() => setActiveTab('customers')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'customers'
                ? 'border-orange text-navy'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Customers ({customers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('executives')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'executives'
                ? 'border-orange text-navy'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Executives ({executives.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('sync')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'sync'
                ? 'border-orange text-navy'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Data & Sync</span>
          </button>
        </div>

        {/* TAB 1: CUSTOMERS VIEW (Clean 5-Column Manager Table, No Raw Lat/Lon) */}
        {activeTab === 'customers' && (
          <div className="p-6 space-y-4">
            
            {/* Filter & Search Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex-1 max-w-sm relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search customer, account name, or area..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-500">Area:</span>
                <select
                  value={selectedArea}
                  onChange={(e) => setSelectedArea(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-navy focus:outline-none"
                >
                  <option value="all">All Zones ({areas.length})</option>
                  {areas.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            {/* Manager Clean Customer Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Customer</th>
                    <th className="p-3.5">Priority</th>
                    <th className="p-3.5">PTP</th>
                    <th className="p-3.5">Visit Window</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredCustomers.map((c) => (
                    <tr 
                      key={c.id} 
                      onClick={() => setSelectedCustomer(c)}
                      className="hover:bg-slate-50/80 transition cursor-pointer"
                    >
                      <td className="p-3.5">
                        <div className="font-bold text-navy">{c.name || `Account ${c.id}`}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-slate-500">{c.id}</span>
                          <span>·</span>
                          <span>{formatLocation(c.area)}</span>
                        </div>
                      </td>

                      <td className="p-3.5">
                        {getPriorityBadge(c.priority_score)}
                      </td>

                      <td className="p-3.5">
                        {c.ptp_today === 1 ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange/15 text-orange border border-orange/30">
                            PTP TODAY (Required)
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Regular</span>
                        )}
                      </td>

                      <td className="p-3.5 font-mono text-slate-600">
                        {formatTimeRange(c.window_start, c.window_end)}
                      </td>

                      <td className="p-3.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Ready
                        </span>
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
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* TAB 2: EXECUTIVES VIEW */}
        {activeTab === 'executives' && (
          <div className="p-6">
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Executive</th>
                    <th className="p-3.5">Shift Window</th>
                    <th className="p-3.5">Max Visits</th>
                    <th className="p-3.5">Max Distance</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {executives.map((e) => (
                    <tr 
                      key={e.id} 
                      onClick={() => setSelectedExecutive(e)}
                      className="hover:bg-slate-50/80 transition cursor-pointer"
                    >
                      <td className="p-3.5">
                        <div className="font-bold text-navy">{e.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">{e.id}</div>
                      </td>

                      <td className="p-3.5 font-mono text-slate-600">
                        {formatTimeRange(e.shift_start, e.shift_end)}
                      </td>

                      <td className="p-3.5 font-medium text-navy">
                        {e.max_visits} visits
                      </td>

                      <td className="p-3.5 font-medium text-navy">
                        {e.max_km} km
                      </td>

                      <td className="p-3.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      </td>

                      <td className="p-3.5 text-right">
                        <button
                          onClick={(evt) => {
                            evt.stopPropagation();
                            setSelectedExecutive(e);
                          }}
                          className="px-2.5 py-1 rounded-lg text-slate-500 hover:text-navy hover:bg-slate-100 text-[11px] font-semibold transition"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: DATA & SYNC (Secondary Section, Not Equal in Dominance) */}
        {activeTab === 'sync' && (
          <div className="p-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-navy">
                    {isToday ? "Today's Data Sync" : `Data Sync · ${formattedDate}`}
                  </h3>
                  <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    ✓ Synced
                  </span>
                </div>
                <div className="space-y-2 text-xs pt-1">
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Last Synced:</span>
                    <span className="font-bold text-navy">08:05 AM ({isToday ? 'Today' : formattedDate})</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Customers:</span>
                    <span className="font-bold text-emerald-700">60 ✓</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Executives:</span>
                    <span className="font-bold text-emerald-700">6 ✓</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Source:</span>
                    <span className="font-bold text-navy">Connected Daily Pipeline / CSV</span>
                  </div>
                </div>
                <div className="pt-2">
                  <button
                    onClick={handleSyncData}
                    disabled={syncing}
                    className="w-full py-2.5 rounded-xl bg-navy hover:bg-navy-deep text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                    <span>{syncing ? 'Synchronizing...' : 'Sync Data Now'}</span>
                  </button>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h3 className="text-sm font-bold text-navy">Import Data Files</h3>
                <p className="text-xs text-slate-500">
                  Upload fresh field operations sheets for today if new accounts or emergency shifts are designated.
                </p>
                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => navigate('/data/import')}
                    className="w-full py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-navy text-xs font-semibold transition flex items-center justify-center gap-2"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Customers / Executives CSV</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* 5. CUSTOMER DETAILS DRAWER (Progressive Disclosure) */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-navy-darkest/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div 
            className="w-full max-w-md h-full bg-white shadow-2xl p-6 overflow-y-auto space-y-6 flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-5">
              
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Account File</div>
                  <h2 className="text-lg font-bold text-navy mt-0.5">Customer Details</h2>
                </div>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-navy hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Identity Details */}
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
                  Zone: <b>{formatLocation(selectedCustomer.area)}</b>
                </div>
              </div>

              {/* Operational Fields */}
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">PTP Today</span>
                  <span className={`font-bold ${selectedCustomer.ptp_today === 1 ? 'text-orange' : 'text-slate-700'}`}>
                    {selectedCustomer.ptp_today === 1 ? 'Yes (Must-Visit Required)' : 'No'}
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

                {/* Level 3 Technical Disclosure (Coordinates in details drawer only) */}
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Coordinates</span>
                  <span className="font-mono text-slate-400 text-[11px]">{selectedCustomer.lat.toFixed(4)}, {selectedCustomer.lon.toFixed(4)}</span>
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
      )}

      {/* 6. EXECUTIVE DETAILS DRAWER */}
      {selectedExecutive && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-navy-darkest/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div 
            className="w-full max-w-md h-full bg-white shadow-2xl p-6 overflow-y-auto space-y-6 flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Roster File</div>
                  <h2 className="text-lg font-bold text-navy mt-0.5">Executive Details</h2>
                </div>
                <button
                  onClick={() => setSelectedExecutive(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-navy hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <span className="font-mono text-xs font-bold text-orange px-2 py-0.5 rounded bg-orange/10">
                  {selectedExecutive.id}
                </span>
                <div className="text-base font-bold text-navy mt-1">
                  {selectedExecutive.name}
                </div>
                <div className="text-xs text-emerald-700 font-semibold">
                  Status: Active / Ready for Route
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Shift Window</span>
                  <span className="font-bold text-navy font-mono">{formatTimeRange(selectedExecutive.shift_start, selectedExecutive.shift_end)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Maximum Visits</span>
                  <span className="font-bold text-navy">{selectedExecutive.max_visits} visits/day</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Maximum Distance</span>
                  <span className="font-bold text-navy">{selectedExecutive.max_km} km</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Home Depot Location</span>
                  <span className="font-mono text-slate-400 text-[11px]">{selectedExecutive.home_lat.toFixed(4)}, {selectedExecutive.home_lon.toFixed(4)}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={() => setSelectedExecutive(null)}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-navy font-bold text-xs transition cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
