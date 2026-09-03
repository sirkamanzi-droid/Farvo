import React from 'react';
import { WeatherData, District } from '../types';
import { Thermometer, Droplets, Wind, Waves, Sun, Cloud, CloudSun, CloudFog, CloudDrizzle, CloudRain, CloudLightning, Gauge, Compass } from 'lucide-react';

interface WeatherDashboardProps {
  weatherData: WeatherData;
  district: District;
}

export function getWeatherDetails(code: number) {
  switch (code) {
    case 0: return { label: 'Sunny / Clear Sky', icon: Sun, color: 'text-gold-500 bg-gold-100' };
    case 1: case 2: return { label: 'Partly Cloudy', icon: CloudSun, color: 'text-leaf-600 bg-leaf-100' };
    case 3: return { label: 'Overcast / Cloudy', icon: Cloud, color: 'text-soil-400 bg-parchment-100' };
    case 45: case 48: return { label: 'Foggy / Misty', icon: CloudFog, color: 'text-teal-600 bg-teal-50' };
    case 51: case 53: case 55: return { label: 'Light Drizzle', icon: CloudDrizzle, color: 'text-blue-400 bg-blue-50' };
    case 61: case 63: return { label: 'Moderate Rain', icon: CloudRain, color: 'text-blue-500 bg-blue-50' };
    case 65: return { label: 'Heavy Tropical Rain', icon: CloudRain, color: 'text-blue-700 bg-blue-100 border border-blue-200' };
    case 80: case 81: case 82: return { label: 'Localized Showers', icon: CloudRain, color: 'text-indigo-500 bg-indigo-50' };
    case 95: case 96: case 99: return { label: 'Severe Thunderstorms', icon: CloudLightning, color: 'text-purple-600 bg-purple-50 border border-purple-200 animate-pulse' };
    default: return { label: 'Variable Weather', icon: CloudSun, color: 'text-leaf-600 bg-leaf-100' };
  }
}

function getSoilMoistureStatus(moisture: number) {
  if (moisture < 0.15) return { label: 'Very Dry (Stress)', color: 'text-red-600 bg-red-50 border-red-200' };
  if (moisture >= 0.15 && moisture < 0.25) return { label: 'Moderately Dry', color: 'text-clay-600 bg-gold-100 border-gold-100' };
  if (moisture >= 0.25 && moisture < 0.40) return { label: 'Optimal Moisture', color: 'text-leaf-600 bg-leaf-100 border-leaf-100' };
  return { label: 'Saturated (Waterlogged)', color: 'text-blue-600 bg-blue-50 border-blue-200' };
}

