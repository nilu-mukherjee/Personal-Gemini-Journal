'use client';

import React, { useState, useEffect, useRef } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { 
  MapPin, 
  Search, 
  Navigation, 
  X, 
  Compass, 
  Map as MapIcon,
  Sparkles,
  Info
} from 'lucide-react';
import { LocationData } from '@/lib/firestore-utils';

interface GoogleMapPickerProps {
  location: LocationData | null;
  onSelectLocation: (loc: LocationData | null) => void;
  readOnly?: boolean;
}

const PRESET_PLACES = [
  { name: 'San Francisco, CA', lat: 37.7749, lng: -122.4194 },
  { name: 'Tokyo, Japan', lat: 35.6762, lng: 139.6503 },
  { name: 'Paris, France', lat: 48.8566, lng: 2.3522 },
  { name: 'New York, NY', lat: 40.7128, lng: -74.0060 },
  { name: 'Kyoto, Japan', lat: 35.0116, lng: 135.7681 },
  { name: 'Zürich, Switzerland', lat: 47.3769, lng: 8.5417 },
];

export const GoogleMapPicker: React.FC<GoogleMapPickerProps> = ({
  location,
  onSelectLocation,
  readOnly = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [authFailed, setAuthFailed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [, setCustomName] = useState(location?.name || '');

  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);

  // Validate API key format: genuine Google Maps Platform API keys start with 'AIza'
  // Credentials with other prefixes (e.g. Gemini/AI Studio 'AQ.Ab8...') are not Maps keys
  const rawApiKey = (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '').trim();
  const isKeyFormatValid = Boolean(rawApiKey && rawApiKey.startsWith('AIza') && rawApiKey.length >= 20);

  const onSelectLocationRef = useRef(onSelectLocation);
  const locationRef = useRef(location);

  useEffect(() => {
    onSelectLocationRef.current = onSelectLocation;
    locationRef.current = location;
  }, [onSelectLocation, location]);

  // Intercept Google Maps authentication failure (InvalidKeyMapError, referrer restrictions)
  useEffect(() => {
    const originalAuthFailure = (window as any).gm_authFailure;
    (window as any).gm_authFailure = () => {
      console.warn('Google Maps authentication notice: Key is invalid or restricted. Activating interactive fallback.');
      setAuthFailed(true);
      setMapsLoaded(false);
      if (typeof originalAuthFailure === 'function') {
        try {
          originalAuthFailure();
        } catch {
          // Suppress unhandled errors
        }
      }
    };

    return () => {
      (window as any).gm_authFailure = originalAuthFailure;
    };
  }, []);

  // Initialize live Google Maps API only if a valid Google Cloud Maps key is present
  useEffect(() => {
    if (!isKeyFormatValid || authFailed) {
      return;
    }

    let isMounted = true;

    async function initMap() {
      try {
        setOptions({
          key: rawApiKey,
          v: 'weekly',
        });

        const { Map } = await importLibrary('maps');
        const { AdvancedMarkerElement } = await importLibrary('marker');

        if (!isMounted || !mapContainerRef.current) return;

        const loc = locationRef.current;
        const center = loc 
          ? { lat: loc.lat, lng: loc.lng } 
          : { lat: 37.7749, lng: -122.4194 };

        const map = new Map(mapContainerRef.current, {
          center,
          zoom: loc ? 13 : 4,
          mapId: 'DEMO_MAP_ID', // Modern vector map identifier
          internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
        });

        mapInstanceRef.current = map;

        if (loc) {
          const marker = new AdvancedMarkerElement({
            map,
            position: center,
            title: loc.name,
          });
          markerInstanceRef.current = marker;
        }

        if (!readOnly) {
          map.addListener('click', (e: any) => {
            const lat = e.latLng.lat();
            const lng = e.latLng.lng();
            const placeName = `Pinned Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;

            if (markerInstanceRef.current) {
              markerInstanceRef.current.position = { lat, lng };
            } else {
              markerInstanceRef.current = new AdvancedMarkerElement({
                map,
                position: { lat, lng },
                title: placeName,
              });
            }

            onSelectLocationRef.current({
              lat: Number(lat.toFixed(5)),
              lng: Number(lng.toFixed(5)),
              name: placeName,
            });
          });
        }

        if (isMounted) {
          setMapsLoaded(true);
        }
      } catch (err) {
        console.warn('Google Maps API load notice:', err);
        if (isMounted) {
          setLoadError('Using interactive fallback map mode.');
        }
      }
    }

    initMap();

    return () => {
      isMounted = false;
    };
  }, [rawApiKey, isKeyFormatValid, authFailed, readOnly]);

  const handleSelectPreset = (preset: typeof PRESET_PLACES[0]) => {
    onSelectLocation({
      lat: preset.lat,
      lng: preset.lng,
      name: preset.name,
    });
    setCustomName(preset.name);

    if (mapInstanceRef.current && isLiveMapActive) {
      mapInstanceRef.current.setCenter({ lat: preset.lat, lng: preset.lng });
      mapInstanceRef.current.setZoom(12);
      if (markerInstanceRef.current) {
        markerInstanceRef.current.position = { lat: preset.lat, lng: preset.lng };
      }
    }
  };

  const handleGetCurrentLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      handleSelectPreset(PRESET_PLACES[0]);
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = Number(pos.coords.latitude.toFixed(5));
        const lng = Number(pos.coords.longitude.toFixed(5));
        const name = 'My Current Location';

        onSelectLocation({ lat, lng, name });
        setCustomName(name);

        if (mapInstanceRef.current && isLiveMapActive) {
          mapInstanceRef.current.setCenter({ lat, lng });
          mapInstanceRef.current.setZoom(14);
          if (markerInstanceRef.current) {
            markerInstanceRef.current.position = { lat, lng };
          }
        }
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation notice:', err);
        // Fallback gracefully to default preset in constrained iframe
        handleSelectPreset(PRESET_PLACES[0]);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handleCustomSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    // Check if matches preset
    const match = PRESET_PLACES.find((p) => p.name.toLowerCase().includes(query.toLowerCase()));
    if (match) {
      handleSelectPreset(match);
      setSearchQuery('');
      return;
    }

    // Deterministic coordinate derivation for simulation
    const hash = query.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const lat = Number((20 + (hash % 40)).toFixed(4));
    const lng = Number((-100 + ((hash * 7) % 200)).toFixed(4));

    onSelectLocation({
      lat,
      lng,
      name: query,
    });
    setCustomName(query);
    setSearchQuery('');
  };

  // Handle clicking anywhere on the interactive fallback canvas to drop/move pin
  const handleFallbackCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    // Map 0..1 to lat/lng range (lat 60 to 10, lng -130 to 140)
    const lat = Number((60 - y * 50).toFixed(4));
    const lng = Number((-130 + x * 270).toFixed(4));
    const placeName = `Pinned Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;

    onSelectLocationRef.current({
      lat: Number(lat.toFixed(5)),
      lng: Number(lng.toFixed(5)),
      name: placeName,
    });
    setCustomName(placeName);
  };

  // Determine if live Google Maps can be rendered
  const isLiveMapActive = isKeyFormatValid && !authFailed && !loadError;

  // Calculate pin marker percentage coordinates on the fallback canvas
  const pinX = location ? Math.min(92, Math.max(8, ((location.lng + 130) / 270) * 100)) : 50;
  const pinY = location ? Math.min(88, Math.max(12, ((60 - location.lat) / 50) * 100)) : 50;

  return (
    <div id="google-map-picker-container" className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4">
      {/* Header and current selection */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <MapPin className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-stone-900">
              {location ? location.name : 'Pin Location to Reflection'}
            </h4>
            <p className="text-[11px] text-stone-500">
              {location 
                ? `Coordinates: ${location.lat}, ${location.lng}` 
                : 'Attach place context to remember where this reflection occurred'}
            </p>
          </div>
        </div>

        {location && !readOnly && (
          <button
            id="clear-pinned-location-btn"
            onClick={() => onSelectLocation(null)}
            className="flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs font-medium text-stone-600 hover:bg-red-50 hover:text-red-600 transition"
            title="Remove pinned location"
          >
            <X className="h-3 w-3" />
            <span>Unpin</span>
          </button>
        )}
      </div>

      {/* Setup & Status banner if live Google Maps is in fallback mode */}
      {!isLiveMapActive && (
        <div className="flex items-center justify-between rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 text-[11px] text-amber-900">
          <div className="flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <span>
              {authFailed
                ? 'Google Maps API key is invalid or restricted. Interactive coordinate fallback active.'
                : rawApiKey && !isKeyFormatValid
                ? 'Maps API key must start with "AIza" (Google Cloud Maps key). Interactive fallback active.'
                : 'Zero-config interactive map mode. Click canvas, choose presets, or use GPS.'}
            </span>
          </div>
          <span className="font-mono text-[9px] text-amber-700/80 shrink-0">gmp_mcp_codeassist_v1_aistudio</span>
        </div>
      )}

      {!readOnly && (
        <>
          {/* Search bar & GPS trigger */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <form onSubmit={handleCustomSearch} className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
              <input
                id="map-place-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search city, neighborhood, or landmark..."
                className="w-full rounded-xl border border-stone-300 bg-white py-1.5 pl-8 pr-3 text-xs text-stone-900 placeholder-stone-400 focus:border-stone-900 focus:outline-hidden"
              />
            </form>

            <button
              id="get-current-gps-btn"
              type="button"
              onClick={handleGetCurrentLocation}
              disabled={isLocating}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 transition shadow-2xs"
            >
              <Navigation className={`h-3.5 w-3.5 text-blue-600 ${isLocating ? 'animate-spin' : ''}`} />
              <span>{isLocating ? 'Locating...' : 'Current GPS'}</span>
            </button>
          </div>

          {/* Quick presets */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-[10px] font-medium text-stone-400 shrink-0">Presets:</span>
            {PRESET_PLACES.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => handleSelectPreset(p)}
                className={`shrink-0 rounded-lg px-2 py-1 text-[11px] transition border ${
                  location?.name === p.name
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-medium'
                    : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-100'
                }`}
              >
                {p.name.split(',')[0]}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Map Display Viewport */}
      <div 
        className="relative h-48 w-full overflow-hidden rounded-xl border border-stone-300 bg-stone-100"
      >
        {isLiveMapActive ? (
          <div ref={mapContainerRef} className="h-full w-full" />
        ) : (
          /* High-Fidelity Interactive Visual Map Canvas Fallback */
          <div 
            onClick={handleFallbackCanvasClick}
            className={`relative h-full w-full bg-[#e8ece9] flex flex-col justify-between p-3 overflow-hidden select-none ${
              readOnly ? '' : 'cursor-crosshair'
            }`}
          >
            {/* Map Grid Pattern */}
            <div 
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(#4b6b58 1px, transparent 1px), radial-gradient(#4b6b58 1px, #e8ece9 1px)',
                backgroundSize: '24px 24px',
                backgroundPosition: '0 0, 12px 12px'
              }}
            />

            {/* Stylized Landform & Water Vectors */}
            <svg className="absolute inset-0 h-full w-full pointer-events-none opacity-25" xmlns="http://www.w3.org/2000/svg">
              <path d="M0,80 Q120,40 240,90 T480,70 L480,200 L0,200 Z" fill="#9bc4a8" />
              <path d="M100,0 Q180,60 220,120 T350,180" stroke="#79a288" strokeWidth="4" fill="none" />
              <path d="M-20,130 Q140,110 320,150 T600,120" stroke="#d5b88f" strokeWidth="2" fill="none" strokeDasharray="6 4" />
            </svg>

            {/* Map Controls & Status Badge */}
            <div className="relative z-10 flex items-center justify-between pointer-events-none">
              <div className="flex items-center gap-1.5 rounded-md bg-white/90 px-2 py-1 text-[10px] font-medium text-stone-700 shadow-xs backdrop-blur-xs">
                <MapIcon className="h-3 w-3 text-emerald-600" />
                <span>Interactive Map Canvas</span>
              </div>
              <span className="rounded-md bg-stone-900/80 px-2 py-0.5 text-[10px] font-mono text-stone-200">
                {location ? `${location.lat}°N, ${location.lng}°E` : (readOnly ? 'No Location' : 'Click to Drop Pin')}
              </span>
            </div>

            {/* Interactive Pin Marker */}
            {location ? (
              <div 
                className="absolute z-20 flex flex-col items-center pointer-events-none transition-all duration-300"
                style={{ left: `${pinX}%`, top: `${pinY}%`, transform: 'translate(-50%, -100%)' }}
              >
                <div className="flex items-center gap-1 rounded-full bg-stone-900 px-2.5 py-1 text-xs font-semibold text-white shadow-md whitespace-nowrap">
                  <MapPin className="h-3.5 w-3.5 text-amber-400" />
                  <span>{location.name}</span>
                </div>
                <div className="h-2 w-2 rotate-45 bg-stone-900 -mt-1" />
              </div>
            ) : (
              <div className="relative z-10 flex flex-col items-center justify-center text-center py-6 pointer-events-none">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-stone-600 shadow-xs">
                  <Compass className="h-5 w-5 text-emerald-600 animate-pulse" />
                </div>
                <p className="mt-2 text-xs font-medium text-stone-800">
                  Click anywhere on the map to drop a pin, or select a preset city above
                </p>
                <p className="text-[11px] text-stone-500">
                  Location coordinates will be securely saved with your reflection
                </p>
              </div>
            )}

            {/* Attribution footer */}
            <div className="relative z-10 flex items-center justify-between text-[10px] text-stone-500 pointer-events-none">
              <span>Google Maps Platform Ready</span>
              <span className="font-mono text-[9px] text-stone-400">gmp_mcp_codeassist_v1_aistudio</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
