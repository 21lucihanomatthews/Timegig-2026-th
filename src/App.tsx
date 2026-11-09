import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import { Search, Satellite, Map as MapIcon, Zap, Plus, Minus, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Fix for default marker icons
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-black"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;
const customIcon = L.divIcon({
  html: iconSvg,
  className: 'custom-div-icon',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const userLocationIcon = L.divIcon({
  html: `
    <div class="relative flex items-center justify-center">
      <div class="absolute w-8 h-8 bg-blue-500/30 rounded-full animate-ping"></div>
      <div class="relative w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg"></div>
    </div>
  `,
  className: 'user-location-marker',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

function LocationMarker() {
  const [position, setPosition] = useState<L.LatLng | null>(null);
  const [accuracy, setAccuracy] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const map = useMap();

  useEffect(() => {
    const onLocationFound = (e: L.LocationEvent) => {
      setPosition(e.latlng);
      setAccuracy(e.accuracy);
      setError(null);
      if (!position) {
        map.flyTo(e.latlng, 16);
      }
    };

    const onLocationError = (e: L.ErrorEvent) => {
      console.error("Location error:", e.message);
      setError(e.message);
    };

    map.locate({ setView: true, maxZoom: 16, watch: true, enableHighAccuracy: true });
    map.on("locationfound", onLocationFound);
    map.on("locationerror", onLocationError);

    return () => {
      map.off("locationfound", onLocationFound);
      map.off("locationerror", onLocationError);
      map.stopLocate();
    };
  }, [map, position]);

  return (
    <>
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute top-20 left-1/2 -translate-x-1/2 z-[2000] bg-red-50 border border-red-200 px-4 py-2 rounded-lg shadow-lg flex items-center gap-3"
          >
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <p className="text-xs text-red-700 font-medium">
              Location access denied. Please check your browser permissions.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {position !== null && (
        <>
          <Marker position={position} icon={userLocationIcon}>
            <Popup className="custom-popup">
              <div className="text-center">
                <p className="font-bold text-black mb-1">Your Location</p>
                <p className="text-[10px] text-slate-500 tabular-nums">
                  {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
                </p>
              </div>
            </Popup>
          </Marker>
          {accuracy > 0 && (
            <Circle
              center={position}
              radius={accuracy}
              pathOptions={{
                fillColor: '#2563eb',
                fillOpacity: 0.1,
                color: '#2563eb',
                weight: 1,
                dashArray: '5, 5'
              }}
            />
          )}
        </>
      )}
    </>
  );
}

interface Suggestion {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  boundingbox: string[];
}

function SearchBar() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const map = useMap();
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.length < 3) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
          {
            headers: {
              'Accept-Language': 'en',
              'User-Agent': 'WorldExplorerTemplate/1.0'
            }
          }
        );
        const data = await response.json();
        setSuggestions(data);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const handleSelect = (suggestion: Suggestion) => {
    const { lat, lon, boundingbox } = suggestion;
    if (boundingbox) {
      map.fitBounds([
        [parseFloat(boundingbox[0]), parseFloat(boundingbox[2])],
        [parseFloat(boundingbox[1]), parseFloat(boundingbox[3])]
      ]);
    } else {
      map.flyTo([parseFloat(lat), parseFloat(lon)], 16);
    }
    setQuery(suggestion.display_name);
    setShowSuggestions(false);
  };

  return (
    <div ref={searchRef} className="absolute top-4 left-4 sm:left-14 z-[1001] w-[calc(100%-2rem)] sm:w-[450px]">
      <div className="relative group">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <Search className={`w-4 h-4 ${loading ? 'animate-pulse text-black' : 'text-black'}`} />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 3 && setShowSuggestions(true)}
          placeholder="Search location..."
          className="w-full h-12 pl-10 pr-12 bg-white/95 backdrop-blur-md border border-black/5 rounded-2xl shadow-xl focus:outline-none focus:ring-2 focus:ring-black transition-all placeholder:text-slate-400 text-black font-medium"
        />
        
        <AnimatePresence>
          {showSuggestions && suggestions.length > 0 && (
            <motion.ul
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute w-full mt-2 bg-white border border-black/5 rounded-2xl shadow-2xl overflow-hidden z-[1002]"
            >
              {suggestions.map((s) => (
                <li
                  key={s.place_id}
                  onClick={() => handleSelect(s)}
                  className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 flex items-start gap-3 group"
                >
                  <MapIcon className="w-4 h-4 mt-0.5 text-slate-400 group-hover:text-black shrink-0" />
                  <span className="text-sm text-slate-700 line-clamp-2 group-hover:text-black">
                    {s.display_name}
                  </span>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}


function CustomControls({ viewMode, setViewMode }: { 
  viewMode: 'street' | 'satellite'; 
  setViewMode: React.Dispatch<React.SetStateAction<'street' | 'satellite'>> 
}) {
  const map = useMap();

  return (
    <div className="absolute top-[80px] left-[16px] z-[1000] flex flex-col gap-5">
      {/* Locate Me */}
      <div className="flex flex-col items-center gap-1">
        <button
          onClick={() => map.locate({ setView: true, maxZoom: 16 })}
          className="w-12 h-12 bg-white border border-black/5 rounded-full shadow-lg flex items-center justify-center hover:bg-slate-50 transition-all hover:-translate-y-0.5 active:scale-90"
        >
          <Navigation className="w-5 h-5 text-black fill-black/10" />
        </button>
        <span className="text-[9px] font-bold uppercase tracking-tighter text-black bg-white/80 backdrop-blur-sm px-1.5 py-0.5 rounded-full shadow-sm">Me</span>
      </div>

      {/* Zoom In */}
      <div className="flex flex-col items-center gap-1">
        <button
          onClick={() => map.zoomIn()}
          className="w-12 h-12 bg-white border border-black/5 rounded-full shadow-lg flex items-center justify-center hover:bg-slate-50 transition-all hover:-translate-y-0.5 active:scale-90"
        >
          <Plus className="w-6 h-6 text-black" />
        </button>
        <span className="text-[9px] font-bold uppercase tracking-tighter text-black bg-white/80 backdrop-blur-sm px-1.5 py-0.5 rounded-full shadow-sm">In</span>
      </div>

      {/* Zoom Out */}
      <div className="flex flex-col items-center gap-1">
        <button
          onClick={() => map.zoomOut()}
          className="w-12 h-12 bg-white border border-black/5 rounded-full shadow-lg flex items-center justify-center hover:bg-slate-50 transition-all hover:-translate-y-0.5 active:scale-90"
        >
          <Minus className="w-6 h-6 text-black" />
        </button>
        <span className="text-[9px] font-bold uppercase tracking-tighter text-black bg-white/80 backdrop-blur-sm px-1.5 py-0.5 rounded-full shadow-sm">Out</span>
      </div>

      {/* Satellite Toggle */}
      <div className="flex flex-col items-center gap-1">
        <button
          onClick={() => setViewMode(prev => prev === 'street' ? 'satellite' : 'street')}
          className="w-12 h-12 bg-white border border-black/5 rounded-full shadow-lg flex items-center justify-center transition-all hover:bg-slate-50 hover:-translate-y-0.5 active:scale-90"
        >
          {viewMode === 'street' ? (
            <Satellite className="w-5 h-5 text-black" />
          ) : (
            <MapIcon className="w-5 h-5 text-black" />
          )}
        </button>
        <span className="text-[9px] font-bold uppercase tracking-tighter text-black bg-white/80 backdrop-blur-sm px-1.5 py-0.5 rounded-full shadow-sm">
          {viewMode === 'street' ? 'Sat' : 'Map'}
        </span>
      </div>
    </div>
  );
}

export default function App() {
  const [viewMode, setViewMode] = useState<'street' | 'satellite'>('street');
  const [isActivated, setIsActivated] = useState(false);

  return (
    <div className="h-screen w-full bg-slate-50 font-sans overflow-hidden">
      <main className="h-full w-full relative">
        <MapContainer
          center={[20, 0]}
          zoom={2}
          scrollWheelZoom={true}
          className="h-full w-full"
          attributionControl={false}
          zoomControl={false}
        >
          {viewMode === 'street' ? (
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          ) : (
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          )}
          
          <LocationMarker />
          <SearchBar />
          <CustomControls viewMode={viewMode} setViewMode={setViewMode} />
        </MapContainer>

        {/* 3D Bottom Menu Bar (Smaller, Docked) */}
        <div className="absolute bottom-0 left-0 w-full z-[1000]">
          <div className="relative">
            <motion.div 
              className="bg-white/95 backdrop-blur-md border-t border-slate-200 h-16 flex items-center justify-center relative shadow-[0_-8px_20px_rgba(0,0,0,0.08)]"
            >
              <div className="flex flex-col items-center">
                <button 
                  onClick={() => setIsActivated(!isActivated)}
                  className="flex items-center justify-center w-8 h-8 transition-all duration-300 active:scale-90"
                >
                  <Zap className={`w-6 h-6 text-black transition-all ${isActivated ? 'fill-black' : ''}`} />
                </button>
                <span className={`text-[9px] font-bold uppercase tracking-[0.2em] text-black transition-opacity ${isActivated ? 'opacity-100' : 'opacity-40'}`}>
                  {isActivated ? 'Active' : 'Activation'}
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
