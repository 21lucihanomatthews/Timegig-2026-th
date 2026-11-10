import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import { Search, Satellite, Map as MapIcon, Zap, Plus, Minus, Navigation, Camera, FileUp, Receipt, CheckCircle2, Loader2, X, Users, Briefcase, UserSearch, UserCircle, Smartphone, LogIn, UserPlus } from 'lucide-react';
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
    <div className="absolute top-[80px] left-[16px] z-[1000] flex flex-col gap-5">
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
type TabType = 'map' | 'tenant' | 'referrals' | 'gadgets' | 'seekers' | 'profile';
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
  const [activeTab, setActiveTab] = useState<TabType>('map');
  const [step, setStep] = useState<OnboardingStep>('subscription');
  const [selectedSub, setSelectedSub] = useState<'tenant' | 'user' | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
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
        if (selectedSub === 'tenant') {
          setIsFullyActivated(true);
          if (currentUser) {
            setCurrentUser({ ...currentUser, isRegistered: true });
          }
        }
      }, 2000);
    }
  };

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const email = formData.get('email') as string;

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      if (authMode === 'signin') {
        const isRegistered = email === 'test@test.com';
        const name = formData.get('name') as string || 'John';
        const surname = formData.get('surname') as string || 'Doe';
        const contact = formData.get('contact') as string || '+1 234 567 890';
        const mockSelfie = 'https://api.dicebear.com/7.x/avataaars/svg?seed=John';
        
        setCurrentUser({ email, isRegistered, name, surname, contact, selfieUrl: mockSelfie });
        setAuthMode('welcome');
        setTimeout(() => {
          setIsAuthOpen(false);
          if (isRegistered) {
            setIsFullyActivated(true);
          }
        }, 2000);
      } else {
        const name = formData.get('name') as string;
        const surname = formData.get('surname') as string;
        const contact = formData.get('contact') as string;
        
        setAuthMode('congrats');
        setCurrentUser({ email, isRegistered: false, name, surname, contact });
        setTimeout(() => {
          setIsAuthOpen(false);
          setIsActivated(true);
        }, 2000);
      }
    }, 1500);
  };

  const handleTabClick = (tab: TabType) => {
    setActiveTab(prev => prev === tab ? 'map' : tab);
  };

  return (
    <div className="flex flex-col h-screen h-[100dvh] w-full bg-slate-50 font-sans overflow-hidden">
      {/* Content Area */}
      <div className="flex-1 relative overflow-hidden">
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
        </MapContainer>

        {/* Feature Tabs Overlays */}
        <AnimatePresence>
          {activeTab !== 'map' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[1500] bg-white flex flex-col items-center justify-center p-10 overflow-y-auto"
            >
              <div className="text-center w-full max-w-lg pb-10">
                <h1 className="text-4xl font-bold text-black uppercase tracking-[0.2em] mb-4">{activeTab}</h1>
                <p className="text-slate-400 font-medium mb-12">Coming soon to the platform</p>
                
                {activeTab === 'profile' && (
                  <div className="border-t border-slate-100 pt-8">
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
                    
                    <button 
                      onClick={resetAccount}
                      className="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Reset Account & Logout
                    </button>
                  </div>
                )}
              </div>
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
                          placeholder="+1 234 567 890"
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
                      <h2 className="text-3xl font-bold text-slate-900 mb-2">Choose Plan</h2>
                      <p className="text-slate-500 mb-10">Select a subscription to begin activation</p>
                      <div className="flex flex-col md:flex-row gap-8 justify-center">
                        {/* Tenant Sub */}
                        <motion.div 
                          whileHover={{ scale: 1.02 }}
                          onClick={() => handleSubSelect('tenant')}
                          className="relative w-full max-w-[340px] aspect-[1.6/1] bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 shadow-xl cursor-pointer group border-4 border-transparent hover:border-blue-500 transition-all"
                        >
                          <div className="flex justify-between items-start mb-6">
                            <div className="text-left">
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Corporate</span>
                              <h3 className="text-xl font-bold text-white">Tenant Sub</h3>
                            </div>
                            <div className="w-10 h-7 bg-amber-400/80 rounded-md shadow-inner" />
                          </div>
                          <div className="mt-auto text-left">
                            <p className="text-white/40 font-mono text-sm tracking-widest mb-4">•••• •••• •••• 2026</p>
                            <div className="flex justify-between items-end">
                              <span className="text-xs text-white/60 font-medium">ANNUAL PLAN</span>
                              <span className="text-white font-bold">$499<span className="text-[10px] font-normal text-white/40">/mo</span></span>
                            </div>
                          </div>
                        </motion.div>

                        {/* User Sub */}
                        <motion.div 
                          whileHover={{ scale: 1.02 }}
                          onClick={() => handleSubSelect('user')}
                          className="relative w-full max-w-[340px] aspect-[1.6/1] bg-gradient-to-br from-blue-700 to-blue-600 rounded-2xl p-6 shadow-xl cursor-pointer group border-4 border-transparent hover:border-white transition-all"
                        >
                          <div className="flex justify-between items-start mb-6">
                            <div className="text-left">
                              <span className="text-[10px] text-blue-100 font-bold uppercase tracking-widest">Individual</span>
                              <h3 className="text-xl font-bold text-white">User Sub</h3>
                            </div>
                            <div className="w-10 h-7 bg-slate-100/80 rounded-md shadow-inner" />
                          </div>
                          <div className="mt-auto text-left">
                            <p className="text-white/40 font-mono text-sm tracking-widest mb-4">•••• •••• •••• 1109</p>
                            <div className="flex justify-between items-end">
                              <span className="text-xs text-white/60 font-medium">MONTHLY PLAN</span>
                              <span className="text-white font-bold">$19<span className="text-[10px] font-normal text-white/40">/mo</span></span>
                            </div>
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

      {/* Bottom Menu Bar (Persistent Flex-Based for Production) */}
      <div className="h-20 bg-white border-t border-slate-200 shadow-[0_-1px_10px_rgba(0,0,0,0.05)] z-[3000] px-6 flex items-center justify-between pb-safe">
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
          <div className="flex items-center justify-between w-full">
            <TabButton icon={<Users />} label="Tenant" active={activeTab === 'tenant'} onClick={() => handleTabClick('tenant')} />
            <TabButton icon={<MapIcon />} label="Referrals" active={activeTab === 'referrals'} onClick={() => handleTabClick('referrals')} />
            <TabButton icon={<Smartphone />} label="Gadgets" active={activeTab === 'gadgets'} onClick={() => handleTabClick('gadgets')} />
            <TabButton icon={<UserSearch />} label="Seekers" active={activeTab === 'seekers'} onClick={() => handleTabClick('seekers')} />
            <TabButton 
              icon={<UserCircle />} 
              label="Profile" 
              active={activeTab === 'profile'} 
              onClick={() => handleTabClick('profile')} 
              image={currentUser?.selfieUrl}
            />
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
