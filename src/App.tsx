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
import { Loader2, AlertCircle, RefreshCw, Beef, Wallet, User } from 'lucide-react';

const DEFAULT_DISTRICT = DISTRICTS[1];

export default function App() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [activeFarmId, setActiveFarmId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('weather');
  const [districtPickerOpen, setDistrictPickerOpen] = useState(false);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');
  const [locationDetected, setLocationDetected] = useState(false);

  useEffect(() => {
    const saved = loadFarms();
    if (saved.length > 0) {
      setFarms(saved);
      setActiveFarmId(saved[0].id);
    } else {
      setLocationStatus('detecting');
      detectNearestDistrict(DISTRICTS)
        .then(({ district, status }) => {
          const firstFarm = createFarm(district, district.mainCrops[0] || 'Maize', 0);
          setFarms([firstFarm]);
          setActiveFarmId(firstFarm.id);
          saveFarms([firstFarm]);
          setLocationStatus(status);
          setLocationDetected(true);
        })
        .catch((status: LocationStatus) => {
          const firstFarm = createFarm(DEFAULT_DISTRICT, DEFAULT_DISTRICT.mainCrops[0] || 'Maize', 0);
          setFarms([firstFarm]);
          setActiveFarmId(firstFarm.id);
          saveFarms([firstFarm]);
          setLocationStatus(status);
        });
    }
  }, []);

  const activeFarm = farms.find((f) => f.id === activeFarmId) || farms[0];

  const fetchWeather = async (district: District) => {
    setLoadingWeather(true);
    setWeatherError(null);
    try {
      const response = await fetch(`/api/weather?latitude=${district.latitude}&longitude=${district.longitude}`);
      if (!response.ok) throw new Error('Failed to retrieve meteorology weather forecast.');
      const data = await response.json();
      setWeatherData(data);
    } catch (err: any) {
      console.error('Weather fetch error:', err);
      setWeatherError(err.message || 'Unable to connect to weather services. Please check connection and try again.');
    } finally {
      setLoadingWeather(false);
    }
  };

  useEffect(() => {
    if (activeFarm) fetchWeather(activeFarm.district);
  }, [activeFarm?.district.id]);

  const handleAddFarm = () => {
    const newFarm = createFarm(DEFAULT_DISTRICT, DEFAULT_DISTRICT.mainCrops[0] || 'Maize', farms.length);
    const updated = [...farms, newFarm];
    setFarms(updated);
    saveFarms(updated);
    setActiveFarmId(newFarm.id);
    setDistrictPickerOpen(true);
  };

  const handleSelectFarm = (farm: Farm) => setActiveFarmId(farm.id);

  const handleUpdateActiveFarm = (district: District, crop: string) => {
    const updated = farms.map((f) => (f.id === activeFarm.id ? { ...f, district, crop } : f));
    setFarms(updated);
    saveFarms(updated);
  };

  const detectLocationForActiveFarm = () => {
    setLocationStatus('detecting');
    detectNearestDistrict(DISTRICTS)
      .then(({ district, status }) => {
        handleUpdateActiveFarm(district, activeFarm.crop);
        setLocationStatus(status);
        setLocationDetected(true);
      })
      .catch((status: LocationStatus) => setLocationStatus(status));
  };

  if (!activeFarm) {
    return (
      <div className="min-h-screen bg-parchment-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-leaf-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-parchment-100 flex flex-col font-sans pb-20" id="app-root">
      <main className="flex-1 max-w-7xl w-full mx-auto flex flex-col gap-6" id="app-main">
        {activeTab === 'weather' && (
          <>
            <SkyHero
              farms={farms}
              activeFarm={activeFarm}
              onSelectFarm={handleSelectFarm}
              onAddFarm={handleAddFarm}
              onOpenDistrictPicker={() => setDistrictPickerOpen(true)}
              onSelectCrop={(c) => handleUpdateActiveFarm(activeFarm.district, c)}
              weatherCode={weatherData?.current.weatherCode ?? 1}
              temperature={weatherData?.current.temperature ?? 0}
              wasGeoDetected={locationStatus === 'success' && locationDetected}
            />
            <div className="px-4 sm:px-6 lg:px-8 flex flex-col gap-6">
            {loadingWeather && (
              <div className="bg-parchment-50 rounded-2xl shadow-md border border-leaf-100 p-12 flex flex-col items-center justify-center text-center min-h-[300px]">
                <Loader2 className="h-10 w-10 text-leaf-600 animate-spin mb-4" />
                <h4 className="font-bold text-soil-900 text-base">Fetching Meteorological Datasets...</h4>
                <p className="text-xs text-soil-400 mt-1 max-w-xs">Downloading current conditions and 7-day forecast for {activeFarm.district.name}...</p>
              </div>
            )}
            {weatherError && !loadingWeather && (
              <div className="bg-parchment-50 rounded-2xl shadow-md border border-rose-100 p-12 flex flex-col items-center justify-center text-center min-h-[300px]">
                <AlertCircle className="h-12 w-12 text-rose-500 mb-4" />
                <h4 className="font-bold text-rose-800 text-base">Weather Synchronization Failed</h4>
                <p className="text-xs text-rose-600 mt-1 max-w-sm mx-auto">{weatherError}</p>
                <button onClick={() => fetchWeather(activeFarm.district)} className="mt-6 flex items-center gap-2 bg-leaf-600 hover:bg-leaf-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-sm">
                  <RefreshCw className="h-3.5 w-3.5" /> Try Reconnecting
                </button>
              </div>
            )}
            {!loadingWeather && !weatherError && weatherData && (
              <div className="flex flex-col gap-6" id="dashboard-loaded-data">
                <WeatherDashboard weatherData={weatherData} district={activeFarm.district} />
                <AIAdvisor weatherData={weatherData} district={activeFarm.district} cropName={activeFarm.crop} />
              </div>
            )}
            </div>
          </>
        )}
        {activeTab !== 'weather' && (
          <div className="px-4 sm:px-6 lg:px-8">
            {activeTab === 'disease' && <DiseaseDetection />}
            {activeTab === 'livestock' && <ComingSoon icon={Beef} title="Livestock Advisor" description="Care guidance for cattle, goats, and poultry — coming soon." onBack={() => setActiveTab('weather')} />}
            {activeTab === 'records' && <ComingSoon icon={Wallet} title="Financial Records" description="Track income and expenses across your farms — coming soon." onBack={() => setActiveTab('weather')} />}
            {activeTab === 'account' && <ComingSoon icon={User} title="Account" description="Sign in to sync your farms across devices — coming soon." onBack={() => setActiveTab('weather')} />}
          </div>
        )}
      </main>
      <BottomNav active={activeTab} onChange={setActiveTab} />
      <DistrictPicker
        isOpen={districtPickerOpen}
        onClose={() => setDistrictPickerOpen(false)}
        selectedDistrict={activeFarm.district}
        onSelect={(d) => handleUpdateActiveFarm(d, d.mainCrops[0] || activeFarm.crop)}
        onUseMyLocation={detectLocationForActiveFarm}
        locationStatus={locationStatus}
      />
    </div>
  );
}
