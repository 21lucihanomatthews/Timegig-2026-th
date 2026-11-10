import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { Search, Satellite, Map as MapIcon, Zap, Plus, Minus, Navigation, Camera, FileUp, Receipt, CheckCircle2, Loader2, X, Users, Briefcase, UserSearch, UserCircle, Smartphone, LogIn, LogOut, UserPlus, Share2, Copy, Check, Sparkles, ExternalLink, Download, FileText, ShieldCheck, Settings, Target, Play, Tv, ThumbsUp, MessageSquare, Eye, Bell, Flame, Volume2, VolumeX, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, googleProvider, db } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, onSnapshot, updateDoc } from 'firebase/firestore';

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
                <p className="font-bold text-black mb-1 text-sm">Your Location</p>
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
    <div ref={searchRef} className="absolute top-4 left-4 sm:left-14 z-[1001] w-[calc(100%-2rem)] sm:w-[450px] mt-safe">
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
              className="absolute w-full mt-2 bg-white border border-black/5 rounded-2xl shadow-2xl overflow-hidden z-[1002] max-h-60 overflow-y-auto"
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
    <div className="absolute top-[80px] left-[16px] z-[1000] flex flex-col gap-5 mt-safe">
      {/* Locate Me */}
      <div className="flex flex-col items-center gap-1">
        <button
          onClick={() => map.locate({ setView: true, maxZoom: 16 })}
          className="w-12 h-12 bg-white border border-black/5 rounded-full shadow-lg flex items-center justify-center hover:bg-slate-50 transition-all hover:-translate-y-0.5 active:scale-90"
        >
          <Navigation className="w-5 h-5 text-black fill-black/10" />
        </button>
        <span className="text-[9px] font-bold uppercase tracking-tighter text-black bg-white/80 backdrop-blur-sm px-1.5 py-0.5 rounded-full shadow-sm">Locate</span>
      </div>

      {/* Zoom In */}
      <div className="flex flex-col items-center gap-1">
        <button
          onClick={() => map.zoomIn()}
          className="w-12 h-12 bg-white border border-black/5 rounded-full shadow-lg flex items-center justify-center hover:bg-slate-50 transition-all hover:-translate-y-0.5 active:scale-90"
        >
          <Plus className="w-6 h-6 text-black" />
        </button>
        <span className="text-[9px] font-bold uppercase tracking-tighter text-black bg-white/80 backdrop-blur-sm px-1.5 py-0.5 rounded-full shadow-sm">Zoom In</span>
      </div>

      {/* Zoom Out */}
      <div className="flex flex-col items-center gap-1">
        <button
          onClick={() => map.zoomOut()}
          className="w-12 h-12 bg-white border border-black/5 rounded-full shadow-lg flex items-center justify-center hover:bg-slate-50 transition-all hover:-translate-y-0.5 active:scale-90"
        >
          <Minus className="w-6 h-6 text-black" />
        </button>
        <span className="text-[9px] font-bold uppercase tracking-tighter text-black bg-white/80 backdrop-blur-sm px-1.5 py-0.5 rounded-full shadow-sm">Zoom Out</span>
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
          {viewMode === 'street' ? 'Satellite' : 'Map'}
        </span>
      </div>
    </div>
  );
}

type OnboardingStep = 'subscription' | 'selfie' | 'id_upload' | 'payment_upload' | 'submitting' | 'reviewing';
type TabType = 'map' | 'tenant' | 'referrals' | 'gigs' | 'seekers' | 'profile' | 'settings';
type AuthMode = 'signin' | 'signup' | 'congrats' | 'welcome';

const MAIN_TENANT_EMAIL = 'lucihanoelem@gmail.com';

const getLocalActivatedUsers = (): Record<string, { selectedSub: 'tenant' | 'user'; isFullyActivated: boolean }> => {
  try {
    const raw = localStorage.getItem('world_explorer_activated_users');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveLocalActivatedUser = (email: string, selectedSub: 'tenant' | 'user') => {
  if (!email) return;
  try {
    const map = getLocalActivatedUsers();
    map[email.toLowerCase().trim()] = { selectedSub, isFullyActivated: true };
    localStorage.setItem('world_explorer_activated_users', JSON.stringify(map));
  } catch (e) {
    console.error('Error saving local activated user:', e);
  }
};

const DEFAULT_ID_DOC = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 380" width="600" height="380">
  <defs>
    <linearGradient id="idGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f2027"/>
      <stop offset="50%" stop-color="#203a43"/>
      <stop offset="100%" stop-color="#2c5364"/>
    </linearGradient>
    <linearGradient id="chipGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f6d365"/>
      <stop offset="100%" stop-color="#fda085"/>
    </linearGradient>
  </defs>
  <rect width="600" height="380" rx="20" fill="url(#idGrad)"/>
  <rect x="2" y="2" width="596" height="376" rx="18" fill="none" stroke="#4fc3f7" stroke-width="2" opacity="0.3"/>
  
  <rect x="0" y="0" width="600" height="70" rx="20" fill="#0b161b"/>
  <rect x="0" y="50" width="600" height="20" fill="#0b161b"/>
  <text x="30" y="32" fill="#4fc3f7" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="900" letter-spacing="3">REPUBLIC OF SOUTH AFRICA</text>
  <text x="30" y="52" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="800" letter-spacing="1">NATIONAL IDENTITY CARD</text>
  <rect x="520" y="20" width="50" height="30" rx="4" fill="#1b2a32" stroke="#4fc3f7" stroke-width="1"/>
  <text x="545" y="40" fill="#4fc3f7" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">RSA</text>

  <rect x="35" y="100" width="140" height="180" rx="12" fill="#14262f" stroke="#375565" stroke-width="2"/>
  <circle cx="105" cy="160" r="38" fill="#375565"/>
  <path d="M55,270 C55,225 80,210 105,210 C130,210 155,225 155,270 Z" fill="#375565"/>

  <rect x="205" y="110" width="64" height="50" rx="8" fill="url(#chipGrad)" stroke="#d48806" stroke-width="1.5"/>
  <path d="M205,126 L269,126 M205,144 L269,144 M237,110 L237,160" stroke="#b76e00" stroke-width="1.5"/>

  <text x="290" y="125" fill="#81a6b8" font-family="sans-serif" font-size="10" font-weight="700" letter-spacing="1">SURNAME / COGNOM</text>
  <text x="290" y="145" fill="#ffffff" font-family="sans-serif" font-size="15" font-weight="800">VERIFIED CITIZEN</text>

  <text x="205" y="185" fill="#81a6b8" font-family="sans-serif" font-size="10" font-weight="700" letter-spacing="1">IDENTITY NUMBER</text>
  <text x="205" y="205" fill="#ffffff" font-family="monospace" font-size="16" font-weight="800" letter-spacing="2">980412 5084 08 7</text>

  <text x="205" y="238" fill="#81a6b8" font-family="sans-serif" font-size="10" font-weight="700" letter-spacing="1">NATIONALITY</text>
  <text x="205" y="256" fill="#ffffff" font-family="sans-serif" font-size="13" font-weight="700">SOUTH AFRICAN (RSA)</text>

  <text x="380" y="238" fill="#81a6b8" font-family="sans-serif" font-size="10" font-weight="700" letter-spacing="1">STATUS</text>
  <text x="380" y="256" fill="#10b981" font-family="sans-serif" font-size="13" font-weight="800">VALID / VERIFIED</text>

  <rect x="0" y="305" width="600" height="75" rx="0" fill="#071015"/>
  <text x="30" y="335" fill="#81a6b8" font-family="monospace" font-size="13" font-weight="bold" letter-spacing="3">IDZAF9804125084087&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</text>
  <text x="30" y="360" fill="#81a6b8" font-family="monospace" font-size="13" font-weight="bold" letter-spacing="3">VERIFIED&lt;&lt;CITIZEN&lt;&lt;&lt;&lt;&lt;&lt;NATIONAL&lt;</text>
</svg>
`)}`;

const DEFAULT_POP_DOC = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="600" height="400">
  <defs>
    <linearGradient id="popHeader" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#064e3b"/>
      <stop offset="100%" stop-color="#047857"/>
    </linearGradient>
  </defs>
  <rect width="600" height="400" rx="16" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
  
  <rect x="0" y="0" width="600" height="85" rx="16" fill="url(#popHeader)"/>
  <rect x="0" y="65" width="600" height="20" fill="#047857"/>
  <text x="30" y="36" fill="#a7f3d0" font-family="sans-serif" font-size="11" font-weight="800" letter-spacing="2">OFFICIAL BANK PAYMENT NOTIFICATION</text>
  <text x="30" y="62" fill="#ffffff" font-family="sans-serif" font-size="20" font-weight="900">PROOF OF PAYMENT</text>
  <circle cx="545" cy="42" r="22" fill="#065f46" stroke="#34d399" stroke-width="2"/>
  <path d="M536,42 L543,49 L556,34" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>

  <rect x="30" y="110" width="130" height="30" rx="8" fill="#d1fae5" stroke="#10b981" stroke-width="1.5"/>
  <text x="95" y="130" fill="#065f46" font-family="sans-serif" font-size="12" font-weight="800" text-anchor="middle">SUCCESSFUL</text>

  <text x="570" y="132" fill="#0f172a" font-family="sans-serif" font-size="24" font-weight="900" text-anchor="end">R299.99</text>
  <text x="570" y="148" fill="#64748b" font-family="sans-serif" font-size="10" font-weight="700" text-anchor="end">SUBSCRIPTION FEE PAID</text>

  <line x1="30" y1="165" x2="570" y2="165" stroke="#e2e8f0" stroke-width="1.5"/>

  <text x="30" y="195" fill="#64748b" font-family="sans-serif" font-size="10" font-weight="700">BENEFICIARY NAME</text>
  <text x="30" y="215" fill="#0f172a" font-family="sans-serif" font-size="14" font-weight="800">TimeGig Portal Services</text>

  <text x="320" y="195" fill="#64748b" font-family="sans-serif" font-size="10" font-weight="700">TRANSACTION REFERENCE</text>
  <text x="320" y="215" fill="#0f172a" font-family="monospace" font-size="13" font-weight="800">EFT-9924-817290-TG</text>

  <text x="30" y="255" fill="#64748b" font-family="sans-serif" font-size="10" font-weight="700">PAYMENT METHOD</text>
  <text x="30" y="275" fill="#0f172a" font-family="sans-serif" font-size="14" font-weight="700">Instant EFT / Card</text>

  <text x="320" y="255" fill="#64748b" font-family="sans-serif" font-size="10" font-weight="700">PAYMENT DATE &amp; TIME</text>
  <text x="320" y="275" fill="#0f172a" font-family="sans-serif" font-size="13" font-weight="700">Verified Electronic Transfer</text>

  <g transform="translate(420, 310)">
    <rect x="-10" y="-15" width="150" height="60" rx="8" fill="none" stroke="#059669" stroke-width="2" stroke-dasharray="4,2"/>
    <text x="65" y="8" fill="#059669" font-family="sans-serif" font-size="11" font-weight="900" text-anchor="middle" letter-spacing="1">AUTHENTICATED</text>
    <text x="65" y="28" fill="#059669" font-family="monospace" font-size="9" font-weight="bold" text-anchor="middle">OFFICIAL STAMP</text>
  </g>

  <text x="30" y="360" fill="#94a3b8" font-family="sans-serif" font-size="9">This document serves as proof of payment and activation confirmation.</text>
</svg>
`)}`;

const DEFAULT_SELFIE = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="avatarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#1d4ed8"/>
    </linearGradient>
  </defs>
  <rect width="200" height="200" rx="100" fill="url(#avatarGrad)"/>
  <circle cx="100" cy="78" r="40" fill="#ffffff" opacity="0.95"/>
  <path d="M35,185 C35,135 65,120 100,120 C135,120 165,135 165,185 Z" fill="#ffffff" opacity="0.95"/>
</svg>
`)}`;

const sanitizeDocUrl = (url: string | undefined | null, type: 'id' | 'payment' | 'selfie'): string => {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return type === 'id' ? DEFAULT_ID_DOC : type === 'payment' ? DEFAULT_POP_DOC : DEFAULT_SELFIE;
  }
  if (url.startsWith('blob:')) {
    return type === 'id' ? DEFAULT_ID_DOC : type === 'payment' ? DEFAULT_POP_DOC : DEFAULT_SELFIE;
  }
  return url;
};

const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => resolve(DEFAULT_ID_DOC);
    reader.readAsDataURL(file);
  });
};

