import React from 'react';
import { WeatherData, District } from '../types';
import { generateCropAdvice } from '../data/cropAdvisor';
import { Sun, Cloud, CloudSun, CloudFog, CloudDrizzle, CloudRain, CloudLightning, Droplets, Wind, Sprout, Sprout as Plant, SprayCan, Wheat, ChevronRight, Clock3 } from 'lucide-react';

interface WeatherDashboardProps {
  weatherData: WeatherData;
  district: District;
  cropName?: string;
  onAskKato?: () => void;
}

export function getWeatherDetails(code: number) {
  switch (code) {
    case 0: return { label: 'Clear sky', icon: Sun };
    case 1: case 2: return { label: 'Partly cloudy', icon: CloudSun };
    case 3: return { label: 'Cloudy', icon: Cloud };
    case 45: case 48: return { label: 'Foggy', icon: CloudFog };
    case 51: case 53: case 55: return { label: 'Light drizzle', icon: CloudDrizzle };
    case 61: case 63: case 65: case 80: case 81: case 82: return { label: 'Light rain', icon: CloudRain };
    case 95: case 96: case 99: return { label: 'Thunderstorms', icon: CloudLightning };
    default: return { label: 'Variable conditions', icon: CloudSun };
  }
}

function formatUpdated(time: string) {
  if (!time) return 'Latest available forecast';
  const date = new Date(time);
  return Number.isNaN(date.getTime()) ? 'Latest available forecast' : 'Updated ' + date.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
}

export default function WeatherDashboard({ weatherData, district, cropName='Maize', onAskKato }: WeatherDashboardProps) {
  const { current, daily } = weatherData;
  const today = daily[0];
  const nextFive = daily.slice(0,5);
  const details = getWeatherDetails(current.weatherCode);
  const CurrentIcon = details.icon;
  const rainProbability = today?.precipitationProbability ?? 0;
  const expectedRain = today?.precipitation ?? 0;
  const adviceCrop = cropName.toLowerCase().includes('potato') ? 'Irish Potatoes' : cropName.toLowerCase().includes('banana') ? 'Matooke (Bananas)' : cropName;
  const advice = generateCropAdvice(district.name, adviceCrop, weatherData).cropAdvisories[0];
  const sprayingAdvice = rainProbability >= 60
    ? 'Rain is likely. Avoid spraying just before rainfall; check the product label for rain-free time.'
    : 'Check the forecast and product label before any crop spraying.';
  const decisions = [
    {title:'Planting',icon:Sprout,body:advice.plantingAdvisory,meta:'Based on soil moisture and rainfall'},
    {title:'Spraying',icon:SprayCan,body:sprayingAdvice,meta:'Weather timing guidance'},
    {title:'Drying',icon:Sun,body:rainProbability >= 50 ? 'Rain is possible. Dry harvested produce under a covered, well-ventilated area.' : 'A drier window may be available. Keep produce raised and protected from damp ground.',meta:'Based on rain probability'},
    {title:'Harvesting',icon:Wheat,body:advice.harvestAdvisory,meta:'Next 3 days outlook'}
  ];
  return (
    <div className="px-4 sm:px-6 pb-6 flex flex-col gap-4" id="weather-dashboard-container">
      <section className="rounded-2xl border border-[#e4dac7] bg-[#faf7ef] p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-soil-700"><MapPin className="h-3.5 w-3.5 text-leaf-700"/>{district.name} District</div>
          <span className="text-[10px] text-soil-400">Open-Meteo</span>
        </div>
        <div className="mt-4 flex items-center gap-4">
          <CurrentIcon className="h-14 w-14 text-[#6e9bb1]"/>
          <div className="min-w-0"><div className="text-[38px] leading-none font-semibold tracking-tight text-soil-900">{Math.round(current.temperature)}°C</div><div className="text-xs font-semibold text-soil-700 mt-1">{details.label}</div></div>
          <div className="ml-auto border-l border-[#e4dac7] pl-4">
            <div className="text-[10px] text-soil-500">Rainfall probability</div>
            <div className="text-xl font-bold text-soil-900">{Math.round(rainProbability)}%</div>
            <div className="text-[10px] text-soil-500">Expected: {expectedRain.toFixed(1)} mm</div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-[#e9e0d0] pt-3 text-[10px] text-soil-400">
          <span className="flex items-center gap-1"><Clock3 className="h-3 w-3"/>{formatUpdated(current.time)}</span>
          <span>Source: Open-Meteo</span>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-2"><h2 className="text-sm font-bold text-soil-900">5-day forecast</h2><span className="text-[10px] text-soil-500">Daily outlook</span></div>
        <div className="grid grid-cols-5 gap-1.5">
          {nextFive.map((day,index)=>{
            const dayWeather=getWeatherDetails(day.weatherCode); const Icon=dayWeather.icon;
            const weekday=index===0?'Today':new Date(day.date).toLocaleDateString('en-US',{weekday:'short'});
            return <div key={day.date} className={`min-w-0 rounded-xl border p-2 text-center ${index===0?'border-[#b7c9b1] bg-[#e9efe2]':'border-[#e4dac7] bg-[#faf7ef]'}`}>
              <div className="text-[10px] font-bold text-soil-700">{weekday}</div>
              <Icon className="mx-auto my-2 h-5 w-5 text-[#6e9bb1]"/>
              <div className="text-[10px] font-bold text-soil-900">{Math.round(day.maxTemp)}°/{Math.round(day.minTemp)}°</div>
              <div className="mt-1 flex items-center justify-center gap-0.5 text-[9px] text-[#5686a0]"><Droplets className="h-2.5 w-2.5"/>{Math.round(day.precipitationProbability)}%</div>
            </div>;
          })}
        </div>
      </section>

      <section>
        <div className="mb-2"><h2 className="text-sm font-bold text-soil-900">Farming decisions</h2><p className="text-[10px] text-soil-500 mt-0.5">Weather-based guidance for your {cropName} farm</p></div>
        <div className="flex flex-col gap-2">
          {decisions.map((item,index)=>{const Icon=item.icon;return <article key={item.title} className="flex items-center gap-3 rounded-xl border border-[#e4dac7] bg-[#faf7ef] p-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${index===1?'bg-[#f7ead5] text-[#b47735]':'bg-[#e7eddf] text-[#285b40]'}`}><Icon className="h-5 w-5"/></div>
            <div className="min-w-0 flex-1"><h3 className="text-xs font-bold text-soil-900">{item.title}</h3><p className="text-[11px] leading-relaxed text-soil-700 mt-0.5">{item.body}</p><p className="text-[9px] text-soil-400 mt-1">{item.meta}</p></div>
            <ChevronRight className="h-4 w-4 shrink-0 text-soil-400"/>
          </article>})}
        </div>
      </section>

      <section className="rounded-xl border border-[#dce2d5] bg-[#edf1e8] p-3">
        <div className="flex items-center gap-2"><Plant className="h-4 w-4 text-leaf-700"/><h3 className="text-xs font-bold text-soil-900">{cropName} crop advice</h3></div>
        <p className="mt-1 text-[11px] leading-relaxed text-soil-700">{advice.growthAdvisory}</p>
        {onAskKato&&<button onClick={onAskKato} className="mt-3 flex items-center gap-1 text-xs font-bold text-leaf-700">Ask Kato about your farm <ChevronRight className="h-3.5 w-3.5"/></button>}
      </section>
    </div>
  );
}
