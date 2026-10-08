import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, CheckCircle2, Clock, MapPin, 
  UserCheck, ShieldCheck, Phone, AlertCircle
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { planningService } from '../services/api';
import { PlanDetail } from '../types';
import { PageHeader } from '../components/PageHeader';
import { usePlan } from '../context/PlanContext';
import { APP_LOCATION } from '../config/locale';
import { formatTime, formatTimeRange, formatLocation } from '../utils/formatters';

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

// Custom Map Marker
const createStopIcon = (color: string, label: string) => {
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

export const ExecutiveRouteDetailPage: React.FC = () => {
  const { id, execId, routeId, executiveId } = useParams<{ id?: string; execId?: string; routeId?: string; executiveId?: string }>();
  const { currentPlan } = usePlan();
  const [plan, setPlan] = useState<PlanDetail | null>((!id || id === 'latest') ? currentPlan : null);
  const [loading, setLoading] = useState((!id || id === 'latest') ? !currentPlan : true);

  useEffect(() => {
    if ((!id || id === 'latest') && currentPlan) {
      setPlan(currentPlan);
      setLoading(false);
    } else {
      loadRoute();
    }
  }, [id, execId, currentPlan]);

  const loadRoute = async () => {
    setLoading(true);
    try {
      let targetId = (!id || id === 'latest') ? 1 : Number(id);
      if (!id || id === 'latest') {
        const plans = await planningService.listPlans();
        if (plans.data && plans.data.length > 0) targetId = plans.data[0].id;
      }
      const data = await planningService.getPlan(targetId);
      setPlan(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !plan) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading route itinerary...</div>;
  }

  // Find targeted route
  const targetExecId = routeId || execId || executiveId || id || 'E01';
  const route = plan.routes[targetExecId] || Object.values(plan.routes)[0];
  if (!route) {
    return (
      <div className="p-12 text-center space-y-3">
        <p className="text-xs text-slate-400">Route not found for executive ID: {targetExecId}</p>
        <Link to="/manager/routes" className="text-xs font-bold text-orange hover:underline">
          Return to All Routes
        </Link>
      </div>
    );
  }

  const m = route.metrics;
  const ptpCount = (route.timeline || []).filter(s => s.ptp_today === 1).length;
  const homeCoord: [number, number] = [
    route.home_lat ?? route.start_lat ?? APP_LOCATION.defaultCenter.lat,
    route.home_lon ?? route.start_lon ?? APP_LOCATION.defaultCenter.lng
  ];
  const polylineCoords: [number, number][] = [
    homeCoord,
    ...route.timeline.map(s => [s.lat, s.lon] as [number, number]),
    homeCoord
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Standardized Page Header */}
      <PageHeader
        breadcrumbs={[
          { label: 'Operations', to: '/manager/routes' },
          { label: 'Routes', to: '/manager/routes' },
          { label: `${route.executive_id} · ${route.executive_name}` }
        ]}
        backTo={{ label: 'Back to Routes', to: '/manager/routes' }}
        title={`${route.executive_id} · ${route.executive_name}`}
        subtitle={`Field Collection Route · Shift ${formatTime(route.shift_start || "08:30")} – ${formatTime(route.shift_end || "17:30")} · ${m.visit_count} stops · ${ptpCount} must-visit · ${m.total_km} km`}
        statusBadge={{ label: 'READY', variant: 'success' }}
        primaryAction={{
          label: 'View All Routes',
          to: '/manager/routes',
          icon: <ArrowLeft className="w-4 h-4" />
        }}
      />

      {/* Level 1 Route Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs text-center">
          <div className="text-[10px] uppercase font-bold text-slate-400">Visits</div>
          <div className="text-2xl font-extrabold text-navy font-mono mt-1">{m.visit_count} stops</div>
          <div className="text-[10px] text-slate-500">Scheduled</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs text-center">
          <div className="text-[10px] uppercase font-bold text-slate-400">Must-Visit (PTP)</div>
          <div className="text-2xl font-extrabold text-orange font-mono mt-1">{ptpCount}</div>
          <div className="text-[10px] text-slate-500">High-priority</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs text-center">
          <div className="text-[10px] uppercase font-bold text-slate-400">Distance</div>
          <div className="text-2xl font-extrabold text-navy font-mono mt-1">{m.total_km} km</div>
          <div className="text-[10px] text-slate-500">Road travel</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs text-center">
          <div className="text-[10px] uppercase font-bold text-slate-400">Return Home</div>
          <div className="text-2xl font-extrabold text-navy font-mono mt-1">{formatTime(m.return_time)}</div>
          <div className="text-[10px] text-emerald-600 font-semibold truncate">{APP_LOCATION.depotName}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs text-center col-span-2 md:col-span-1">
          <div className="text-[10px] uppercase font-bold text-slate-400">Duration</div>
          <div className="text-2xl font-extrabold text-navy font-mono mt-1">
            {Math.floor(m.total_duration_minutes / 60)}h {Math.round(m.total_duration_minutes % 60)}m
          </div>
          <div className="text-[10px] text-slate-500">Shift active</div>
        </div>
      </div>

      {/* Two Column Layout: Timeline on Left, Map on Right */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Sequential Timeline */}
        <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-navy">Visit Itinerary</h3>
            <span className="text-xs text-slate-400 font-mono">{route.timeline.length} Stops</span>
          </div>

          <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200">
            
            {/* Start Depot */}
            <div className="relative flex items-center gap-3 pl-8 text-xs">
              <div className="absolute left-2 w-3.5 h-3.5 rounded-full bg-navy ring-4 ring-white" />
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex-1 flex items-center justify-between">
                <div>
                  <span className="font-bold text-navy">Depart Home Depot</span>
                  <div className="text-[11px] text-slate-400">Shift Start</div>
                </div>
                <span className="font-mono font-bold text-navy">{formatTime(route.shift_start || "08:30")}</span>
              </div>
            </div>

            {/* Stops */}
            {route.timeline.map((stop) => (
              <div key={stop.customer_id} className="relative flex items-center gap-3 pl-8 text-xs">
                <div className={`absolute left-2 w-3.5 h-3.5 rounded-full ring-4 ring-white flex items-center justify-center text-[9px] font-bold text-white ${
                  stop.ptp_today === 1 ? 'bg-orange' : 'bg-slate-400'
                }`}>
                  {stop.seq}
                </div>

                <div className="p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition flex-1 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-navy">{stop.customer_name || `Account ${stop.customer_id}`}</span>
                      <span className="text-[11px] text-slate-400">({formatLocation(stop.area)})</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Window: {formatTimeRange(stop.window_start, stop.window_end)} · {stop.service_min}m visit
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex items-center gap-2">
                    {stop.status === 'completed' && (
                      <span className="font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300 text-[10px]">
                        ✓ Completed
                      </span>
                    )}
                    {stop.status === 'in_progress' && (
                      <span className="font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300 text-[10px] animate-pulse">
                        ● In Progress
                      </span>
                    )}
                    {stop.status === 'failed' && (
                      <span className="font-semibold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-300 text-[10px]">
                        ✕ Unsuccessful
                      </span>
                    )}
                    <div>
                      <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                        {formatTime(stop.arrival_time)}
                      </span>
                      {stop.ptp_today === 1 && (
                        <div className="text-[10px] font-bold text-orange mt-0.5">
                          PTP Required
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* End Depot */}
            <div className="relative flex items-center gap-3 pl-8 text-xs">
              <div className="absolute left-2 w-3.5 h-3.5 rounded-full bg-emerald-600 ring-4 ring-white" />
              <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 flex-1 flex items-center justify-between">
                <div>
                  <span className="font-bold text-emerald-900">Return to {APP_LOCATION.depotName}</span>
                  <div className="text-[11px] text-emerald-700">Collections hand-over</div>
                </div>
                <span className="font-mono font-bold text-emerald-900">{formatTime(m.return_time)}</span>
              </div>
            </div>

          </div>
        </div>

        {/* Right: Map View Container */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden h-[380px] sm:h-[480px] lg:h-[540px] sticky top-6">
          <MapContainer
            center={polylineCoords.length > 0 ? polylineCoords[0] : [APP_LOCATION.defaultCenter.lat, APP_LOCATION.defaultCenter.lng]}
            zoom={12}
            style={{ width: '100%', height: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapBoundsAdjuster points={polylineCoords} />
            {/* Executive Home Marker from imported data */}
            <Marker
              position={homeCoord}
              icon={createStopIcon('#173B56', 'H')}
            >
              <Popup>
                <div className="text-xs p-1">
                  <b>{route.executive_id} — {route.executive_name || 'Executive Home Base'}</b>
                  <br />
                  Start & Return Depot Location
                  <br />
                  Coordinates: {homeCoord[0]}, {homeCoord[1]}
                </div>
              </Popup>
            </Marker>
            {polylineCoords.length > 1 && (
              <Polyline
                positions={polylineCoords}
                color="#ee822a"
                weight={4}
                dashArray="6, 6"
              />
            )}
            {route.timeline.map((stop, sIdx) => {
              const markerPos = getDispersedMarkerPosition(stop, sIdx, route.timeline);
              return (
                <Marker
                  key={stop.customer_id}
                  position={markerPos}
                  icon={createStopIcon(stop.ptp_today === 1 ? '#ee822a' : '#1a3a52', String(stop.seq))}
                >
                  <Popup>
                    <div className="text-xs p-1">
                      <b>#{stop.seq} {stop.customer_name || stop.customer_id}</b>
                      <br />
                      Arrival: <b>{formatTime(stop.arrival_time)}</b> ({formatLocation(stop.area)})
                      <br />
                      Window: {formatTimeRange(stop.window_start, stop.window_end)}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

      </div>

    </div>
  );
};
