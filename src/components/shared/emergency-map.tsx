'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { VEHICLE_TYPE_CONFIG, DEFAULT_CENTER, DEFAULT_ZOOM } from '@/lib/constants';
import type { Emergency } from '@/lib/types';

// ── Emergency vehicle marker icon ──
function createVehicleIcon(vehicleType: string) {
  const config = VEHICLE_TYPE_CONFIG[vehicleType as keyof typeof VEHICLE_TYPE_CONFIG] ?? VEHICLE_TYPE_CONFIG.AMBULANCE;
  const color = config.color;

  return L.divIcon({
    html: `
      <div style="position:relative;width:44px;height:44px;">
        <div style="
          position:absolute;inset:0;
          display:flex;align-items:center;justify-content:center;
          font-size:22px;
          filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));
        ">${config.emoji}</div>
        <div style="
          position:absolute;bottom:0;left:50%;transform:translateX(-50%);
          width:14px;height:14px;border-radius:50%;background:${color};
          border:2px solid white;box-shadow:0 0 10px ${color};
        "></div>
      </div>
    `,
    className: '',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

// ── Destination marker (red pin) ──
function createDestinationIcon() {
  return L.divIcon({
    html: `
      <div style="position:relative;width:28px;height:36px;">
        <svg width="28" height="36" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 24 16 24s16-12 16-24C32 7.16 24.84 0 16 0z" fill="#DC2626"/>
          <text x="16" y="21" text-anchor="middle" fill="white" font-size="14">H</text>
        </svg>
      </div>
    `,
    className: '',
    iconSize: [28, 36],
    iconAnchor: [14, 36],
  });
}

// ── Pulse ring around vehicle (animated) ──
function createPulseIcon(vehicleType: string) {
  const config = VEHICLE_TYPE_CONFIG[vehicleType as keyof typeof VEHICLE_TYPE_CONFIG] ?? VEHICLE_TYPE_CONFIG.AMBULANCE;
  const color = config.color;

  return L.divIcon({
    html: `
      <div style="
        width:56px;height:56px;border-radius:50%;
        background:${color}33;
        border:2px solid ${color};
        animation:emap-pulse 2s ease-out infinite;
      "></div>
    `,
    className: 'emap-pulse-marker',
    iconSize: [56, 56],
    iconAnchor: [28, 28],
  });
}

interface EmergencyMapProps {
  emergencies: Emergency[];
  userLat?: number;
  userLng?: number;
}

export default function EmergencyMap({ emergencies, userLat, userLng }: EmergencyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routesLayerRef = useRef<L.LayerGroup | null>(null);

  // ── Initialize map once ──
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const center: [number, number] = (userLat && userLng)
      ? [userLat, userLng]
      : DEFAULT_CENTER;

    const map = L.map(containerRef.current, {
      center,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
      attributionControl: false,
      scrollWheelZoom: true,
      dragging: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    const routesLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    routesLayerRef.current = routesLayer;
    mapRef.current = map;

    // Inject pulse keyframes (only once per page)
    const styleId = 'emergency-map-anim-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes emap-pulse {
          0%   { transform: scale(1);   opacity: 0.7; }
          100% { transform: scale(2.8); opacity: 0;   }
        }
        .emap-pulse-marker {
          animation: emap-pulse 2s ease-out infinite;
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
  }, []);

  // ── Update markers + routes whenever emergencies update ──
  useEffect(() => {
    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;
    const routesLayer = routesLayerRef.current;
    if (!map || !markersLayer || !routesLayer) return;

    markersLayer.clearLayers();
    routesLayer.clearLayers();

    const bounds = L.latLngBounds([] as L.LatLngExpression[]);
    let hasValid = false;

    for (const em of emergencies) {
      if (em.currentLatitude == null || em.currentLongitude == null) continue;

      const vPos: L.LatLngExpression = [em.currentLatitude, em.currentLongitude];
      const dPos: L.LatLngExpression = [em.destinationLatitude, em.destinationLongitude];
      hasValid = true;

      // Pulse ring
      markersLayer.addLayer(
        L.marker(vPos, { icon: createPulseIcon(em.vehicleType), interactive: false })
      );

      // Vehicle marker with popup
      const config = VEHICLE_TYPE_CONFIG[em.vehicleType as keyof typeof VEHICLE_TYPE_CONFIG] ?? VEHICLE_TYPE_CONFIG.AMBULANCE;
      const etaMin = em.eta ? `${Math.ceil(em.eta / 60)} min` : '—';
      const speedText = em.speed ? `${em.speed} km/h` : '—';
      const distText = em.distanceRemaining != null ? `${em.distanceRemaining.toFixed(1)} km` : '—';
      const driverName = em.driver?.user?.name ?? 'Unknown';

      const vehicleMarker = L.marker(vPos, { icon: createVehicleIcon(em.vehicleType) });
      vehicleMarker.bindPopup(
        `<div style="font-family:system-ui,sans-serif;min-width:170px;">
          <div style="font-weight:700;font-size:14px;margin-bottom:6px;">${config.emoji} ${config.label}</div>
          <div style="font-size:12px;color:#444;line-height:1.6;">
            <div>🧑 <strong>${driverName}</strong></div>
            <div>📍 Destination: <strong>${em.destinationName}</strong></div>
            <div style="margin-top:4px;display:flex;gap:12px;">
              <span>⏱ <strong>${etaMin}</strong></span>
              <span>🚀 ${speedText}</span>
              <span>📏 ${distText}</span>
            </div>
          </div>
        </div>`
      );
      markersLayer.addLayer(vehicleMarker);

      // Destination marker
      const destMarker = L.marker(dPos, { icon: createDestinationIcon() });
      destMarker.bindPopup(
        `<div style="font-family:system-ui,sans-serif;font-size:13px;">
          <strong>🏥 ${em.destinationName}</strong>
        </div>`
      );
      markersLayer.addLayer(destMarker);

      // Route polyline (dashed)
      const routePts = buildRoutePoints(
        [em.currentLatitude, em.currentLongitude],
        [em.destinationLatitude, em.destinationLongitude]
      );
      routesLayer.addLayer(
        L.polyline(routePts, {
          color: config.color,
          weight: 3,
          opacity: 0.7,
          dashArray: '10, 14',
          lineCap: 'round' as const,
          lineJoin: 'round' as const,
        })
      );

      bounds.extend(vPos);
      bounds.extend(dPos);
    }

    if (userLat && userLng) {
      bounds.extend([userLat, userLng]);
      hasValid = true;
    }

    if (hasValid && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [emergencies, userLat, userLng]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full rounded-lg overflow-hidden"
      style={{ minHeight: '280px' }}
    />
  );
}

// Generate slightly curved waypoints between two coords
function buildRoutePoints(a: [number, number], b: [number, number]): L.LatLngExpression[] {
  const pts: L.LatLngExpression[] = [a];
  const steps = 3 + Math.floor(Math.random() * 2);
  for (let i = 1; i <= steps; i++) {
    const t = i / (steps + 1);
    const lat = a[0] + (b[0] - a[0]) * t;
    const lng = a[1] + (b[1] - a[1]) * t;
    const offset = (Math.random() - 0.5) * 0.003;
    const dx = -(b[1] - a[1]);
    const dy = b[0] - a[0];
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    pts.push([lat + (dx / len) * offset, lng + (dy / len) * offset]);
  }
  pts.push(b);
  return pts;
}
