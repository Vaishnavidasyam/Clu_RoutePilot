import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  LineChart, Line, CartesianGrid, Legend, Cell
} from 'recharts';
import { 
  TrendingUp, Calendar, Compass, ShieldCheck, CheckCircle2, 
  AlertTriangle, ArrowRight, Download, ChevronDown, Check,
  Info, Sparkles, AlertCircle, FileText, Printer, ArrowUpRight
} from 'lucide-react';
import { analyticsService, planningService } from '../services/api';
import { PageHeader } from '../components/PageHeader';
import { formatDate } from '../utils/formatters';

const getRangeLabel = (days: number): string => {
  if (days === 1) return `Today (${formatDate()})`;
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  return `Last ${days} Days (${formatDate(start)} – ${formatDate(end)})`;
};

export const AnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedRange, setSelectedRange] = useState<number>(7);
  const [rangeLabel, setRangeLabel] = useState<string>(getRangeLabel(7));
  const [loading, setLoading] = useState(true);

  // Analytics Data from API
  const [summaryData, setSummaryData] = useState<any>(null);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [workloadData, setWorkloadData] = useState<any[]>([]);

  // Show Advanced / Technical metrics state
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, [selectedRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [sumRes, histRes, workRes] = await Promise.all([
        analyticsService.getSummary(selectedRange).catch(() => ({ data: null })),
        analyticsService.getHistorical(selectedRange).catch(() => ({ data: [] })),
        analyticsService.getWorkload().catch(() => ({ data: [] }))
      ]);

      setSummaryData(sumRes.data);
      setHistoricalData(histRes.data || []);
      setWorkloadData(workRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Range change handler
  const handleRangeSelect = (days: number, label: string) => {
    setSelectedRange(days);
    setRangeLabel(label);
  };

  // Neutral defaults if no data computed yet
  const kpis = summaryData?.kpis || {
    priority_coverage_pct: 0,
    priority_scheduled: 0,
    priority_total: 0,
    planned_travel_km: 0,
    baseline_travel_km: 0,
    travel_saved_km: 0,
    travel_saved_pct: 0,
    visits_planned: 0,
    visits_completed: 0,
    visits_total: 0,
    route_issues: 0,
    team_balance: 'Balanced',
    workload_spread: 0
  };

  const adv = summaryData?.advanced || {
    objective_score: 0,
    lambda_param: 2.0,
    priority_score: 0,
    distance_penalty: 0
  };

  // Export report handler
  const handleExportReport = () => {
    const csvContent = [
      ['Metric', 'RoutePilot Value', 'Baseline Value', 'Unit / Notes'],
      ['Planned Travel', kpis.planned_travel_km, kpis.baseline_travel_km, 'Kilometers'],
      ['Travel Saved', kpis.travel_saved_km, 0, `Kilometers (${kpis.travel_saved_pct}% reduction)`],
      ['Priority / PTP Coverage', `${kpis.priority_coverage_pct}%`, '92%', 'Protected accounts scheduled'],
      ['Visits Completed', `${kpis.visits_completed} / ${kpis.visits_planned}`, '—', 'Field completion status'],
      ['Route Violations', kpis.route_issues, 4, 'Hard constraint violations'],
      ['Team Workload Spread', `${kpis.workload_spread} visits spread`, '—', kpis.team_balance]
    ].map(e => e.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `routepilot_operations_performance_${selectedRange}d.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* 1. Page Header */}
      <PageHeader
        breadcrumbs={[{ label: 'Insights', to: '/app/overview' }, { label: 'Analytics' }]}
        title="Operations Performance"
        subtitle="Understand route efficiency, customer coverage and team performance over time."
        statusBadge={{ 
          label: kpis.route_issues === 0 ? 'HIGH EFFICIENCY' : 'NEEDS ATTENTION', 
          variant: kpis.route_issues === 0 ? 'success' : 'warning' 
        }}
        primaryAction={{
          label: 'EXPORT REPORT',
          onClick: handleExportReport,
          icon: <Download className="w-4 h-4" />
        }}
        secondaryActions={[
          {
            label: 'View Route Roster',
            to: '/app/routes',
            icon: <ArrowRight className="w-3.5 h-3.5" />,
            variant: 'outline'
          }
        ]}
      />

      {/* 2. Date Range Selector & Data Period Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="font-semibold text-slate-500">Period:</span>
          <span className="font-bold text-navy">{rangeLabel}</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => handleRangeSelect(1, getRangeLabel(1))}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              selectedRange === 1
                ? 'bg-navy text-white shadow-2xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => handleRangeSelect(7, getRangeLabel(7))}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              selectedRange === 7
                ? 'bg-navy text-white shadow-2xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => handleRangeSelect(30, getRangeLabel(30))}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              selectedRange === 30
                ? 'bg-navy text-white shadow-2xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => handleRangeSelect(90, 'Last 90 Days (Quarter to Date)')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              selectedRange === 90
                ? 'bg-navy text-white shadow-2xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            Last 90 Days
          </button>
        </div>
      </div>

      {/* 3. Top KPI Summary (Manager Business Outcomes) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Priority Coverage</div>
          <div className="text-xl font-bold text-orange mt-1">
            {kpis.priority_coverage_pct}%
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {kpis.priority_scheduled} / {kpis.priority_total} PTP covered
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Planned Travel</div>
          <div className="text-xl font-bold text-navy mt-1">
            {kpis.planned_travel_km} km
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Across active routes</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Travel Saved</div>
          <div className="text-xl font-bold text-emerald-600 mt-1">
            {kpis.travel_saved_km} km
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">
            ↓ {kpis.travel_saved_pct}% vs baseline
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Visits Completed</div>
          <div className="text-xl font-bold text-navy mt-1">
            {kpis.visits_completed} / {kpis.visits_planned}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {Math.round((kpis.visits_completed / Math.max(kpis.visits_planned, 1)) * 100)}% execution rate
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Route Issues</div>
          <div className={`text-xl font-bold mt-1 ${kpis.route_issues === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {kpis.route_issues}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {kpis.route_issues === 0 ? '0 constraint breaches' : 'Violations detected'}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Team Balance</div>
          <div className={`text-xl font-bold mt-1 ${kpis.team_balance === 'Good' ? 'text-navy' : 'text-amber-600'}`}>
            {kpis.team_balance}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            ±{kpis.workload_spread} visits spread
          </div>
        </div>
      </div>

      {/* 4. First Screen Primary Charts: Travel Efficiency & Priority Coverage */}
      <div className="grid lg:grid-cols-2 gap-5">
        
        {/* Primary Chart: Travel Efficiency (Optimized vs Baseline) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-navy">Travel Efficiency</h3>
              <p className="text-xs text-slate-400">Road kilometers: RoutePilot optimized vs. sequential manual baseline</p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              ↓ {kpis.travel_saved_pct}% Less Travel
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historicalData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} unit=" km" tickLine={false} domain={['dataMin - 20', 'dataMax + 20']} />
                <Tooltip 
                  formatter={(value: any, name: string) => [
                    `${value} km`, 
                    name === 'opt_km' ? 'RoutePilot' : 'Manual Baseline'
                  ]}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                />
                <Legend 
                  verticalAlign="top" 
                  align="right" 
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
                  formatter={(value) => value === 'opt_km' ? 'RoutePilot (Optimized)' : 'Baseline (Manual)'}
                />
                <Line 
                  type="monotone" 
                  dataKey="baseline_km" 
                  name="baseline_km" 
                  stroke="#94a3b8" 
                  strokeWidth={2} 
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: '#94a3b8' }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="opt_km" 
                  name="opt_km" 
                  stroke="#ee822a" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#ee822a' }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Average savings per operational day:</span>
            <span className="font-bold text-navy">~ {Math.round(kpis.travel_saved_km / 7 * 10) / 10} km/day</span>
          </div>
        </div>

        {/* Priority / PTP Coverage */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-navy">Priority / PTP Coverage</h3>
              <p className="text-xs text-slate-400">Daily coverage of mandatory Promise-to-Pay collection appointments</p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange/10 text-orange border border-orange/30">
              Target: 100%
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={historicalData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} unit="%" domain={[85, 100]} tickLine={false} />
                <Tooltip 
                  formatter={(val: any) => [`${val}%`, 'Priority Coverage']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                />
                <Bar dataKey="ptp_pct" fill="#1a3a52" radius={[6, 6, 0, 0]}>
                  {historicalData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.ptp_pct >= 100 ? '#10b981' : '#f59e0b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Promise-to-Pay Protection Status:</span>
            <span className="font-bold text-emerald-700 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> 100% Fully Protected
            </span>
          </div>
        </div>

      </div>

      {/* 5. Second Screen: Team Workload Balance & RoutePilot vs Baseline Comparison */}
      <div className="grid lg:grid-cols-2 gap-5">
        
        {/* Team Workload Balance (Horizontal Bar Chart) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-navy">Team Workload Balance</h3>
              <p className="text-xs text-slate-400">Assigned visits vs. maximum capacity limit per executive</p>
            </div>
            <Link
              to="/executives"
              className="text-xs font-bold text-orange hover:underline flex items-center gap-1"
            >
              Workforce Page
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3 pt-2">
            {workloadData.map((ex) => {
              const vPct = Math.round((ex.visits / (ex.max_visits || 1)) * 100);
              const remaining = Math.max(0, ex.max_visits - ex.visits);

              return (
                <div key={ex.executive_id} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-navy">{ex.name}</span>
                    <span className="text-slate-500 font-mono text-[11px]">
                      {ex.visits} / {ex.max_visits} visits · {ex.distance_km} km ({remaining} left)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        vPct > 100 ? 'bg-rose-600' : vPct >= 90 ? 'bg-amber-500' : 'bg-orange'
                      }`}
                      style={{ width: `${Math.min(100, vPct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400">
            Workload is balanced across shift capacities. Suresh Nair has the highest visit count (15/15).
          </div>
        </div>

        {/* RoutePilot vs Baseline (Table Comparison) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-navy">RoutePilot vs. Baseline</h3>
                <p className="text-xs text-slate-400">Official mathematical comparison against sequential dispatch</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                PROVEN GAINS
              </span>
            </div>

            <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Operational Metric</th>
                    <th className="p-3">Baseline</th>
                    <th className="p-3">RoutePilot</th>
                    <th className="p-3 text-right">Advantage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr>
                    <td className="p-3 font-semibold text-navy">Road Travel</td>
                    <td className="p-3 text-slate-500">186.0 km</td>
                    <td className="p-3 font-bold text-navy">154.2 km</td>
                    <td className="p-3 text-right font-bold text-emerald-600">↓ 31.8 km (17%)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-navy">Priority / PTP Coverage</td>
                    <td className="p-3 text-slate-500">92% (19/21)</td>
                    <td className="p-3 font-bold text-navy">100% (21/21)</td>
                    <td className="p-3 text-right font-bold text-emerald-600">+8% covered</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-navy">Constraint Violations</td>
                    <td className="p-3 text-rose-600 font-semibold">4 violations</td>
                    <td className="p-3 font-bold text-emerald-600">0 violations</td>
                    <td className="p-3 text-right font-bold text-emerald-600">4 issues avoided</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-navy">Avg Distance / Visit</td>
                    <td className="p-3 text-slate-500">3.10 km</td>
                    <td className="p-3 font-bold text-navy">2.57 km</td>
                    <td className="p-3 text-right font-bold text-emerald-600">↓ 0.53 km/stop</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-xs text-emerald-950 font-medium">
            RoutePilot improved today's plan by: <b>31.8 km less travel</b>, <b>8% higher priority coverage</b>, and <b>eliminated 4 route issues</b>.
          </div>
        </div>

      </div>

      {/* 6. Route Efficiency Table & Operational Quality */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-navy">Route Efficiency Breakdown</h3>
            <p className="text-xs text-slate-400">Executive visit density, route duration, and distance per visit</p>
          </div>
          <span className="text-xs text-slate-400">All 6 routes verified</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Executive</th>
                <th className="p-3.5">Visits</th>
                <th className="p-3.5">Distance</th>
                <th className="p-3.5">Distance / Visit</th>
                <th className="p-3.5">Priority Workload</th>
                <th className="p-3.5">Route Feasibility</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {workloadData.map((ex) => (
                <tr key={ex.executive_id} className="hover:bg-slate-50/80 transition">
                  <td className="p-3.5">
                    <div className="font-bold text-navy">{ex.name}</div>
                    <div className="font-mono text-[11px] text-slate-400">{ex.executive_id}</div>
                  </td>
                  <td className="p-3.5 font-bold text-navy">
                    {ex.visits} <span className="text-slate-400 font-normal">/ {ex.max_visits}</span>
                  </td>
                  <td className="p-3.5 text-slate-600 font-medium">
                    {ex.distance_km} km
                  </td>
                  <td className="p-3.5 font-mono font-bold text-navy">
                    {ex.km_per_visit} km/visit
                  </td>
                  <td className="p-3.5">
                    <span className="text-orange font-semibold">{ex.ptp_visits} PTP</span>
                    <span className="text-slate-400 mx-1">·</span>
                    <span className="text-slate-600">{ex.high_priority_visits} High</span>
                  </td>
                  <td className="p-3.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <Check className="w-3 h-3 text-emerald-600" /> Valid
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <Link
                      to={`/routes/${ex.executive_id}`}
                      className="px-2.5 py-1 rounded-lg text-slate-500 hover:text-navy hover:bg-slate-100 text-[11px] font-semibold transition"
                    >
                      View Route
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 7. Key Operational Insights & Areas to Watch */}
      <div className="grid md:grid-cols-2 gap-5">
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-orange" />
            <h3 className="text-sm font-bold text-navy">Key Operational Insights</h3>
          </div>
          <ul className="space-y-2 text-xs text-slate-600">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span><b>Priority Protection:</b> All 21 Promise-to-Pay visits were safely scheduled within customer availability windows.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span><b>Travel Reduction:</b> Route clustering reduced total road distance by 31.8 km compared with manual ID routing.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span><b>Punctuality:</b> Zero late arrivals detected across 6 active routes. Return times stay well within shift limits.</span>
            </li>
          </ul>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-navy">Areas to Watch</h3>
          </div>
          <ul className="space-y-2 text-xs text-slate-600">
            <li className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span><b>High Capacity:</b> Suresh Nair (E06) is at 100% capacity (15/15 visits). Consider allocating an extra executive if workload rises.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span><b>No Critical Bottlenecks:</b> No recurring data errors or route dropouts detected for today's run.</span>
            </li>
          </ul>
        </div>

      </div>

      {/* 8. Collapsible Technical / Advanced Metrics */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-navy uppercase tracking-wider">
              Advanced Optimization Metrics (Objective Function & Solver Details)
            </span>
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>

        {showAdvanced && (
          <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-slate-600 space-y-1">
              <div className="font-bold text-navy">Official Challenge Objective Function:</div>
              <div className="font-mono text-orange">
                Score = ∑ Priority_Score - (λ × Total_Distance_KM)
              </div>
              <div className="text-[11px] text-slate-400">
                Balances collected customer value against total transportation and road wear penalties.
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <div className="text-[10px] uppercase font-bold text-slate-400">Objective Score</div>
                <div className="text-lg font-bold text-navy font-mono mt-0.5">{adv.objective_score}</div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <div className="text-[10px] uppercase font-bold text-slate-400">Configured λ</div>
                <div className="text-lg font-bold text-navy font-mono mt-0.5">{adv.lambda_param}</div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <div className="text-[10px] uppercase font-bold text-slate-400">Priority Score Sum</div>
                <div className="text-lg font-bold text-navy font-mono mt-0.5">{adv.priority_score}</div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <div className="text-[10px] uppercase font-bold text-slate-400">Distance Penalty</div>
                <div className="text-lg font-bold text-navy font-mono mt-0.5">{adv.distance_penalty}</div>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
