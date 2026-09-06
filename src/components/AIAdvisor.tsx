import React, { useState, useEffect, useRef } from 'react';
import { WeatherData, District, WeatherPrediction, Message } from '../types';
import { generateCropAdvice } from '../data/cropAdvisor';
import { Sprout, Sparkles, AlertTriangle, Lightbulb, Send, Loader2, User, ChevronDown, ChevronUp } from 'lucide-react';

interface AIAdvisorProps {
  weatherData: WeatherData;
  district: District;
  cropName: string;
}

export default function AIAdvisor({ weatherData, district, cropName }: AIAdvisorProps) {
  const [prediction, setPrediction] = useState<WeatherPrediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);
  const [advisoryExpanded, setAdvisoryExpanded] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(false);

  const [chatMessages, setChatMessages] = useState<Message[]>([{
    id: 'welcome', role: 'assistant',
    content: `Olimu otya! I am Kato, your Ugandan AI Agronomist. Ask me anything about ${cropName} in ${district.name}.`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }]);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPrediction(null);
    setHasRequested(false);
    setAdvisoryExpanded(false);
    setChatMessages([{
      id: 'welcome', role: 'assistant',
      content: `Olimu otya! I am Kato, your Ugandan AI Agronomist. Ask me anything about ${cropName} in ${district.name}.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }]);
  }, [district.id, cropName]);

  function fetchPrediction() {
    setLoading(true);
    setHasRequested(true);
    setTimeout(() => {
      const result = generateCropAdvice(district.name, cropName, weatherData);
      setPrediction(result);
      setLoading(false);
      setAdvisoryExpanded(true);
    }, 1200);
  }

  async function handleSendChat(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim() || sendingChat) return;
    const userMsg: Message = {
      id: Math.random().toString(), role: 'user', content: chatInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setSendingChat(true);
    setTimeout(() => { chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, 50);
    setTimeout(() => {
      const p = prediction;
      let reply = '';
      const q = chatInput.toLowerCase();
      if (q.includes('plant') || q.includes('when')) {
        reply = p ? `For ${cropName} in ${district.name}: ${p.cropAdvisories[0]?.plantingAdvisory}` : `Click "Get AI Farming Advice" first for planting advice.`;
      } else if (q.includes('pest') || q.includes('disease') || q.includes('spray') || q.includes('yellow') || q.includes('wilt')) {
        reply = p ? `Pest & Disease outlook: ${p.cropAdvisories[0]?.pestDiseaseAdvisory}` : `Get your farming advice first for pest alerts.`;
      } else if (q.includes('harvest')) {
        reply = p ? `Harvest conditions: ${p.cropAdvisories[0]?.harvestAdvisory}` : `Click "Get AI Farming Advice" first for harvest timing.`;
      } else if (q.includes('water') || q.includes('irrigat')) {
        reply = p ? `Water management: ${p.cropAdvisories[0]?.irrigationGuidance}` : `Get your farming advice first for water guidance.`;
      } else if (q.includes('fertiliz') || q.includes('weed') || q.includes('grow')) {
        reply = p ? `Crop care: ${p.cropAdvisories[0]?.growthAdvisory}` : `Click "Get AI Farming Advice" first for crop care tips.`;
      } else if (q.includes('weather') || q.includes('forecast') || q.includes('rain')) {
        reply = p ? p.weeklyOutlook : `Current temperature is ${weatherData.current.temperature}°C in ${district.name}.`;
      } else {
        reply = p ? `${p.summary} Ask me about planting, pests, harvest, water, or fertilizer for more.` : `Click "Get AI Farming Advice" first, then ask me anything about ${cropName}.`;
      }
      setChatMessages((prev) => [...prev, {
        id: Math.random().toString(), role: 'assistant', content: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
      setSendingChat(false);
    }, 800);
  }

  const getScoreColor = (score: number) => (score >= 80 ? 'bg-[#2F5226]' : score >= 50 ? 'bg-gold-500' : 'bg-rose-500');
  const getPestRiskColor = (risk: string) => (risk === 'High' ? 'text-rose-700 bg-rose-50 border-rose-200' : risk === 'Medium' ? 'text-clay-600 bg-gold-100 border-gold-100' : 'text-leaf-600 bg-leaf-100 border-leaf-100');

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-[#3F6B33] rounded-2xl overflow-hidden">
        <button onClick={() => (hasRequested ? setAdvisoryExpanded((s) => !s) : fetchPrediction())} className="w-full flex items-center justify-between p-4 text-left">
          <div className="flex items-center gap-2.5 min-w-0">
            <Sprout className="h-5 w-5 text-leaf-100 shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-parchment-100">Crop advisory</div>
              <div className="text-xs text-leaf-100 truncate">{loading ? 'Calculating...' : prediction ? prediction.summary : `Tap to check ${cropName} conditions`}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {loading && <Loader2 className="h-4 w-4 text-parchment-100 animate-spin" />}
            {prediction?.cropAdvisories[0] && <span className="bg-gold-500 text-soil-900 text-xs font-bold px-2 py-0.5 rounded-lg">{prediction.cropAdvisories[0].plantingScore}%</span>}
            {hasRequested && !loading && (advisoryExpanded ? <ChevronUp className="h-4 w-4 text-parchment-100" /> : <ChevronDown className="h-4 w-4 text-parchment-100" />)}
          </div>
        </button>

        {advisoryExpanded && prediction && (
          <div className="bg-[#F8F4EB] p-5 space-y-5">
            {prediction.riskAlerts.length > 0 && (
              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4">
                <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5 mb-2"><AlertTriangle className="h-4 w-4 text-rose-600" /> Active Field Alerts</h4>
                <ul className="space-y-1.5">{prediction.riskAlerts.map((alert, idx) => (<li key={idx} className="text-xs text-rose-700 flex items-start gap-1.5"><span className="shrink-0">•</span><span>{alert}</span></li>))}</ul>
              </div>
            )}
            {prediction.cropAdvisories[0] && (() => {
              const a = prediction.cropAdvisories[0];
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[{ label: 'Planting Suitability', score: a.plantingScore, text: a.plantingAdvisory }, { label: 'Harvest & Drying', score: a.harvestScore, text: a.harvestAdvisory }].map((item) => (
                      <div key={item.label} className="border border-parchment-100 rounded-2xl p-4 bg-parchment-50/50">
                        <div className="flex justify-between items-center mb-1.5"><span className="text-xs font-bold text-soil-400 uppercase tracking-wider">{item.label}</span><span className="text-sm font-black text-[#2B1B12]">{item.score}%</span></div>
                        <div className="w-full bg-parchment-200 h-2.5 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-700 ${getScoreColor(item.score)}`} style={{ width: `${item.score}%` }} /></div>
                        <p className="text-xs text-[#5C4030] mt-2.5 leading-relaxed">{item.text}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="border border-parchment-100 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-2"><span className="text-xs font-bold text-soil-400 uppercase tracking-wider">Pest & Disease</span><span className={`text-xs font-bold px-2 py-0.5 rounded border ${getPestRiskColor(a.pestDiseaseRisk)}`}>{a.pestDiseaseRisk} Risk</span></div>
                      <p className="text-xs text-[#5C4030] leading-relaxed">{a.pestDiseaseAdvisory}</p>
                    </div>
                    <div className="border border-parchment-100 rounded-2xl p-4"><span className="text-xs font-bold text-soil-400 uppercase tracking-wider block mb-2">Soil & Drainage</span><p className="text-xs text-[#5C4030] leading-relaxed">{a.irrigationGuidance}</p></div>
                  </div>
                  <div className="border border-leaf-100 rounded-2xl p-4 bg-leaf-100/20"><span className="text-xs font-bold text-leaf-700 uppercase tracking-wider block mb-1.5">Crop Care & Fertilizer</span><p className="text-xs text-[#5C4030] leading-relaxed">{a.growthAdvisory}</p></div>
                </div>
              );
            })()}
            <div className="border-t border-parchment-100 pt-4">
              <h4 className="text-sm font-bold text-[#2B1B12] flex items-center gap-1.5 mb-3"><Lightbulb className="text-gold-500 h-4 w-4" /> This Week's Tactical Tips</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {prediction.generalFarmingTips.map((tip, idx) => (
                  <div key={idx} className="bg-gold-100/30 border border-gold-100 rounded-xl p-3 flex gap-2">
                    <div className="bg-gold-500/10 text-clay-600 h-5 w-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold">{idx + 1}</div>
                    <p className="text-xs text-[#5C4030] leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-[#2B1B12] rounded-2xl overflow-hidden">
        {!chatExpanded ? (
          <button onClick={() => setChatExpanded(true)} className="w-full flex items-center gap-2.5 p-3.5">
            <div className="h-7 w-7 rounded-full bg-gold-500 flex items-center justify-center shrink-0"><Sparkles className="h-3.5 w-3.5 text-soil-900" /></div>
            <span className="flex-1 text-left text-xs text-soil-400">Ask Kato about {cropName}...</span>
            <Send className="h-4 w-4 text-gold-500" />
          </button>
        ) : (
          <div className="flex flex-col h-[400px]">
            <button onClick={() => setChatExpanded(false)} className="flex items-center justify-between px-4 py-3 bg-leaf-600 shrink-0">
              <div className="flex items-center gap-2"><Sprout className="h-4 w-4 text-white" /><span className="text-sm font-bold text-white">Kato (AI Agronomist)</span><span className="h-2 w-2 rounded-full bg-leaf-400 animate-pulse" /></div>
              <ChevronUp className="h-4 w-4 text-white" />
            </button>
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-parchment-50/50">
              {chatMessages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div key={msg.id} className={`flex gap-2.5 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
                    <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${isUser ? 'bg-gold-500 text-white' : 'bg-[#2F5226] text-white'}`}>{isUser ? <User className="h-4 w-4" /> : <Sprout className="h-4 w-4" />}</div>
                    <div>
                      <div className={`p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${isUser ? 'bg-gold-500 text-white rounded-tr-none' : 'bg-[#F8F4EB] text-soil-900 border border-parchment-100 rounded-tl-none'}`}><p className="whitespace-pre-line">{msg.content}</p></div>
                      <span className={`text-[9px] text-soil-400 mt-1 block ${isUser ? 'text-right' : 'text-left'}`}>{msg.timestamp}</span>
                    </div>
                  </div>
                );
              })}
              {sendingChat && (
                <div className="flex gap-2.5 max-w-[85%] mr-auto">
                  <div className="h-8 w-8 rounded-xl bg-[#2F5226] text-white flex items-center justify-center shrink-0"><Sprout className="h-4 w-4" /></div>
                  <div className="bg-[#F8F4EB] border border-parchment-100 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin text-[#2F5226]" /><span className="text-xs text-soil-400">Kato is typing...</span></div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>
            <form onSubmit={handleSendChat} className="p-3 border-t border-parchment-100 bg-[#F8F4EB] shrink-0 flex gap-2">
              <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} disabled={sendingChat} placeholder={`Ask Kato about ${cropName}...`} className="flex-1 px-3.5 py-2 border border-[#D8C9B0] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-leaf-600 bg-parchment-50 disabled:bg-parchment-100" />
              <button type="submit" disabled={!chatInput.trim() || sendingChat} className="bg-[#2F5226] hover:bg-[#24401D] disabled:bg-parchment-200 text-white p-2.5 rounded-xl transition flex items-center justify-center shrink-0"><Send className="h-4 w-4" /></button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
