import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import { Search } from 'lucide-react';

// Fix for default marker icons in Leaflet with Vite/React
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-600"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;
const customIcon = L.divIcon({
  html: iconSvg,
  className: 'custom-div-icon',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

function LocationMarker() {
  const [position, setPosition] = useState<L.LatLng | null>(null);
  const map = useMap();

  useEffect(() => {
    map.locate().on("locationfound", function (e) {
      setPosition(e.latlng);
      map.flyTo(e.latlng, 15);
    });
  }, [map]);

  return position === null ? null : (
    <Marker position={position} icon={customIcon}>
      <Popup>You are here</Popup>
    </Marker>
  );
}

function SearchBar() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const map = useMap();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`,
        {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'WorldExplorerTemplate/1.0'
          }
        }
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const { lat, lon, boundingbox } = data[0];
        if (boundingbox) {
          map.fitBounds([
            [parseFloat(boundingbox[0]), parseFloat(boundingbox[2])],
            [parseFloat(boundingbox[1]), parseFloat(boundingbox[3])]
          ]);
        } else {
          map.flyTo([parseFloat(lat), parseFloat(lon)], 16);
        }
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute top-4 left-4 sm:left-14 z-[1000] w-[calc(100%-2rem)] sm:w-[400px]">
      <form onSubmit={handleSearch} className="relative group">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <Search className={`w-4 h-4 ${loading ? 'animate-pulse text-blue-500' : 'text-slate-400'}`} />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search address, street, or city..."
          className="w-full h-12 pl-10 pr-12 bg-white border border-slate-200 rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-400 text-slate-900"
        />
        {loading && (
          <div className="absolute right-3 top-3.5">
             <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </form>
    </div>
  );
}

export default function App() {
  return (
    <div className="h-screen w-full bg-slate-50 font-sans">
      <main className="h-full w-full relative">
        <MapContainer
          center={[20, 0]}
          zoom={2}
          scrollWheelZoom={true}
          className="h-full w-full"
          attributionControl={false}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker />
          <SearchBar />
          
          {/* Zoom controls pushed down via CSS class in index.css */}
          <ZoomControl position="topleft" />
        </MapContainer>

        {/* Info Overlay */}
        <div className="absolute bottom-6 right-6 z-[1000] bg-white/90 backdrop-blur-sm p-3 rounded-lg border border-slate-200 shadow-sm max-w-[200px] pointer-events-none hidden sm:block">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-0.5">Privacy Note</p>
          <p className="text-[11px] text-slate-600 leading-tight">
            Searches use OpenStreetMap Nominatim. Location data is processed locally.
          </p>
        </div>
      </main>
    </div>
  );
}
