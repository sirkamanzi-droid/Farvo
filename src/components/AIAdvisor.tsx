import React, { useState, useEffect, useRef } from 'react';
import { WeatherData, District, WeatherPrediction, Message } from '../types';
import { generateCropAdvice } from '../data/cropAdvisor';
import { Sprout, Sparkles, AlertTriangle, Lightbulb, AlertCircle, Send, Loader2, User, HelpCircle } from 'lucide-react';

interface AIAdvisorProps {
  weatherData: WeatherData;
  district: District;
  cropName: string;
}

export default function AIAdvisor({ weatherData, district, cropName }: AIAdvisorProps) {
  const [prediction, setPrediction] = useState<WeatherPrediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([{
    id: 'welcome', role: 'assistant',
    content: `Olimu otya! I am Kato, your Ugandan AI Agronomist. I've analysed the weather for ${district.name} and your target crop ${cropName}. Click "Get AI Farming Advice" above, then ask me any questions!`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }]);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPrediction(null);
    setHasRequested(false);
    setChatMessages([{
      id: 'welcome', role: 'assistant',
      content: `Olimu otya! I am Kato, your Ugandan AI Agronomist. I've analysed the weather for ${district.name} and your target crop ${cropName}. Click "Get AI Farming Advice" above, then ask me any questions!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }]);
  }, [district.id, cropName]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, sendingChat]);

  function fetchPrediction() {
    setLoading(true);
    setHasRequested(true);
    setTimeout(() => {
      const result = generateCropAdvice(district.name, cropName, weatherData);
      setPrediction(result);
      setLoading(false);
    }, 1200);
  }

  async function handleSendChat(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim() || sendingChat) return;
    const userMsg: Message = {
      id: Math.random().toString(), role: 'user', content: chatInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setSendingChat(true);
    setTimeout(() => {
      const p = prediction;
      let reply = '';
      const q = chatInput.toLowerCase();
      if (q.includes('plant') || q.includes('when')) {
        reply = p ? `For ${cropName} in ${district.name}: ${p.cropAdvisories[0]?.plantingAdvisory}` : `Please click "Get AI Farming Advice" first to get your personalised planting advice for ${cropName}.`;
      } else if (q.includes('pest') || q.includes('disease') || q.includes('spray') || q.includes('yellow') || q.includes('wilt') || q.includes('rot') || q.includes('spot') || q.includes('dying') || q.includes('leaves') || q.includes('fungus')) {
        reply = p ? `Pest & Disease outlook: ${p.cropAdvisories[0]?.pestDiseaseAdvisory}` : `Get your farming advice first, then I can give you specific pest alerts for ${cropName}.`;
      } else if (q.includes('harvest') || q.includes('pick') || q.includes('cut')) {
        reply = p ? `Harvest conditions: ${p.cropAdvisories[0]?.harvestAdvisory}` : `Click "Get AI Farming Advice" first for harvest timing advice.`;
      } else if (q.includes('water') || q.includes('irrigat') || q.includes('drain') || q.includes('flood') || q.includes('waterlog') || q.includes('channel')) {
        reply = p ? `Water management: ${p.cropAdvisories[0]?.irrigationGuidance}` : `Get your farming advice first for water management guidance.`;
      } else if (q.includes('fertiliz') || q.includes('weed') || q.includes('grow')) {
        reply = p ? `Crop care: ${p.cropAdvisories[0]?.growthAdvisory}` : `Click "Get AI Farming Advice" first for crop care tips.`;
      } else if (q.includes('weather') || q.includes('forecast') || q.includes('rain')) {
        reply = p ? p.weeklyOutlook : `Current temperature is ${weatherData.current.temperature}°C with ${weatherData.current.relativeHumidity}% humidity in ${district.name}.`;
      } else if (q.includes('tip') || q.includes('advice') || q.includes('help')) {
        reply = p ? `This week's tips for ${cropName}:\n${p.generalFarmingTips.map((t, i) => `${i+1}. ${t}`).join('\n')}` : `Get your farming advice first for this week's tactical tips.`;
      } else {
        reply = p
          ? `Good question about ${cropName} farming in ${district.name}. Based on current conditions — ${weatherData.current.temperature}°C, ${weatherData.current.relativeHumidity}% humidity, soil moisture ${Math.round(weatherData.current.soilMoisture * 100)}% — ${p.summary} Ask me specifically about planting, pests, harvest, water, or fertilizer for more detailed advice.`
          : `I am Kato, your agronomist for ${district.name}. Click "Get AI Farming Advice" first to analyse current conditions, then ask me about planting, pests, harvest timing, irrigation, or fertilizer.`;
      }
      setChatMessages(prev => [...prev, {
        id: Math.random().toString(), role: 'assistant', content: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
      setSendingChat(false);
    }, 800);
  }

  const getScoreColor = (score: number) => score >= 80 ? 'bg-[#2F5226]' : score >= 50 ? 'bg-gold-500' : 'bg-rose-500';
  const getPestRiskColor = (risk: string) => risk === 'High' ? 'text-rose-700 bg-rose-50 border-rose-200' : risk === 'Medium' ? 'text-clay-600 bg-gold-100 border-gold-100' : 'text-leaf-600 bg-leaf-100 border-leaf-100';

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-[#F8F4EB] rounded-2xl shadow-md border border-leaf-100 p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="bg-leaf-100 p-2 rounded-xl"><Sprout className="text-leaf-600 h-5 w-5" /></div>
          <div>
            <h2 className="text-xl font-bold text-[#2B1B12] flex items-center gap-1.5">AI Agricultural Advisor <Sparkles className="text-gold-500 h-4 w-4 fill-gold-500" /></h2>
            <p className="text-xs text-soil-400">Agronomic analysis for <span className="font-semibold text-[#2F5226]">{cropName}</span> in <span className="font-semibold text-[#2F5226]">{district.name}</span></p>
          </div>
        </div>

        {!hasRequested && !loading && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Sprout className="h-12 w-12 text-leaf-100 mb-4" />
            <p className="text-sm font-semibold text-soil-900 mb-1">Ready to analyse {cropName} conditions for {district.name}</p>
            <p className="text-xs text-soil-400 mb-6 max-w-xs">Powered by real meteorological data and crop science algorithms.</p>
            <button onClick={fetchPrediction} className="flex items-center gap-2 bg-[#2F5226] hover:bg-[#24401D] text-white font-bold text-sm px-6 py-3 rounded-xl transition shadow-md">
              <Sparkles className="h-4 w-4" /> Get AI Farming Advice
            </button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Loader2 className="h-10 w-10 text-[#2F5226] animate-spin mb-4" />
            <p className="font-bold text-soil-900">Calculating agronomic scores...</p>
            <p className="text-xs text-soil-400 mt-2 animate-pulse">Applying crop science thresholds to live weather data...</p>
          </div>
        )}

        {!loading && prediction && (
          <div className="space-y-6">
            <div className="bg-leaf-100/50 border border-leaf-100 rounded-2xl p-4">
              <p className="text-sm font-semibold text-leaf-700">🌾 {prediction.summary}</p>
              <p className="text-xs text-[#5C4030] mt-2">{prediction.weeklyOutlook}</p>
            </div>

            {prediction.riskAlerts.length > 0 && (
              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4">
                <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <AlertTriangle className="h-4 w-4 text-rose-600" /> Active Field Alerts
                </h4>
                <ul className="space-y-1.5">
                  {prediction.riskAlerts.map((alert, idx) => (
                    <li key={idx} className="text-xs text-rose-700 flex items-start gap-1.5"><span className="shrink-0">•</span><span>{alert}</span></li>
                  ))}
                </ul>
              </div>
            )}

            {prediction.cropAdvisories[0] && (() => {
              const a = prediction.cropAdvisories[0];
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[{label:'Planting Suitability', score: a.plantingScore, text: a.plantingAdvisory},
                      {label:'Harvest & Drying', score: a.harvestScore, text: a.harvestAdvisory}].map(item => (
                      <div key={item.label} className="border border-parchment-100 rounded-2xl p-4 bg-parchment-50/50">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-xs font-bold text-soil-400 uppercase tracking-wider">{item.label}</span>
                          <span className="text-sm font-black text-[#2B1B12]">{item.score}%</span>
                        </div>
                        <div className="w-full bg-parchment-200 h-2.5 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-700 ${getScoreColor(item.score)}`} style={{ width: `${item.score}%` }} />
                        </div>
                        <p className="text-xs text-[#5C4030] mt-2.5 leading-relaxed">{item.text}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="border border-parchment-100 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-soil-400 uppercase tracking-wider">Pest & Disease</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded border ${getPestRiskColor(a.pestDiseaseRisk)}`}>{a.pestDiseaseRisk} Risk</span>
                      </div>
                      <p className="text-xs text-[#5C4030] leading-relaxed">{a.pestDiseaseAdvisory}</p>
                    </div>
                    <div className="border border-parchment-100 rounded-2xl p-4">
                      <span className="text-xs font-bold text-soil-400 uppercase tracking-wider block mb-2">Soil & Drainage</span>
                      <p className="text-xs text-[#5C4030] leading-relaxed">{a.irrigationGuidance}</p>
                    </div>
                  </div>
                  <div className="border border-leaf-100 rounded-2xl p-4 bg-leaf-100/20">
                    <span className="text-xs font-bold text-leaf-700 uppercase tracking-wider block mb-1.5">Crop Care & Fertilizer</span>
                    <p className="text-xs text-[#5C4030] leading-relaxed">{a.growthAdvisory}</p>
                  </div>
                </div>
              );
            })()}

            <div className="border-t border-parchment-100 pt-5">
              <h4 className="text-sm font-bold text-[#2B1B12] flex items-center gap-1.5 mb-3">
                <Lightbulb className="text-gold-500 h-4 w-4" /> This Week's Tactical Tips
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {prediction.generalFarmingTips.map((tip, idx) => (
                  <div key={idx} className="bg-gold-100/30 border border-gold-100 rounded-xl p-3 flex gap-2">
                    <div className="bg-gold-500/10 text-clay-600 h-5 w-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold">{idx + 1}</div>
                    <p className="text-xs text-[#5C4030] leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button onClick={fetchPrediction} className="text-xs text-leaf-600 hover:text-leaf-700 font-semibold border border-leaf-100 hover:border-leaf-400 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" /> Refresh Analysis
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-[#F8F4EB] rounded-2xl shadow-md border border-leaf-100 flex flex-col h-[400px] overflow-hidden">
        <div className="bg-gradient-to-r from-leaf-600 to-leaf-600 px-5 py-4 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="bg-[#F8F4EB]/10 p-2 rounded-xl"><Sprout className="h-5 w-5" /></div>
            <div>
              <div className="font-bold text-sm flex items-center gap-1.5">Kato (AI Agronomist) <span className="h-2 w-2 rounded-full bg-leaf-400 animate-pulse" /></div>
              <div className="text-[10px] text-leaf-100">Ugandan Crop Consultation Expert</div>
            </div>
          </div>
          <HelpCircle className="h-4 w-4 opacity-70" />
        </div>

        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-parchment-50/50">
          {chatMessages.map(msg => {
            const isUser = msg.role === 'user';
            return (
              <div key={msg.id} className={`flex gap-2.5 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
                <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${isUser ? 'bg-gold-500 text-white' : 'bg-[#2F5226] text-white'}`}>
                  {isUser ? <User className="h-4 w-4" /> : <Sprout className="h-4 w-4" />}
                </div>
                <div>
                  <div className={`p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${isUser ? 'bg-gold-500 text-white rounded-tr-none' : 'bg-[#F8F4EB] text-soil-900 border border-parchment-100 rounded-tl-none'}`}>
                    <p className="whitespace-pre-line">{msg.content}</p>
                  </div>
                  <span className={`text-[9px] text-soil-400 mt-1 block ${isUser ? 'text-right' : 'text-left'}`}>{msg.timestamp}</span>
                </div>
              </div>
            );
          })}
          {sendingChat && (
            <div className="flex gap-2.5 max-w-[85%] mr-auto">
              <div className="h-8 w-8 rounded-xl bg-[#2F5226] text-white flex items-center justify-center shrink-0"><Sprout className="h-4 w-4" /></div>
              <div className="bg-[#F8F4EB] border border-parchment-100 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin text-[#2F5226]" />
                <span className="text-xs text-soil-400">Kato is typing...</span>
              </div>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        <form onSubmit={handleSendChat} className="p-3 border-t border-parchment-100 bg-[#F8F4EB] shrink-0 flex gap-2">
          <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} disabled={sendingChat}
            placeholder={`Ask Kato about ${cropName}...`}
            className="flex-1 px-3.5 py-2 border border-[#D8C9B0] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-leaf-600 bg-parchment-50 disabled:bg-parchment-100" />
          <button type="submit" disabled={!chatInput.trim() || sendingChat}
            className="bg-[#2F5226] hover:bg-[#24401D] disabled:bg-parchment-200 text-white p-2.5 rounded-xl transition flex items-center justify-center shrink-0">
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
