import React, { useState } from 'react';
import { WeatherData, District } from '../types';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar 
} from 'recharts';
import { 
  Thermometer, Droplets, Wind, Waves, Sun, Cloud, CloudSun, CloudFog, CloudDrizzle, CloudRain, CloudLightning, Gauge, ArrowUpRight, Compass, HelpCircle
} from 'lucide-react';

interface WeatherDashboardProps {
  weatherData: WeatherData;
  district: District;
}

// Weather Code helper to map Open-Meteo codes to beautiful localized details
export function getWeatherDetails(code: number) {
  switch (code) {
    case 0:
      return { label: 'Sunny / Clear Sky', icon: Sun, color: 'text-amber-500 bg-amber-50' };
    case 1:
    case 2:
      return { label: 'Partly Cloudy', icon: CloudSun, color: 'text-sky-500 bg-sky-50' };
    case 3:
      return { label: 'Overcast / Cloudy', icon: Cloud, color: 'text-slate-500 bg-slate-100' };
    case 45:
    case 48:
      return { label: 'Foggy / Misty', icon: CloudFog, color: 'text-teal-600 bg-teal-50' };
    case 51:
    case 53:
    case 55:
      return { label: 'Light Drizzle', icon: CloudDrizzle, color: 'text-blue-400 bg-blue-50' };
    case 61:
    case 63:
      return { label: 'Moderate Rain', icon: CloudRain, color: 'text-blue-500 bg-blue-50' };
    case 65:
      return { label: 'Heavy Tropical Rain', icon: CloudRain, color: 'text-blue-700 bg-blue-100 border border-blue-200' };
    case 80:
    case 81:
    case 82:
      return { label: 'Localized Showers', icon: CloudRain, color: 'text-indigo-500 bg-indigo-50' };
    case 95:
    case 96:
    case 99:
      return { label: 'Severe Thunderstorms', icon: CloudLightning, color: 'text-purple-600 bg-purple-50 border border-purple-200 animate-pulse' };
    default:
      return { label: 'Variable Weather', icon: CloudSun, color: 'text-emerald-600 bg-emerald-50' };
  }
}

