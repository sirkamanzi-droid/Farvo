import React from 'react';
import { WeatherData, District } from '../types';
import { generateCropAdvice } from '../data/cropAdvisor';
import { Droplets, MapPin, Sprout, Leaf, Wheat, Clock3, Sun } from 'lucide-react';
import WeatherGlyph from './WeatherGlyph';

interface WeatherDashboardProps {
  weatherData: WeatherData;
  district: District;
  cropName?: string;
  onAskKato?: () => void;
}

export function getWeatherDetails(code: number) {
  switch (code) {
    case 0: return { label: 'Clear sky' };
    case 1: case 2: return { label: 'Partly cloudy' };
    case 3: return { label: 'Cloudy' };
    case 45: case 48: return { label: 'Foggy' };
    case 51: case 53: case 55: return { label: 'Light drizzle' };
    case 61: case 63: case 65: case 80: case 81: case 82: return { label: 'Light rain' };
    case 95: case 96: case 99: return { label: 'Thunderstorms' };
    default: return { label: 'Variable conditions' };
  }
}

function formatUpdated(time: string) {
  if (!time) return 'Latest forecast';
  const date = new Date(time);
  return Number.isNaN(date.getTime()) ? 'Latest forecast' : 'Updated ' + date.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
}

export default function WeatherDashboard({ weatherData, district, cropName='Maize', onAskKato }: WeatherDashboardProps) {
  const { current, daily } = weatherData;
  const today = daily[0];
  const nextFive = daily.slice(0,5);
  const details = getWeatherDetails(current.weatherCode);
  const rainProbability = today?.precipitationProbability ?? 0;
  const expectedRain = today?.precipitation ?? 0;
  const adviceCrop = cropName.toLowerCase().includes('potato') ? 'Irish Potatoes' : cropName.toLowerCase().includes('banana') ? 'Matooke (Bananas)' : cropName;
  const advice = generateCropAdvice(district.name, adviceCrop, weatherData).cropAdvisories[0];
  const decisions = [
    {title:'Planting',icon:Sprout,body:advice.plantingAdvisory},
    {title:'Spraying',icon:Droplets,body:rainProbability >= 60 ? 'Rain is likely. Avoid spraying just before rainfall. Check the product label.' : 'Check the forecast and product label before spraying.'},
    {title:'Drying',icon:Sun,body:rainProbability >= 50 ? 'Rain is possible. Dry produce under a covered, well-ventilated area.' : 'A drier window may be available. Keep produce raised and protected.'},
    {title:'Harvesting',icon:Wheat,body:advice.harvestAdvisory}
  ];

  return (
    <div className="px-4 sm:px-6 pb-8 flex flex-col gap-6" id="weather-dashboard-container">
      <section className="rounded-3xl bg-[#174432] p-5 text-white">
        <div className="flex items-center gap-2 text-sm text-white/75"><MapPin className="h-4 w-4"/>{district.name} District</div>
        <div className="mt-5 flex items-center gap-4">
          <WeatherGlyph code={current.weatherCode} size="lg"/>
          <div><p className="text-4xl font-semibold">{Math.round(current.temperature)}°C</p><p className="mt-1 text-sm text-white/80">{details.label}</p></div>
        </div>
        <div className="mt-5 flex items-center justify-between border-t border-white/20 pt-4">
          <div><p className="text-xs text-white/70">Chance of rain</p><p className="mt-1 text-xl font-semibold">{Math.round(rainProbability)}%</p></div>
          <div className="text-right"><p className="text-xs text-white/70">Expected rainfall</p><p className="mt-1 text-xl font-semibold">{expectedRain.toFixed(1)} mm</p></div>
        </div>
        <p className="mt-3 text-[10px] text-white/60"><Clock3 className="mr-1 inline h-3 w-3"/>{formatUpdated(current.time)} · Open-Meteo forecast</p>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-soil-900">Next 5 days</h2>
        <div className="grid grid-cols-5 gap-2">
          {nextFive.map((day,index)=>{
            const weekday=index===0?'Today':new Date(day.date).toLocaleDateString('en-US',{weekday:'short'});
            return <div key={day.date} className={`min-w-0 rounded-2xl p-2 text-center ${index===0?'bg-[#e7eddf]':'bg-[#faf7ef]'}`}>
              <p className="text-[11px] font-semibold text-soil-700">{weekday}</p>
              <div className="my-2 flex justify-center"><WeatherGlyph code={day.weatherCode} size="sm"/></div>
              <p className="text-[10px] font-semibold text-soil-900">{Math.round(day.maxTemp)}°/{Math.round(day.minTemp)}°</p>
              <p className="mt-1 flex items-center justify-center gap-0.5 text-[10px] text-[#5686a0]"><Droplets className="h-3 w-3"/>{Math.round(day.precipitationProbability)}%</p>
            </div>;
          })}
        </div>
      </section>

      <section>
        <div className="mb-3"><h2 className="text-lg font-bold text-soil-900">Farm advice</h2><p className="text-xs text-soil-500">For your {cropName} farm</p></div>
        <div className="divide-y divide-[#e4dac7] rounded-2xl bg-[#faf7ef] px-4">
          {decisions.map(item=>{const Icon=item.icon;return <article key={item.title} className="flex gap-3 py-4">
            <Icon className="mt-0.5 h-5 w-5 shrink-0 text-leaf-700"/>
            <div><h3 className="text-sm font-semibold text-soil-900">{item.title}</h3><p className="mt-1 text-sm leading-relaxed text-soil-700">{item.body}</p></div>
          </article>;})}
        </div>
      </section>

      <section className="rounded-2xl bg-[#e7eddf] p-4">
        <div className="flex items-center gap-2"><Leaf className="h-5 w-5 text-leaf-700"/><h3 className="font-semibold text-soil-900">{cropName} guidance</h3></div>
        <p className="mt-2 text-sm leading-relaxed text-soil-700">{advice.growthAdvisory}</p>
        {onAskKato&&<button onClick={onAskKato} className="mt-3 text-sm font-semibold text-leaf-700">Ask Kato <span aria-hidden="true">→</span></button>}
      </section>
    </div>
  );
}
