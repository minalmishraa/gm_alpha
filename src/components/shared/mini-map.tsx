'use client';

import { useEffect, useRef, useMemo } from 'react';
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
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routesLayerRef = useRef<L.LayerGroup | null>(null);

  const config = useMemo(() => {
    return VEHICLE_TYPE_CONFIG[emergency.vehicleType as keyof typeof VEHICLE_TYPE_CONFIG] ?? VEHICLE_TYPE_CONFIG.AMBULANCE;
  }, [emergency.vehicleType]);

  // ── Initialize map once ──
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [emergency.destinationLatitude, emergency.destinationLongitude],
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

    const markersLayer = L.layerGroup().addTo(map);
    const routesLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    routesLayerRef.current = routesLayer;
    mapRef.current = map;

    // Inject pulse animation (only once)
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
      markersLayerRef.current = null;
      routesLayerRef.current = null;
    };
  // Intentionally empty — map initializes once
  }, []);

  // ── Update markers when emergency data changes ──
  useEffect(() => {
    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;
    const routesLayer = routesLayerRef.current;
    if (!map || !markersLayer || !routesLayer) return;

    markersLayer.clearLayers();
    routesLayer.clearLayers();

    const vLat = emergency.currentLatitude ?? emergency.destinationLatitude;
    const vLng = emergency.currentLongitude ?? emergency.destinationLongitude;
    const dLat = emergency.destinationLatitude;
    const dLng = emergency.destinationLongitude;

    const vPos: L.LatLngExpression = [vLat, vLng];
    const dPos: L.LatLngExpression = [dLat, dLng];

    // Vehicle marker
    markersLayer.addLayer(
      L.marker(vPos, { icon: createMiniVehicleIcon(emergency.vehicleType) })
    );

    // Destination marker
    markersLayer.addLayer(
      L.marker(dPos, { icon: createMiniDestinationIcon() })
    );

    // Route polyline
    const routePts = buildRoutePoints([vLat, vLng], [dLat, dLng]);
    routesLayer.addLayer(
      L.polyline(routePts, {
        color: config.color,
        weight: 3,
        opacity: 0.8,
        dashArray: '8, 10',
        lineCap: 'round' as const,
        lineJoin: 'round' as const,
      })
    );

    // Fit bounds to show both points
    const bounds = L.latLngBounds([vPos, dPos]);
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [20, 20], maxZoom: 15 });
    }
  }, [emergency.currentLatitude, emergency.currentLongitude, emergency.destinationLatitude, emergency.destinationLongitude, emergency.vehicleType, config]);

  // ETA text for the overlay
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
        style={{ minHeight: '100px' }}
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

// Generate slightly curved waypoints between two coords
function buildRoutePoints(a: [number, number], b: [number, number]): L.LatLngExpression[] {
  const pts: L.LatLngExpression[] = [a];
  const steps = 3;
  for (let i = 1; i <= steps; i++) {
    const t = i / (steps + 1);
    const lat = a[0] + (b[0] - a[0]) * t;
    const lng = a[1] + (b[1] - a[1]) * t;
    const offset = (Math.random() - 0.5) * 0.002;
    const dx = -(b[1] - a[1]);
    const dy = b[0] - a[0];
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    pts.push([lat + (dx / len) * offset, lng + (dy / len) * offset]);
  }
  pts.push(b);
  return pts;
}
