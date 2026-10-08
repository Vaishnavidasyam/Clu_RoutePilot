import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { NextStopData } from './NextStopCard';
import { MapPin, Navigation, Maximize2 } from 'lucide-react';
import { APP_LOCATION } from '../../config/locale';
import { formatTime } from '../../utils/formatters';

interface FieldRouteMapProps {
  stops: NextStopData[];
  currentStopId?: number;
  homeCoords?: [number, number];
  height?: string;
  onMaximize?: () => void;
}

const createPinIcon = (color: string, label: string, isCurrent = false) => {
  const size = isCurrent ? 32 : 24;
  const pulseClass = isCurrent ? 'box-shadow: 0 0 0 4px rgba(245, 130, 32, 0.4);' : '';
  return L.divIcon({
    className: 'field-map-pin',
    html: `<div style="background-color: ${color}; color: white; width: ${size}px; height: ${size}px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: ${isCurrent ? '12px' : '10px'}; font-weight: 800; border: 2px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.25); ${pulseClass}">${label}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

function MapBoundsAdjuster({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    try {
      if (points.length === 1) {
        map.setView(points[0], 13);
      } else {
        const bounds = L.latLngBounds(points);
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [35, 35], maxZoom: 15 });
        }
      }
    } catch {
      // safe fallback
    }
  }, [map, points]);
  return null;
}

// Disperse identical coordinates slightly so all markers remain visible
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

export const FieldRouteMap: React.FC<FieldRouteMapProps> = ({
  stops,
  currentStopId,
  homeCoords = [APP_LOCATION.defaultCenter.lat, APP_LOCATION.defaultCenter.lng],
  height = '100%',
  onMaximize
}) => {
  // Center calculation
  const validStops = stops.filter(s => s.lat && s.lon);
  const centerLat = validStops.length > 0 ? validStops[0].lat : homeCoords[0];
  const centerLon = validStops.length > 0 ? validStops[0].lon : homeCoords[1];

  // All coordinates for auto-fit
  const allFitCoords: [number, number][] = [
    homeCoords,
    ...validStops.map(s => [s.lat, s.lon] as [number, number])
  ];

  // Route Polyline Points: Home -> Stops -> Home
  const polylineCoords: [number, number][] = [
    homeCoords,
    ...validStops.map(s => [s.lat, s.lon] as [number, number]),
    homeCoords
  ];

  return (
    <div className="relative w-full h-full min-h-[320px] rounded-2xl overflow-hidden border border-[#E3EBEF] shadow-sm bg-white">
      <MapContainer
        center={[centerLat, centerLon]}
        zoom={13}
        style={{ height, width: '100%' }}
        scrollWheelZoom={false}
      >
        <MapBoundsAdjuster points={allFitCoords} />

        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Depots: Home base start/end */}
        <Marker 
          position={homeCoords} 
          icon={createPinIcon('#173B56', 'H')}
        >
          <Popup>
            <div className="text-xs font-bold text-[#173B56]">
              <b>Executive Home Base</b>
              <p className="text-[11px] text-slate-500 font-normal">Starting & Shift Return Base</p>
            </div>
          </Popup>
        </Marker>

        {/* Route Line */}
        <Polyline
          positions={polylineCoords}
          pathOptions={{
            color: '#F58220',
            weight: 3.5,
            opacity: 0.85,
            dashArray: '5, 8'
          }}
        />

        {/* Customer Stop Pins */}
        {validStops.map((stop, sIdx) => {
          const isCurrent = stop.stop_id === currentStopId;
          const isCompleted = stop.status === 'completed';
          const isFailed = stop.status === 'failed';
          
          let color = '#687F91'; // default upcoming
          if (isCurrent) color = '#F58220'; // vibrant orange
          else if (isCompleted) color = '#159A78'; // emerald completed
          else if (isFailed) color = '#D94B4B'; // rose skipped/failed

          const markerPos = getDispersedMarkerPosition(stop.lat, stop.lon, sIdx, validStops);

          return (
            <Marker
              key={stop.stop_id}
              position={markerPos}
              icon={createPinIcon(color, String(stop.seq), isCurrent)}
            >
              <Popup>
                <div className="text-xs space-y-1 font-sans">
                  <div className="font-bold text-[#173B56]">{stop.customer_name || stop.customer_id}</div>
                  <div className="text-[11px] text-slate-500">Stop #{stop.seq} · Expected: {formatTime(stop.arrival_time)}</div>
                  {stop.ptp_today === 1 && (
                    <span className="inline-block px-1.5 py-0.5 rounded bg-[#F58220]/15 text-[#F58220] font-bold text-[10px]">
                      ★ PTP TODAY
                    </span>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Top Map Overlay Controls */}
      <div className="absolute top-3 left-3 z-[1000] flex items-center gap-1.5 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-[#173B56] shadow-sm">
        <Navigation className="w-3.5 h-3.5 text-[#F58220]" />
        <span>Today&apos;s Route Path</span>
      </div>

      {onMaximize && (
        <button
          onClick={onMaximize}
          className="absolute top-3 right-3 z-[1000] p-2 bg-white/90 hover:bg-white backdrop-blur-md rounded-xl border border-slate-200 text-slate-600 hover:text-[#173B56] shadow-sm transition"
          title="Toggle Fullscreen Map"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Bottom Route Legend */}
      <div className="absolute bottom-3 left-3 right-3 z-[1000] bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 text-[10px] font-bold text-[#173B56] shadow-sm flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F58220]" />
            <span>Next/Active</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#159A78]" />
            <span>Done</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#687F91]" />
            <span>Upcoming</span>
          </div>
        </div>
        <div className="text-slate-400 font-medium">Haversine × 1.3</div>
      </div>
    </div>
  );
};