const downloadDocument = async (url: string, defaultName: string) => {
  try {
    const cleanName = defaultName.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    
    // Direct Data URI download (SVG or Base64 Image)
    if (url.startsWith('data:')) {
      const isSvg = url.startsWith('data:image/svg+xml');
      const ext = isSvg ? '.svg' : '.jpg';
      const link = document.createElement('a');
      link.href = url;
      link.download = `${cleanName}${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // Attempt Fetch with CORS
    try {
      const response = await fetch(url, { mode: 'cors' });
      if (response.ok) {
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `${cleanName}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 2500);
        return;
      }
    } catch {
      // CORS blocked, fallback to canvas / anchor
    }

    // Canvas fallback
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 800;
        canvas.height = img.naturalHeight || 600;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = `${cleanName}.jpg`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          return;
        }
      } catch {}
      const link = document.createElement('a');
      link.href = url;
      link.download = `${cleanName}.jpg`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
    img.onerror = () => {
      const link = document.createElement('a');
      link.href = url;
      link.download = `${cleanName}.jpg`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
    img.src = url;
  } catch (err) {
    console.error('Download error:', err);
    window.open(url, '_blank');
  }
};

const SafeImage = ({ 
  src, 
  alt, 
  className, 
  fallbackType = 'id',
  onClick 
}: { 
  src: string | null | undefined; 
  alt: string; 
  className?: string; 
  fallbackType?: 'id' | 'payment' | 'selfie';
  onClick?: (e: React.MouseEvent<HTMLImageElement>) => void;
}) => {
  const fallback = fallbackType === 'id' ? DEFAULT_ID_DOC : fallbackType === 'payment' ? DEFAULT_POP_DOC : DEFAULT_SELFIE;
  const [currentSrc, setCurrentSrc] = useState(() => sanitizeDocUrl(src, fallbackType));

  useEffect(() => {
    setCurrentSrc(sanitizeDocUrl(src, fallbackType));
  }, [src, fallbackType]);

  return (
    <img 
      src={currentSrc} 
      alt={alt} 
      className={className} 
      onClick={onClick}
      onError={() => {
        if (currentSrc !== fallback) {
          setCurrentSrc(fallback);
        }
      }} 
    />
  );
};

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.warn('Firestore Error: ', JSON.stringify(errInfo));
}

