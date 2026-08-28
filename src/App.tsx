import React, { useState, useEffect } from 'react';
import { DISTRICTS } from './data/districts';
import { District, WeatherData } from './types';
import DistrictSelector from './components/DistrictSelector';
import WeatherDashboard from './components/WeatherDashboard';
import AIAdvisor from './components/AIAdvisor';
import { Sprout, CloudRain, Sun, Leaf, Loader2, AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [selectedDistrict, setSelectedDistrict] = useState<District>(DISTRICTS[1]); // Default Wakiso
  const [selectedCrop, setSelectedCrop] = useState<string>('Maize');
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  // Fetch meteorological data whenever selected district coordinate changes
  const fetchWeather = async (district: District) => {
    setLoadingWeather(true);
    setWeatherError(null);
    try {
      const response = await fetch(
        `/api/weather?latitude=${district.latitude}&longitude=${district.longitude}`
      );
      if (!response.ok) {
        throw new Error('Failed to retrieve meteorology weather forecast.');
      }
      const data = await response.json();
      setWeatherData(data);
    } catch (err: any) {
      console.error('Weather fetch error:', err);
      setWeatherError(
        err.message || 'Unable to connect to weather services. Please check connection and try again.'
      );
    } finally {
      setLoadingWeather(false);
    }
  };

  useEffect(() => {
    fetchWeather(selectedDistrict);
  }, [selectedDistrict.id]);

  return (
    <div className="min-h-screen bg-[#F5F0E8] flex flex-col font-sans" id="app-root">
      {/* Premium Agriculture Top Navigation Header */}
      <header className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white shadow-md shrink-0" id="app-header">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2.5 rounded-2xl border border-white/10 shadow-inner">
              <Sprout className="h-7 w-7 text-emerald-300 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                Uganda Districts Weather Predictor
              </h1>
              <p className="text-xs text-emerald-100/90 font-medium">
                Your crop. Your district. Your advice.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-xs bg-[#12342C]/50 backdrop-blur-sm border border-emerald-500/20 px-3 py-1.5 rounded-full font-semibold">
            <CloudRain className="h-4 w-4 text-emerald-300" />
            <span className="text-[#D8E7DF]"></span>
          </div>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6" id="app-main">
        {/* Upper summary helper card */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100/70 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex gap-3">
            <div className="bg-amber-500/10 text-amber-800 h-10 w-10 rounded-xl flex items-center justify-center shrink-0">
              <Leaf className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-[#24332E] text-sm">Farvo</h3>
              <p className="text-xs text-slate-600 leading-relaxed mt-0.5">
                Providing Ugandan farmers with precise meteorology data (temperature, rainfall probabilities, soil heat indices, moisture ratios, and evapotranspiration) powered by real-time meteorological servers.
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="dashboard-grid">
          {/* Left Column: District & Crop Selector (Takes up 4 cols on large screens) */}
          <div className="lg:col-span-4 flex flex-col gap-6" id="left-sidebar">
            <DistrictSelector
              selectedDistrict={selectedDistrict}
              setSelectedDistrict={setSelectedDistrict}
              selectedCrop={selectedCrop}
              setSelectedCrop={setSelectedCrop}
            />
          </div>

          {/* Right Column: Weather Dashboard & AI Predictions (Takes up 8 cols on large screens) */}
          <div className="lg:col-span-8 flex flex-col gap-6" id="right-content">
            {/* Loading Weather State */}
            {loadingWeather && (
              <div className="bg-white rounded-2xl shadow-md border border-emerald-100 p-12 flex flex-col items-center justify-center text-center flex-1 min-h-[400px]">
                <Loader2 className="h-10 w-10 text-emerald-600 animate-spin mb-4" />
                <h4 className="font-bold text-[#24332E] text-base">Fetching Meteorological Datasets...</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Downloading current air pressure, soil heat metrics, and 7-day forecast figures for {selectedDistrict.name}...
                </p>
              </div>
            )}

            {/* Error Loading Weather State */}
            {weatherError && !loadingWeather && (
              <div className="bg-white rounded-2xl shadow-md border border-rose-100 p-12 flex flex-col items-center justify-center text-center flex-1 min-h-[400px]">
                <AlertCircle className="h-12 w-12 text-rose-500 mb-4" />
                <h4 className="font-bold text-rose-800 text-base">Weather Synchronization Failed</h4>
                <p className="text-xs text-rose-600 mt-1 max-w-sm mx-auto">
                  {weatherError}
                </p>
                <button
                  onClick={() => fetchWeather(selectedDistrict)}
                  className="mt-6 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-sm"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Try Reconnecting
                </button>
              </div>
            )}

            {/* Weather Metrics and AI Advisories (Loaded State) */}
            {!loadingWeather && !weatherError && weatherData && (
              <div className="flex flex-col gap-6" id="dashboard-loaded-data">
                {/* 1. Meteorological charts and live stats */}
                <WeatherDashboard 
                  weatherData={weatherData} 
                  district={selectedDistrict} 
                />

                {/* 2. Gemini AI Agronomist predictions and advisor panel */}
                <AIAdvisor 
                  weatherData={weatherData} 
                  district={selectedDistrict} 
                  cropName={selectedCrop} 
                />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer credits and information */}
      <footer className="bg-slate-800 text-slate-400 text-xs py-6 border-t border-slate-700 shrink-0 mt-auto" id="app-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Uganda Districts Agricultural Weather Predictor. All rights reserved.</p>
          <p className="flex items-center gap-1.5 text-slate-500 font-medium">
            <Leaf className="h-3.5 w-3.5 text-emerald-600" />
            © 2026 Farvo. Kampala, Uganda.
          </p>
        </div>
      </footer>
    </div>
  );
}
