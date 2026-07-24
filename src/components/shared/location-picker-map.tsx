'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin, Locate, Loader2, Navigation } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface LocationPickerMapProps {
  initialLat?: number;
  initialLng?: number;
  onSelectLocation: (lat: number, lng: number, addressName?: string) => void;
  height?: string;
  autoDetectGPSOnMount?: boolean;
}

// ── Custom destination pin icon with pulse effect ──
function createPickerPinIcon() {
  return L.divIcon({
    html: `
      <div style="position:relative;width:36px;height:46px;cursor:grab;">
        <svg width="36" height="46" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.4));">
          <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 24 16 24s16-12 16-24C32 7.16 24.84 0 16 0z" fill="#DC2626"/>
          <circle cx="16" cy="16" r="7" fill="white"/>
          <circle cx="16" cy="16" r="4" fill="#DC2626"/>
        </svg>
        <div style="
          position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);
          width:16px;height:6px;border-radius:50%;background:rgba(0,0,0,0.25);
          filter:blur(1px);
        "></div>
      </div>
    `,
    className: '',
    iconSize: [36, 46],
    iconAnchor: [18, 44],
  });
}

export default function LocationPickerMap({
  initialLat,
  initialLng,
  onSelectLocation,
  height = '300px',
  autoDetectGPSOnMount = true,
}: LocationPickerMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [locatingGPS, setLocatingGPS] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [isGPSPosition, setIsGPSPosition] = useState(false);

  // Reverse geocoding function
  const reverseGeocode = useCallback(
    async (lat: number, lng: number) => {
      setGeocoding(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
          { headers: { 'User-Agent': 'SERIRAS-Emergency-System/1.0' } }
        );
        if (res.ok) {
          const data = await res.json();
          const name = data.display_name
            ? data.display_name.split(',').slice(0, 3).join(', ')
            : `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          setSelectedAddress(name);
          onSelectLocation(lat, lng, name);
        } else {
          onSelectLocation(lat, lng);
        }
      } catch {
        onSelectLocation(lat, lng);
      } finally {
        setGeocoding(false);
      }
    },
    [onSelectLocation]
  );

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Default starting point (will be overridden by browser GPS if autoDetectGPSOnMount is true)
    const lat = initialLat ?? 27.7172;
    const lng = initialLng ?? 85.324;

    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: 15,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([lat, lng], {
      icon: createPickerPinIcon(),
      draggable: true,
    }).addTo(map);

    // Marker Drag Event
    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      setIsGPSPosition(false);
      reverseGeocode(pos.lat, pos.lng);
    });

    // Map Click Event
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;
      marker.setLatLng([clickLat, clickLng]);
      setIsGPSPosition(false);
      reverseGeocode(clickLat, clickLng);
    });

    mapRef.current = map;
    markerRef.current = marker;

    // ── Auto Detect Live Device GPS on Mount ──
    if (autoDetectGPSOnMount && typeof navigator !== 'undefined' && navigator.geolocation) {
      setLocatingGPS(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userLat = pos.coords.latitude;
          const userLng = pos.coords.longitude;

          if (mapRef.current && markerRef.current) {
            mapRef.current.setView([userLat, userLng], 15);
            markerRef.current.setLatLng([userLat, userLng]);
          }

          setIsGPSPosition(true);
          setLocatingGPS(false);
          reverseGeocode(userLat, userLng);
        },
        () => {
          // Geolocation denied or unavailable -> keep initial coordinates & reverse geocode
          setLocatingGPS(false);
          reverseGeocode(lat, lng);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      reverseGeocode(lat, lng);
    }

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []); // Run once on mount

  // Sync marker position when initialLat/Lng change externally (e.g. from preset selection)
  useEffect(() => {
    if (mapRef.current && markerRef.current && initialLat != null && initialLng != null) {
      const currentPos = markerRef.current.getLatLng();
      if (Math.abs(currentPos.lat - initialLat) > 0.0001 || Math.abs(currentPos.lng - initialLng) > 0.0001) {
        markerRef.current.setLatLng([initialLat, initialLng]);
        mapRef.current.panTo([initialLat, initialLng]);
        setIsGPSPosition(false);
      }
    }
  }, [initialLat, initialLng]);

  // Handle Location Search
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setSearchResults([]);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery.trim()
        )}&limit=5`,
        { headers: { 'User-Agent': 'SERIRAS-Emergency-System/1.0' } }
      );
      if (res.ok) {
        const results = await res.json();
        setSearchResults(results);
      }
    } catch {
      console.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  // Select Search Result
  const handleSelectSearchResult = (result: { display_name: string; lat: string; lon: string }) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const shortName = result.display_name.split(',').slice(0, 3).join(', ');

    if (mapRef.current && markerRef.current) {
      mapRef.current.setView([lat, lng], 15);
      markerRef.current.setLatLng([lat, lng]);
    }

    setSelectedAddress(shortName);
    setIsGPSPosition(false);
    onSelectLocation(lat, lng, shortName);
    setSearchResults([]);
    setSearchQuery('');
  };

  // Locate Driver/User Current GPS Location
  const handleLocateMe = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    setLocatingGPS(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (mapRef.current && markerRef.current) {
          mapRef.current.setView([latitude, longitude], 15);
          markerRef.current.setLatLng([latitude, longitude]);
        }
        setIsGPSPosition(true);
        setLocatingGPS(false);
        reverseGeocode(latitude, longitude);
      },
      () => {
        setLocatingGPS(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className="space-y-2">
      {/* Search Input Bar */}
      <form onSubmit={handleSearch} className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search your city, street, or hospital (e.g. Pokhara, Patan Hospital)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs sm:text-sm h-9"
          />
        </div>
        <Button type="submit" size="sm" variant="secondary" disabled={searching} className="h-9 gap-1 text-xs">
          {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          Search
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={handleLocateMe} disabled={locatingGPS} className="h-9 px-2.5 text-xs gap-1" title="Go to My Local GPS Location">
          {locatingGPS ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Locate className="h-3.5 w-3.5 text-blue-600" />}
          <span className="hidden sm:inline">My GPS</span>
        </Button>
      </form>

      {/* Search Results Dropdown */}
      {searchResults.length > 0 && (
        <div className="bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto divide-y divide-border z-50 text-xs">
          {searchResults.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectSearchResult(item)}
              className="w-full text-left p-2.5 hover:bg-muted transition-colors flex items-start gap-2"
            >
              <MapPin className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <span className="line-clamp-2">{item.display_name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Map Container */}
      <div className="relative rounded-lg overflow-hidden border border-border">
        <div ref={containerRef} style={{ height, width: '100%' }} className="z-10" />

        {/* Status Badges Overlay */}
        <div className="absolute top-2 right-2 z-20 flex flex-col items-end gap-1 pointer-events-none">
          {isGPSPosition && (
            <div className="bg-blue-600 text-white px-2.5 py-1 rounded text-[11px] font-semibold shadow flex items-center gap-1">
              <Navigation className="h-3 w-3" />
              <span>Current GPS Location</span>
            </div>
          )}
          <div className="bg-background/90 backdrop-blur-sm border border-border px-2.5 py-1 rounded text-[11px] font-medium shadow flex items-center gap-1.5">
            <MapPin className="h-3 w-3 text-destructive" />
            <span>Click map or drag pin to move location</span>
          </div>
        </div>

        {/* Loading Indicators */}
        {(geocoding || locatingGPS) && (
          <div className="absolute bottom-2 left-2 z-20 bg-background/95 border border-border px-2.5 py-1 rounded text-[11px] shadow flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin text-primary" />
            <span>{locatingGPS ? 'Detecting device GPS...' : 'Resolving address...'}</span>
          </div>
        )}
      </div>

      {/* Selected Address Display */}
      {selectedAddress && (
        <div className="text-xs text-muted-foreground flex items-center gap-1.5 px-1 truncate">
          <MapPin className="h-3.5 w-3.5 text-destructive shrink-0" />
          <span className="truncate font-medium text-foreground">{selectedAddress}</span>
        </div>
      )}
    </div>
  );
}
