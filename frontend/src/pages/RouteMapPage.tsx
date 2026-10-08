import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Filter, Compass, ArrowLeft, Layers, ShieldCheck } from 'lucide-react';
import { planningService } from '../services/api';
import { PlanDetail } from '../types';
import { usePlan } from '../context/PlanContext';
import { useOperationalDate } from '../context/DateTimeContext';
import { APP_LOCATION } from '../config/locale';
import { formatTime, formatTimeRange, formatLocation, formatCurrencyINR } from '../utils/formatters';

// Custom Map Markers
const createIcon = (color: string, label: string) => {
  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: `<div style="background-color: ${color}; color: white; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; border: 2px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.3);">${label}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
};

const EXEC_COLORS = [
  '#F58220', '#173B56', '#0284c7', '#0FA968', '#8b5cf6', '#E9A23B',
  '#EC4899', '#14B8A6', '#F43F5E', '#6366F1', '#84CC16', '#06B6D4',
  '#D97706', '#4F46E5', '#10B981', '#E11D48', '#2563EB', '#7C3AED',
  '#059669', '#EA580C'
];

import { useMap } from 'react-leaflet';

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

// Disperse identical coordinates slightly so all markers remain visible and clickable
const getDispersedMarkerPosition = (
  lat: number,
  lon: number,
  index: number,
  allStops: { lat: number; lon: number }[]
): [number, number] => {
  const sameCoordStops = allStops.filter(
    (s) => Math.abs(s.lat - lat) < 0.00005 && Math.abs(s.lon - lon) < 0.00005
  );
  if (sameCoordStops.length <= 1) return [lat, lon];
  const order = sameCoordStops.findIndex(
    (s, i) => i === index || (Math.abs(s.lat - lat) < 0.00005 && Math.abs(s.lon - lon) < 0.00005 && i === index)
  );
  if (order <= 0) return [lat, lon];
  const angle = (order * (2 * Math.PI)) / sameCoordStops.length;
  const radius = 0.00035;
  return [lat + radius * Math.cos(angle), lon + radius * Math.sin(angle)];
};

export const RouteMapPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentPlan } = usePlan();
  const { formattedDate, operationalDate, isToday } = useOperationalDate();
  const [plan, setPlan] = useState<PlanDetail | null>((!id || id === 'latest') ? currentPlan : null);
  const [loading, setLoading] = useState((!id || id === 'latest') ? !currentPlan : true);
  const [selectedExec, setSelectedExec] = useState<string>('all');
  const [filterPtpOnly, setFilterPtpOnly] = useState<boolean>(false);

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
      setPlan(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-slate-400">
        Loading route visualization for {APP_LOCATION.urbanArea}...
      </div>
    );
  }

  const routes = plan ? Object.values(plan.routes) : [];
  const activeRoutes = selectedExec === 'all' ? routes : routes.filter(r => r.executive_id === selectedExec);

  // Collect all points for map bounds adjustment (both executive homes and customer stops)
  const allPoints: [number, number][] = [];
  activeRoutes.forEach(r => {
    if (r.home_lat && r.home_lon) allPoints.push([r.home_lat, r.home_lon]);
    r.timeline.forEach(s => {
      if (s.lat && s.lon) allPoints.push([s.lat, s.lon]);
    });
  });

  return (
    <div className="space-y-4 h-[calc(100vh-6rem)] flex flex-col">
      
      {/* Top Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/manager/routes" className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-base font-bold text-navy">Interactive Route Map</h1>
            <p className="text-[11px] text-slate-500">{APP_LOCATION.urbanArea} · {formattedDate}</p>
          </div>
        </div>

        {routes.length > 0 ? (
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-navy">Executive:</span>
              <select
                value={selectedExec}
                onChange={(e) => setSelectedExec(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-navy focus:outline-none"
              >
                <option value="all">All Executives ({routes.length})</option>
                {routes.map(r => (
                  <option key={r.executive_id} value={r.executive_id}>{r.executive_id} — {r.executive_name}</option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-navy">
              <input
                type="checkbox"
                checked={filterPtpOnly}
                onChange={(e) => setFilterPtpOnly(e.target.checked)}
                className="rounded border-slate-300 text-orange focus:ring-orange"
              />
              <span>PTP Accounts Only</span>
            </label>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to="/manager/data/import"
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#FF7A18] hover:bg-[#e06509] text-white transition shadow-sm"
            >
              Import Data
            </Link>
            <Link
              to="/manager/plan"
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#123A55] hover:bg-[#0D2536] text-white transition shadow-sm"
            >
              Plan Routes
            </Link>
          </div>
        )}
      </div>

      {/* Map Container */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
        {routes.length === 0 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white/95 backdrop-blur px-4 py-2.5 rounded-xl border border-amber-200 shadow-md text-xs text-amber-800 flex items-center gap-2 pointer-events-auto">
            <span>No route plan generated for {formattedDate} yet. Please import data and run optimization.</span>
          </div>
        )}

        <MapContainer
          center={allPoints.length > 0 ? allPoints[0] : [APP_LOCATION.defaultCenter.lat, APP_LOCATION.defaultCenter.lng]}
          zoom={12}
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapBoundsAdjuster points={allPoints} />

          {activeRoutes.map((r, rIdx) => {
            const color = EXEC_COLORS[rIdx % EXEC_COLORS.length];
            const timeline = filterPtpOnly ? r.timeline.filter(s => s.ptp_today === 1) : r.timeline;
            
            // Build polyline starting and ending at imported executive home
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
                    icon={createIcon('#173B56', 'H')}
                  >
                    <Popup>
                      <div className="p-2 space-y-1 text-xs">
                        <div className="font-bold text-navy">{r.executive_id} — {r.executive_name || 'Executive Home Base'}</div>
                        <div className="text-[11px] text-slate-500">Executive Start & Return Location</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {r.home_lat}, {r.home_lon}
                        </div>
                        <div className="text-[11px] font-semibold text-emerald-700">
                          Return: {formatTime(r.metrics.return_time)} · {r.metrics.total_km} km
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
                  const markerPos = getDispersedMarkerPosition(stop.lat, stop.lon, sIdx, timeline);
                  return (
                    <Marker
                      key={stop.customer_id}
                      position={markerPos}
                      icon={createIcon(stop.ptp_today === 1 ? '#ee822a' : color, String(stop.seq))}
                    >
                    <Popup>
                      <div className="p-2 space-y-1 text-xs">
                        <div className="font-bold text-navy">{stop.customer_name || stop.customer_id}</div>
                        <div className="text-[11px] text-slate-500">{formatLocation(stop.area)}</div>
                        <div className="text-[11px]">
                          Sequence: <b>#{stop.seq}</b> · Arrive: <b>{formatTime(stop.arrival_time)}</b>
                        </div>
                        <div className="text-[11px]">
                          Window: <b>{formatTimeRange(stop.window_start, stop.window_end)}</b>
                        </div>
                        <div className="text-[11px]">
                          Overdue: <b>{formatCurrencyINR(stop.overdue_amount)}</b> · Priority: <b>{stop.priority_score}</b>
                        </div>
                        {stop.ptp_today === 1 && (
                          <div className="mt-1 px-2 py-0.5 rounded bg-orange/15 text-orange font-bold text-[10px] inline-block">
                            PTP MUST-VISIT TODAY
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 pt-1">
                          Assigned to: {r.executive_id} ({r.executive_name})
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
              </React.Fragment>
            );
          })}
        </MapContainer>

        {/* Floating Map Legend (Section 9 Specification) */}
        <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur p-3.5 rounded-xl border border-slate-200 shadow-lg text-xs space-y-2 pointer-events-auto">
          <div className="font-bold text-navy text-[11px] uppercase tracking-wider">Map Legend</div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-[#FF7A18] flex items-center justify-center text-[9px] text-white font-bold">P</span>
            <span className="text-slate-600">PTP / Must Visit</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-[#123A55] flex items-center justify-center text-[9px] text-white font-bold">1</span>
            <span className="text-slate-600">Scheduled Visit</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-[#10A88A] flex items-center justify-center text-[9px] text-white font-bold">✓</span>
            <span className="text-slate-600">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-slate-700 flex items-center justify-center text-[9px] text-white font-bold">H</span>
            <span className="text-slate-600">Home / Central Depot</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 border-t-2 border-dashed border-[#FF7A18]" />
            <span className="text-slate-600">Executive Route</span>
          </div>
        </div>
      </div>

    </div>
  );
};
