import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { Search, Satellite, Map as MapIcon, Zap, Plus, Minus, Navigation, Camera, FileUp, Receipt, CheckCircle2, Loader2, X, Users, Briefcase, UserSearch, UserCircle, Smartphone, LogIn, LogOut, UserPlus, Share2 } from 'lucide-react';
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
type TabType = 'map' | 'tenant' | 'referrals' | 'gigs' | 'seekers' | 'profile';
type AuthMode = 'signin' | 'signup' | 'congrats' | 'welcome';

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
    const saved = localStorage.getItem('world_explorer_user');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [isActivated, setIsActivated] = useState(false);
  const [isFullyActivated, setIsFullyActivated] = useState(() => {
    return localStorage.getItem('world_explorer_fully_activated') === 'true';
  });
  const [referralSearch, setReferralSearch] = useState('');
  const [seekerSearch, setSeekerSearch] = useState('');
  const [tenantProfit, setTenantProfit] = useState({ total: 0, sub: 0, user: 0 });
  const [activeTab, setActiveTab] = useState<TabType>('map');
  const [step, setStep] = useState<OnboardingStep>('subscription');
  const [selectedSub, setSelectedSub] = useState<'tenant' | 'user' | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

  const [referralApplications, setReferralApplications] = useState([
    { 
      id: 1, 
      name: 'Alice', 
      surname: 'Smith', 
      status: 'pending', 
      planType: 'user',
      date: '2026-11-08',
      selfie: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
      idDoc: 'https://images.unsplash.com/photo-1554224155-1696413565d3?w=800&auto=format&fit=crop&q=60',
      payment: 'https://images.unsplash.com/photo-1601597111158-2fcee29ec4d0?w=800&auto=format&fit=crop&q=60'
    },
    { 
      id: 2, 
      name: 'Bob', 
      surname: 'Jones', 
      status: 'pending', 
      planType: 'tenant',
      date: '2026-11-09',
      selfie: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
      idDoc: 'https://images.unsplash.com/photo-1554224155-1696413565d3?w=800&auto=format&fit=crop&q=60',
      payment: 'https://images.unsplash.com/photo-1601597111158-2fcee29ec4d0?w=800&auto=format&fit=crop&q=60'
    },
    { 
      id: 3, 
      name: 'Charlie', 
      surname: 'Brown', 
      status: 'approved', 
      planType: 'user',
      date: '2026-11-05',
      selfie: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie',
      idDoc: 'https://images.unsplash.com/photo-1554224155-1696413565d3?w=800&auto=format&fit=crop&q=60',
      payment: 'https://images.unsplash.com/photo-1601597111158-2fcee29ec4d0?w=800&auto=format&fit=crop&q=60'
    },
  ]);
  const [viewingDoc, setViewingDoc] = useState<string | null>(null);
  
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

  const resetAccount = () => {
    localStorage.clear();
    setCurrentUser(null);
    setIsFullyActivated(false);
    setIsActivated(false);
    setActiveTab('map');
    setStep('subscription');
    setSelectedSub(null);
    setIdFile(null);
    setPaymentFile(null);
    setIsAuthOpen(false);
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
      setTimeout(() => {
        setStep('reviewing');
        setIsFullyActivated(true); // Now User Sub also activates these features
        if (currentUser) {
          setCurrentUser({ ...currentUser, isRegistered: true });
        }
      }, 2000);
    }
  };

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const email = formData.get('email') as string;
    const name = formData.get('name') as string || 'John';
    const surname = formData.get('surname') as string || 'Doe';
    const contact = formData.get('contact') as string || '+27 12 345 6789';

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      
      const registeredEmails = JSON.parse(localStorage.getItem('world_explorer_registered_emails') || '["test@test.com", "timegig2026@gmail.com"]');

      if (authMode === 'signup') {
        if (registeredEmails.includes(email)) {
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
        }, 2000);
      } else {
        // Sign In
        const isMainTenant = email === 'timegig2026@gmail.com';
        const isTestUser = email === 'test@test.com' || registeredEmails.includes(email);
        const mockSelfie = `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`;
        
        if (isMainTenant) {
          setSelectedSub('tenant');
          setIsFullyActivated(true);
        } else if (isTestUser) {
          setIsFullyActivated(true);
        }

        setCurrentUser({ 
          email, 
          isRegistered: true, 
          name: isMainTenant ? 'TimeGig' : name, 
          surname: isMainTenant ? 'Tenant' : surname, 
          contact, 
          selfieUrl: mockSelfie 
        });
        setAuthMode('welcome');
        setTimeout(() => {
          setIsAuthOpen(false);
        }, 2000);
      }
    }, 1500);
  };

  const handleTabClick = (tab: TabType) => {
    setActiveTab(prev => prev === tab ? 'map' : tab);
  };

  const [seekers] = useState([
    { id: 1, name: 'David', surname: 'Mokoena', role: 'Business Owner', distance: '1.2km', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David' },
    { id: 2, name: 'Sarah', surname: 'Luthuli', role: 'Event Planner', distance: '3.5km', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah' },
    { id: 3, name: 'Thabo', surname: 'Ndlovu', role: 'Logistics Manager', distance: '0.8km', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Thabo' },
  ]);

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
          <SearchBar />
          <CustomControls viewMode={viewMode} setViewMode={setViewMode} />

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

        {/* Feature Tabs Overlays */}
        <AnimatePresence>
          {activeTab !== 'map' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[1500] bg-white flex flex-col items-center p-6 sm:p-10 pt-safe overflow-y-auto"
            >
              <div className="w-full max-w-lg pb-32">
                {/* Very Top Search Bar for Specific Features */}
                {activeTab === 'referrals' && (
                  <div className="relative mb-6 pt-4">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                      <Search className="w-4 h-4 text-black" />
                    </div>
                    <input 
                      type="text" 
                      value={referralSearch}
                      onChange={(e) => setReferralSearch(e.target.value)}
                      placeholder="Search Referrals..."
                      className="w-full h-14 pl-12 pr-6 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-black transition-all font-medium text-black placeholder:text-slate-400 shadow-sm"
                    />
                  </div>
                )}

                {activeTab === 'seekers' && (
                  <div className="relative mb-10 pt-2">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                      <Search className="w-4 h-4 text-black" />
                    </div>
                    <input 
                      type="text" 
                      value={seekerSearch}
                      onChange={(e) => setSeekerSearch(e.target.value)}
                      placeholder="Search Seekers..."
                      className="w-full h-14 pl-12 pr-6 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-black transition-all font-medium text-black placeholder:text-slate-400 shadow-sm"
                    />
                  </div>
                )}

                <div className="text-center mb-10">
                  <h1 className="text-4xl font-bold text-black uppercase tracking-[0.2em] mb-4">{activeTab}</h1>
                  {!(activeTab === 'tenant' || activeTab === 'referrals' || activeTab === 'seekers' || activeTab === 'profile') && (
                    <p className="text-slate-400 font-medium">Coming soon to the platform</p>
                  )}
                </div>
                
                {activeTab === 'tenant' && (
                  <div className="text-left space-y-8 w-full max-w-md mx-auto pt-6 relative">
                    <div className="flex justify-end mb-4">
                      <button 
                        onClick={resetAccount}
                        className="p-3 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-colors shadow-sm flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                    {/* Total Profit Card */}
                    <div className="bg-black rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                      <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-50 mb-1">Total Profit Balance</p>
                      <h2 className="text-4xl font-bold tracking-tighter tabular-nums">R{tenantProfit.total.toFixed(2)}</h2>
                      
                      <button 
                        onClick={() => setTenantProfit({ total: 0, sub: 0, user: 0 })}
                        className="mt-6 text-[9px] font-bold uppercase tracking-widest bg-white/10 px-4 py-2 rounded-full hover:bg-white/20 transition-all"
                      >
                        Reset Balance
                      </button>
                    </div>

                    {/* Breakdown */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tenant Sub Profit</p>
                        <p className="text-xl font-bold text-black tabular-nums">R{tenantProfit.sub.toFixed(2)}</p>
                      </div>
                      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">User Sub Profit</p>
                        <p className="text-xl font-bold text-black tabular-nums">R{tenantProfit.user.toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Share Link */}
                    <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl relative group">
                      <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-3">Invite & Build Network</p>
                      <div className="flex items-center gap-3 bg-white border border-blue-200 rounded-xl p-3">
                        <input 
                          readOnly 
                          value={`https://worldexplorer.app/invite/${currentUser?.name?.toLowerCase() || 'user'}${currentUser?.surname?.toLowerCase() || ''}`} 
                          className="grow text-xs font-mono text-blue-800 bg-transparent outline-none truncate"
                        />
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(`https://worldexplorer.app/invite/${currentUser?.name?.toLowerCase() || 'user'}${currentUser?.surname?.toLowerCase() || ''}`);
                            alert('Invitation link copied!');
                          }}
                          className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-[9px] text-blue-400 mt-3 font-medium">Earn a passive monthly income from user subscriptions in your network.</p>
                    </div>
                  </div>
                )}

                {activeTab === 'referrals' && (
                  <div className="w-full max-w-2xl mx-auto pt-4 space-y-6">
                    <div className="space-y-6">
                      {['pending', 'approved', 'frozen'].map((sectionStatus) => {
                        const filteredReferrals = referralApplications.filter(app => 
                          `${app.name} ${app.surname}`.toLowerCase().includes(referralSearch.toLowerCase())
                        );
                        const apps = filteredReferrals.filter(app => app.status === sectionStatus);
                        if (apps.length === 0 && sectionStatus !== 'pending') return null;

                        return (
                          <div key={sectionStatus} className="space-y-4">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-2">
                              {sectionStatus === 'pending' ? 'Pending Applications' : 
                               sectionStatus === 'approved' ? 'Active Network' : 'Frozen Accounts'}
                            </p>
                            
                            <div className="grid gap-4">
                              {apps.length > 0 ? (
                                apps.map(app => (
                                  <div key={app.id} className="bg-slate-50 border border-slate-100 p-6 rounded-3xl shadow-sm space-y-6">
                                    <div className="flex items-start justify-between">
                                      <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-md cursor-pointer bg-slate-200" onClick={() => setViewingDoc(app.selfie)}>
                                          <img src={app.selfie} className="w-full h-full object-cover" alt="Selfie" />
                                        </div>
                                        <div className="flex flex-col">
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-black">{app.name} {app.surname}</span>
                                            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${app.planType === 'tenant' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                              {app.planType}
                                            </span>
                                          </div>
                                          <span className="text-[10px] text-slate-400 font-medium">Applied {app.date}</span>
                                        </div>
                                      </div>
                                      
                                      <div className="flex gap-2">
                                        {app.status === 'pending' && (
                                          <>
                                            <button 
                                              onClick={() => setReferralApplications(prev => prev.map(a => a.id === app.id ? {...a, status: 'approved'} : a))}
                                              className="px-4 py-2 bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                                            >
                                              Approve
                                            </button>
                                            <button 
                                              onClick={() => setReferralApplications(prev => prev.map(a => a.id === app.id ? {...a, status: 'rejected'} : a))}
                                              className="px-4 py-2 bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                                            >
                                              Reject
                                            </button>
                                          </>
                                        )}
                                        {app.status === 'approved' && (
                                          <button 
                                            onClick={() => setReferralApplications(prev => prev.map(a => a.id === app.id ? {...a, status: 'frozen'} : a))}
                                            className="px-4 py-2 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl hover:bg-black transition-all shadow-lg"
                                          >
                                            Freeze
                                          </button>
                                        )}
                                        {app.status === 'frozen' && (
                                          <button 
                                            onClick={() => setReferralApplications(prev => prev.map(a => a.id === app.id ? {...a, status: 'approved'} : a))}
                                            className="px-4 py-2 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                                          >
                                            Unfreeze
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    {/* Document Previews */}
                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                      <div 
                                        onClick={() => setViewingDoc(app.idDoc)}
                                        className="aspect-video bg-slate-200 rounded-2xl overflow-hidden relative group cursor-pointer border border-slate-300/30"
                                      >
                                        <img src={app.idDoc} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="ID" />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <span className="text-[8px] font-bold text-white uppercase tracking-widest bg-black/40 px-2 py-1 rounded-full backdrop-blur-sm">View ID Card</span>
                                        </div>
                                      </div>
                                      <div 
                                        onClick={() => setViewingDoc(app.payment)}
                                        className="aspect-video bg-slate-200 rounded-2xl overflow-hidden relative group cursor-pointer border border-slate-300/30"
                                      >
                                        <img src={app.payment} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="Payment" />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <span className="text-[8px] font-bold text-white uppercase tracking-widest bg-black/40 px-2 py-1 rounded-full backdrop-blur-sm">View POP</span>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {app.status === 'approved' && (
                                      <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 py-2 px-3 rounded-xl">
                                        <CheckCircle2 className="w-3 h-3" />
                                        <span className="text-[9px] font-bold uppercase tracking-widest">Verified to use the app until subscription ends</span>
                                      </div>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <div className="text-center py-6 opacity-20 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                                  <p className="text-[10px] font-bold uppercase tracking-widest">No referrals found</p>
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
                        <div key={seeker.id} className="bg-white border border-slate-100 p-5 rounded-2xl flex items-center justify-between group hover:shadow-lg transition-all">
                          <div className="flex items-center gap-4">
                            <div 
                              onClick={() => setViewingDoc(seeker.avatar)}
                              className="w-12 h-12 bg-slate-50 rounded-full overflow-hidden border border-slate-200 shadow-sm cursor-pointer hover:scale-105 transition-transform"
                            >
                              <img src={seeker.avatar} className="w-full h-full object-cover" alt={seeker.name} />
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
                        {currentUser?.selfieUrl ? (
                          <img src={currentUser.selfieUrl} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <UserCircle className="w-20 h-20 text-slate-200" />
                        )}
                      </div>
                      <h3 className="text-2xl font-bold text-black tracking-tight">
                        {currentUser?.name} {currentUser?.surname}
                      </h3>
                      <p className="text-blue-600 text-xs font-bold uppercase tracking-widest mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Activated
                      </p>
                    </div>

                    <div className="space-y-4 text-left mb-10">
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Email Address</p>
                        <p className="text-sm font-medium text-black ml-1">{currentUser?.email}</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
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
                  src={viewingDoc} 
                  className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" 
                  alt="Full view" 
                />
                <button 
                  onClick={() => setViewingDoc(null)}
                  className="absolute -top-12 right-0 p-2 text-white/50 hover:text-white transition-colors"
                >
                  <X className="w-8 h-8" />
                </button>
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
                className="bg-white rounded-[2rem] w-full max-w-md p-8 md:p-12 shadow-2xl relative my-auto"
              >
                <button 
                  onClick={() => setIsAuthOpen(false)}
                  className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>

                {authMode === 'welcome' && (
                  <div className="text-center py-10">
                    <CheckCircle2 className="w-16 h-16 text-blue-600 mx-auto mb-6" />
                    <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome Back!</h2>
                    <p className="text-slate-500">{currentUser?.email}</p>
                  </div>
                )}

                {authMode === 'congrats' && (
                  <div className="text-center py-10">
                    <CheckCircle2 className="w-16 h-16 text-blue-600 mx-auto mb-6" />
                    <h2 className="text-3xl font-bold text-slate-900 mb-2">Congratulations!</h2>
                    <p className="text-slate-500 mb-6">Welcome to the app. Let's get you activated.</p>
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                  </div>
                )}

                {(authMode === 'signin' || authMode === 'signup') && (
                  <>
                    <div className="text-center mb-8">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        {authMode === 'signin' ? <LogIn className="w-8 h-8 text-blue-600" /> : <UserPlus className="w-8 h-8 text-blue-600" />}
                      </div>
                      <h2 className="text-3xl font-bold text-slate-900 mb-2">{authMode === 'signin' ? 'Sign In' : 'Sign Up'}</h2>
                      <p className="text-slate-500">{authMode === 'signin' ? 'Access your account' : 'Create your account to continue'}</p>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[8px] font-bold uppercase tracking-widest text-slate-400 mb-1 ml-1">Name</label>
                          <input 
                            name="name"
                            type="text" 
                            required 
                            className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-black transition-all"
                            placeholder="John"
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] font-bold uppercase tracking-widest text-slate-400 mb-1 ml-1">Surname</label>
                          <input 
                            name="surname"
                            type="text" 
                            required 
                            className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-black transition-all"
                            placeholder="Doe"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-[8px] font-bold uppercase tracking-widest text-slate-400 mb-1 ml-1">Email Address</label>
                        <input 
                          name="email"
                          type="email" 
                          required 
                          className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-black transition-all"
                          placeholder="name@example.com"
                        />
                      </div>

                      <div>
                        <label className="block text-[8px] font-bold uppercase tracking-widest text-slate-400 mb-1 ml-1">Contact Number</label>
                        <input 
                          name="contact"
                          type="tel" 
                          required 
                          className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-black transition-all"
                          placeholder="+27 12 345 6789"
                        />
                      </div>

                      <div>
                        <label className="block text-[8px] font-bold uppercase tracking-widest text-slate-400 mb-1 ml-1">Password</label>
                        <input 
                          name="password"
                          type="password" 
                          required 
                          className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-black transition-all"
                          placeholder="••••••••"
                        />
                      </div>
                      
                      {authMode === 'signup' && (
                        <div className="flex items-center gap-3 p-1">
                          <input type="checkbox" required className="w-3 h-3 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                          <label className="text-[10px] text-slate-500 font-medium">I accept the <span className="text-blue-600 underline">Terms & Conditions</span></label>
                        </div>
                      )}

                      <button 
                        disabled={isLoading}
                        type="submit" 
                        className="w-full h-12 bg-black text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2"
                      >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (authMode === 'signin' ? 'Sign In' : 'Sign Up')}
                      </button>
                    </form>

                    <div className="mt-8 text-center">
                      <button 
                        onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                        className="text-sm font-medium text-slate-500 hover:text-black transition-colors"
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

      {/* Bottom Menu Bar (Fixed Positioning for reliable visibility) */}
      <div className="fixed bottom-0 left-0 w-full h-20 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-[3000] px-6 flex items-center justify-between pb-safe">
        {!currentUser ? (
          <div className="flex items-center justify-center w-full">
            <TabButton 
              icon={<LogIn />} 
              label="Sign In/Up" 
              active={isAuthOpen} 
              onClick={() => setIsAuthOpen(true)} 
            />
          </div>
        ) : isFullyActivated ? (
          <div className={`flex w-full ${selectedSub === 'tenant' ? 'justify-between' : 'justify-center gap-14'}`}>
            {selectedSub === 'tenant' ? (
              <>
                <TabButton icon={<Users />} label="Tenant" active={activeTab === 'tenant'} onClick={() => handleTabClick('tenant')} />
                <TabButton icon={<Share2 />} label="Referrals" active={activeTab === 'referrals'} onClick={() => handleTabClick('referrals')} />
                <TabButton icon={<Briefcase />} label="GiGs" active={activeTab === 'map'} onClick={() => setActiveTab('map')} />
                <TabButton icon={<UserSearch />} label="Seekers" active={activeTab === 'seekers'} onClick={() => handleTabClick('seekers')} />
                <TabButton 
                  icon={<UserCircle />} 
                  label="Profile" 
                  active={activeTab === 'profile'} 
                  onClick={() => handleTabClick('profile')} 
                  image={currentUser?.selfieUrl}
                />
              </>
            ) : (
              <>
                <TabButton icon={<UserSearch />} label="Seekers" active={activeTab === 'seekers'} onClick={() => handleTabClick('seekers')} />
                <TabButton icon={<Briefcase />} label="GiGs" active={activeTab === 'map'} onClick={() => setActiveTab('map')} />
                <TabButton 
                  icon={<UserCircle />} 
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
              icon={<Zap />} 
              label={isActivated ? 'Active' : 'Activation'} 
              active={isActivated} 
              onClick={() => setIsActivated(true)} 
            />
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({ icon, label, active, onClick, image }: { 
  icon: React.ReactNode; 
  label: string; 
  active: boolean; 
  onClick: () => void;
  image?: string;
}) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-all ${active ? 'scale-110' : 'hover:opacity-80'}`}
    >
      <div className={`w-6 h-6 flex items-center justify-center transition-all ${active ? 'fill-black' : ''}`}>
        {image ? (
          <div className="w-6 h-6 rounded-full overflow-hidden border border-black/10">
            <img src={image} className="w-full h-full object-cover" alt={label} />
          </div>
        ) : icon}
      </div>
      <span className="text-[9px] font-bold uppercase tracking-wider text-black">{label}</span>
    </button>
  );
}
