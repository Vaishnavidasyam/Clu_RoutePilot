import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { 
  MapPin, CheckCircle2, ArrowRight, Search, Filter, 
  AlertTriangle, Clock, ArrowUpDown, ChevronDown, ChevronUp, ChevronRight, Check, AlertCircle,
  ExternalLink, Layers, Compass, User
} from 'lucide-react';
import { planningService } from '../services/api';
import { PlanDetail } from '../types';
import { PageHeader } from '../components/PageHeader';
import { usePlan } from '../context/PlanContext';
import { useOperationalDate } from '../context/DateTimeContext';
import { APP_LOCATION } from '../config/locale';
import { formatTime, formatTimeRange, formatLocation, formatCurrencyINR } from '../utils/formatters';

const MapBoundsAdjuster: React.FC<{ points: [number, number][] }> = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [points, map]);
  return null;
};

// Custom Map Marker Helper
const createMapIcon = (color: string, label: string) => {
  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: `<div style="background-color: ${color}; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">${label}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const getDispersedMarkerPosition = (
  stop: { lat: number; lon: number; customer_id?: string },
  index: number,
  allStops: Array<{ lat: number; lon: number; customer_id?: string }>
): [number, number] => {
  const sameCoordStops = allStops.filter(
    s => Math.abs(s.lat - stop.lat) < 0.00005 && Math.abs(s.lon - stop.lon) < 0.00005
  );
  if (sameCoordStops.length <= 1) {
    return [stop.lat, stop.lon];
  }
  const posInGroup = sameCoordStops.findIndex(s => s.customer_id === stop.customer_id);
  const angle = (2 * Math.PI * (posInGroup >= 0 ? posInGroup : index)) / sameCoordStops.length;
  const radius = 0.00035; // Visual dispersion (~35m) so each stop pin is visible
  return [
    stop.lat + radius * Math.cos(angle),
    stop.lon + radius * Math.sin(angle)
  ];
};

const EXEC_COLORS = ['#FF7A18', '#123A55', '#10A88A', '#0284c7', '#8b5cf6', '#E9A23B', '#ec4899', '#14b8a6', '#f43f5e', '#6366f1'];

export const ExecutiveRoutesPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentPlan } = usePlan();
  const { isToday, formattedDate, dateHeaderLabel, routesTitle, operationalDate } = useOperationalDate();
  const [plan, setPlan] = useState<PlanDetail | null>(
    (!id || id === 'latest') ? currentPlan : null
  );
  const [loading, setLoading] = useState(
    (!id || id === 'latest') ? !currentPlan : true
  );

  // Filters & State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExecId, setSelectedExecId] = useState<string>('all');
  const [filterPtpOnly, setFilterPtpOnly] = useState<boolean>(false);
  const [expandedRoutes, setExpandedRoutes] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<'split' | 'map' | 'roster'>('split');

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
        if (plans.data && plans.data.length > 0) {
          targetId = plans.data[0].id;
        }
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

  const rawRoutes = useMemo(() => {
    return Object.values(plan?.routes || {});
  }, [plan]);

  // Set default expanded executive on load
  useEffect(() => {
    if (rawRoutes.length > 0 && Object.keys(expandedRoutes).length === 0) {
      setExpandedRoutes({ [rawRoutes[0].executive_id]: true });
    }
  }, [rawRoutes]);

  const toggleRoute = (execId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setExpandedRoutes((prev) => ({
      ...prev,
      [execId]: !prev[execId]
    }));
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 pb-16">
        <div className="bg-white p-8 rounded-2xl border border-[#DDE7ED] text-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-orange border-t-transparent animate-spin mx-auto" />
          <div className="text-sm font-bold text-navy">Loading today&apos;s routes and interactive map...</div>
        </div>
      </div>
    );
  }

  // EMPTY STATE (Routes not created yet)
  if (!plan) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-16">
        <PageHeader
          breadcrumbs={[{ label: isToday ? 'Today' : formattedDate, to: '/app/overview' }, { label: 'Routes' }]}
          title={routesTitle}
          subtitle={`${dateHeaderLabel} · Review executive assignments and route performance.`}
          statusBadge={{ label: 'NOT PLANNED', variant: 'neutral' }}
        />
        <div className="bg-white p-8 rounded-2xl border border-[#DDE7ED] shadow-2xs text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <MapPin className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-navy">
            {isToday ? "No routes have been created yet." : `No routes found for ${formattedDate}.`}
          </h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {isToday 
              ? "Today's data is verified and ready. Generate today's routes across available executives."
              : `Review completed plans in Plan History, or build a new route plan for ${formattedDate}.`}
          </p>
          <div className="pt-2">
            <Link
              to="/app/plan"
              className="px-6 py-2.5 rounded-full text-xs font-bold bg-[#FF7A18] hover:bg-[#e06509] text-white shadow-sm transition inline-flex items-center gap-2"
            >
              <span>{isToday ? 'PLAN TODAY' : `BUILD PLAN · ${formattedDate}`}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const m = plan.metrics;
  const issuesCount = m?.violations_count || 0;
  const allRoutesReady = issuesCount === 0;

  // Filter routes
  const filteredRoutes = rawRoutes.filter((r) => {
    // Executive filter
    if (selectedExecId !== 'all' && r.executive_id !== selectedExecId) return false;

    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesExec = r.executive_id.toLowerCase().includes(q) || r.executive_name.toLowerCase().includes(q);
      const matchesStop = r.timeline?.some(s => 
        (s.customer_name && s.customer_name.toLowerCase().includes(q)) || 
        s.customer_id.toLowerCase().includes(q) ||
        (s.area && s.area.toLowerCase().includes(q))
      );
      if (!matchesExec && !matchesStop) return false;
    }

    // PTP filter
    if (filterPtpOnly) {
      const hasPtp = r.timeline?.some(s => s.ptp_today === 1);
      if (!hasPtp) return false;
    }

    return true;
  });

  const activeMapRoutes = selectedExecId === 'all' 
    ? filteredRoutes 
    : rawRoutes.filter(r => r.executive_id === selectedExecId);

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-16">
      
      {/* 1. Universal Page Header (Section 8) */}
      <PageHeader
        breadcrumbs={[{ label: isToday ? 'Today' : formattedDate, to: '/app/overview' }, { label: 'Routes' }]}
        title={routesTitle}
        subtitle={`${dateHeaderLabel} · Review executive assignments, stop sequences, and spatial collection routes.`}
        statusBadge={{ 
          label: allRoutesReady ? 'ALL ROUTES READY' : `${issuesCount} ROUTE ISSUES`, 
          variant: allRoutesReady ? 'success' : 'warning' 
        }}
      />

      {/* 2. Control Toolbar: Executive Selector, Search, Filter & View Toggle */}
      <div className="bg-white p-4 rounded-2xl border border-[#DDE7ED] shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        
        {/* Left: Executive Selector & Search */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          <div className="flex items-center gap-2">
            <span className="font-bold text-navy whitespace-nowrap">Executive:</span>
            <select
              value={selectedExecId}
              onChange={(e) => {
                setSelectedExecId(e.target.value);
                if (e.target.value !== 'all') {
                  setExpandedRoutes({ [e.target.value]: true });
                }
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-navy focus:outline-none focus:border-orange cursor-pointer"
            >
              <option value="all">All Executives ({rawRoutes.length})</option>
              {rawRoutes.map(r => (
                <option key={r.executive_id} value={r.executive_id}>
                  {r.executive_id} — {r.executive_name} ({r.metrics?.visit_count || r.timeline?.length} stops)
                </option>
              ))}
            </select>
          </div>

          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search customer, area, executive..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-navy placeholder:text-slate-400 focus:outline-none focus:border-orange"
            />
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-navy ml-1 select-none">
            <input
              type="checkbox"
              checked={filterPtpOnly}
              onChange={(e) => setFilterPtpOnly(e.target.checked)}
              className="rounded border-slate-300 text-orange focus:ring-orange"
            />
            <span>PTP Accounts Only</span>
          </label>
        </div>

        {/* Right: Layout View Modes */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('split')}
            className={`px-3 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
              viewMode === 'split' ? 'bg-white text-navy shadow-2xs' : 'text-slate-500 hover:text-navy'
            }`}
          >
            Split View
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`px-3 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
              viewMode === 'map' ? 'bg-white text-navy shadow-2xs' : 'text-slate-500 hover:text-navy'
            }`}
          >
            Map Only
          </button>
          <button
            onClick={() => setViewMode('roster')}
            className={`px-3 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
              viewMode === 'roster' ? 'bg-white text-navy shadow-2xs' : 'text-slate-500 hover:text-navy'
            }`}
          >
            Roster Only
          </button>
        </div>

      </div>

      {/* 3. Primary Operational Canvas */}
      <div className="grid lg:grid-cols-12 gap-5 items-start">
        
        {/* Left Column: Route Roster & Stop Sequences */}
        {(viewMode === 'split' || viewMode === 'roster') && (
          <div className={`${viewMode === 'split' ? 'lg:col-span-5' : 'lg:col-span-12'} space-y-3`}>
            
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">
                Active Itineraries ({filteredRoutes.length})
              </span>
              <span className="text-[11px] text-slate-500">
                Click route to inspect stops
              </span>
            </div>

            <div className="space-y-3">
              {filteredRoutes.map((r, rIdx) => {
                const isExpanded = Boolean(expandedRoutes[r.executive_id]);
                const color = EXEC_COLORS[rIdx % EXEC_COLORS.length];
                const ptpCount = r.timeline?.filter(s => s.ptp_today === 1).length || 0;

                return (
                  <div
                    key={r.executive_id}
                    className={`bg-white rounded-2xl border transition-all duration-200 shadow-2xs overflow-hidden ${
                      isExpanded ? 'border-orange ring-1 ring-orange/30' : 'border-[#DDE7ED] hover:border-slate-300'
                    }`}
                  >
                    {/* Route Card Header */}
                    <div 
                      onClick={() => toggleRoute(r.executive_id)}
                      className="p-4 cursor-pointer select-none bg-white hover:bg-slate-50/50 transition-colors"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleRoute(r.executive_id);
                        }
                      }}
                      aria-expanded={isExpanded}
                      aria-label={`${isExpanded ? 'Collapse' : 'Expand'} route for ${r.executive_name}`}
                    >
                      {/* Top Row: Executive Info, Metrics & Action Buttons */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div 
                            className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-xs"
                            style={{ backgroundColor: color }}
                          >
                            {r.executive_id}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-navy text-sm flex items-center gap-2 truncate">
                              <span className="truncate">{r.executive_name}</span>
                              {ptpCount > 0 && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange/10 text-orange border border-orange/20 shrink-0">
                                  {ptpCount} Must-Visit
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2 mt-0.5 flex-wrap">
                              <span>{r.metrics.visit_count} stops</span>
                              <span>·</span>
                              <span>{r.metrics.total_km} km</span>
                              <span>·</span>
                              <span>Return {formatTime(r.metrics.return_time)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Top-Right Action Buttons Cluster */}
                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          {/* 1. Open Route Details Button (External Link) */}
                          <div className="relative group/ext">
                            <Link
                              to={`/manager/routes/${r.executive_id}`}
                              className="w-8 h-8 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg bg-white border border-[#DDE7ED] text-navy hover:bg-slate-100 hover:border-slate-300 hover:text-navy active:bg-slate-200 active:scale-95 transition-all shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-1 cursor-pointer"
                              aria-label={`Open route details for ${r.executive_name}`}
                              title="Open route details"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                            {/* Accessible Floating Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/ext:block group-focus-within/ext:block z-30 pointer-events-none">
                              <div className="px-2 py-1 bg-navy text-white text-[10px] font-medium rounded shadow-md whitespace-nowrap">
                                Open route details
                              </div>
                            </div>
                          </div>

                          {/* 2. Expand/Collapse Chevron Button */}
                          <div className="relative group/chev">
                            <button
                              type="button"
                              onClick={(e) => toggleRoute(r.executive_id, e)}
                              className="w-8 h-8 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg bg-white border border-[#DDE7ED] text-navy hover:bg-slate-100 hover:border-slate-300 hover:text-navy active:bg-slate-200 active:scale-95 transition-all shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-1 cursor-pointer"
                              aria-label={isExpanded ? `Collapse route for ${r.executive_name}` : `Expand route for ${r.executive_name}`}
                              aria-expanded={isExpanded}
                              title={isExpanded ? "Collapse route" : "Expand route"}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-navy transition-transform duration-200" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-navy transition-transform duration-200" />
                              )}
                            </button>
                            {/* Accessible Floating Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/chev:block group-focus-within/chev:block z-30 pointer-events-none">
                              <div className="px-2 py-1 bg-navy text-white text-[10px] font-medium rounded shadow-md whitespace-nowrap">
                                {isExpanded ? "Collapse route" : "Expand route"}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Header Bottom Action Row: View Route -> */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100/80 flex items-center justify-between">
                        <Link
                          to={`/manager/routes/${r.executive_id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange hover:text-orange-dark transition group/link"
                          aria-label={`Open route details for ${r.executive_name}`}
                        >
                          <span>View route</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform" />
                        </Link>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {isExpanded ? 'Sequence open' : 'Click to inspect stops'}
                        </span>
                      </div>
                    </div>

                    {/* Collapsible Stop Sequence Timeline */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 p-4 bg-slate-50/60 space-y-2.5 animate-in fade-in duration-150">
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                          Stop Sequence ({r.timeline?.length || 0} stops)
                        </div>

                        {/* Home Depot Start */}
                        <div className="flex items-center gap-2.5 text-xs text-slate-600">
                          <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold">H</span>
                          <span className="font-semibold text-navy">Home Depot Start ({APP_LOCATION.depotName})</span>
                          <span className="font-mono text-slate-400 ml-auto">{formatTime(r.shift_start || "08:30")}</span>
                        </div>

                        {/* Customer Stops */}
                        <div className="space-y-1.5 pl-2.5 border-l-2 border-slate-200 ml-2.5 my-1">
                          {r.timeline?.map((stop) => (
                            <div 
                              key={stop.customer_id} 
                              className="p-2 rounded-xl bg-white border border-slate-200/80 text-xs flex items-center justify-between hover:border-slate-300 transition"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="w-5 h-5 rounded-full bg-navy/10 text-navy flex items-center justify-center text-[10px] font-bold shrink-0">
                                  #{stop.seq}
                                </span>
                                <div className="truncate">
                                  <div className="font-semibold text-navy truncate">{stop.customer_name || `Account ${stop.customer_id}`}</div>
                                  <div className="text-[10px] text-slate-400">{formatLocation(stop.area)} · {stop.service_min || 15}m visit</div>
                                </div>
                              </div>
                              <div className="text-right shrink-0 pl-2 flex items-center gap-2">
                                {stop.status === 'completed' && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    ✓ Done
                                  </span>
                                )}
                                {stop.status === 'in_progress' && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                                    ● In Progress
                                  </span>
                                )}
                                {stop.status === 'failed' && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300">
                                    ✕ Failed
                                  </span>
                                )}
                                <div className="font-mono font-bold text-navy">{formatTime(stop.arrival_time)}</div>
                                {stop.ptp_today === 1 && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-orange/10 text-orange border border-orange/20 whitespace-nowrap">
                                    ★ MUST-VISIT
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Home Depot Return */}
                        <div className="flex items-center gap-2.5 text-xs text-slate-600 pt-1">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold">✓</span>
                          <span className="font-semibold text-emerald-800">Home Depot Return ({APP_LOCATION.depotName})</span>
                          <span className="font-mono font-bold text-emerald-800 ml-auto">{formatTime(r.metrics.return_time)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredRoutes.length === 0 && (
                <div className="p-8 bg-white rounded-2xl border border-[#DDE7ED] text-center text-xs text-slate-400">
                  No routes match your current search and filter criteria.
                </div>
              )}
            </div>

          </div>
        )}

        {/* Right Column: Interactive Leaflet Map */}
        {(viewMode === 'split' || viewMode === 'map') && (
          <div className={`${viewMode === 'split' ? 'lg:col-span-7' : 'lg:col-span-12'} sticky top-20`}>
            
            <div className="bg-white rounded-2xl border border-[#DDE7ED] shadow-2xs overflow-hidden flex flex-col h-[600px]">
              
              {/* Map Header Strip */}
              <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs px-4 shrink-0">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-orange" />
                  <span className="font-bold text-navy">{APP_LOCATION.urbanArea} Spatial Cluster Visualizer</span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {activeMapRoutes.length} active paths plotted
                </div>
              </div>

              {/* Map Canvas */}
              <div className="flex-1 w-full h-full relative">
                {(() => {
                  const allMapPoints: [number, number][] = [];
                  activeMapRoutes.forEach(r => {
                    if (r.home_lat && r.home_lon) allMapPoints.push([r.home_lat, r.home_lon]);
                    const tl = filterPtpOnly 
                      ? (r.timeline?.filter(s => s.ptp_today === 1) || [])
                      : (r.timeline || []);
                    tl.forEach(s => {
                      if (s.lat && s.lon) allMapPoints.push([s.lat, s.lon]);
                    });
                  });

                  return (
                    <MapContainer
                      center={allMapPoints.length > 0 ? allMapPoints[0] : [APP_LOCATION.defaultCenter.lat, APP_LOCATION.defaultCenter.lng]}
                      zoom={12}
                      style={{ width: '100%', height: '100%' }}
                      scrollWheelZoom={false}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />

                      <MapBoundsAdjuster points={allMapPoints} />

                  {activeMapRoutes.map((r, rIdx) => {
                    const color = EXEC_COLORS[rIdx % EXEC_COLORS.length];
                    const timeline = filterPtpOnly 
                      ? (r.timeline?.filter(s => s.ptp_today === 1) || [])
                      : (r.timeline || []);

                    const homePos: [number, number] | null = (r.home_lat && r.home_lon) ? [r.home_lat, r.home_lon] : null;
                    const polylinePoints: [number, number][] = [
                      ...(homePos ? [homePos] : []),
                      ...timeline.map(s => [s.lat, s.lon] as [number, number]),
                      ...(homePos ? [homePos] : [])
                    ];

                    return (
                      <React.Fragment key={r.executive_id}>
                        {/* Executive Home Marker from executives.csv */}
                        {homePos && (
                          <Marker
                            position={homePos}
                            icon={createMapIcon('#173B56', 'H')}
                          >
                            <Popup>
                              <div className="p-2 space-y-1 text-xs">
                                <div className="font-bold text-navy">{r.executive_id} — {r.executive_name || 'Executive Home Base'}</div>
                                <div className="text-[11px] text-slate-500">Executive Start & Return Location</div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  Coordinates: {r.home_lat}, {r.home_lon}
                                </div>
                                <div className="text-[11px] font-semibold text-emerald-700">
                                  Shift Return: {formatTime(r.metrics.return_time)} · {r.metrics.total_km} km
                                </div>
                              </div>
                            </Popup>
                          </Marker>
                        )}

                        {/* Route Path */}
                        {polylinePoints.length > 1 && (
                          <Polyline
                            positions={polylinePoints}
                            color={color}
                            weight={4}
                            opacity={0.8}
                            dashArray="6, 6"
                          />
                        )}

                        {/* Customer Markers */}
                        {timeline.map((stop, sIdx) => {
                          const markerPos = getDispersedMarkerPosition(stop, sIdx, timeline);
                          return (
                            <Marker
                              key={`${r.executive_id}-${stop.customer_id}`}
                              position={markerPos}
                              icon={createMapIcon(stop.ptp_today === 1 ? '#FF7A18' : color, String(stop.seq))}
                            >
                            <Popup>
                              <div className="p-2 space-y-1 text-xs">
                                <div className="font-bold text-navy">{stop.customer_name || stop.customer_id}</div>
                                <div className="text-[11px] text-slate-500">{formatLocation(stop.area)} · Exec: {r.executive_id}</div>
                                <div className="text-[11px]">
                                  Sequence: <b>#{stop.seq}</b> · ETA: <b>{formatTime(stop.arrival_time)}</b>
                                </div>
                                <div className="text-[11px]">
                                  Window: <b>{formatTimeRange(stop.window_start, stop.window_end)}</b> · Duration: <b>{stop.service_min || 15}m</b>
                                </div>
                                <div className="text-[11px]">
                                  Priority: <b>{stop.priority_score}</b> {stop.overdue_amount ? `· Overdue: ${formatCurrencyINR(stop.overdue_amount)}` : ''}
                                </div>
                                {stop.ptp_today === 1 && (
                                  <div className="mt-1 px-2 py-0.5 rounded bg-orange/15 text-orange font-bold text-[10px] inline-block">
                                    ★ PTP MUST-VISIT TODAY
                                  </div>
                                )}
                              </div>
                            </Popup>
                          </Marker>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </MapContainer>
                  );
                })()}
              </div>

            </div>

          </div>
        )}

      </div>

    </div>
  );
};
