import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import AuthScreen from './components/AuthScreen';
import AccountScreen from './components/AccountScreen';
import React, { useState, useEffect } from 'react';
import { DISTRICTS } from './data/districts';
import { District, WeatherData, Farm } from './types';
import { detectNearestDistrict, LocationStatus } from './data/geolocation';
import { loadFarms, saveFarms, createFarm } from './data/farms';
import SkyHero from './components/SkyHero';
import DistrictPicker from './components/DistrictPicker';
import WeatherDashboard from './components/WeatherDashboard';
import AIAdvisor from './components/AIAdvisor';
import BottomNav, { Tab } from './components/BottomNav';
import ComingSoon from './components/ComingSoon';
import DiseaseDetection from './components/DiseaseDetection';
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

function HomeDashboard({farm, weather, loading, onOpenWeather, onOpenDisease, onOpenComingSoon, onOpenDistrict}: {
  farm: Farm; weather: WeatherData | null; loading: boolean;
  onOpenWeather: () => void; onOpenDisease: () => void;
  onOpenComingSoon: (title: string, description: string) => void; onOpenDistrict: () => void;
}) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const WeatherIcon = weather?.current.weatherCode === 0 ? Sun : CloudRain;
  return (
    <div className="px-4 sm:px-6 py-5 flex flex-col gap-4">
      <section className="flex items-start justify-between">
        <div>
          <p className="text-xs text-leaf-700 font-semibold">YOUR FARM DASHBOARD</p>
          <h1 className="text-2xl font-bold text-soil-900 mt-1">{greeting}, farmer.</h1>
          <p className="text-xs text-soil-600 mt-1">What needs your attention today?</p>
        </div>
        <div className="h-10 w-10 rounded-full bg-leaf-100 flex items-center justify-center"><Sprout className="h-5 w-5 text-leaf-700"/></div>
      </section>

      <button onClick={onOpenDistrict} className="flex items-center justify-between rounded-xl border border-[#e6dcc8] bg-[#f8f4eb] p-3 text-left">
        <div className="flex items-center gap-2.5"><MapPin className="h-4 w-4 text-leaf-700"/><div><p className="text-[10px] text-soil-500">YOUR FARM LOCATION</p><p className="text-sm font-bold text-soil-900">{farm.district.name}</p><p className="text-[10px] text-soil-600">{farm.crop} farm</p></div></div>
        <ChevronRight className="h-4 w-4 text-soil-400"/>
      </button>

      <button onClick={onOpenWeather} className="w-full text-left rounded-2xl border border-[#e6dcc8] bg-[#fffdf8] p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div><p className="text-xs font-bold text-soil-800">Today's weather</p><p className="text-[10px] text-soil-500 mt-0.5">{farm.district.name} District</p></div>
          <span className="text-[10px] font-semibold text-leaf-700">Full forecast <ChevronRight className="inline h-3 w-3"/></span>
        </div>
        <div className="flex items-center gap-4 mt-3">
          <WeatherIcon className="h-10 w-10 text-leaf-600"/>
          <div><div className="text-3xl font-bold text-soil-900">{loading ? '—' : weather ? Math.round(weather.current.temperature) + '°C' : '—'}</div><div className="text-[11px] text-soil-600">{weather ? (weather.current.rainfall > 0 ? 'Rain recorded today' : 'Current conditions') : loading ? 'Loading local forecast…' : 'Weather unavailable'}</div></div>
          <div className="ml-auto border-l border-[#e8dfcc] pl-4"><Droplets className="h-4 w-4 text-blue-600"/><p className="text-xs font-bold text-soil-900 mt-1">{weather ? weather.current.rainfall.toFixed(1) + ' mm' : '—'}</p><p className="text-[9px] text-soil-500">Rainfall</p></div>
        </div>
      </button>

      <section className="rounded-2xl border border-[#efd9bd] bg-[#fff3e3] p-4">
        <div className="flex items-center gap-2 text-clay-600"><span className="text-base">✦</span><p className="text-xs font-bold">Your farming tools</p></div>
        <p className="text-xs text-soil-700 mt-1">Get weather insights, check crop photos and ask Kato for practical guidance.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={onOpenWeather} className="flex items-center gap-2 rounded-xl bg-[#fffdf8] border border-[#eadfc9] p-3 text-left"><CloudSun className="h-5 w-5 text-gold-500"/><span className="text-xs font-bold text-soil-900">Weather</span></button>
          <button onClick={onOpenDisease} className="flex items-center gap-2 rounded-xl bg-[#fffdf8] border border-[#eadfc9] p-3 text-left"><Leaf className="h-5 w-5 text-leaf-700"/><span className="text-xs font-bold text-soil-900">Check a crop</span></button>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-2"><h2 className="text-sm font-bold text-soil-900">More from Omulimi</h2><span className="text-[10px] text-soil-500">Explore tools</span></div>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => onOpenComingSoon('Farm calendar','Plan planting dates, farm activities and important reminders.')} className="rounded-xl border border-[#e6dcc8] bg-[#f8f4eb] p-3 flex flex-col items-center gap-2"><CalendarDays className="h-5 w-5 text-leaf-700"/><span className="text-[10px] font-semibold text-soil-800">Calendar</span></button>
          <button onClick={() => onOpenComingSoon('Farm tools','Soil calculator and practical farm tools are being prepared.')} className="rounded-xl border border-[#e6dcc8] bg-[#f8f4eb] p-3 flex flex-col items-center gap-2"><Wrench className="h-5 w-5 text-leaf-700"/><span className="text-[10px] font-semibold text-soil-800">Tools</span></button>
          <button onClick={() => onOpenComingSoon('Livestock advisor','Livestock care guidance is being prepared for a future Omulimi update.')} className="rounded-xl border border-[#e6dcc8] bg-[#f8f4eb] p-3 flex flex-col items-center gap-2"><Sprout className="h-5 w-5 text-leaf-700"/><span className="text-[10px] font-semibold text-soil-800">Livestock</span></button>
        </div>
      </section>
    </div>
  );
}

