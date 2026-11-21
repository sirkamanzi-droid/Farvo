import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import AuthScreen from './components/AuthScreen';
import AccountScreen from './components/AccountScreen';
import React, { useState, useEffect, useRef } from 'react';
import { DISTRICTS } from './data/districts';
import { District, WeatherData, Farm } from './types';
import { detectNearestDistrict, LocationStatus } from './data/geolocation';
import { fetchFarms, importLegacyFarms, loadLegacyFarms, insertFarm, updateFarm, deleteFarm, createFarm } from './data/farms';
import SkyHero from './components/SkyHero';
import DistrictPicker from './components/DistrictPicker';
import WeatherDashboard from './components/WeatherDashboard';
import KatoChat from './components/KatoChat';
import BottomNav, { Tab } from './components/BottomNav';
import ComingSoon from './components/ComingSoon';
import WeatherGlyph from './components/WeatherGlyph';
import DiseaseDetection from './components/DiseaseDetection';
import SoilCalculator from './components/SoilCalculator';
import CommandCentre from './components/CommandCentre';
import { Loader2, AlertCircle, RefreshCw, Sprout, CloudSun, Leaf, CalendarDays, Wrench, ChevronRight, MapPin, Droplets, Sun, CloudRain } from 'lucide-react';

const DEFAULT_DISTRICT = DISTRICTS[1];

function BrandHeader() {
  return (
    <header className="flex items-center justify-between px-4 sm:px-6 pt-4 pb-3 border-b border-[#e4dac7] bg-[#f8f4eb]">
      <div className="flex items-center gap-2.5">
        <div className="h-10 w-10 rounded-xl bg-[#e3ecde] flex items-center justify-center"><Sprout className="h-6 w-6 text-leaf-700" /></div>
        <div>
          <div className="text-[25px] leading-7 font-bold text-soil-900" style={{fontFamily:'Fraunces, Georgia, serif'}}>Omulimi</div>
          <div className="text-[10px] text-soil-700">Better decisions. Healthier harvests.</div>
        </div>
      </div>
      <div className="hidden sm:block text-[11px] font-medium text-soil-700">Farmer-focused <span className="mx-2 text-leaf-600">•</span> Practical advice <span className="mx-2 text-leaf-600">•</span> Stronger communities</div>
    </header>
  );
}

