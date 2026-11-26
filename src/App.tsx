import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import AuthScreen from './components/AuthScreen';
import AccountScreen from './components/AccountScreen';
import React, { useState, useEffect, useRef } from 'react';
import { DISTRICTS } from './data/districts';
import { DEFAULT_CROP, SUPPORTED_CROP_NAMES } from './data/supportedCrops';
import { District, WeatherData, Farm } from './types';
import { detectNearestDistrict, LocationStatus } from './data/geolocation';
import { fetchFarms, importLegacyFarms, loadLegacyFarms, insertFarm, updateFarm, deleteFarm, createFarm, saveFarmAssets } from './data/farms';
import FarmSetup, { type FarmSetupResult } from './components/FarmSetup';
import SkyHero from './components/SkyHero';
import DistrictPicker from './components/DistrictPicker';
import WeatherDashboard from './components/WeatherDashboard';
import KatoChat from './components/KatoChat';
import BottomNav, { Tab } from './components/BottomNav';
import WeatherGlyph from './components/WeatherGlyph';
import DiseaseDetection from './components/DiseaseDetection';
import SoilCalculator from './components/SoilCalculator';
import CommandCentre from './components/CommandCentre';
import KnowledgeCentre from './components/KnowledgeCentre';
import { Loader2, AlertCircle, RefreshCw, Sprout, CloudSun, Leaf, Wrench, ChevronRight, MapPin, Droplets, Sun, CloudRain, BookOpen } from 'lucide-react';


const DEFAULT_DISTRICT = DISTRICTS[1];

async function generateKatoCareGuidance(input: { farmId: string; cropName: string; districtName: string; issueName: string; confidence: number; observations: string; weatherContext: WeatherData | null; weatherDistrictName: string | null }) {
  try {
    const { data, error } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (error || !token) return null;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 28000);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        signal: controller.signal,
        body: JSON.stringify({
          messages: [{ role: 'user', content: `Create the initial Omulimi crop-care guidance for this scan. Crop: ${input.cropName}. Selected district: ${input.districtName}. Possible issue: ${input.issueName}. Image-service match score: ${input.confidence}% (not diagnostic accuracy). Scan observations: ${input.observations}. Provide the structured crop-care plan using your required headings. Prioritise symptom verification, safe immediate actions, locally verifiable treatment options, justified soil/fertiliser guidance only, and a practical inspection timeline. Do not claim the diagnosis is confirmed or invent chemical products, rates or label directions.` }],
          farmId: input.farmId,
          cropName: input.cropName,
          districtName: input.districtName,
          weatherContext: input.weatherContext,
          weatherDistrictName: input.weatherDistrictName
        })
      });
      if (!response.ok || !response.body) {
        const details = await response.text().catch(() => '');
        console.warn('Kato initial care guidance request failed:', response.status, details.slice(0, 500));
        return null;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let answer = '';
      let completed = false;
      const consume = (line: string) => {
        if (!line.trim()) return;
        const event = JSON.parse(line) as { text?: string; done?: boolean; error?: string };
        if (event.error) throw new Error(event.error);
        if (typeof event.text === 'string') answer += event.text;
        if (event.done) completed = true;
      };
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || '';
        for (const line of lines) consume(line);
      }
      buffer += decoder.decode();
      if (buffer.trim()) consume(buffer);
      return completed && answer.trim() ? answer.trim() : null;
    } finally {
      window.clearTimeout(timeout);
    }
  } catch (error) {
    console.warn('Kato could not generate the initial saved care guidance:', error);
    return null;
  }
}