export default function WeatherDashboard({ weatherData, district }: WeatherDashboardProps) {
  const { current, daily } = weatherData;
  const soilMoistureStatus = getSoilMoistureStatus(current.soilMoisture);

  return (
    <div className="bg-parchment-50 rounded-2xl shadow-md border border-leaf-100 p-6 flex flex-col gap-6" id="weather-dashboard-container">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="agronomy-metrics-grid">
        <div className="bg-gradient-to-br from-orange-50/50 to-orange-50/20 border border-orange-100 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between"><span className="text-xs font-semibold text-orange-700 uppercase tracking-wider">Temperature</span><Thermometer className="h-5 w-5 text-orange-500" /></div>
          <div className="mt-4"><span className="text-3xl font-black text-soil-900">{current.temperature}°C</span>{current.apparentTemperature && <span className="text-[11px] text-orange-600 font-semibold block mt-1">Feels like {current.apparentTemperature}°C</span>}</div>
        </div>
        <div className="bg-gradient-to-br from-gold-100/50 to-gold-100/20 border border-gold-100 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between"><span className="text-xs font-semibold text-clay-600 uppercase tracking-wider">Soil Temp (6cm)</span><Gauge className="h-5 w-5 text-gold-500" /></div>
          <div className="mt-4"><span className="text-3xl font-black text-soil-900">{current.soilTemperature.toFixed(1)}°C</span><span className="text-[11px] text-clay-600 font-semibold block mt-1">Seeds germ-sensitive</span></div>
        </div>
        <div className="bg-gradient-to-br from-leaf-100/50 to-leaf-100/20 border border-leaf-100 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between"><span className="text-xs font-semibold text-leaf-700 uppercase tracking-wider">Soil Moisture</span><Droplets className="h-5 w-5 text-leaf-600" /></div>
          <div className="mt-4"><span className="text-3xl font-black text-soil-900">{(current.soilMoisture * 100).toFixed(0)}%</span><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border mt-1.5 inline-block ${soilMoistureStatus.color}`}>{soilMoistureStatus.label}</span></div>
        </div>
        <div className="bg-gradient-to-br from-blue-50/50 to-blue-50/20 border border-blue-100 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between"><span className="text-xs font-semibold text-blue-800 uppercase tracking-wider">Water Loss (ET0)</span><Waves className="h-5 w-5 text-blue-500" /></div>
          <div className="mt-4"><span className="text-3xl font-black text-soil-900">{current.evapotranspiration.toFixed(2)} mm</span><span className="text-[11px] text-blue-600 font-semibold block mt-1">Hourly evapotranspiration</span></div>
        </div>
      </div>

      <div className="bg-parchment-50 border border-parchment-100 rounded-2xl p-4 grid grid-cols-3 gap-2 text-center" id="secondary-metrics-bar">
        <div><div className="text-xs font-semibold text-soil-400 uppercase tracking-wider mb-1 flex items-center justify-center gap-1"><Wind className="h-3.5 w-3.5 text-soil-400" /> Wind Speed</div><div className="text-sm font-bold text-soil-900">{current.windSpeed.toFixed(1)} km/h</div><div className="text-[10px] text-soil-400 mt-0.5 flex items-center justify-center gap-0.5"><Compass className="h-2.5 w-2.5" /> {current.windDirection}° Direction</div></div>
        <div className="border-x border-parchment-200"><div className="text-xs font-semibold text-soil-400 uppercase tracking-wider mb-1 flex items-center justify-center gap-1"><Droplets className="h-3.5 w-3.5 text-blue-500" /> Humidity</div><div className="text-sm font-bold text-soil-900">{current.relativeHumidity}%</div><div className="text-[10px] text-soil-400 mt-0.5">Relative Air Humidity</div></div>
        <div><div className="text-xs font-semibold text-soil-400 uppercase tracking-wider mb-1 flex items-center justify-center gap-1"><CloudRain className="h-3.5 w-3.5 text-blue-600" /> Today's Rain</div><div className="text-sm font-bold text-soil-900">{current.rainfall.toFixed(1)} mm</div><div className="text-[10px] text-soil-400 mt-0.5">Accumulated precipitation</div></div>
      </div>

      <div>
        <h3 className="font-bold text-soil-900 text-sm mb-3">7-Day Daily Farming Outlook</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3" id="daily-micro-cards">
          {daily.slice(0, 7).map((day, idx) => {
            const d = new Date(day.date);
            const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
            const dayNum = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
            const details = getWeatherDetails(day.weatherCode);
            const DayIcon = details.icon;
            return (
              <div key={day.date} className={`p-3 rounded-xl border flex flex-col items-center text-center transition-all duration-200 ${idx === 0 ? 'bg-leaf-100/40 border-leaf-400 ring-2 ring-leaf-600/10' : 'bg-parchment-50/50 border-parchment-100 hover:bg-parchment-50'}`}>
                <div className="text-[11px] font-bold text-soil-400">{idx === 0 ? 'Today' : weekday}</div>
                <div className="text-[10px] text-soil-400 mt-0.5">{dayNum}</div>
                <div className={`p-1.5 rounded-lg my-2.5 ${details.color}`}><DayIcon className="h-4.5 w-4.5" /></div>
                <div className="text-xs font-bold text-soil-900">{day.maxTemp.toFixed(0)}° / {day.minTemp.toFixed(0)}°</div>
                <div className="text-[10px] font-semibold text-sky-600 mt-1.5 flex items-center gap-0.5">💧 {day.precipitation > 0 ? `${day.precipitation.toFixed(1)}mm` : '0mm'}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