function HomeDashboard({farm, weather, loading, onOpenWeather, onOpenDisease, onOpenSoil, onOpenComingSoon, onOpenDistrict}: {
  farm: Farm; weather: WeatherData | null; loading: boolean;
  onOpenWeather: () => void; onOpenDisease: () => void; onOpenSoil: () => void;
  onOpenComingSoon: (title: string, description: string) => void; onOpenDistrict: () => void;
}) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="px-4 sm:px-6 py-6 flex flex-col gap-6">
      <section>
        <p className="text-sm font-medium text-leaf-700">{greeting}</p>
        <h1 className="mt-1 text-3xl font-bold text-soil-900">Your farm, at a glance.</h1>
      </section>

      <button onClick={onOpenDistrict} className="flex items-center justify-between rounded-2xl bg-[#faf7ef] px-4 py-4 text-left">
        <div className="flex items-center gap-3">
          <MapPin className="h-5 w-5 text-leaf-700"/>
          <div><p className="text-xs text-soil-500">Your farm</p><p className="text-sm font-semibold text-soil-900">{farm.district.name} · {farm.crop}</p></div>
        </div>
        <ChevronRight className="h-4 w-4 text-soil-400"/>
      </button>

      <button onClick={onOpenWeather} className="w-full rounded-2xl bg-[#174432] p-5 text-left text-white">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white/80">Weather today</span>
          <ChevronRight className="h-5 w-5 text-white/70"/>
        </div>
        <div className="mt-4 flex items-center gap-4">
          {weather ? <WeatherGlyph code={weather.current.weatherCode} size="md"/> : <CloudSun className="h-10 w-10 text-[#e8d6a8]"/>}
          <div>
            <p className="text-3xl font-semibold">{loading ? '—' : weather ? Math.round(weather.current.temperature) + '°C' : '—'}</p>
            <p className="mt-1 text-xs text-white/75">{loading ? 'Loading forecast…' : weather ? farm.district.name + ' District' : 'Forecast unavailable'}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-lg font-semibold">{weather ? weather.current.rainfall.toFixed(1) + ' mm' : '—'}</p>
            <p className="text-xs text-white/70">Rainfall</p>
          </div>
        </div>
      </button>

      <section>
        <div className="mb-3"><h2 className="text-lg font-bold text-soil-900">What would you like to do?</h2></div>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onOpenDisease} className="flex min-h-28 flex-col justify-between rounded-2xl bg-[#faf7ef] p-4 text-left">
            <Leaf className="h-6 w-6 text-leaf-700"/>
            <span><span className="block text-sm font-semibold text-soil-900">Check a crop</span><span className="mt-1 block text-xs text-soil-500">Identify possible diseases</span></span>
          </button>
          <button onClick={onOpenSoil} className="flex min-h-28 flex-col justify-between rounded-2xl bg-[#faf7ef] p-4 text-left">
            <Wrench className="h-6 w-6 text-leaf-700"/>
            <span><span className="block text-sm font-semibold text-soil-900">Check your soil</span><span className="mt-1 block text-xs text-soil-500">Get soil guidance</span></span>
          </button>
          <button onClick={()=>onOpenComingSoon('Farm calendar','Farm planning tools are coming soon.')} className="flex min-h-24 flex-col justify-between rounded-2xl bg-[#faf7ef] p-4 text-left">
            <CalendarDays className="h-5 w-5 text-leaf-700"/>
            <span className="text-sm font-semibold text-soil-900">Farm calendar</span>
          </button>
          <button onClick={()=>onOpenComingSoon('Livestock advisor','Livestock guidance is coming soon.')} className="flex min-h-24 flex-col justify-between rounded-2xl bg-[#faf7ef] p-4 text-left">
            <Sprout className="h-5 w-5 text-leaf-700"/>
            <span className="text-sm font-semibold text-soil-900">Livestock</span>
          </button>
        </div>
      </section>
    </div>
  );
}
function AuthenticatedApp({ userId }: { userId: string }) {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [farmSyncError, setFarmSyncError] = useState<string | null>(null);
  const [activeFarmId, setActiveFarmId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [pendingKatoQuestion, setPendingKatoQuestion] = useState<string | null>(null);
  const [districtPickerOpen, setDistrictPickerOpen] = useState(false);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [weatherDistrictId, setWeatherDistrictId] = useState<string | null>(null);
  const weatherRequestId = useRef(0);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');
  const [locationDetected, setLocationDetected] = useState(false);
  const [comingSoon, setComingSoon] = useState<{title:string;description:string}|null>(null);
  const [showSoilCalculator, setShowSoilCalculator] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/command?view=public-config', { cache: 'no-store' })
      .then(response => response.ok ? response.json() : { announcement: '' })
      .then(data => { if (!cancelled && typeof data.announcement === 'string') setAnnouncement(data.announcement); })
      .catch(() => { if (!cancelled) setAnnouncement(''); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const initialiseFarms = async () => {
      try {
        let saved = await fetchFarms(userId);
        if (saved.length === 0) {
          await importLegacyFarms(userId);
          saved = await fetchFarms(userId);
        }
        if (saved.length === 0) {
          setLocationStatus('detecting');
          let district = DEFAULT_DISTRICT;
          try {
            const detected = await detectNearestDistrict(DISTRICTS);
            district = detected.district;
            if (!cancelled) {
              setLocationStatus(detected.status);
              setLocationDetected(true);
            }
          } catch (status) {
            if (!cancelled) setLocationStatus(status as LocationStatus);
          }
          const firstFarm = await insertFarm(userId, createFarm(district, district.mainCrops[0] || 'Maize', 0));
          saved = [firstFarm];
        }
        if (cancelled) return;
        setFarms(saved);
        setActiveFarmId(saved[0].id);
        setFarmSyncError(null);
      } catch (error) {
        console.error('Farm cloud sync error:', error);
        if (cancelled) return;
        const legacy = loadLegacyFarms(userId);
        const fallback = legacy.length > 0
          ? legacy
          : [createFarm(DEFAULT_DISTRICT, DEFAULT_DISTRICT.mainCrops[0] || 'Maize', 0)];
        setFarms(fallback);
        setActiveFarmId(fallback[0].id);
        setFarmSyncError('Your farm information could not sync. Check your connection and reload to try again.');
      }
    };
    void initialiseFarms();
    return () => { cancelled = true; };
  }, [userId]);

  const activeFarm=farms.find(f=>f.id===activeFarmId)||farms[0];
  const fetchWeather=async(district:District)=>{
    const requestId=++weatherRequestId.current;
    setLoadingWeather(true); setWeatherError(null); setWeatherData(null); setWeatherDistrictId(null);
    try {
      const {data:{session},error:sessionError}=await supabase.auth.getSession();
      if(sessionError||!session) throw new Error('Please sign in again to view weather.');
      const response=await fetch(`/api/weather?latitude=${district.latitude}&longitude=${district.longitude}`,{headers:{Authorization:`Bearer ${session.access_token}`}});
      if(response.status===401) throw new Error('Your session has expired. Please sign in again.');
      if(!response.ok) throw new Error('Failed to retrieve weather forecast.');
      const result=await response.json() as WeatherData;
      if(requestId!==weatherRequestId.current) return;
      setWeatherData(result);
      setWeatherDistrictId(district.id);
    } catch(err:unknown) {
      if(requestId!==weatherRequestId.current) return;
      console.error('Weather fetch error:',err);
      setWeatherError(err instanceof Error?err.message:'Unable to connect to weather services. Please try again.');
    } finally {
      if(requestId===weatherRequestId.current) setLoadingWeather(false);
    }
  };
  useEffect(()=>{if(activeFarm) void fetchWeather(activeFarm.district);},[activeFarm?.district.id]);

  const handleAddFarm=async()=>{
    try {
      const farm=await insertFarm(userId,createFarm(DEFAULT_DISTRICT,DEFAULT_DISTRICT.mainCrops[0]||'Maize',farms.length));
      const updated=[...farms,farm];
      setFarms(updated); setActiveFarmId(farm.id); setFarmSyncError(null); setDistrictPickerOpen(true);
    } catch(error) {
      console.error('Could not create farm:',error);
      setFarmSyncError('Could not save this farm. Please check your connection and try again.');
    }
  };
  const handleSelectFarm=(farm:Farm)=>setActiveFarmId(farm.id);
  const handleDeleteActiveFarm=async()=>{
    if(farms.length<=1) return;
    if(!window.confirm(`Remove ${activeFarm.label} from your account? This cannot be undone.`)) return;
    try {
      await deleteFarm(userId,activeFarm.id);
      const remaining=farms.filter(farm=>farm.id!==activeFarm.id);
      setFarms(remaining);
      setActiveFarmId(remaining[0].id);
      setFarmSyncError(null);
    } catch(error) {
      console.error('Could not remove farm:',error);
      setFarmSyncError('Could not remove this farm. Please try again.');
    }
  };
  const handleUpdateActiveFarm=async(district:District,crop:string)=>{
    const changed={...activeFarm,district,crop};
    try {
      const saved=await updateFarm(userId,changed);
      setFarms(current=>current.map(f=>f.id===saved.id?saved:f));
      setFarmSyncError(null);
    } catch(error) {
      console.error('Could not update farm:',error);
      setFarmSyncError('Your farm changes could not be saved. Please try again.');
    }
  };
  const detectLocationForActiveFarm=()=>{
    setLocationStatus('detecting');
    detectNearestDistrict(DISTRICTS).then(({district,status})=>{handleUpdateActiveFarm(district,activeFarm.crop);setLocationStatus(status);setLocationDetected(true);}).catch((status:LocationStatus)=>setLocationStatus(status));
  };

  if(!activeFarm) return <div className="min-h-screen bg-parchment-100 flex items-center justify-center"><Loader2 className="h-8 w-8 text-leaf-600 animate-spin"/></div>;

  return (
    <div className="min-h-screen bg-[#f1ebdc] flex flex-col font-sans pb-24" id="app-root">
      <BrandHeader/>
      {announcement && <div role="status" className="mx-auto mt-3 w-full max-w-3xl px-4 sm:px-6"><div className="rounded-xl border border-[#ead7a8] bg-[#fff3d5] px-4 py-3 text-sm text-soil-900">{announcement}</div></div>}
      <main className="flex-1 w-full max-w-3xl mx-auto">
        {farmSyncError&&<div className="mx-4 sm:mx-6 mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">{farmSyncError}</div>}
        {activeTab==='home' && <HomeDashboard farm={activeFarm} weather={weatherData} loading={loadingWeather} onOpenWeather={()=>setActiveTab('weather')} onOpenDisease={()=>setActiveTab('disease')} onOpenSoil={()=>setShowSoilCalculator(true)} onOpenComingSoon={(title,description)=>setComingSoon({title,description})} onOpenDistrict={()=>setDistrictPickerOpen(true)}/>}
        {activeTab==='weather' && <div className="flex flex-col gap-4">
          <SkyHero farms={farms} activeFarm={activeFarm} onSelectFarm={handleSelectFarm} onAddFarm={handleAddFarm} onOpenDistrictPicker={()=>setDistrictPickerOpen(true)} onSelectCrop={c=>handleUpdateActiveFarm(activeFarm.district,c)} onDeleteFarm={handleDeleteActiveFarm} weatherCode={weatherData?.current.weatherCode??1} temperature={weatherData?.current.temperature??0} wasGeoDetected={locationStatus==='success'&&locationDetected}/>
          <div className="px-0 sm:px-0 flex flex-col gap-0 pb-4">
            
            {loadingWeather&&<div className="rounded-2xl bg-[#f8f4eb] border border-[#e6dcc8] p-8 text-center"><Loader2 className="h-7 w-7 text-leaf-600 animate-spin mx-auto"/><p className="text-xs text-soil-600 mt-2">Loading your local forecast…</p></div>}
            {weatherError&&!loadingWeather&&<div className="rounded-2xl bg-[#f8f4eb] border border-rose-100 p-5"><AlertCircle className="h-6 w-6 text-rose-600"/><p className="text-sm font-bold text-soil-900 mt-2">Weather unavailable</p><p className="text-xs text-soil-600 mt-1">{weatherError}</p><button onClick={()=>void fetchWeather(activeFarm.district)} className="mt-3 bg-leaf-700 text-white rounded-xl px-4 py-2 text-xs font-bold"><RefreshCw className="inline h-3 w-3 mr-1"/>Try again</button></div>}
            {!loadingWeather&&!weatherError&&weatherData&&<><WeatherDashboard weatherData={weatherData} district={activeFarm.district} cropName={activeFarm.crop} onAskKato={()=>setActiveTab('kato')}/></>}
          </div>
        </div>}
        {activeTab==='disease'&&<div className="px-4 sm:px-6 py-5"><DiseaseDetection onGetTreatmentAdvice={question=>{setPendingKatoQuestion(question);setActiveTab('kato');}}/></div>}
        <div className={activeTab==='kato'?'':'hidden'}><KatoChat userId={userId} district={activeFarm.district} cropName={activeFarm.crop} weatherData={weatherDistrictId===activeFarm.district.id?weatherData:null} weatherDistrictName={weatherDistrictId===activeFarm.district.id?activeFarm.district.name:null} initialQuestion={pendingKatoQuestion} onInitialQuestionHandled={()=>setPendingKatoQuestion(null)}/></div>
        {activeTab==='calendar'&&<div className="px-4 sm:px-6 py-5"><ComingSoon icon={CalendarDays} title="Farm calendar" description="Plan planting dates, farm activities and important reminders — coming soon." onBack={()=>setActiveTab('home')}/></div>}
        {activeTab==='account'&&<div className="px-4 sm:px-6 py-5"><AccountScreen/><div className="mt-5 grid grid-cols-2 gap-2">
          <button onClick={()=>setShowSoilCalculator(true)} className="rounded-xl border border-[#e6dcc8] bg-[#f8f4eb] p-3 text-left"><Wrench className="h-4 w-4 text-leaf-700 mb-2"/><span className="text-xs font-bold text-soil-900">Farm tools</span></button>
          <button onClick={()=>setComingSoon({title:'Livestock advisor',description:'Livestock care guidance is being prepared for a future Omulimi update.'})} className="rounded-xl border border-[#e6dcc8] bg-[#f8f4eb] p-3 text-left"><Sprout className="h-4 w-4 text-leaf-700 mb-2"/><span className="text-xs font-bold text-soil-900">Livestock advisor</span></button>
        </div></div>}
      </main>
      {comingSoon&&<div className="fixed inset-0 z-40 bg-soil-900/50 flex items-center justify-center p-4"><div className="w-full max-w-sm rounded-3xl bg-[#f8f4eb] border border-[#e6dcc8] p-6 text-center shadow-xl"><div className="h-14 w-14 rounded-2xl bg-leaf-100 flex items-center justify-center mx-auto"><Wrench className="h-7 w-7 text-leaf-700"/></div><p className="text-xs font-bold text-leaf-700 mt-4">COMING SOON</p><h2 className="text-xl font-bold text-soil-900 mt-1">{comingSoon.title}</h2><p className="text-sm text-soil-600 mt-2">{comingSoon.description}</p><button onClick={()=>setComingSoon(null)} className="mt-5 w-full rounded-xl bg-leaf-700 text-white py-3 text-sm font-bold">Got it</button></div></div>}
      {!showSoilCalculator&&<BottomNav active={activeTab} onChange={setActiveTab}/>} 
      {showSoilCalculator&&<div className="fixed inset-0 z-40 overflow-y-auto bg-[#f1ebdc]"><div className="mx-auto min-h-full w-full max-w-3xl"><SoilCalculator userId={userId} initialCrop={activeFarm.crop} onBack={()=>setShowSoilCalculator(false)}/></div></div>}
      <DistrictPicker isOpen={districtPickerOpen} onClose={()=>setDistrictPickerOpen(false)} selectedDistrict={activeFarm.district} onSelect={d=>handleUpdateActiveFarm(d,d.mainCrops[0]||activeFarm.crop)} onUseMyLocation={detectLocationForActiveFarm} locationStatus={locationStatus}/>
    </div>
  );
}

export default function App() {
  const [session,setSession]=useState<Session|null>(null);
  const [checkingSession,setCheckingSession]=useState(true);
  useEffect(()=>{
    let mounted=true;
    supabase.auth.getSession().then(({data,error})=>{if(!mounted)return;if(error)console.error('Could not load session:',error);setSession(data.session);setCheckingSession(false);});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,newSession)=>{if(!mounted)return;setSession(newSession);setCheckingSession(false);});
    return ()=>{mounted=false;subscription.unsubscribe();};
  },[]);
  const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
  const isCommandCentre = currentPath === '/command-centre';

  if (checkingSession) {
    return <div className="min-h-screen flex items-center justify-center bg-parchment-100 text-soil-700">
      {isCommandCentre ? 'Opening Omulimi Command Centre…' : 'Checking your Omulimi account…'}
    </div>;
  }
  if (isCommandCentre) return <CommandCentre session={session}/>;
  if (!session) return <AuthScreen/>;
  return <AuthenticatedApp userId={session.user.id}/>;
}