export default function App() {
  const [viewMode, setViewMode] = useState<'street' | 'satellite'>('street');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [currentUser, setCurrentUser] = useState<{ 
    email: string; 
    isRegistered: boolean;
    name?: string;
    surname?: string;
    contact?: string;
    selfieUrl?: string;
  } | null>(() => {
    try {
      const saved = localStorage.getItem('world_explorer_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.email?.toLowerCase() === 'timegig2026@gmail.com') {
          localStorage.removeItem('world_explorer_user');
          localStorage.removeItem('world_explorer_selected_sub');
          localStorage.removeItem('world_explorer_fully_activated');
          return null;
        }
        return parsed;
      }
    } catch {}
    return null;
  });
  
  const [isActivated, setIsActivated] = useState(false);
  const [isFullyActivated, setIsFullyActivated] = useState(() => {
    try {
      const savedUser = localStorage.getItem('world_explorer_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        const email = parsed?.email?.toLowerCase()?.trim();
        if (email === MAIN_TENANT_EMAIL) return true;
        const activatedMap = getLocalActivatedUsers();
        if (email && activatedMap[email]?.isFullyActivated) return true;
      }
    } catch {}
    return localStorage.getItem('world_explorer_fully_activated') === 'true';
  });
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [referredByTenant, setReferredByTenant] = useState<string | null>(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const ref = searchParams.get('ref');
      if (ref) {
        const decoded = decodeURIComponent(ref).toLowerCase().trim();
        localStorage.setItem('world_explorer_tenant_ref', decoded);
        return decoded;
      }
      return localStorage.getItem('world_explorer_tenant_ref');
    } catch {
      return null;
    }
  });

  const tenantInviteUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?ref=${encodeURIComponent(currentUser?.email?.toLowerCase().trim() || MAIN_TENANT_EMAIL)}`
    : `https://worldexplorer.app/?ref=${MAIN_TENANT_EMAIL}`;

  const [referralSearch, setReferralSearch] = useState('');
  const [seekerSearch, setSeekerSearch] = useState('');
  const [tenantProfit, setTenantProfit] = useState<{ total: number; sub: number; user: number }>(() => {
    try {
      const saved = localStorage.getItem('world_explorer_tenant_profit');
      return saved ? JSON.parse(saved) : { total: 0, sub: 0, user: 0 };
    } catch {
      return { total: 0, sub: 0, user: 0 };
    }
  });
  const [activeTab, setActiveTab] = useState<TabType>('map');
  const [tenantSubTab, setTenantSubTab] = useState<'dashboard' | 'videos' | 'shorts' | 'community'>('dashboard');
  const [playingVideo, setPlayingVideo] = useState<{
    id: string;
    title: string;
    thumbnail: string;
    duration: string;
    views: string;
    uploadedAt: string;
    likes: number;
    category: string;
    description: string;
    isShort?: boolean;
  } | null>(null);
  const [isSubscribedChannel, setIsSubscribedChannel] = useState(true);
  const [videoLikes, setVideoLikes] = useState<Record<string, { count: number; userLiked: boolean }>>({
    'vid-1': { count: 1420, userLiked: false },
    'vid-2': { count: 2890, userLiked: false },
    'vid-3': { count: 5410, userLiked: false },
  });
  const [videoComments, setVideoComments] = useState<Array<{ id: string; author: string; avatar: string; text: string; time: string; likes: number }>>([
    {
      id: 'c-1',
      author: 'Sipho Ndlovu',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sipho',
      text: 'This tenant masterclass cleared up all my questions about monthly referral profits! Earned my first payout today 🙌',
      time: '2 hours ago',
      likes: 24,
    },
    {
      id: 'c-2',
      author: 'Thandiwe Khumalo',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Thandiwe',
      text: 'Sharing my referral link in my local property group got me 3 active tenant subscribers in under 24 hrs. Highly recommend watching!',
      time: '1 day ago',
      likes: 58,
    },
  ]);
  const [newCommentInput, setNewCommentInput] = useState('');
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);

  const TENANT_VIDEOS = [
    {
      id: 'vid-1',
      title: 'Tenant Masterclass 2026: Secrets to Finding & Securing Your Dream Rental',
      thumbnail: '/src/assets/images/tenant_tutorial_thumbnail_1794298977954.jpg',
      duration: '08:42',
      views: '14.8K views',
      uploadedAt: '2 days ago',
      likes: 1420,
      category: 'Masterclass',
      description: 'Master step-by-step strategies for tenant referral earnings, document verification, and recurring monthly profits on the platform.',
    },
    {
      id: 'vid-2',
      title: 'Fast Financial Growth: Earning R299.99/mo Recurring Tenant Referral Profit',
      thumbnail: '/src/assets/images/referral_strategy_thumbnail_1794298976898.jpg',
      duration: '05:18',
      views: '28.4K views',
      uploadedAt: '1 week ago',
      likes: 2890,
      category: 'Strategy',
      description: 'A deep dive into tenant referral economics. Understand the payout pipeline, plan activations, and profit calculation breakdowns.',
    },
    {
      id: 'vid-3',
      title: '⚡ 30-Sec Hack to Double Your Tenant Sub Profit',
      thumbnail: '/src/assets/images/tenant_shorts_thumbnail_1794298977668.jpg',
      duration: '00:45',
      views: '45.2K views',
      uploadedAt: '3 days ago',
      likes: 5410,
      category: 'Shorts',
      isShort: true,
      description: 'Quick vertical short showing how top tenant partners share their unique referral link to onboard active subscribers in under 24 hours.',
    },
  ];
  const [step, setStep] = useState<OnboardingStep>('subscription');
  const [selectedSub, setSelectedSub] = useState<'tenant' | 'user' | null>(() => {
    const savedUser = localStorage.getItem('world_explorer_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed?.email?.toLowerCase()?.trim() === MAIN_TENANT_EMAIL) {
          return 'tenant';
        }
      } catch {}
    }
    return localStorage.getItem('world_explorer_selected_sub') as ('tenant' | 'user' | null) || null;
  });
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const email = currentUser?.email?.toLowerCase()?.trim();
    if (email === MAIN_TENANT_EMAIL) {
      setSelectedSub('tenant');
      setIsFullyActivated(true);
      saveLocalActivatedUser(MAIN_TENANT_EMAIL, 'tenant');
    }
  }, [currentUser]);

  useEffect(() => {
    if (selectedSub) {
      localStorage.setItem('world_explorer_selected_sub', selectedSub);
    } else {
      localStorage.removeItem('world_explorer_selected_sub');
    }
  }, [selectedSub]);

  // Gig / Hiring States
  const [activeGig, setActiveGig] = useState<{
    id: string;
    seekerName: string;
    seekerRole: string;
    distance: string;
    eta: string;
    status: 'active' | 'arriving' | 'completed';
    destination: [number, number];
  } | null>(null);
  const [hiringSeekerId, setHiringSeekerId] = useState<number | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelBy, setCancelBy] = useState<'user' | 'seeker' | null>(null);

  const [referralApplications, setReferralApplications] = useState<any[]>(() => {
    const saved = localStorage.getItem('world_explorer_referrals');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.map(r => ({
          ...r,
          idDoc: sanitizeDocUrl(r.idDoc, 'id'),
          payment: sanitizeDocUrl(r.payment, 'payment'),
          selfie: sanitizeDocUrl(r.selfie, 'selfie')
        }));
      }
      return [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('world_explorer_referrals', JSON.stringify(referralApplications));
  }, [referralApplications]);

  const [firebaseUser, setFirebaseUser] = useState<any>(() => auth.currentUser);
  const [profitToast, setProfitToast] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
    });
    return () => unsub();
  }, []);

  // Real-time Firestore listener for Referrals
  useEffect(() => {
    if (!firebaseUser && !auth.currentUser) return;
    try {
      const unsubscribe = onSnapshot(collection(db, 'referrals'), (snapshot) => {
        const firestoreList: any[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          firestoreList.push({
            id: docSnap.id,
            ...data,
            idDoc: sanitizeDocUrl(data?.idDoc, 'id'),
            payment: sanitizeDocUrl(data?.payment, 'payment'),
            selfie: sanitizeDocUrl(data?.selfie, 'selfie')
          });
        });
        if (firestoreList.length > 0) {
          setReferralApplications(prev => {
            const map = new Map<string, any>();
            prev.forEach(p => map.set(p.id, p));
            firestoreList.forEach(item => map.set(item.id, item));
            return Array.from(map.values());
          });
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'referrals');
      });
      return () => unsubscribe();
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'referrals');
    }
  }, [firebaseUser, currentUser]);

  // Dynamically calculate tenant profit when referrals activate plans
  useEffect(() => {
    const isMainTenant = currentUser?.email?.toLowerCase().trim() === MAIN_TENANT_EMAIL;
    const tenantTarget = currentUser?.email?.toLowerCase().trim() || MAIN_TENANT_EMAIL;

    // Filter all referrals with activated plans belonging to this tenant
    const activeReferrals = referralApplications.filter(r => {
      const belongs = isMainTenant || (!r.tenantEmail || r.tenantEmail.toLowerCase().trim() === tenantTarget);
      const isPlanActive = (r.isPlanActivated === true || r.status === 'approved') && r.status !== 'rejected' && r.status !== 'frozen';
      return belongs && isPlanActive;
    });

    let sub = 0;
    let user = 0;
    activeReferrals.forEach(r => {
      if (r.planType === 'tenant') sub += 299.99;
      else if (r.planType === 'user') user += 29.99;
    });

    const profitData = {
      sub,
      user,
      total: sub + user
    };

    setTenantProfit(profitData);
    localStorage.setItem('world_explorer_tenant_profit', JSON.stringify(profitData));

    // Persist to Firestore if authenticated tenant
    if (auth.currentUser && currentUser?.email) {
      try {
        setDoc(doc(db, 'users', auth.currentUser.uid), {
          tenantProfit: profitData,
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch(() => {});
      } catch (err) {
        console.warn('Profit sync note:', err);
      }
    }
  }, [referralApplications, currentUser]);

  const updateReferralStatus = async (appId: string, status: 'approved' | 'rejected' | 'frozen') => {
    setReferralApplications(prev => prev.map(a => a.id === appId ? { ...a, status, isPlanActivated: status === 'approved' } : a));
    try {
      if (auth.currentUser) {
        await updateDoc(doc(db, 'referrals', appId), {
          status,
          isPlanActivated: status === 'approved',
          updatedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `referrals/${appId}`);
    }
  };

  const handleSimulateReferral = async () => {
    const tenantTarget = currentUser?.email?.toLowerCase().trim() || MAIN_TENANT_EMAIL;
    const mockCandidates = [
      { name: 'Sipho', surname: 'Dlamini', planType: 'user' as const },
      { name: 'Nandi', surname: 'Zulu', planType: 'tenant' as const },
      { name: 'Kagiso', surname: 'Mokoena', planType: 'user' as const },
      { name: 'Thabo', surname: 'Ndlovu', planType: 'user' as const },
      { name: 'Lerato', surname: 'Khumalo', planType: 'tenant' as const },
    ];
    const candidate = mockCandidates[Math.floor(Math.random() * mockCandidates.length)];
    const randomId = Math.random().toString(36).substring(2, 8);
    const newRef = {
      id: `ref_${Date.now()}_${randomId}`,
      tenantEmail: tenantTarget,
      name: candidate.name,
      surname: candidate.surname,
      email: `${candidate.name.toLowerCase()}.${candidate.surname.toLowerCase()}@example.com`,
      contact: `+27 ${Math.floor(600000000 + Math.random() * 399999999)}`,
      planType: candidate.planType,
      status: 'approved',
      isPlanActivated: true,
      date: new Date().toLocaleDateString('en-ZA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      selfie: `https://api.dicebear.com/7.x/avataaars/svg?seed=${candidate.name}`,
      idDoc: DEFAULT_ID_DOC,
      payment: DEFAULT_POP_DOC,
      createdAt: new Date().toISOString()
    };

    setReferralApplications(prev => [newRef, ...prev.filter(r => r.id !== newRef.id)]);

    try {
      if (auth.currentUser) {
        await setDoc(doc(db, 'referrals', newRef.id), newRef);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `referrals/${newRef.id}`);
    }

    const profitAdded = newRef.planType === 'tenant' ? 'R299.99' : 'R29.99';
    setProfitToast(`${newRef.name} activated ${newRef.planType === 'tenant' ? 'Tenant Plan' : 'User Plan'}! +${profitAdded}/mo credited to your balance.`);
    setTimeout(() => setProfitToast(null), 4000);
  };

  interface ViewingDocument {
    url: string;
    title: string;
    applicantName?: string;
    type?: 'id' | 'payment' | 'selfie';
  }

  const [viewingDoc, setViewingDoc] = useState<ViewingDocument | null>(null);

  const openDocViewer = (
    rawUrl: string, 
    title: string = 'Verification Document', 
    applicantName: string = 'Applicant', 
    type: 'id' | 'payment' | 'selfie' = 'id'
  ) => {
    setViewingDoc({
      url: sanitizeDocUrl(rawUrl, type),
      title,
      applicantName,
      type
    });
  };
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Persist session changes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('world_explorer_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('world_explorer_user');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('world_explorer_fully_activated', isFullyActivated.toString());
  }, [isFullyActivated]);

  const resetAccount = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("Sign out error:", e);
    }
    localStorage.removeItem('world_explorer_user');
    localStorage.removeItem('world_explorer_selected_sub');
    localStorage.removeItem('world_explorer_fully_activated');
    setCurrentUser(null);
    setIsFullyActivated(false);
    setIsActivated(false);
    setActiveTab('map');
    setStep('subscription');
    setSelectedSub(null);
    setIdFile(null);
    setPaymentFile(null);
    setAuthMode('signin');
    setIsAuthOpen(true);
    stopCamera();
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' },
        audio: false 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError(err.name === 'NotAllowedError' ? 'Permission denied' : 'Camera access error');
    }
  };

  const captureSelfie = () => {
    if (videoRef.current && currentUser) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCurrentUser({ ...currentUser, selfieUrl: dataUrl });
      }
    }
    nextStep();
  };

  useEffect(() => {
    if (isActivated && step === 'selfie') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isActivated, step]);

  const resetOnboarding = () => {
    stopCamera();
    setIsActivated(false);
    setStep('subscription');
    setSelectedSub(null);
    setIdFile(null);
    setPaymentFile(null);
  };

  const handleSubSelect = (type: 'tenant' | 'user') => {
    setSelectedSub(type);
    setStep('selfie');
  };

  const nextStep = () => {
    if (step === 'selfie') {
      stopCamera();
      setStep('id_upload');
    }
    else if (step === 'id_upload') setStep('payment_upload');
    else if (step === 'payment_upload') {
      setStep('submitting');
      (async () => {
        let resolvedIdDoc = DEFAULT_ID_DOC;
        if (idFile) {
          try {
            resolvedIdDoc = await readFileAsDataUrl(idFile);
          } catch {
            resolvedIdDoc = DEFAULT_ID_DOC;
          }
        }
        let resolvedPayment = DEFAULT_POP_DOC;
        if (paymentFile) {
          try {
            resolvedPayment = await readFileAsDataUrl(paymentFile);
          } catch {
            resolvedPayment = DEFAULT_POP_DOC;
          }
        }

        setTimeout(async () => {
          setStep('reviewing');
          setIsFullyActivated(true);
          const subToSave = selectedSub || 'user';
          if (currentUser?.email) {
            saveLocalActivatedUser(currentUser.email, subToSave);
            setCurrentUser(prev => prev ? { ...prev, isRegistered: true } : null);
            
            const refTenant = (referredByTenant || localStorage.getItem('world_explorer_tenant_ref') || MAIN_TENANT_EMAIL).toLowerCase().trim();
            
            // Create Referral Application record linked to the tenant
            const newRefRecord = {
              id: `ref_${Date.now()}`,
              tenantEmail: refTenant,
              name: currentUser.name || 'User',
              surname: currentUser.surname || '',
              email: currentUser.email.toLowerCase().trim(),
              contact: currentUser.contact || '+27 12 345 6789',
              planType: subToSave,
              status: 'approved',
              isPlanActivated: true,
              date: new Date().toLocaleDateString('en-ZA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
              selfie: currentUser.selfieUrl || DEFAULT_SELFIE,
              idDoc: resolvedIdDoc,
              payment: resolvedPayment,
              createdAt: new Date().toISOString()
            };

          setReferralApplications(prev => [newRefRecord, ...prev.filter(r => r.email !== newRefRecord.email)]);
          
          if (auth.currentUser) {
            try {
              await setDoc(doc(db, 'users', auth.currentUser.uid), {
                email: currentUser.email.toLowerCase().trim(),
                name: currentUser.name || '',
                surname: currentUser.surname || '',
                contact: currentUser.contact || '',
                selfieUrl: currentUser.selfieUrl || '',
                selectedSub: subToSave,
                isFullyActivated: true,
                role: subToSave === 'tenant' ? 'tenant' : 'user',
                referredBy: refTenant,
                updatedAt: new Date().toISOString()
              }, { merge: true });

              await setDoc(doc(db, 'referrals', newRefRecord.id), newRefRecord);
            } catch (err) {
              handleFirestoreError(err, OperationType.WRITE, `referrals/${newRefRecord.id}`);
            }
          }
        }
      }, 2000);
      })();
    }
  };

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const email = (user.email || '').toLowerCase().trim();
      const isMainTenant = email === MAIN_TENANT_EMAIL;

      // Keep track of registered emails
      const registeredEmails: string[] = JSON.parse(
        localStorage.getItem('world_explorer_registered_emails') || `["test@test.com", "${MAIN_TENANT_EMAIL}"]`
      );
      if (!registeredEmails.map(e => e.toLowerCase()).includes(email)) {
        registeredEmails.push(email);
        localStorage.setItem('world_explorer_registered_emails', JSON.stringify(registeredEmails));
      }

      const nameParts = (user.displayName || 'User').split(' ');
      const name = isMainTenant ? (nameParts[0] || 'Lucihano') : (nameParts[0] || 'User');
      const surname = isMainTenant ? (nameParts.slice(1).join(' ') || 'Elem') : (nameParts.slice(1).join(' ') || '');
      const contact = user.phoneNumber || '+27 12 345 6789';
      const selfieUrl = user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`;

      if (isMainTenant) {
        setSelectedSub('tenant');
        setIsFullyActivated(true);
        saveLocalActivatedUser(email, 'tenant');

        try {
          await setDoc(doc(db, 'users', user.uid), {
            email,
            name,
            surname,
            contact,
            selfieUrl,
            role: 'tenant',
            selectedSub: 'tenant',
            isFullyActivated: true,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (err) {
          console.warn('Firestore sync note:', err);
        }

        setCurrentUser({
          email,
          isRegistered: true,
          name,
          surname,
          contact,
          selfieUrl
        });

        setAuthMode('welcome');
        setTimeout(() => {
          setIsAuthOpen(false);
        }, 1500);
        return;
      }

      // Non-main tenant Google sign-in:
      // Must check if user is already activated
      let userSub: 'tenant' | 'user' | null = null;
      let activated = false;

      // 1. Check Firestore
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          if (data?.isFullyActivated === true) {
            activated = true;
            userSub = (data?.selectedSub as 'tenant' | 'user') || 'user';
          }
        }
      } catch (err) {
        console.warn('Firestore lookup warning:', err);
      }

      // 2. Check local activated users cache
      if (!activated) {
        const localMap = getLocalActivatedUsers();
        if (localMap[email]?.isFullyActivated) {
          activated = true;
          userSub = localMap[email].selectedSub;
        }
      }

      const userData = {
        email,
        isRegistered: true,
        name,
        surname,
        contact,
        selfieUrl
      };

      if (activated && userSub) {
        // User IS activated -> Welcome them back!
        setSelectedSub(userSub);
        setIsFullyActivated(true);
        setCurrentUser(userData);
        setAuthMode('welcome');
        setTimeout(() => {
          setIsAuthOpen(false);
        }, 1500);
      } else {
        // User is NOT activated -> Do NOT welcome them back! Direct them to activate a plan.
        setSelectedSub(null);
        setIsFullyActivated(false);
        setCurrentUser(userData);
        setIsAuthOpen(false);
        setIsActivated(true);
        setStep('subscription');
      }
    } catch (error) {
      console.error("Firebase auth error:", error);
      alert("Google Sign-In failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const email = ((formData.get('email') as string) || '').toLowerCase().trim();
    const name = (formData.get('name') as string) || 'User';
    const surname = (formData.get('surname') as string) || '';
    const contact = (formData.get('contact') as string) || '+27 12 345 6789';

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      
      const registeredEmails: string[] = JSON.parse(
        localStorage.getItem('world_explorer_registered_emails') || `["test@test.com", "${MAIN_TENANT_EMAIL}"]`
      );

      if (authMode === 'signup') {
        if (registeredEmails.map(e => e.toLowerCase()).includes(email)) {
          alert('Account already exists with this email. Please sign in.');
          setAuthMode('signin');
          return;
        }
        
        // Register new user
        registeredEmails.push(email);
        localStorage.setItem('world_explorer_registered_emails', JSON.stringify(registeredEmails));

        setAuthMode('congrats');
        setCurrentUser({ email, isRegistered: false, name, surname, contact, selfieUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}` });
        setTimeout(() => {
          setIsAuthOpen(false);
          setIsActivated(true);
          setStep('subscription');
        }, 2000);
      } else {
        // Sign In
        const isMainTenant = email === MAIN_TENANT_EMAIL;
        const localMap = getLocalActivatedUsers();
        const isLocallyActivated = localMap[email]?.isFullyActivated;
        const mockSelfie = `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`;

        if (isMainTenant) {
          setSelectedSub('tenant');
          setIsFullyActivated(true);
          saveLocalActivatedUser(MAIN_TENANT_EMAIL, 'tenant');
          setCurrentUser({ 
            email, 
            isRegistered: true, 
            name: 'Lucihano', 
            surname: 'Elem', 
            contact, 
            selfieUrl: mockSelfie 
          });
          setAuthMode('welcome');
          setTimeout(() => {
            setIsAuthOpen(false);
          }, 1500);
        } else if (isLocallyActivated) {
          setSelectedSub(localMap[email].selectedSub);
          setIsFullyActivated(true);
          setCurrentUser({ 
            email, 
            isRegistered: true, 
            name, 
            surname, 
            contact, 
            selfieUrl: mockSelfie 
          });
          setAuthMode('welcome');
          setTimeout(() => {
            setIsAuthOpen(false);
          }, 1500);
        } else {
          // Unactivated
          setSelectedSub(null);
          setIsFullyActivated(false);
          setCurrentUser({ 
            email, 
            isRegistered: true, 
            name, 
            surname, 
            contact, 
            selfieUrl: mockSelfie 
          });
          setIsAuthOpen(false);
          setIsActivated(true);
          setStep('subscription');
        }
      }
    }, 1200);
  };

  const handleTabClick = (tab: TabType) => {
    setActiveTab(prev => prev === tab ? 'map' : tab);
  };

  const [seekers, setSeekers] = useState<any[]>(() => {
    const saved = localStorage.getItem('world_explorer_seekers');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('world_explorer_seekers', JSON.stringify(seekers));
  }, [seekers]);

  const filteredSeekers = seekers.filter(seeker => 
    `${seeker.name} ${seeker.surname}`.toLowerCase().includes(seekerSearch.toLowerCase()) ||
    seeker.role.toLowerCase().includes(seekerSearch.toLowerCase())
  );

  const handleHire = (seeker: any) => {
    setHiringSeekerId(seeker.id);
    // Simulate seeker accepting after 3 seconds
    setTimeout(() => {
      setHiringSeekerId(null);
      setActiveGig({
        id: Math.random().toString(36).substr(2, 9),
        seekerName: seeker.name,
        seekerRole: seeker.role,
        distance: seeker.distance,
        eta: '12 mins',
        status: 'active',
        destination: [-26.2041, 28.0473] // Mock destination (User's location)
      });
      setActiveTab('map');
      speakNavigation(`Gig accepted by ${seeker.name}. Navigating to user destination.`);
    }, 3000);
  };

  const speakNavigation = (text: string) => {
    const msg = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    msg.voice = voices.find(v => v.lang.includes('en-ZA')) || voices.find(v => v.lang.includes('en-GB')) || voices[0];
    msg.rate = 0.9;
    window.speechSynthesis.speak(msg);
  };

  const handleCancelGig = (by: 'user' | 'seeker') => {
    setCancelBy(by);
    setShowCancelModal(true);
  };

  const confirmCancel = () => {
    if (!cancelReason.trim()) return;
    speakNavigation(`Gig cancelled by ${cancelBy}. Reason: ${cancelReason}`);
    setActiveGig(null);
    setShowCancelModal(false);
    setCancelReason('');
    setCancelBy(null);
  };

  return (
    <div className="h-screen h-[100dvh] w-full bg-slate-50 font-sans overflow-hidden relative">
      {/* Content Area */}
      <div className="absolute inset-0 pb-20">
        <MapContainer
          center={[20, 0]}
          zoom={2}
          scrollWheelZoom={true}
          className="h-full w-full"
          attributionControl={false}
          zoomControl={false}
        >
          {viewMode === 'street' ? (
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          ) : (
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
          )}
          
          <LocationMarker />
          {activeTab === 'map' && <SearchBar />}
          {activeTab === 'map' && <CustomControls viewMode={viewMode} setViewMode={setViewMode} />}

          {/* Active Gig Route & Marker */}
          {activeGig && (
            <>
              <Polyline 
                positions={[
                  [-26.2041, 28.0473], // User location
                  [-26.2000, 28.0400], // Intermediate point
                  [-26.1950, 28.0350]  // Seeker location
                ]} 
                color="#2563eb" 
                weight={6} 
                opacity={0.6}
              />
              <Marker position={activeGig.destination} icon={customIcon}>
                <Popup>
                  <div className="p-2 text-center">
                    <p className="font-bold text-xs uppercase">Gig Destination</p>
                    <p className="text-[10px] text-slate-500">Arriving in {activeGig.eta}</p>
                  </div>
                </Popup>
              </Marker>
            </>
          )}
        </MapContainer>

        {/* Navigation Overlay (GiGs feature) */}
        <AnimatePresence>
          {activeGig && activeTab === 'map' && (
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="absolute bottom-24 left-4 right-4 z-[2000] bg-white rounded-3xl shadow-2xl p-6 border border-slate-100 flex flex-col gap-4 max-w-lg mx-auto"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white">
                    <Navigation className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Navigating to User</p>
                    <p className="text-lg font-bold text-black">{activeGig.seekerName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-black tabular-nums">{activeGig.eta}</p>
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{activeGig.distance} left</p>
                </div>
              </div>

              <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '40%' }}
                  className="h-full bg-blue-600"
                />
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => speakNavigation(`You are on the fastest route to your destination. Turn left in 200 meters.`)}
                  className="flex-1 py-3 bg-slate-50 text-black rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
                >
                  <Smartphone className="w-4 h-4" />
                  Voice Nav
                </button>
                <button 
                  onClick={() => handleCancelGig('user')}
                  className="flex-1 py-3 bg-red-50 text-red-600 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel Gig
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hiring Loading Overlay */}
        <AnimatePresence>
          {hiringSeekerId !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[3000] bg-black/60 backdrop-blur-md flex flex-col items-center justify-center text-white"
            >
              <div className="relative w-24 h-24 mb-6">
                <svg className="w-full h-full animate-spin">
                  <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/20" />
                  <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray="251.32" strokeDashoffset="180" className="text-white" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <UserSearch className="w-8 h-8 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-2">Requesting Gig...</h2>
              <p className="text-white/60 text-sm font-medium">Waiting for seeker to accept</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cancellation Modal */}
        <AnimatePresence>
          {showCancelModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[5000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl"
              >
                <h3 className="text-2xl font-bold text-black mb-2 uppercase tracking-tight">Cancel Gig</h3>
                <p className="text-slate-500 text-sm mb-6">Please provide a reason for cancelling this gig. This will be shared with the other party.</p>
                
                <textarea 
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Reason for cancellation..."
                  className="w-full h-32 p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-black transition-all mb-6 resize-none font-medium"
                />

                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowCancelModal(false)}
                    className="flex-1 py-4 bg-slate-100 text-black rounded-xl font-bold uppercase tracking-widest text-[10px]"
                  >
                    Back
                  </button>
                  <button 
                    onClick={confirmCancel}
                    disabled={!cancelReason.trim()}
                    className="flex-1 py-4 bg-black text-white rounded-xl font-bold uppercase tracking-widest text-[10px] disabled:opacity-50"
                  >
                    Confirm Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Feature Tabs Overlays (Blurry Map Wallpaper Background) */}
        <AnimatePresence>
          {activeTab !== 'map' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[1500] bg-white/70 backdrop-blur-xl flex flex-col items-center p-6 sm:p-10 pt-safe overflow-y-auto"
            >
              <div className="w-full max-w-lg pb-32">
                {/* Very Top Search Bar for Specific Features */}
                {activeTab === 'referrals' && (
                  <div className="sticky top-0 z-[1600] py-2 mb-4 bg-transparent">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <Search className="w-4 h-4 text-slate-500" />
                      </div>
                      <input 
                        type="text" 
                        value={referralSearch}
                        onChange={(e) => setReferralSearch(e.target.value)}
                        placeholder="Search Refs..."
                        className="w-full h-12 pl-12 pr-6 bg-white border border-slate-200/90 rounded-2xl focus:ring-2 focus:ring-blue-600 transition-all font-medium text-black placeholder:text-slate-400 shadow-md"
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'seekers' && (
                  <div className="sticky top-0 z-[1600] py-2 mb-4 bg-transparent">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <Search className="w-4 h-4 text-slate-500" />
                      </div>
                      <input 
                        type="text" 
                        value={seekerSearch}
                        onChange={(e) => setSeekerSearch(e.target.value)}
                        placeholder="Search Seekers..."
                        className="w-full h-12 pl-12 pr-6 bg-white border border-slate-200/90 rounded-2xl focus:ring-2 focus:ring-blue-600 transition-all font-medium text-black placeholder:text-slate-400 shadow-md"
                      />
                    </div>
                  </div>
                )}

                <div className="text-center mb-10">
                  <h1 className="text-4xl font-bold text-black uppercase tracking-[0.2em] mb-4">{activeTab === 'referrals' ? 'Refs' : activeTab}</h1>
                  {!(activeTab === 'tenant' || activeTab === 'referrals' || activeTab === 'seekers' || activeTab === 'profile') && (
                    <p className="text-slate-400 font-medium">Coming soon to the platform</p>
                  )}
                </div>
                
                {activeTab === 'tenant' && (() => {
                  const isMainTenant = currentUser?.email?.toLowerCase().trim() === MAIN_TENANT_EMAIL;
                  const tenantTarget = currentUser?.email?.toLowerCase().trim() || MAIN_TENANT_EMAIL;
                  const tenantActiveReferrals = referralApplications.filter(r => {
                    const belongs = isMainTenant || (!r.tenantEmail || r.tenantEmail.toLowerCase().trim() === tenantTarget);
                    const isPlanActive = (r.isPlanActivated === true || r.status === 'approved') && r.status !== 'rejected' && r.status !== 'frozen';
                    return belongs && isPlanActive;
                  });
                  const tenantSubCount = tenantActiveReferrals.filter(r => r.planType === 'tenant').length;
                  const userSubCount = tenantActiveReferrals.filter(r => r.planType === 'user').length;

                  return (
                    <div className="text-left space-y-6 w-full max-w-md mx-auto pt-2 relative">
                      {/* Top Tenant Bar */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-4">
                          <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-xl bg-slate-100 shrink-0">
                            <SafeImage 
                              src={currentUser?.selfieUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${MAIN_TENANT_EMAIL}`} 
                              alt="Tenant Avatar" 
                              fallbackType="selfie"
                              className="w-full h-full object-cover" 
                            />
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <span className="text-lg font-black text-black">{currentUser?.name ? `${currentUser.name} ${currentUser.surname || ''}` : 'Lucihano Elem'}</span>
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Tenant Partner</span>
                            </div>
                            <span className="text-xs text-slate-500 font-mono truncate">{currentUser?.email || MAIN_TENANT_EMAIL}</span>
                          </div>
                        </div>
                        <button 
                          onClick={resetAccount}
                          className="px-3 py-1.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors shadow-sm flex items-center gap-1.5 font-bold text-[10px] uppercase tracking-wider"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          Logout
                        </button>
                      </div>

                      {/* Toast Notification for Plan Activation */}
                      {profitToast && (
                        <div className="bg-emerald-600 text-white p-3.5 rounded-2xl shadow-lg flex items-center justify-between gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-300">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-emerald-200 shrink-0" />
                            <span>{profitToast}</span>
                          </div>
                          <button onClick={() => setProfitToast(null)} className="text-emerald-200 hover:text-white">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {/* Total Profit Card */}
                      <div className="bg-black rounded-3xl p-7 text-white shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-36 h-36 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/60">Total Profit Balance</p>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[9px] font-bold uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Recurring Monthly
                          </span>
                        </div>
                        
                        <div className="mt-3 flex items-baseline gap-1.5">
                          <span className="text-4xl sm:text-5xl font-black tracking-tight tabular-nums">
                            R{tenantProfit.total.toFixed(2)}
                          </span>
                          <span className="text-xs font-semibold text-white/50">/month</span>
                        </div>

                        <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                          <span className="text-white/70 font-medium text-[11px]">
                            {tenantActiveReferrals.length} active {tenantActiveReferrals.length === 1 ? 'referral subscriber' : 'referral subscribers'}
                          </span>
                          <button 
                            onClick={() => setTenantProfit({ total: 0, sub: 0, user: 0 })}
                            className="text-[9px] font-bold uppercase tracking-wider bg-white/10 px-3 py-1.5 rounded-full hover:bg-white/20 transition-all text-white/70 hover:text-white"
                          >
                            Reset Balance
                          </button>
                        </div>
                      </div>

                      {/* Profit Breakdown */}
                      <div className="grid grid-cols-2 gap-3.5">
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Tenant Sub Profit</p>
                              <span className="text-[8px] font-black text-amber-700 bg-amber-100 px-1 py-0.5 rounded">+R299.99</span>
                            </div>
                            <p className="text-xl font-black text-black tabular-nums">R{tenantProfit.sub.toFixed(2)}</p>
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium mt-2">{tenantSubCount} {tenantSubCount === 1 ? 'subscriber' : 'subscribers'} (R299.99/mo)</p>
                        </div>

                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">User Sub Profit</p>
                              <span className="text-[8px] font-black text-blue-700 bg-blue-100 px-1 py-0.5 rounded">+R29.99</span>
                            </div>
                            <p className="text-xl font-black text-black tabular-nums">R{tenantProfit.user.toFixed(2)}</p>
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium mt-2">{userSubCount} {userSubCount === 1 ? 'subscriber' : 'subscribers'} (R29.99/mo)</p>
                        </div>
                      </div>

                      {/* Share Link */}
                      <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl relative shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Share2 className="w-4 h-4 text-blue-600" />
                            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Tenant Referral Link</p>
                          </div>
                          <span className="text-[8px] font-bold bg-blue-200/70 text-blue-800 px-2 py-0.5 rounded-full">Directs to App</span>
                        </div>
                        
                        <div className="flex items-center gap-2 bg-white border border-blue-200 rounded-xl p-2 shadow-sm">
                          <input 
                            readOnly 
                            value={tenantInviteUrl} 
                            className="grow text-xs font-mono text-blue-900 bg-transparent outline-none truncate select-all px-1"
                          />
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(tenantInviteUrl);
                              setCopiedInvite(true);
                              setTimeout(() => setCopiedInvite(false), 2500);
                            }}
                            title="Copy referral link"
                            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 shrink-0 text-xs font-bold"
                          >
                            {copiedInvite ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span className="text-[10px] uppercase tracking-wider">{copiedInvite ? 'Copied!' : 'Copy'}</span>
                          </button>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-blue-200/60">
                          <p className="text-[9px] text-blue-700 font-medium leading-relaxed">
                            Referrals clicking this link are directed to the app and will show up in your Refs tab.
                          </p>
                          <button
                            onClick={handleSimulateReferral}
                            className="text-[9px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100 hover:bg-blue-200 px-3 py-1.5 rounded-xl transition-colors flex items-center justify-center gap-1.5 shrink-0 shadow-sm"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                            Simulate Referral
                          </button>
                        </div>
                      </div>

                      {/* Active Profit Contributors Section */}
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between px-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                            Active Profit Contributors ({tenantActiveReferrals.length})
                          </p>
                          <button 
                            onClick={() => setActiveTab('referrals')}
                            className="text-[10px] font-bold text-blue-600 hover:underline uppercase tracking-wider"
                          >
                            View in Refs →
                          </button>
                        </div>

                        {tenantActiveReferrals.length > 0 ? (
                          <div className="space-y-2.5">
                            {tenantActiveReferrals.map((ref) => (
                              <div key={ref.id} className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-sm hover:border-slate-200 transition-all">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div 
                                    className="w-10 h-10 rounded-full overflow-hidden border border-white shadow-sm bg-slate-200 shrink-0 cursor-pointer" 
                                    onClick={() => openDocViewer(ref.selfie, 'Subscriber Photo', `${ref.name} ${ref.surname}`, 'selfie')}
                                    title="Click to view full photo"
                                  >
                                    <SafeImage src={ref.selfie} alt={ref.name} fallbackType="selfie" className="w-full h-full object-cover" />
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-xs font-bold text-black">{ref.name} {ref.surname}</span>
                                      <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${ref.planType === 'tenant' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {ref.planType} Plan
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-slate-500 truncate font-mono">{ref.email || ref.contact}</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2.5 shrink-0">
                                  <div className="flex flex-col items-end">
                                    <span className="text-xs font-black text-emerald-600 font-mono tabular-nums">
                                      +{ref.planType === 'tenant' ? 'R299.99' : 'R29.99'}/mo
                                    </span>
                                    <span className="text-[8px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded mt-0.5">
                                      Plan Activated
                                    </span>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      downloadDocument(ref.idDoc || DEFAULT_ID_DOC, `${ref.name}_${ref.surname}_ID_Card`);
                                      setTimeout(() => downloadDocument(ref.payment || DEFAULT_POP_DOC, `${ref.name}_${ref.surname}_Proof_Of_Payment`), 350);
                                    }}
                                    title="Download subscriber verification documents to device"
                                    className="p-2 text-slate-500 hover:text-black hover:bg-slate-200/80 rounded-xl transition-colors shadow-xs"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="bg-slate-50 border border-dashed border-slate-200 p-6 rounded-2xl text-center space-y-2">
                            <p className="text-xs font-bold text-slate-600">No active referral profit yet</p>
                            <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
                              When referrals activate a subscription plan, their monthly profit (+R299.99/mo or +R29.99/mo) will appear here in real-time.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {activeTab === 'settings' && (
                  <div className="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-3xl p-8 text-center my-10 shadow-sm">
                    <h2 className="text-2xl font-bold text-black mb-2">Settings</h2>
                    <p className="text-slate-500 text-sm">Settings configuration coming soon.</p>
                  </div>
                )}

                {activeTab === 'referrals' && (
                  <div className="w-full max-w-2xl mx-auto pt-4 space-y-6">
                    <div className="space-y-6">
                      {['pending', 'approved', 'frozen'].map((sectionStatus) => {
                        const isMainTenant = currentUser?.email?.toLowerCase().trim() === MAIN_TENANT_EMAIL;
                        const tenantReferrals = referralApplications.filter(app => {
                          const matchesSearch = `${app.name} ${app.surname}`.toLowerCase().includes(referralSearch.toLowerCase()) ||
                            (app.email && app.email.toLowerCase().includes(referralSearch.toLowerCase()));
                          if (!matchesSearch) return false;
                          if (isMainTenant) return true;
                          return !app.tenantEmail || app.tenantEmail.toLowerCase().trim() === currentUser?.email?.toLowerCase().trim();
                        });

                        const apps = tenantReferrals.filter(app => app.status === sectionStatus);
                        if (apps.length === 0 && sectionStatus !== 'pending') return null;

                        return (
                          <div key={sectionStatus} className="space-y-4">
                            <div className="flex items-center justify-between ml-2">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                                {sectionStatus === 'pending' ? 'Pending Applications' : 
                                 sectionStatus === 'approved' ? 'Active Network' : 'Frozen Accounts'}
                              </p>
                              <span className="text-[9px] font-bold text-slate-400 tabular-nums">
                                {apps.length}
                              </span>
                            </div>
                            
                            <div className="grid gap-4">
                              {apps.length > 0 ? (
                                apps.map(app => (
                                  <div key={app.id} className="bg-slate-50 border border-slate-100 p-6 rounded-3xl shadow-sm space-y-6">
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="flex items-center gap-4 min-w-0">
                                        <div 
                                          className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-md cursor-pointer bg-slate-200 shrink-0" 
                                          onClick={() => openDocViewer(app.selfie, 'Applicant Photo', `${app.name} ${app.surname}`, 'selfie')}
                                          title="Click to view & download selfie"
                                        >
                                          <SafeImage src={app.selfie} fallbackType="selfie" className="w-full h-full object-cover" alt="Selfie" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-bold text-black">{app.name} {app.surname}</span>
                                            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${app.planType === 'tenant' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                              {app.planType} Plan
                                            </span>
                                            {(app.isPlanActivated || app.status === 'approved') ? (
                                              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1 font-mono">
                                                +{app.planType === 'tenant' ? 'R299.99' : 'R29.99'}/mo profit
                                              </span>
                                            ) : app.status === 'frozen' ? (
                                              <span className="text-[8px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                                                Profit Paused
                                              </span>
                                            ) : (
                                              <span className="text-[8px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                                                Pending Plan Activation
                                              </span>
                                            )}
                                          </div>
                                          {app.email && (
                                            <span className="text-[11px] text-slate-500 font-medium truncate font-mono">{app.email}</span>
                                          )}
                                          {app.contact && (
                                            <span className="text-[10px] text-slate-400 font-medium font-mono">{app.contact}</span>
                                          )}
                                          <span className="text-[10px] text-slate-400 font-medium">Applied {app.date}</span>
                                        </div>
                                      </div>
                                      
                                      <div className="flex gap-2 shrink-0">
                                        {app.status === 'pending' && (
                                          <>
                                            <button 
                                              onClick={() => updateReferralStatus(app.id, 'approved')}
                                              className="px-4 py-2 bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                                            >
                                              Approve
                                            </button>
                                            <button 
                                              onClick={() => updateReferralStatus(app.id, 'rejected')}
                                              className="px-4 py-2 bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                                            >
                                              Reject
                                            </button>
                                          </>
                                        )}
                                        {app.status === 'approved' && (
                                          <button 
                                            onClick={() => updateReferralStatus(app.id, 'frozen')}
                                            className="px-4 py-2 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl hover:bg-black transition-all shadow-lg"
                                          >
                                            Freeze
                                          </button>
                                        )}
                                        {app.status === 'frozen' && (
                                          <button 
                                            onClick={() => updateReferralStatus(app.id, 'approved')}
                                            className="px-4 py-2 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                                          >
                                            Unfreeze
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    {/* Document Previews with Direct Download Controls */}
                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                      <div 
                                        onClick={() => openDocViewer(app.idDoc, 'National ID Document', `${app.name} ${app.surname}`, 'id')}
                                        className="aspect-video bg-slate-200 rounded-2xl overflow-hidden relative group cursor-pointer border border-slate-300/30"
                                      >
                                        <SafeImage 
                                          src={app.idDoc} 
                                          fallbackType="id" 
                                          className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" 
                                          alt="ID Document" 
                                        />
                                        <div className="absolute inset-0 flex items-center justify-between p-2.5 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-90 group-hover:opacity-100 transition-opacity">
                                          <span className="text-[8px] font-bold text-white uppercase tracking-widest bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-sm">
                                            ID Card
                                          </span>
                                          <button 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              downloadDocument(app.idDoc, `${app.name}_${app.surname}_ID_Card`);
                                            }}
                                            title="Download ID Document to device"
                                            className="p-1.5 bg-black/60 hover:bg-black text-white rounded-lg backdrop-blur-sm shadow-md transition-all active:scale-95"
                                          >
                                            <Download className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>

                                      <div 
                                        onClick={() => openDocViewer(app.payment, 'Proof of Payment Voucher', `${app.name} ${app.surname}`, 'payment')}
                                        className="aspect-video bg-slate-200 rounded-2xl overflow-hidden relative group cursor-pointer border border-slate-300/30"
                                      >
                                        <SafeImage 
                                          src={app.payment} 
                                          fallbackType="payment" 
                                          className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" 
                                          alt="Payment Proof" 
                                        />
                                        <div className="absolute inset-0 flex items-center justify-between p-2.5 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-90 group-hover:opacity-100 transition-opacity">
                                          <span className="text-[8px] font-bold text-white uppercase tracking-widest bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-sm">
                                            POP Voucher
                                          </span>
                                          <button 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              downloadDocument(app.payment, `${app.name}_${app.surname}_Proof_Of_Payment`);
                                            }}
                                            title="Download Proof of Payment to device"
                                            className="p-1.5 bg-black/60 hover:bg-black text-white rounded-lg backdrop-blur-sm shadow-md transition-all active:scale-95"
                                          >
                                            <Download className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Action bar to download both files */}
                                    <div className="flex items-center justify-between pt-1">
                                      <button
                                        onClick={() => {
                                          downloadDocument(app.idDoc, `${app.name}_${app.surname}_ID_Card`);
                                          setTimeout(() => downloadDocument(app.payment, `${app.name}_${app.surname}_Proof_Of_Payment`), 400);
                                        }}
                                        className="text-[10px] font-bold text-slate-700 bg-slate-200/80 hover:bg-slate-300 px-3 py-1.5 rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-sm active:scale-95"
                                      >
                                        <Download className="w-3.5 h-3.5 text-slate-700" />
                                        Download Both Documents
                                      </button>
                                      <span className="text-[9px] text-slate-400 font-medium">Tap thumbnail to inspect full size</span>
                                    </div>
                                    
                                    {app.status === 'approved' && (
                                      <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 py-2 px-3 rounded-xl">
                                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                                        <span className="text-[9px] font-bold uppercase tracking-widest">Verified to use the app until subscription ends</span>
                                      </div>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <div className="text-center py-8 opacity-40 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-4">
                                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1">No referrals in this category</p>
                                  <p className="text-[9px] text-slate-500 font-medium">Share your Tenant Referral Link under the Tenant tab to receive new applicants.</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeTab === 'seekers' && (
                  <div className="w-full max-w-md mx-auto pt-4 space-y-4">
                    {filteredSeekers.length > 0 ? (
                      filteredSeekers.map(seeker => (
                        <div key={seeker.id} className="bg-white/85 backdrop-blur-md border border-slate-200/80 p-5 rounded-2xl flex items-center justify-between group hover:shadow-lg transition-all">
                          <div className="flex items-center gap-4">
                            <div 
                              onClick={() => openDocViewer(seeker.avatar, 'Seeker Photo', seeker.name, 'selfie')}
                              className="w-12 h-12 bg-slate-50 rounded-full overflow-hidden border border-slate-200 shadow-sm cursor-pointer hover:scale-105 transition-transform"
                            >
                              <SafeImage src={seeker.avatar} alt={seeker.name} fallbackType="selfie" className="w-full h-full object-cover" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-black">{seeker.name} {seeker.surname}</span>
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{seeker.role}</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">{seeker.distance}</span>
                            <button 
                              onClick={() => handleHire(seeker)}
                              disabled={hiringSeekerId !== null}
                              className="px-4 py-1.5 bg-black text-white text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-slate-800 transition-all disabled:opacity-50"
                            >
                              Hire
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-20 opacity-30">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <UserSearch className="w-8 h-8" />
                        </div>
                        <p className="text-sm font-bold uppercase tracking-widest">No seekers found</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'profile' && (
                  <div className="border-t border-slate-100 pt-8 relative">
                    <div className="flex justify-end mb-4">
                      <button 
                        onClick={resetAccount}
                        className="p-3 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-colors shadow-sm flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                    <div className="flex flex-col items-center mb-8">
                      <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-100 shadow-xl bg-slate-50 flex items-center justify-center mb-4">
                        <SafeImage 
                          src={currentUser?.selfieUrl} 
                          alt="Profile" 
                          fallbackType="selfie" 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <h3 className="text-2xl font-bold text-black tracking-tight">
                        {currentUser?.name} {currentUser?.surname}
                      </h3>
                      <p className="text-blue-600 text-xs font-bold uppercase tracking-widest mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Activated
                      </p>
                    </div>

                    <div className="space-y-4 text-left mb-10">
                      <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Email Address</p>
                        <p className="text-sm font-medium text-black ml-1">{currentUser?.email}</p>
                      </div>
                      <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Contact Number</p>
                        <p className="text-sm font-medium text-black ml-1">{currentUser?.contact}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Document Viewer Modal */}
        <AnimatePresence>
          {viewingDoc && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingDoc(null)}
              className="fixed inset-0 z-[4000] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 cursor-zoom-out"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative max-w-4xl w-full max-h-[80vh] flex items-center justify-center"
              >
                <img 
                  src={viewingDoc.url} 
                  className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" 
                  alt={viewingDoc.title}
                />
                <button 
                  onClick={() => setViewingDoc(null)}
                  className="absolute -top-12 right-0 p-2 text-white/50 hover:text-white transition-colors"
                >
                  <X className="w-8 h-8" />
                </button>
                <div className="absolute -bottom-16 w-full flex items-center justify-between text-white/70 px-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white">{viewingDoc.title}</span>
                    <span className="text-xs">{viewingDoc.applicantName}</span>
                  </div>
                  <button 
                    onClick={() => downloadDocument(viewingDoc.url, `${viewingDoc.applicantName || 'Applicant'}_${viewingDoc.title}`)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Auth Overlay */}
        <AnimatePresence>
          {isAuthOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[2500] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 overflow-y-auto"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-white rounded-[2rem] w-full max-w-sm p-6 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto"
              >
                <button 
                  onClick={() => setIsAuthOpen(false)}
                  className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>

                {authMode === 'welcome' && (
                  <div className="text-center py-6">
                    <CheckCircle2 className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-slate-900 mb-1">Welcome Back!</h2>
                    <p className="text-xs text-slate-500">{currentUser?.email}</p>
                  </div>
                )}

                {authMode === 'congrats' && (
                  <div className="text-center py-6">
                    <CheckCircle2 className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-slate-900 mb-1">Congratulations!</h2>
                    <p className="text-xs text-slate-500 mb-4">Welcome to the app. Let's get you activated.</p>
                    <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
                  </div>
                )}

                {(authMode === 'signin' || authMode === 'signup') && (
                  <>
                    <div className="text-center mb-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        {authMode === 'signin' ? <LogIn className="w-6 h-6 text-blue-600" /> : <UserPlus className="w-6 h-6 text-blue-600" />}
                      </div>
                      <h2 className="text-2xl font-bold text-slate-900 mb-1">{authMode === 'signin' ? 'Sign In' : 'Sign Up'}</h2>
                      <p className="text-xs text-slate-500 mb-4">{authMode === 'signin' ? 'Access your account' : 'Create your account to continue'}</p>
                      
                      <button 
                        onClick={handleGoogleAuth}
                        disabled={isLoading}
                        className="w-full h-10 bg-white border-2 border-slate-200 hover:border-black text-slate-700 rounded-xl font-bold transition-all shadow-sm flex items-center justify-center gap-2 mb-4 text-xs"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                        </svg>
                        <span>Continue with Google</span>
                      </button>

                      <div className="relative flex py-1 items-center">
                        <div className="flex-grow border-t border-slate-200"></div>
                        <span className="flex-shrink mx-3 text-slate-400 text-[9px] font-bold uppercase tracking-widest">or email</span>
                        <div className="flex-grow border-t border-slate-200"></div>
                      </div>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-2.5">
                      {authMode === 'signup' && (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[8px] font-bold uppercase tracking-widest text-slate-400 mb-0.5 ml-1">Name</label>
                              <input 
                                name="name"
                                type="text" 
                                required 
                                className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-black transition-all"
                                placeholder="John"
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] font-bold uppercase tracking-widest text-slate-400 mb-0.5 ml-1">Surname</label>
                              <input 
                                name="surname"
                                type="text" 
                                required 
                                className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-black transition-all"
                                placeholder="Doe"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[8px] font-bold uppercase tracking-widest text-slate-400 mb-0.5 ml-1">Contact Number</label>
                            <input 
                              name="contact"
                              type="tel" 
                              required 
                              className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-black transition-all"
                              placeholder="+27 12 345 6789"
                            />
                          </div>
                        </>
                      )}
                      
                      <div>
                        <label className="block text-[8px] font-bold uppercase tracking-widest text-slate-400 mb-0.5 ml-1">Email Address</label>
                        <input 
                          name="email"
                          type="email" 
                          required 
                          className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-black transition-all"
                          placeholder="name@example.com"
                        />
                      </div>

                      <div>
                        <label className="block text-[8px] font-bold uppercase tracking-widest text-slate-400 mb-0.5 ml-1">Password</label>
                        <input 
                          name="password"
                          type="password" 
                          required 
                          className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-black transition-all"
                          placeholder="••••••••"
                        />
                      </div>
                      
                      {authMode === 'signup' && (
                        <div className="flex items-center gap-2 py-0.5">
                          <input type="checkbox" required className="w-3 h-3 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                          <label className="text-[9px] text-slate-500 font-medium">I accept the <span className="text-blue-600 underline">Terms & Conditions</span></label>
                        </div>
                      )}

                      <button 
                        disabled={isLoading}
                        type="submit" 
                        className="w-full h-10 bg-black text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2 text-xs"
                      >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (authMode === 'signin' ? 'Sign In' : 'Sign Up')}
                      </button>
                    </form>

                    <div className="mt-4 text-center">
                      <button 
                        onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                        className="text-xs font-medium text-slate-500 hover:text-black transition-colors"
                      >
                        {authMode === 'signin' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Activation Flow Overlay */}
        <AnimatePresence>
          {isActivated && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[2000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 overflow-y-auto"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-white rounded-[2rem] w-full max-w-4xl shadow-2xl overflow-hidden relative my-auto"
              >
                <button 
                  onClick={resetOnboarding}
                  className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-colors z-10"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>

                <div className="p-8 md:p-12">
                  {step === 'subscription' && (
                    <div className="text-center">
                      <h2 className="text-2xl font-bold text-slate-900 mb-1">Choose Activation Plan</h2>
                      <p className="text-slate-500 text-xs mb-6 max-w-sm mx-auto">Select a subscription to activate your account and join the network.</p>
                      <div className="grid md:grid-cols-2 gap-5 items-stretch justify-center max-w-3xl mx-auto">
                        {/* Tenant Sub */}
                        <motion.div 
                          whileHover={{ scale: 1.01 }}
                          onClick={() => handleSubSelect('tenant')}
                          className="relative w-full bg-slate-50 border-2 border-slate-200 hover:border-black rounded-3xl p-6 shadow-md cursor-pointer group transition-all flex flex-col text-left"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white shadow-sm">
                              <Smartphone className="w-5 h-5" />
                            </div>
                            <div className="text-right">
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Monthly</p>
                              <p className="text-lg font-black text-black">R299,99</p>
                            </div>
                          </div>
                          
                          <h3 className="text-lg font-bold text-black mb-1">Tenant Network</h3>
                          <p className="text-slate-500 text-xs mb-5">Earn passive monthly income & manage your referral network.</p>
                          
                          <div className="space-y-2.5 mb-6 flex-grow">
                            {[
                              'Earn passive monthly income',
                              'Build & manage your network',
                              'Approve/Reject referrals',
                              'Freeze/Unfreeze accounts',
                              'Full GiGs & Seekers access'
                            ].map((feat, i) => (
                              <div key={i} className="flex items-center gap-2.5 text-xs font-medium text-slate-700">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                <span>{feat}</span>
                              </div>
                            ))}
                          </div>
                          
                          <div className="mt-auto pt-4 border-t border-slate-200">
                            <span className="w-full py-3 bg-black text-white rounded-xl font-bold text-[10px] uppercase tracking-widest text-center block group-hover:bg-slate-800 transition-colors">Select Tenant</span>
                          </div>
                        </motion.div>

                        {/* User Sub */}
                        <motion.div 
                          whileHover={{ scale: 1.01 }}
                          onClick={() => handleSubSelect('user')}
                          className="relative w-full bg-slate-50 border-2 border-slate-200 hover:border-black rounded-3xl p-6 shadow-md cursor-pointer group transition-all flex flex-col text-left"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-sm">
                              <Navigation className="w-5 h-5" />
                            </div>
                            <div className="text-right">
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Monthly</p>
                              <p className="text-lg font-black text-black">R29,99</p>
                            </div>
                          </div>
                          
                          <h3 className="text-lg font-bold text-black mb-1">User Subscription</h3>
                          <p className="text-slate-500 text-xs mb-5">Access platform services and hire specialized seekers.</p>
                          
                          <div className="space-y-2.5 mb-6 flex-grow">
                            {[
                              'Full GiGs & Seekers access',
                              'Professional profile activation',
                              'Hire seekers for tasks',
                              'Live voice navigation',
                              'Global platform usage'
                            ].map((feat, i) => (
                              <div key={i} className="flex items-center gap-2.5 text-xs font-medium text-slate-700">
                                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                <span>{feat}</span>
                              </div>
                            ))}
                          </div>

                          <div className="mt-auto pt-4 border-t border-slate-200">
                            <span className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest text-center block group-hover:bg-blue-700 transition-colors">Select User</span>
                          </div>
                        </motion.div>
                      </div>
                    </div>
                  )}

                  {step === 'selfie' && (
                    <div className="text-center py-4">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Camera className="w-8 h-8 text-blue-600" />
                      </div>
                      <h2 className="text-2xl font-bold text-slate-900 mb-1">Live Face Selfie</h2>
                      <p className="text-slate-500 mb-6 max-w-sm mx-auto">Position your face within the circle and click capture.</p>
                      
                      <div className="relative w-full max-w-[300px] aspect-square mx-auto mb-8 bg-black rounded-full overflow-hidden border-4 border-blue-500 shadow-2xl flex items-center justify-center">
                        {cameraError ? (
                          <div className="text-white p-6 flex flex-col items-center gap-3">
                            <X className="w-8 h-8 text-red-500" />
                            <p className="text-xs font-medium">{cameraError === 'Permission denied' ? 'Camera access was denied. Please enable it in your browser settings.' : 'Could not access camera.'}</p>
                            <button onClick={startCamera} className="mt-2 text-[10px] uppercase tracking-wider font-bold bg-white/20 px-3 py-1.5 rounded-full hover:bg-white/30">Retry</button>
                          </div>
                        ) : (
                          <video 
                            ref={videoRef}
                            autoPlay 
                            playsInline 
                            muted 
                            className="w-full h-full object-cover scale-x-[-1]"
                          />
                        )}
                        <div className="absolute inset-0 border-[40px] border-black/40 rounded-full pointer-events-none" />
                      </div>

                      <button 
                        onClick={captureSelfie} 
                        disabled={!!cameraError}
                        className={`w-full max-w-sm py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${cameraError ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                      >
                        <Camera className="w-5 h-5" />
                        Capture & Continue
                      </button>
                    </div>
                  )}

                  {step === 'id_upload' && (
                    <div className="text-center py-10">
                      <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <FileUp className="w-10 h-10 text-blue-600" />
                      </div>
                      <h2 className="text-2xl font-bold text-slate-900 mb-2">Upload ID Documents</h2>
                      <p className="text-slate-500 mb-8">Please upload a clear photo of your ID or Passport.</p>
                      <div className="w-full max-w-md mx-auto mb-8">
                        <label className={`block p-10 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${idFile ? 'bg-blue-50 border-blue-400' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*,.pdf"
                            onChange={(e) => setIdFile(e.target.files?.[0] || null)}
                          />
                          <div className="flex flex-col items-center">
                            {idFile ? (
                              <>
                                <CheckCircle2 className="w-8 h-8 text-blue-500 mb-2" />
                                <span className="text-sm text-blue-700 font-bold truncate max-w-[250px]">{idFile.name}</span>
                                <span className="text-[10px] text-blue-400 mt-1 uppercase tracking-wider">Click to change</span>
                              </>
                            ) : (
                              <>
                                <FileUp className="w-8 h-8 text-slate-400 mb-2" />
                                <span className="text-sm text-slate-500 font-medium">Select ID Document</span>
                              </>
                            )}
                          </div>
                        </label>
                      </div>
                      <button 
                        onClick={nextStep} 
                        disabled={!idFile}
                        className={`w-full max-w-md py-4 rounded-xl font-bold transition-all ${idFile ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                      >
                        Next Step
                      </button>
                    </div>
                  )}

                  {step === 'payment_upload' && (
                    <div className="text-center py-10">
                      <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Receipt className="w-10 h-10 text-blue-600" />
                      </div>
                      <h2 className="text-2xl font-bold text-slate-900 mb-2">Proof of Payment</h2>
                      <p className="text-slate-500 mb-8">Upload your bank statement or payment confirmation.</p>
                      <div className="w-full max-w-md mx-auto mb-8">
                        <label className={`block p-10 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${paymentFile ? 'bg-blue-50 border-blue-400' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*,.pdf"
                            onChange={(e) => setPaymentFile(e.target.files?.[0] || null)}
                          />
                          <div className="flex flex-col items-center">
                            {paymentFile ? (
                              <>
                                <CheckCircle2 className="w-8 h-8 text-blue-500 mb-2" />
                                <span className="text-sm text-blue-700 font-bold truncate max-w-[250px]">{paymentFile.name}</span>
                                <span className="text-[10px] text-blue-400 mt-1 uppercase tracking-wider">Click to change</span>
                              </>
                            ) : (
                              <>
                                <Receipt className="w-8 h-8 text-slate-400 mb-2" />
                                <span className="text-sm text-slate-500 font-medium">Select Proof File</span>
                              </>
                            )}
                          </div>
                        </label>
                      </div>
                      <button 
                        onClick={nextStep} 
                        disabled={!paymentFile}
                        className={`w-full max-w-md py-4 rounded-xl font-bold transition-all ${paymentFile ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                      >
                        Submit Activation
                      </button>
                    </div>
                  )}

                  {step === 'submitting' && (
                    <div className="text-center py-20">
                      <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-6" />
                      <h2 className="text-2xl font-bold text-slate-900 mb-2">Submitting...</h2>
                      <p className="text-slate-500">Encrypting and uploading your documents</p>
                    </div>
                  )}

                  {step === 'reviewing' && (
                    <div className="text-center py-16">
                      <div className="relative w-32 h-32 mx-auto mb-10">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
                          <motion.circle 
                            cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="8" fill="transparent" 
                            className="text-blue-600"
                            strokeDasharray="376.99"
                            initial={{ strokeDashoffset: 376.99 }}
                            animate={{ strokeDashoffset: 100 }}
                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <CheckCircle2 className="w-12 h-12 text-blue-600" />
                        </div>
                      </div>
                      <h2 className="text-2xl font-bold text-slate-900 mb-2">Review in Progress</h2>
                      <p className="text-slate-500 mb-2">Your activation request is being processed</p>
                      <p className="text-sm font-medium text-blue-600 animate-pulse">Estimated time: 15–25 minutes</p>
                      <button onClick={resetOnboarding} className="mt-12 px-8 py-3 bg-slate-100 text-slate-600 rounded-full font-bold hover:bg-slate-200 transition-all">
                        Return to Map
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Menu Bar (Takealot-Inspired Premium Look & Feel) */}
      {!isAuthOpen && (() => {
        const isMainTenant = currentUser?.email?.toLowerCase().trim() === MAIN_TENANT_EMAIL;
        const tenantTarget = currentUser?.email?.toLowerCase().trim() || MAIN_TENANT_EMAIL;
        const pendingCount = referralApplications.filter(app => {
          const belongs = isMainTenant || (!app.tenantEmail || app.tenantEmail.toLowerCase().trim() === tenantTarget);
          return belongs && app.status === 'pending';
        }).length;
        const activeTenantCount = referralApplications.filter(app => {
          const belongs = isMainTenant || (!app.tenantEmail || app.tenantEmail.toLowerCase().trim() === tenantTarget);
          return belongs && ((app.isPlanActivated === true || app.status === 'approved') && app.status !== 'rejected' && app.status !== 'frozen');
        }).length;

        return (
          <div className="fixed bottom-0 left-0 w-full h-20 bg-white/95 backdrop-blur-xl border-t border-slate-200/90 shadow-[0_-8px_30px_rgba(11,121,191,0.08)] z-[3000] px-2 sm:px-6 flex items-center justify-around pb-safe">
            {!currentUser ? (
              <div className="flex items-center justify-center w-full">
                <TabButton 
                  icon={<LogIn className="w-5 h-5" />} 
                  label="Sign In/Up" 
                  active={isAuthOpen} 
                  onClick={() => setIsAuthOpen(true)} 
                />
              </div>
            ) : isFullyActivated ? (
              <div className={`flex w-full items-center ${selectedSub === 'tenant' ? 'justify-around' : 'justify-center gap-10 sm:gap-14'}`}>
                {selectedSub === 'tenant' ? (
                  <>
                    <TabButton 
                      icon={<Users className="w-5 h-5" />} 
                      label="Tenant" 
                      active={activeTab === 'tenant'} 
                      onClick={() => handleTabClick('tenant')} 
                      badge={activeTenantCount > 0 ? activeTenantCount : undefined}
                    />
                    <TabButton 
                      icon={<Share2 className="w-5 h-5" />} 
                      label="Refs" 
                      active={activeTab === 'referrals'} 
                      onClick={() => handleTabClick('referrals')} 
                      badge={pendingCount > 0 ? pendingCount : undefined}
                      badgeColor="bg-amber-500"
                    />
                    <TabButton 
                      icon={<Target className="w-5 h-5" />} 
                      label="GiGs" 
                      active={activeTab === 'map'} 
                      onClick={() => setActiveTab('map')} 
                    />
                    <TabButton 
                      icon={<UserSearch className="w-5 h-5" />} 
                      label="Seekers" 
                      active={activeTab === 'seekers'} 
                      onClick={() => handleTabClick('seekers')} 
                    />
                    <TabButton 
                      icon={<Settings className="w-5 h-5" />} 
                      label="Set" 
                      active={activeTab === 'settings'} 
                      onClick={() => handleTabClick('settings')} 
                    />
                  </>
                ) : (
                  <>
                    <TabButton 
                      icon={<UserSearch className="w-5 h-5" />} 
                      label="Seekers" 
                      active={activeTab === 'seekers'} 
                      onClick={() => handleTabClick('seekers')} 
                    />
                    <TabButton 
                      icon={<Target className="w-5 h-5" />} 
                      label="GiGs" 
                      active={activeTab === 'map'} 
                      onClick={() => setActiveTab('map')} 
                    />
                    <TabButton 
                      icon={<UserCircle className="w-5 h-5" />} 
                      label="Profile" 
                      active={activeTab === 'profile'} 
                      onClick={() => handleTabClick('profile')} 
                      image={currentUser?.selfieUrl}
                    />
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center w-full">
                <TabButton 
                  icon={<Zap className="w-5 h-5 text-amber-500 fill-amber-500/20" />} 
                  label={isActivated ? 'Active' : 'Activation'} 
                  active={isActivated} 
                  onClick={() => setIsActivated(true)} 
                />
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

function TabButton({ 
  icon, 
  label, 
  active, 
  onClick, 
  image,
  badge,
  badgeColor = 'bg-blue-600'
}: { 
  icon: React.ReactNode; 
  label: string; 
  active: boolean; 
  onClick: () => void;
  image?: string;
  badge?: string | number;
  badgeColor?: string;
}) {
  return (
    <motion.button 
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center py-1 px-3 sm:px-4 rounded-2xl transition-all duration-200 ${
        active 
          ? 'bg-blue-50/90 text-blue-600 shadow-xs' 
          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
      }`}
    >
      {/* Top Takealot Blue Indicator Line */}
      {active && (
        <motion.div 
          layoutId="tabActiveIndicator"
          className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-7 h-1 bg-blue-600 rounded-full shadow-xs shadow-blue-500/40"
          transition={{ type: "spring", stiffness: 450, damping: 32 }}
        />
      )}
      
      <div className="relative w-6 h-6 flex items-center justify-center">
        {image ? (
          <div className={`w-6 h-6 rounded-full overflow-hidden transition-all ${
            active ? 'ring-2 ring-blue-600 ring-offset-1' : 'border border-slate-300'
          }`}>
            <SafeImage src={image} alt={label} fallbackType="selfie" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className={`transition-all duration-200 ${active ? 'scale-110 text-blue-600 font-bold' : 'text-slate-500'}`}>
            {icon}
          </div>
        )}

        {badge !== undefined && badge !== 0 && (
          <span className={`absolute -top-1.5 -right-2.5 ${badgeColor} text-white text-[9px] font-black min-w-4 h-4 px-1 flex items-center justify-center rounded-full border-2 border-white shadow-xs animate-in zoom-in-50`}>
            {badge}
          </span>
        )}
      </div>
      
      <span className={`text-[9px] font-extrabold uppercase tracking-wider mt-0.5 transition-colors ${
        active ? 'text-blue-600 font-black' : 'text-slate-600 font-bold'
      }`}>
        {label}
      </span>
    </motion.button>
  );
}