// Map soil moisture to a human-friendly agronomic scale
function getSoilMoistureStatus(moisture: number) {
  if (moisture < 0.15) return { label: 'Very Dry (Stress)', color: 'text-red-600 bg-red-50 border-red-200' };
  if (moisture >= 0.15 && moisture < 0.25) return { label: 'Moderately Dry', color: 'text-amber-600 bg-amber-50 border-amber-200' };
  if (moisture >= 0.25 && moisture < 0.40) return { label: 'Optimal Moisture', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
  return { label: 'Saturated (Waterlogged)', color: 'text-blue-600 bg-blue-50 border-blue-200' };
}

export default function WeatherDashboard({ weatherData, district }: WeatherDashboardProps) {
  const [activeChart, setActiveChart] = useState<'temperature' | 'rainfall'>('temperature');
  const { current, daily } = weatherData;

  const currentWeatherDetails = getWeatherDetails(current.weatherCode);
  const CurrentIcon = currentWeatherDetails.icon;

  const soilMoistureStatus = getSoilMoistureStatus(current.soilMoisture);

  // Format daily data for Recharts
  const chartData = daily.map((day) => {
    const d = new Date(day.date);
    const formattedDate = d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
    return {
      name: formattedDate,
      MaxTemp: day.maxTemp,
      MinTemp: day.minTemp,
      Rainfall: parseFloat(day.precipitation.toFixed(1)),
      RainProbability: day.precipitationProbability,
      Evapotranspiration: parseFloat(day.evapotranspiration.toFixed(2)),
    };
  });

  return (
    <div className="bg-white rounded-2xl shadow-md border border-emerald-100 p-6 flex flex-col gap-6" id="weather-dashboard-container">
      {/* Header and Current Time */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
            Live Meteorology
          </span>
          <h2 className="text-2xl font-black text-slate-800 mt-1">
            {district.name} District
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Geocoordinates: {district.latitude.toFixed(4)}°N, {district.longitude.toFixed(4)}°E • Elevation: {weatherData.elevation}m
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-2xl md:self-center">
          <div className={`p-2 rounded-xl ${currentWeatherDetails.color}`}>
            <CurrentIcon className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Conditions</div>
            <div className="text-sm font-bold text-slate-700">{currentWeatherDetails.label}</div>
          </div>
        </div>
      </div>

      {/* Grid of Key Agronomic Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="agronomy-metrics-grid">
        {/* Metric 1: Temperature */}
        <div className="bg-gradient-to-br from-orange-50/50 to-orange-50/20 border border-orange-100 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-orange-700 uppercase tracking-wider">Temperature</span>
            <Thermometer className="h-5 w-5 text-orange-500" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-slate-800">{current.temperature}°C</span>
            {current.apparentTemperature && (
              <span className="text-[11px] text-orange-600 font-semibold block mt-1">
                Feels like {current.apparentTemperature}°C
              </span>
            )}
          </div>
        </div>

        {/* Metric 2: Soil Temp */}
        <div className="bg-gradient-to-br from-amber-50/50 to-amber-50/20 border border-amber-100 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Soil Temp (6cm)</span>
            <Gauge className="h-5 w-5 text-amber-500" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-slate-800">{current.soilTemperature.toFixed(1)}°C</span>
            <span className="text-[11px] text-amber-700 font-semibold block mt-1">
              Seeds germ-sensitive
            </span>
          </div>
        </div>

        {/* Metric 3: Soil Moisture */}
        <div className="bg-gradient-to-br from-emerald-50/50 to-emerald-50/20 border border-emerald-100 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Soil Moisture</span>
            <Droplets className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-slate-800">{(current.soilMoisture * 100).toFixed(0)}%</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border mt-1.5 inline-block ${soilMoistureStatus.color}`}>
              {soilMoistureStatus.label}
            </span>
          </div>
        </div>

        {/* Metric 4: Evapotranspiration */}
        <div className="bg-gradient-to-br from-blue-50/50 to-blue-50/20 border border-blue-100 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-800 uppercase tracking-wider">Water Loss (ET0)</span>
            <Waves className="h-5 w-5 text-blue-500" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-slate-800">{current.evapotranspiration.toFixed(2)} mm</span>
            <span className="text-[11px] text-blue-600 font-semibold block mt-1">
              Hourly evapotranspiration
            </span>
          </div>
        </div>
      </div>

      {/* Wind, Rain, and Humidity Secondary Bar */}
      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 grid grid-cols-3 gap-2 text-center" id="secondary-metrics-bar">
        <div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
            <Wind className="h-3.5 w-3.5 text-slate-500" /> Wind Speed
          </div>
          <div className="text-sm font-bold text-slate-700">{current.windSpeed.toFixed(1)} km/h</div>
          <div className="text-[10px] text-slate-400 mt-0.5 flex items-center justify-center gap-0.5">
            <Compass className="h-2.5 w-2.5" /> {current.windDirection}° Direction
          </div>
        </div>
        <div className="border-x border-slate-200">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
            <Droplets className="h-3.5 w-3.5 text-blue-500" /> Humidity
          </div>
          <div className="text-sm font-bold text-slate-700">{current.relativeHumidity}%</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Relative Air Humidity</div>
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
            <CloudRain className="h-3.5 w-3.5 text-blue-600" /> Today's Rain
          </div>
          <div className="text-sm font-bold text-slate-700">{current.rainfall.toFixed(1)} mm</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Accumulated precipitation</div>
        </div>
      </div>

      {/* Visual Data Charts Panel for Farmers */}
      <div className="border border-slate-100 rounded-2xl p-5" id="weather-charts-panel">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-1.5">
              <Sun className="text-amber-500 h-5 w-5" />
              7-Day Crop Weather Forecast Charts
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Farmers can switch between Temperature trends and Precipitation volume predictions.
            </p>
          </div>

          {/* Chart Toggle Buttons */}
          <div className="flex bg-slate-100 p-1 rounded-xl self-start">
            <button
              onClick={() => setActiveChart('temperature')}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                activeChart === 'temperature'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Temperature
            </button>
            <button
              onClick={() => setActiveChart('rainfall')}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                activeChart === 'rainfall'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Rainfall & Probability
            </button>
          </div>
        </div>

        {/* Interactive Chart Container */}
        <div className="h-[280px] w-full" id="weather-interactive-chart">
          {activeChart === 'temperature' ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMax" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorMin" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} unit="°" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '12px' }}
                  labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', marginTop: '10px' }} />
                <Area type="monotone" name="Max Temp (°C)" dataKey="MaxTemp" stroke="#f97316" strokeWidth={2.5} fillOpacity={1} fill="url(#colorMax)" />
                <Area type="monotone" name="Min Temp (°C)" dataKey="MinTemp" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorMin)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} unit="m" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '12px' }}
                  labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', marginTop: '10px' }} />
                <Bar name="Rainfall Volume (mm)" dataKey="Rainfall" fill="#0284c7" radius={[4, 4, 0, 0]} maxBarSize={35} />
                <Bar name="Rain Probability (%)" dataKey="RainProbability" fill="#38bdf8" radius={[4, 4, 0, 0]} maxBarSize={35} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 7-Day Forecast Micro Cards */}
      <div>
        <h3 className="font-bold text-slate-800 text-sm mb-3">7-Day Daily Farming Outlook</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3" id="daily-micro-cards">
          {daily.slice(0, 7).map((day, idx) => {
            const d = new Date(day.date);
            const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
            const dayNum = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
            const details = getWeatherDetails(day.weatherCode);
            const DayIcon = details.icon;

            return (
              <div 
                key={day.date} 
                className={`p-3 rounded-xl border flex flex-col items-center text-center transition-all duration-200 ${
                  idx === 0 
                    ? 'bg-emerald-50/40 border-emerald-300 ring-2 ring-emerald-500/10' 
                    : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50'
                }`}
              >
                <div className="text-[11px] font-bold text-slate-500">{idx === 0 ? 'Today' : weekday}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{dayNum}</div>
                
                <div className={`p-1.5 rounded-lg my-2.5 ${details.color}`}>
                  <DayIcon className="h-4.5 w-4.5" />
                </div>
                
                <div className="text-xs font-bold text-slate-700">
                  {day.maxTemp.toFixed(0)}° / {day.minTemp.toFixed(0)}°
                </div>
                
                <div className="text-[10px] font-semibold text-sky-600 mt-1.5 flex items-center gap-0.5">
                  💧 {day.precipitation > 0 ? `${day.precipitation.toFixed(1)}mm` : '0mm'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