function AuthenticatedApp({ userId }: { userId: string }) {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [activeFarmId, setActiveFarmId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [pendingKatoQuestion, setPendingKatoQuestion] = useState<string | null>(null);
  const [katoOpen, setKatoOpen] = useState(false);
  const [districtPickerOpen, setDistrictPickerOpen] = useState(false);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');
  const [locationDetected, setLocationDetected] = useState(false);
  const [comingSoon, setComingSoon] = useState<{title:string;description:string}|null>(null);

  useEffect(() => {
    const saved = loadFarms(userId);
    if (saved.length > 0) { setFarms(saved); setActiveFarmId(saved[0].id); }
    else {
      setLocationStatus('detecting');
      detectNearestDistrict(DISTRICTS).then(({district,status}) => {
        const firstFarm=createFarm(district,district.mainCrops[0]||'Maize',0);
        setFarms([firstFarm]); setActiveFarmId(firstFarm.id); saveFarms(userId,[firstFarm]);
        setLocationStatus(status); setLocationDetected(true);
      }).catch((status:LocationStatus) => {
        const firstFarm=createFarm(DEFAULT_DISTRICT,DEFAULT_DISTRICT.mainCrops[0]||'Maize',0);
        setFarms([firstFarm]); setActiveFarmId(firstFarm.id); saveFarms(userId,[firstFarm]); setLocationStatus(status);
      });
    }
  },[userId]);

  const activeFarm=farms.find(f=>f.id===activeFarmId)||farms[0];
  const fetchWeather=async(district:District)=>{
    setLoadingWeather(true); setWeatherError(null);
    try {
      const {data:{session},error:sessionError}=await supabase.auth.getSession();
      if(sessionError||!session) throw new Error('Please sign in again to view weather.');
      const response=await fetch(`/api/weather?latitude=${district.latitude}&longitude=${district.longitude}`,{headers:{Authorization:`Bearer ${session.access_token}`}});
      if(response.status===401) throw new Error('Your session has expired. Please sign in again.');
      if(!response.ok) throw new Error('Failed to retrieve weather forecast.');
      setWeatherData(await response.json());
    } catch(err:unknown) {
      console.error('Weather fetch error:',err);
      setWeatherError(err instanceof Error?err.message:'Unable to connect to weather services. Please try again.');
    } finally { setLoadingWeather(false); }
  };
  useEffect(()=>{if(activeFarm) void fetchWeather(activeFarm.district);},[activeFarm?.district.id]);

  const handleAddFarm=()=>{
    const farm=createFarm(DEFAULT_DISTRICT,DEFAULT_DISTRICT.mainCrops[0]||'Maize',farms.length);
    const updated=[...farms,farm]; setFarms(updated); saveFarms(userId,updated); setActiveFarmId(farm.id); setDistrictPickerOpen(true);
  };
  const handleSelectFarm=(farm:Farm)=>setActiveFarmId(farm.id);
  const handleUpdateActiveFarm=(district:District,crop:string)=>{
    const updated=farms.map(f=>f.id===activeFarm.id?{...f,district,crop}:f); setFarms(updated); saveFarms(userId,updated);
  };
  const detectLocationForActiveFarm=()=>{
    setLocationStatus('detecting');
    detectNearestDistrict(DISTRICTS).then(({district,status})=>{handleUpdateActiveFarm(district,activeFarm.crop);setLocationStatus(status);setLocationDetected(true);}).catch((status:LocationStatus)=>setLocationStatus(status));
  };

  if(!activeFarm) return <div className="min-h-screen bg-parchment-100 flex items-center justify-center"><Loader2 className="h-8 w-8 text-leaf-600 animate-spin"/></div>;

  return (
    <div className="min-h-screen bg-[#f1ebdc] flex flex-col font-sans pb-24" id="app-root">
      <BrandHeader/>
      <main className="flex-1 w-full max-w-3xl mx-auto">
        {activeTab==='home' && <HomeDashboard farm={activeFarm} weather={weatherData} loading={loadingWeather} onOpenWeather={()=>setActiveTab('weather')} onOpenDisease={()=>setActiveTab('disease')} onOpenComingSoon={(title,description)=>setComingSoon({title,description})} onOpenDistrict={()=>setDistrictPickerOpen(true)}/>}
        {activeTab==='weather' && <div className="flex flex-col gap-4">
          <SkyHero farms={farms} activeFarm={activeFarm} onSelectFarm={handleSelectFarm} onAddFarm={handleAddFarm} onOpenDistrictPicker={()=>setDistrictPickerOpen(true)} onSelectCrop={c=>handleUpdateActiveFarm(activeFarm.district,c)} weatherCode={weatherData?.current.weatherCode??1} temperature={weatherData?.current.temperature??0} wasGeoDetected={locationStatus==='success'&&locationDetected}/>
          <div className="px-4 sm:px-6 flex flex-col gap-4 pb-4">
            <div><p className="text-xs font-semibold text-leaf-700">LOCAL FORECAST</p><h1 className="text-2xl font-bold text-soil-900 mt-1">Weather intelligence</h1><p className="text-xs text-soil-600 mt-1">District forecast and farming decisions for {activeFarm.district.name}.</p></div>
            {loadingWeather&&<div className="rounded-2xl bg-[#f8f4eb] border border-[#e6dcc8] p-8 text-center"><Loader2 className="h-7 w-7 text-leaf-600 animate-spin mx-auto"/><p className="text-xs text-soil-600 mt-2">Loading your local forecast…</p></div>}
            {weatherError&&!loadingWeather&&<div className="rounded-2xl bg-[#f8f4eb] border border-rose-100 p-5"><AlertCircle className="h-6 w-6 text-rose-600"/><p className="text-sm font-bold text-soil-900 mt-2">Weather unavailable</p><p className="text-xs text-soil-600 mt-1">{weatherError}</p><button onClick={()=>void fetchWeather(activeFarm.district)} className="mt-3 bg-leaf-700 text-white rounded-xl px-4 py-2 text-xs font-bold"><RefreshCw className="inline h-3 w-3 mr-1"/>Try again</button></div>}
            {!loadingWeather&&!weatherError&&weatherData&&<><WeatherDashboard weatherData={weatherData} district={activeFarm.district}/><AIAdvisor weatherData={weatherData} district={activeFarm.district} cropName={activeFarm.crop} initialQuestion={pendingKatoQuestion} onInitialQuestionHandled={()=>setPendingKatoQuestion(null)}/></>}
          </div>
        </div>}
        {activeTab==='disease'&&<div className="px-4 sm:px-6 py-5"><DiseaseDetection onGetTreatmentAdvice={question=>{setPendingKatoQuestion(question);setKatoOpen(true);}}/></div>}
        {activeTab==='calendar'&&<div className="px-4 sm:px-6 py-5"><ComingSoon icon={CalendarDays} title="Farm calendar" description="Plan planting dates, farm activities and important reminders — coming soon." onBack={()=>setActiveTab('home')}/></div>}
        {activeTab==='account'&&<div className="px-4 sm:px-6 py-5"><AccountScreen/><div className="mt-5 grid grid-cols-2 gap-2">
          <button onClick={()=>setComingSoon({title:'Farm tools',description:'Soil calculator and practical farm tools are being prepared.'})} className="rounded-xl border border-[#e6dcc8] bg-[#f8f4eb] p-3 text-left"><Wrench className="h-4 w-4 text-leaf-700 mb-2"/><span className="text-xs font-bold text-soil-900">Farm tools</span></button>
          <button onClick={()=>setComingSoon({title:'Livestock advisor',description:'Livestock care guidance is being prepared for a future Omulimi update.'})} className="rounded-xl border border-[#e6dcc8] bg-[#f8f4eb] p-3 text-left"><Sprout className="h-4 w-4 text-leaf-700 mb-2"/><span className="text-xs font-bold text-soil-900">Livestock advisor</span></button>
        </div></div>}
      </main>
      {katoOpen&&weatherData&&<div className="fixed inset-0 z-50 bg-soil-900/50 flex items-center justify-center p-3"><div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto relative rounded-2xl"><button onClick={()=>{setKatoOpen(false);setPendingKatoQuestion(null);}} className="absolute right-3 top-3 z-10 bg-white text-soil-900 rounded-full px-3 py-1.5 text-xs font-bold shadow">Close</button><AIAdvisor weatherData={weatherData} district={activeFarm.district} cropName={activeFarm.crop} initialQuestion={pendingKatoQuestion} onInitialQuestionHandled={()=>setPendingKatoQuestion(null)}/></div></div>}
      {comingSoon&&<div className="fixed inset-0 z-40 bg-soil-900/50 flex items-center justify-center p-4"><div className="w-full max-w-sm rounded-3xl bg-[#f8f4eb] border border-[#e6dcc8] p-6 text-center shadow-xl"><div className="h-14 w-14 rounded-2xl bg-leaf-100 flex items-center justify-center mx-auto"><Wrench className="h-7 w-7 text-leaf-700"/></div><p className="text-xs font-bold text-leaf-700 mt-4">COMING SOON</p><h2 className="text-xl font-bold text-soil-900 mt-1">{comingSoon.title}</h2><p className="text-sm text-soil-600 mt-2">{comingSoon.description}</p><button onClick={()=>setComingSoon(null)} className="mt-5 w-full rounded-xl bg-leaf-700 text-white py-3 text-sm font-bold">Got it</button></div></div>}
      <BottomNav active={activeTab} onChange={setActiveTab}/>
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
  if(checkingSession)return <div className="min-h-screen flex items-center justify-center bg-parchment-100 text-soil-700">Checking your Omulimi account…</div>;
  if(!session)return <AuthScreen/>;
  return <AuthenticatedApp userId={session.user.id}/>;
}
