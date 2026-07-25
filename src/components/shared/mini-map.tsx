'use client';

import { useEffect, useRef, useMemo, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { VEHICLE_TYPE_CONFIG } from '@/lib/constants';
import type { Emergency } from '@/lib/types';

interface MiniMapProps {
  emergency: Emergency;
  className?: string;
}

// ── Small vehicle emoji icon ──
function createMiniVehicleIcon(vehicleType: string) {
  const config = VEHICLE_TYPE_CONFIG[vehicleType as keyof typeof VEHICLE_TYPE_CONFIG] ?? VEHICLE_TYPE_CONFIG.AMBULANCE;
  const color = config.color;

  return L.divIcon({
    html: `
      <div style="position:relative;width:32px;height:32px;">
        <div style="
          position:absolute;inset:0;
          display:flex;align-items:center;justify-content:center;
          font-size:18px;
          filter:drop-shadow(0 1px 3px rgba(0,0,0,0.6));
          z-index:2;
        ">${config.emoji}</div>
        <div style="
          position:absolute;bottom:-2px;left:50%;transform:translateX(-50%);
          width:10px;height:10px;border-radius:50%;background:${color};
          border:2px solid white;box-shadow:0 0 8px ${color};
        "></div>
        <!-- Pulse ring -->
        <div style="
          position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
          width:32px;height:32px;border-radius:50%;
          background:${color}33;
          border:2px solid ${color};
          animation:mini-pulse 2s ease-out infinite;
        "></div>
      </div>
    `,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

// ── Small destination pin icon ──
function createMiniDestinationIcon() {
  return L.divIcon({
    html: `
      <div style="position:relative;width:22px;height:28px;">
        <svg width="22" height="28" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 24 16 24s16-12 16-24C32 7.16 24.84 0 16 0z" fill="#DC2626"/>
          <text x="16" y="21" text-anchor="middle" fill="white" font-size="14">H</text>
        </svg>
      </div>
    `,
    className: '',
    iconSize: [22, 28],
    iconAnchor: [11, 28],
  });
}

export default function MiniMap({ emergency, className = '' }: MiniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const vehicleMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  const [routeGeometry, setRouteGeometry] = useState<L.LatLngExpression[]>([]);

  const config = useMemo(() => {
    return VEHICLE_TYPE_CONFIG[emergency.vehicleType as keyof typeof VEHICLE_TYPE_CONFIG] ?? VEHICLE_TYPE_CONFIG.AMBULANCE;
  }, [emergency.vehicleType]);

  const vLat = emergency.currentLatitude ?? emergency.destinationLatitude;
  const vLng = emergency.currentLongitude ?? emergency.destinationLongitude;
  const dLat = emergency.destinationLatitude;
  const dLng = emergency.destinationLongitude;

  // ── Fetch Real Road Navigation Polyline via OpenStreetMap OSRM API ──
  useEffect(() => {
    let isMounted = true;
    const fetchRealRoadRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${vLng},${vLat};${dLng},${dLat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.routes && data.routes.length > 0) {
            const coords: [number, number][] = data.routes[0].geometry.coordinates;
            // OSRM returns [lon, lat], convert to Leaflet [lat, lon]
            const leafletCoords: L.LatLngExpression[] = coords.map(([lon, lat]) => [lat, lon]);
            if (isMounted) {
              setRouteGeometry(leafletCoords);
              return;
            }
          }
        }
      } catch {
        // Fallback to straight line
      }
      if (isMounted) {
        setRouteGeometry([[vLat, vLng], [dLat, dLng]]);
      }
    };

    fetchRealRoadRoute();
    return () => {
      isMounted = false;
    };
  }, [vLat, vLng, dLat, dLng]);

  // ── Initialize map once on mount ──
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [dLat, dLng],
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
      dragging: false,
      doubleClickZoom: false,
      touchZoom: false,
      boxZoom: false,
      keyboard: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    // Initial vehicle marker
    const vMarker = L.marker([vLat, vLng], { icon: createMiniVehicleIcon(emergency.vehicleType) }).addTo(map);
    // Initial destination marker
    const dMarker = L.marker([dLat, dLng], { icon: createMiniDestinationIcon() }).addTo(map);
    // Initial polyline
    const polyline = L.polyline([[vLat, vLng], [dLat, dLng]], {
      color: config.color,
      weight: 3.5,
      opacity: 0.85,
      dashArray: '8, 8',
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    vehicleMarkerRef.current = vMarker;
    destMarkerRef.current = dMarker;
    polylineRef.current = polyline;
    mapRef.current = map;

    // Fit bounds once at initialization
    const bounds = L.latLngBounds([[vLat, vLng], [dLat, dLng]]);
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [22, 22], maxZoom: 15 });
    }

    // Inject pulse animation CSS if needed
    const styleId = 'mini-map-anim-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes mini-pulse {
          0%   { transform: translate(-50%,-50%) scale(1);   opacity: 0.6; }
          100% { transform: translate(-50%,-50%) scale(2.2); opacity: 0;   }
        }
      `;
      document.head.appendChild(style);
    }

    return () => {
      map.remove();
      mapRef.current = null;
      vehicleMarkerRef.current = null;
      destMarkerRef.current = null;
      polylineRef.current = null;
    };
  }, []); // Run once on mount

  // ── Smooth updates without map re-creation or DOM flickering ──
  useEffect(() => {
    if (!mapRef.current) return;

    // 1. Update vehicle position without recreating marker
    if (vehicleMarkerRef.current) {
      vehicleMarkerRef.current.setLatLng([vLat, vLng]);
    }

    // 2. Update destination position
    if (destMarkerRef.current) {
      destMarkerRef.current.setLatLng([dLat, dLng]);
    }

    // 3. Update route line coordinates seamlessly
    if (polylineRef.current) {
      const pts = routeGeometry.length > 0 ? routeGeometry : [[vLat, vLng], [dLat, dLng]];
      polylineRef.current.setLatLngs(pts);
      polylineRef.current.setStyle({ color: config.color });
    }

    // 4. Smoothly pan map to cover both points
    const bounds = L.latLngBounds([[vLat, vLng], [dLat, dLng]]);
    if (bounds.isValid() && mapRef.current) {
      mapRef.current.fitBounds(bounds, { padding: [20, 20], maxZoom: 15, animate: true });
    }
  }, [vLat, vLng, dLat, dLng, routeGeometry, config.color]);

  // ETA text for overlay badge
  const etaText = emergency.eta
    ? emergency.eta > 60
      ? `${Math.ceil(emergency.eta / 60)} min`
      : `${emergency.eta}s`
    : '—';

  return (
    <div className={`relative rounded-lg overflow-hidden border-2 border-gray-700 dark:border-gray-600 ${className}`}>
      {/* Map container */}
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ minHeight: '110px' }}
      />
      {/* ETA overlay badge */}
      <div className="absolute top-2 right-2 z-[1000]">
        <div className="bg-black/80 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-lg flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          ETA {etaText}
        </div>
      </div>
      {/* Speed overlay badge */}
      {emergency.speed != null && (
        <div className="absolute bottom-2 left-2 z-[1000]">
          <div className="bg-black/70 backdrop-blur-sm text-white text-[9px] font-medium px-1.5 py-0.5 rounded shadow">
            {emergency.speed} km/h
          </div>
        </div>
      )}
      {/* Game-style minimap corner frame */}
      <div className="absolute inset-0 pointer-events-none z-[999]">
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white/40 rounded-tl-sm" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white/40 rounded-tr-sm" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white/40 rounded-bl-sm" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white/40 rounded-br-sm" />
      </div>
    </div>
  );
}