function BrandHeader() { return (<header className="sticky top-0 z-20 flex h-14 items-center bg-[#f2ecdf]/95 px-4 backdrop-blur-md sm:px-6"><div className="mx-auto flex w-full max-w-3xl items-center gap-2.5"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e4eadc]"><Sprout className="h-5 w-5 text-[#174432]"/></div><span className="text-xl font-bold tracking-tight text-[#1d2d27]" style={{fontFamily:'Fraunces, Georgia, serif'}}>Omulimi</span><span className="ml-auto rounded-full bg-[#e4eadc] px-3 py-1 text-[11px] font-semibold text-[#285b40]">Your farm companion</span></div></header>); }
function HomeDashboard({farm, farmerName, weather, loading, onOpenWeather, onOpenDisease, onOpenSoil, onOpenKnowledge, onOpenComingSoon, onOpenDistrict, onCaptureLocation}: { farm: Farm; farmerName: string; weather: WeatherData | null; loading: boolean; onOpenWeather: () => void; onOpenDisease: () => void; onOpenSoil: () => void; onOpenKnowledge: () => void; onOpenComingSoon: (title: string, description: string) => void; onOpenDistrict: () => void; onCaptureLocation: () => void; }) {
  const hour = new Date().getHours(); const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return (<div className="px-4 pb-8 pt-5 sm:px-6"><section className="mb-5"><h1 className="text-[30px] font-semibold leading-tight text-[#1d2d27]">{greeting}, {farmerName || 'farmer'}.</h1></section>
    <button onClick={onOpenDistrict} className="mb-4 flex w-full items-center justify-between rounded-2xl bg-[#faf7ef] px-4 py-3.5 text-left"><span className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e7eddf]"><MapPin className="h-5 w-5 text-[#285b40]"/></span><span className="min-w-0"><span className="block text-[11px] text-[#879188]">YOUR FARM</span><span className="mt-0.5 block truncate text-sm font-semibold text-[#1d2d27]">{farm.district.name} · {farm.crop}</span></span></span><ChevronRight className="h-4 w-4 shrink-0 text-[#879188]"/></button>
    {farm.locationSource!=='phone_gps'&&<button onClick={onCaptureLocation} className="mb-4 flex w-full items-center gap-2 rounded-xl border border-[#d9cba9] bg-[#fff6df] px-4 py-3 text-left text-xs font-semibold text-[#735523]"><MapPin className="h-4 w-4"/> Capture this farm’s GPS location</button>}
    <button onClick={onOpenWeather} className="mb-7 w-full rounded-[26px] bg-[#174432] p-5 text-left text-white shadow-sm"><div className="flex items-center justify-between"><span className="text-sm font-medium text-white/75">Today’s weather</span><ChevronRight className="h-5 w-5 text-white/65"/></div><div className="mt-4 flex items-center gap-4">{weather ? <WeatherGlyph code={weather.current.weatherCode} size="md"/> : <CloudSun className="h-11 w-11 text-[#e8d6a8]"/>}<div><p className="text-4xl font-semibold tracking-tight">{loading ? '—' : weather ? Math.round(weather.current.temperature) + '°' : '—'}</p><p className="mt-1 text-xs text-white/70">{loading ? 'Getting forecast…' : weather ? farm.district.name + ' District' : 'Forecast unavailable'}</p></div><div className="ml-auto text-right"><Droplets className="ml-auto h-4 w-4 text-[#e8d6a8]"/><p className="mt-1 text-lg font-semibold">{weather ? weather.current.rainfall.toFixed(1) + ' mm' : '—'}</p><p className="text-[11px] text-white/65">Rainfall</p></div></div></button>
    <section><div className="mb-3 flex items-end justify-between"><h2 className="text-xl font-semibold text-[#1d2d27]">Your farm tools</h2><span className="text-xs text-[#879188]">Made for your crops</span></div><div className="grid grid-cols-2 gap-3">
      <button onClick={onOpenDisease} className="flex min-h-[142px] flex-col justify-between rounded-[22px] bg-[#e7eddf] p-4 text-left"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/75"><Leaf className="h-5 w-5 text-[#285b40]"/></span><span><span className="block text-[15px] font-semibold text-[#1d2d27]">Crop health</span><span className="mt-1 block text-xs text-[#52645a]">Check a crop for disease</span></span></button>
      <button onClick={onOpenSoil} className="flex min-h-[142px] flex-col justify-between rounded-[22px] bg-[#f5ebd2] p-4 text-left"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/75"><Sprout className="h-5 w-5 text-[#8b6531]"/></span><span><span className="block text-[15px] font-semibold text-[#1d2d27]">Soil Intelligence</span><span className="mt-1 block text-xs text-[#6f624d]">Understand your soil and weather</span></span></button>
    </div><button onClick={onOpenKnowledge} className="mt-3 flex min-h-[112px] w-full items-center gap-4 rounded-[22px] bg-[#faf7ef] p-4 text-left border border-[#e6dcc8]"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f5ebd2]"><BookOpen className="h-6 w-6 text-[#8b6531]"/></span><span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold text-[#1d2d27]">Farming Knowledge</span><span className="mt-1 block text-xs text-[#6f624d]">Manuals, learning guides and practical videos</span><span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#285b40]">Explore the library <ChevronRight className="h-3 w-3"/></span></span></button></section></div>); }
function AuthenticatedApp({ userId }: { userId: string }) {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [farmSyncError, setFarmSyncError] = useState<string | null>(null);
  const [farmSetupMode, setFarmSetupMode] = useState<'initial' | 'add' | 'recapture' | null>(null);
  const [farmSetupTargetId, setFarmSetupTargetId] = useState<string | null>(null);
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
  const [showKnowledgeCentre, setShowKnowledgeCentre] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [farmerName, setFarmerName] = useState('');

  useEffect(() => {
    let cancelled = false;
    const loadFarmerName = async () => {
      const { data, error } = await supabase.rpc('get_my_farmer_account');
      if (cancelled || error) return;
      const row = Array.isArray(data) ? data[0] : null;
      if (row && typeof row.full_name === 'string') {
        const firstName = row.full_name.trim().split(/\\s+/)[0];
        if (firstName) setFarmerName(firstName);
      }
    };
    void loadFarmerName();
    return () => { cancelled = true; };
  }, [userId]);

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
          if (!cancelled) setFarmSetupMode('initial');
          saved = [];
        }
        if (cancelled) return;
        const normalized = saved.map(farm => SUPPORTED_CROP_NAMES.includes(farm.crop) ? farm : { ...farm, crop: DEFAULT_CROP });
        setFarms(normalized);
        for (const farm of normalized) {
          if (!saved.find(item => item.id === farm.id && item.crop === farm.crop)) void updateFarm(userId, farm).catch(error => console.warn('Could not update an older unsupported crop selection:', error));
        }
        setActiveFarmId(normalized[0]?.id ?? null);
        setFarmSyncError(null);
      } catch (error) {
        console.error('Farm cloud sync error:', error);
        if (cancelled) return;
        const legacy = loadLegacyFarms(userId);
        const fallback = legacy.map(farm => SUPPORTED_CROP_NAMES.includes(farm.crop) ? farm : { ...farm, crop: DEFAULT_CROP });
        setFarms(fallback);
        setActiveFarmId(fallback[0]?.id ?? null);
        setFarmSyncError('Your farm information could not sync. Check your connection and reload to try again.');
      }
    };
    void initialiseFarms();
    return () => { cancelled = true; };
  }, [userId]);

  const activeFarm=farms.find(f=>f.id===activeFarmId)||farms[0];
  const fetchWeather=async(farm:Farm)=>{
    const requestId=++weatherRequestId.current;
    setLoadingWeather(true); setWeatherError(null); setWeatherData(null); setWeatherDistrictId(null);
    if(farm.locationSource!=='phone_gps'||!Number.isFinite(farm.latitude)||!Number.isFinite(farm.longitude)){
      setLoadingWeather(false);
      setWeatherError('Capture this farm’s GPS location to get weather for the actual farm. The saved district location is only an older estimate.');
      return;
    }
    try {
      const {data:{session},error:sessionError}=await supabase.auth.getSession();
      if(sessionError||!session) throw new Error('Please sign in again to view weather.');
      const response=await fetch(`/api/weather?latitude=${farm.latitude}&longitude=${farm.longitude}`,{headers:{Authorization:`Bearer ${session.access_token}`}});
      if(response.status===401) throw new Error('Your session has expired. Please sign in again.');
      if(!response.ok) throw new Error('Failed to retrieve weather forecast.');
      const result=await response.json() as WeatherData;
      if(requestId!==weatherRequestId.current) return;
      setWeatherData(result);
      setWeatherDistrictId(farm.district.id);
    } catch(err:unknown) {
      if(requestId!==weatherRequestId.current) return;
      console.error('Weather fetch error:',err);
      setWeatherError(err instanceof Error?err.message:'Unable to connect to weather services. Please try again.');
    } finally {
      if(requestId===weatherRequestId.current) setLoadingWeather(false);
    }
  };
  useEffect(()=>{if(activeFarm) void fetchWeather(activeFarm);},[activeFarm?.id,activeFarm?.latitude,activeFarm?.longitude,activeFarm?.locationSource]);

  const handleAddFarm=()=>setFarmSetupMode('add');
  const handleSaveFarmSetup=async(result:FarmSetupResult)=>{
    const crop=result.crops[0] || DEFAULT_CROP;
    const farm:Farm={
      ...createFarm(result.district,crop,farms.length),
      latitude:result.latitude,
      longitude:result.longitude,
      locationAccuracyM:result.accuracyM,
      locationSource:'phone_gps',
      locationCapturedAt:result.capturedAt,
    };
    let savedFarm:Farm;
    if(farmSetupMode==='initial'||farmSetupMode==='add'){
      savedFarm=await insertFarm(userId,farm);
      try {
        await saveFarmAssets(userId,savedFarm.id,result.crops,result.livestock);
      } catch(error) {
        await deleteFarm(userId,savedFarm.id).catch(()=>undefined);
        throw error;
      }
      setFarms(current=>[...current,savedFarm]);
    } else if(farmSetupMode==='recapture'&&farmSetupTargetId){
      const target=farms.find(item=>item.id===farmSetupTargetId);
      if(!target) throw new Error('Could not find the farm to update. Please reload and try again.');
      savedFarm=await updateFarm(userId,{
        ...target,district:result.district,crop,
        latitude:result.latitude,longitude:result.longitude,
        locationAccuracyM:result.accuracyM,locationSource:'phone_gps',locationCapturedAt:result.capturedAt,
      });
      await saveFarmAssets(userId,savedFarm.id,result.crops,result.livestock);
      setFarms(current=>current.map(item=>item.id===savedFarm.id?savedFarm:item));
    } else {
      throw new Error('This farm setup action is not supported.');
    }
    setActiveFarmId(savedFarm.id);
    setFarmSyncError(null);
    setFarmSetupMode(null);
    setFarmSetupTargetId(null);
  };
  const handleCaptureFarmLocation=()=>{
    setFarmSetupTargetId(activeFarm.id);
    setFarmSetupMode('recapture');
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

  if(!activeFarm) {
    if(farmSetupMode==='initial') return <FarmSetup title="Create your first farm" onSave={handleSaveFarmSetup}/>;
    return <div className="min-h-screen bg-parchment-100 flex items-center justify-center px-6 text-center text-sm text-soil-700">{farmSyncError || 'Loading your farm…'}</div>;
  }

  return (
    <div className="min-h-screen bg-[#f1ebdc] flex flex-col font-sans pb-24" id="app-root">
      <BrandHeader/>
      {announcement && <div role="status" className="mx-auto mt-3 w-full max-w-3xl px-4 sm:px-6"><div className="rounded-xl border border-[#ead7a8] bg-[#fff3d5] px-4 py-3 text-sm text-soil-900">{announcement}</div></div>}
      <main className="flex-1 w-full max-w-3xl mx-auto">
        {farmSyncError&&<div className="mx-4 sm:mx-6 mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">{farmSyncError}</div>}
        {activeTab==='home' && <HomeDashboard farm={activeFarm} farmerName={farmerName} weather={weatherData} loading={loadingWeather} onOpenWeather={()=>setActiveTab('weather')} onOpenDisease={()=>setActiveTab('disease')} onOpenSoil={()=>activeFarm.locationSource==='phone_gps'?setShowSoilCalculator(true):setComingSoon({title:'Set farm location first',description:'Capture this farm’s GPS location before using Soil Intelligence. This keeps soil estimates tied to the actual farm, not a district centre.'})} onOpenKnowledge={()=>setShowKnowledgeCentre(true)} onOpenComingSoon={(title,description)=>setComingSoon({title,description})} onOpenDistrict={()=>setDistrictPickerOpen(true)} onCaptureLocation={handleCaptureFarmLocation}/>}
        {activeTab==='weather' && <div className="flex flex-col gap-4">
          <SkyHero farms={farms} activeFarm={activeFarm} onSelectFarm={handleSelectFarm} onAddFarm={handleAddFarm} onOpenDistrictPicker={()=>setDistrictPickerOpen(true)} onSelectCrop={c=>handleUpdateActiveFarm(activeFarm.district,c)} onDeleteFarm={handleDeleteActiveFarm} weatherCode={weatherData?.current.weatherCode??1} temperature={weatherData?.current.temperature??0} wasGeoDetected={locationStatus==='success'&&locationDetected}/>
          <div className="px-0 sm:px-0 flex flex-col gap-0 pb-4">
            
            {loadingWeather&&<div className="rounded-2xl bg-[#f8f4eb] border border-[#e6dcc8] p-8 text-center"><Loader2 className="h-7 w-7 text-leaf-600 animate-spin mx-auto"/><p className="text-xs text-soil-600 mt-2">Loading your local forecast…</p></div>}
            {weatherError&&!loadingWeather&&<div className="rounded-2xl bg-[#f8f4eb] border border-rose-100 p-5"><AlertCircle className="h-6 w-6 text-rose-600"/><p className="text-sm font-bold text-soil-900 mt-2">Weather unavailable</p><p className="text-xs text-soil-600 mt-1">{weatherError}</p><button onClick={()=>void fetchWeather(activeFarm)} className="mt-3 bg-leaf-700 text-white rounded-xl px-4 py-2 text-xs font-bold"><RefreshCw className="inline h-3 w-3 mr-1"/>Try again</button></div>}
            {!loadingWeather&&!weatherError&&weatherData&&<><WeatherDashboard weatherData={weatherData} district={activeFarm.district} cropName={activeFarm.crop} onAskKato={()=>setActiveTab('kato')}/></>}
          </div>
        </div>}
        <div className={activeTab==='disease'?'px-4 sm:px-6 py-5':'hidden'}><DiseaseDetection onCreateCarePlan={async ({cropName,diagnosis})=>{const now=new Date();const {data:plan,error:planError}=await supabase.from('crop_care_plans').insert({user_id:userId,farm_id:activeFarm.id,crop_name:cropName,district_name:activeFarm.district.name,issue_name:diagnosis.simpleDiseaseName||diagnosis.diseaseName||'Possible crop issue',diagnosis_status:'unconfirmed',status:'active',care_plan:{summary:`Monitor ${cropName}: ${diagnosis.simpleDiseaseName||diagnosis.diseaseName||'possible crop issue'}`,source:'disease_scan',provider_match_score:diagnosis.confidence,observations:diagnosis.whatObserved},source_scan:{outcome:diagnosis.outcome,disease_name:diagnosis.diseaseName||null,simple_disease_name:diagnosis.simpleDiseaseName||null,match_score:diagnosis.confidence,observations:diagnosis.whatObserved,scanned_at:now.toISOString(),weather_district:weatherDistrictId===activeFarm.district.id?activeFarm.district.name:null,weather_snapshot:weatherDistrictId===activeFarm.district.id?weatherData:null}}).select('id').single();if(planError||!plan)throw planError||new Error('Could not create crop-care plan');const specs=[{days:0,title:'Check the symptoms on the affected plant',instructions:'Compare the visible signs with the scan notes. Do not apply a treatment until the problem is better verified.',task_type:'inspect'},{days:2,title:'Inspect nearby plants',instructions:'Look for similar signs on nearby plants and record what you find.',task_type:'inspect'},{days:5,title:'Review the crop condition',instructions:'Check whether the affected area is spreading, staying the same or improving. Record your observations.',task_type:'inspect'},{days:7,title:'Follow up with a new crop photo',instructions:'Take a clear photo from a similar angle so the crop can be reviewed again.',task_type:'photo_check'}];const {error:taskError}=await supabase.from('crop_care_tasks').insert(specs.map(t=>({plan_id:plan.id,user_id:userId,title:t.title,instructions:t.instructions,task_type:t.task_type,due_at:new Date(now.getTime()+t.days*86400000+3600000).toISOString(),status:'pending'})));if(taskError){
          console.error('Care plan saved, but follow-up calendar tasks could not be saved:',{code:taskError.code,message:taskError.message,details:taskError.details});
          const safeFallback=specs.map(t=>({plan_id:plan.id,user_id:userId,title:t.title,instructions:t.instructions,task_type:t.task_type==='photo_check'?'photo_check':'inspect',due_at:new Date(now.getTime()+t.days*86400000+3600000).toISOString(),status:'pending'}));
          const {error:retryError}=await supabase.from('crop_care_tasks').insert(safeFallback);
          if(retryError)console.error('Care calendar retry failed:',{code:retryError.code,message:retryError.message,details:retryError.details});
        }const katoGuidance=await generateKatoCareGuidance({farmId:activeFarm.id,cropName,districtName:activeFarm.district.name,issueName:diagnosis.simpleDiseaseName||diagnosis.diseaseName||'Possible crop issue',confidence:diagnosis.confidence,observations:diagnosis.whatObserved||'No scan observations available',weatherContext:weatherDistrictId===activeFarm.district.id?weatherData:null,weatherDistrictName:weatherDistrictId===activeFarm.district.id?activeFarm.district.name:null});if(katoGuidance){const {error:guidanceError}=await supabase.from('crop_care_plans').update({care_plan:{summary:`Monitor ${cropName}: ${diagnosis.simpleDiseaseName||diagnosis.diseaseName||'possible crop issue'}`,source:'disease_scan',provider_match_score:diagnosis.confidence,observations:diagnosis.whatObserved,kato_guidance:katoGuidance,kato_generated_at:new Date().toISOString()}}).eq('id',plan.id).eq('user_id',userId);if(guidanceError)console.warn('Could not save Kato guidance to crop-care plan:',guidanceError);}return plan.id;}} userId={userId} districtName={activeFarm.district.name} weatherData={weatherDistrictId===activeFarm.district.id?weatherData:null} weatherDistrictName={weatherDistrictId===activeFarm.district.id?activeFarm.district.name:null}/></div>
        <div className={activeTab==='kato'?'':'hidden'}><KatoChat userId={userId} farmId={activeFarm.id} district={activeFarm.district} cropName={activeFarm.crop} weatherData={weatherDistrictId===activeFarm.district.id?weatherData:null} weatherDistrictName={weatherDistrictId===activeFarm.district.id?activeFarm.district.name:null} initialQuestion={pendingKatoQuestion} onInitialQuestionHandled={()=>setPendingKatoQuestion(null)} farmerName={farmerName}/></div>
        {activeTab==='account'&&<div className="px-4 sm:px-6 py-5"><AccountScreen/><div className="mt-5 grid grid-cols-2 gap-2">
          <button onClick={()=>activeFarm.locationSource==='phone_gps'?setShowSoilCalculator(true):setComingSoon({title:'Set farm location first',description:'Capture this farm’s GPS location before using Soil Intelligence.'})} className="rounded-xl border border-[#e6dcc8] bg-[#f8f4eb] p-3 text-left"><Wrench className="h-4 w-4 text-leaf-700 mb-2"/><span className="text-xs font-bold text-soil-900">Farm tools</span></button>
          <button onClick={()=>setComingSoon({title:'Livestock advisor',description:'Livestock care guidance is being prepared for a future Omulimi update.'})} className="rounded-xl border border-[#e6dcc8] bg-[#f8f4eb] p-3 text-left"><Sprout className="h-4 w-4 text-leaf-700 mb-2"/><span className="text-xs font-bold text-soil-900">Livestock advisor</span></button>
        </div></div>}
      </main>
      {showKnowledgeCentre&&<KnowledgeCentre onBack={()=>setShowKnowledgeCentre(false)} onAskKato={(question)=>{setPendingKatoQuestion(question);setShowKnowledgeCentre(false);setActiveTab('kato');}}/>}
      {farmSetupMode==='add'&&<FarmSetup title="Add another farm" onCancel={()=>setFarmSetupMode(null)} onSave={handleSaveFarmSetup}/>}
      {farmSetupMode==='recapture'&&<FarmSetup title="Update this farm’s location" initialCrops={[activeFarm.crop]} onCancel={()=>{setFarmSetupMode(null);setFarmSetupTargetId(null);}} onSave={handleSaveFarmSetup}/>}
      {comingSoon&&<div className="fixed inset-0 z-40 bg-soil-900/50 flex items-center justify-center p-4"><div className="w-full max-w-sm rounded-3xl bg-[#f8f4eb] border border-[#e6dcc8] p-6 text-center shadow-xl"><div className="h-14 w-14 rounded-2xl bg-leaf-100 flex items-center justify-center mx-auto"><Wrench className="h-7 w-7 text-leaf-700"/></div><p className="text-xs font-bold text-leaf-700 mt-4">COMING SOON</p><h2 className="text-xl font-bold text-soil-900 mt-1">{comingSoon.title}</h2><p className="text-sm text-soil-600 mt-2">{comingSoon.description}</p><button onClick={()=>setComingSoon(null)} className="mt-5 w-full rounded-xl bg-leaf-700 text-white py-3 text-sm font-bold">Got it</button></div></div>}
      {!showSoilCalculator&&!showKnowledgeCentre&&<BottomNav active={activeTab} onChange={setActiveTab}/>} 
      {showSoilCalculator&&<div className="fixed inset-0 z-40 overflow-y-auto bg-[#f1ebdc]"><div className="mx-auto min-h-full w-full max-w-3xl"><SoilCalculator userId={userId} farmId={activeFarm.id} initialCrop={activeFarm.crop} initialLatitude={activeFarm.latitude ?? 0} initialLongitude={activeFarm.longitude ?? 0} initialLocation={`${activeFarm.district.name} District, Uganda`} onBack={()=>setShowSoilCalculator(false)}/></div></div>}
      <DistrictPicker isOpen={districtPickerOpen} onClose={()=>setDistrictPickerOpen(false)} selectedDistrict={activeFarm.district} onSelect={d=>handleUpdateActiveFarm(d,SUPPORTED_CROP_NAMES.includes(activeFarm.crop)?activeFarm.crop:DEFAULT_CROP)} onUseMyLocation={detectLocationForActiveFarm} locationStatus={locationStatus}/>
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
