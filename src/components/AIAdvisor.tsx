import React, { useState, useEffect, useRef } from 'react';
import { WeatherData, District, WeatherPrediction, Message } from '../types';
import { 
  Sprout, Sparkles, AlertTriangle, Lightbulb, Check, AlertCircle, Send, Loader2, User, HelpCircle 
} from 'lucide-react';

interface AIAdvisorProps {
  weatherData: WeatherData;
  district: District;
  cropName: string;
}

const REASSURING_MESSAGES = [
  'Kato is analyzing the 7-day soil humidity curves...',
  'Calculating evapotranspiration water-loss indexes...',
  'Evaluating local pest risk thresholds for your crop...',
  'Cross-referencing historical Ugandan seasonal rainfall trends...',
  'Drafting customized planting and harvesting scores...',
];

export default function AIAdvisor({ weatherData, district, cropName }: AIAdvisorProps) {
  const [prediction, setPrediction] = useState<WeatherPrediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);

  // Chat chatbot states
  const [chatMessages, setChatMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Olimu otya! I am Kato, your Ugandan AI Agronomist. I've studied the weather for ${district.name} and your target crop ${cropName}. Ask me any questions about planting timelines, pest control, weeding, or drainage!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Cycle reassuring loading messages
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setLoadingMsgIdx((prev) => (prev + 1) % REASSURING_MESSAGES.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // Fetch AI Prediction when district, crop or weather data changes
  useEffect(() => {
    async function fetchPrediction() {
      setLoading(true);
      setError(null);
      setPrediction(null);
      setLoadingMsgIdx(0);

      // Reset chat welcoming message on crop/district change
      setChatMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `Olimu otya! I am Kato, your Ugandan AI Agronomist. I've studied the weather for ${district.name} and your target crop ${cropName}. Ask me any questions about planting timelines, pest control, weeding, or drainage!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ]);

      try {
        const response = await fetch('/api/predict', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            districtName: district.name,
            cropName,
            weatherData,
          }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to fetch agricultural predictions.');
        }

        const data = await response.json();
        setPrediction(data);
      } catch (err: any) {
        console.error('Error fetching AI advice:', err);
        setError(err.message || 'An error occurred while generating agricultural predictions.');
      } finally {
        setLoading(false);
      }
    }

    fetchPrediction();
  }, [district.id, cropName, weatherData.current.time]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, sendingChat]);

  // Handle chatbot send message
  async function handleSendChat(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim() || sendingChat) return;

    const userMsg: Message = {
      id: Math.random().toString(),
      role: 'user',
      content: chatInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setSendingChat(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...chatMessages, userMsg],
          districtName: district.name,
          cropName,
        }),
      });

      if (!response.ok) {
        throw new Error('Chat failed to respond.');
      }

      const data = await response.json();
      const assistantMsg: Message = {
        id: Math.random().toString(),
        role: 'assistant',
        content: data.content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setChatMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Chatbot error:', err);
      const errorMsg: Message = {
        id: 'error',
        role: 'assistant',
        content: 'I apologize, but I encountered a network issue connection. Please try asking again!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setSendingChat(false);
    }
  }

  // Get score bar color helper
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-600';
    if (score >= 50) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const getPestRiskColor = (risk: string) => {
    switch (risk) {
      case 'High': return 'text-rose-700 bg-rose-50 border-rose-200';
      case 'Medium': return 'text-amber-700 bg-amber-50 border-amber-200';
      default: return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    }
  };

  return (
    <div className="flex flex-col gap-6" id="ai-advisor-container">
      {/* 1. AI Predictions Block */}
      <div className="bg-white rounded-2xl shadow-md border border-emerald-100 p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-100 p-2 rounded-xl">
              <Sprout className="text-emerald-700 h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-1.5">
                AI Agricultural Advisor
                <Sparkles className="text-amber-500 h-4.5 w-4.5 fill-amber-500" />
              </h2>
              <p className="text-xs text-slate-500">
                Weather prediction & farming suitability specifically for <span className="font-semibold text-emerald-600">{cropName}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Loading Skeleton */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 text-center" id="ai-advisor-loading">
            <Loader2 className="h-10 w-10 text-emerald-600 animate-spin mb-4" />
            <p className="font-bold text-slate-700 text-base">Generating Farmers Forecast...</p>
            <p className="text-xs text-slate-400 mt-2 max-w-sm animate-pulse">
              {REASSURING_MESSAGES[loadingMsgIdx]}
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 text-center" id="ai-advisor-error">
            <AlertCircle className="h-10 w-10 text-rose-500 mx-auto mb-3" />
            <h4 className="font-bold text-rose-800 text-sm">Failed to generate AI Advisor Predictions</h4>
            <p className="text-xs text-rose-600 mt-1 max-w-md mx-auto">{error}</p>
            <p className="text-xs text-slate-500 mt-3">Please check your internet connection or double-check that your Gemini API key is configured correctly in Settings.</p>
          </div>
        )}

        {/* AI Predictor Results */}
        {!loading && !error && prediction && (
          <div className="space-y-6" id="ai-predictions-results">
            {/* Summary Banner */}
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4">
              <p className="text-sm font-semibold text-emerald-900 leading-relaxed">
                🌾 {prediction.summary}
              </p>
              <p className="text-xs text-slate-600 mt-2">
                {prediction.weeklyOutlook}
              </p>
            </div>

            {/* Risk Warnings Banner (Only if there are warning triggers) */}
            {prediction.riskAlerts && prediction.riskAlerts.length > 0 && (
              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4">
                <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <AlertTriangle className="h-4.5 w-4.5 text-rose-600" />
                  Meteorological Field Risks & Hazards
                </h4>
                <ul className="space-y-1.5">
                  {prediction.riskAlerts.map((alert, idx) => (
                    <li key={idx} className="text-xs text-rose-700 font-medium flex items-start gap-1.5">
                      <span className="text-rose-500 shrink-0 select-none">•</span>
                      <span>{alert}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Crop Care advisories */}
            {prediction.cropAdvisories && prediction.cropAdvisories[0] && (() => {
              const advisory = prediction.cropAdvisories[0];
              return (
                <div className="space-y-5" id="crop-specific-advisories">
                  {/* Suitability Scores */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Planting Score */}
                    <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Planting Suitability</span>
                        <span className="text-sm font-black text-slate-800">{advisory.plantingScore}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${getScoreColor(advisory.plantingScore)}`} 
                          style={{ width: `${advisory.plantingScore}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                        {advisory.plantingAdvisory}
                      </p>
                    </div>

                    {/* Harvesting Score */}
                    <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Harvest & Drying Suitability</span>
                        <span className="text-sm font-black text-slate-800">{advisory.harvestScore}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${getScoreColor(advisory.harvestScore)}`} 
                          style={{ width: `${advisory.harvestScore}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                        {advisory.harvestAdvisory}
                      </p>
                    </div>
                  </div>

                  {/* Pest/Disease Risk and Irrigation Guide */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Pest Advice */}
                    <div className="border border-slate-100 rounded-2xl p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pest & Disease Threat</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded border ${getPestRiskColor(advisory.pestDiseaseRisk)}`}>
                            {advisory.pestDiseaseRisk} Risk
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {advisory.pestDiseaseAdvisory}
                        </p>
                      </div>
                    </div>

                    {/* Water management */}
                    <div className="border border-slate-100 rounded-2xl p-4 flex flex-col justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                          Soil Hydration & Drainage
                        </span>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {advisory.irrigationGuidance}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Growth stage care */}
                  <div className="border border-emerald-50 rounded-2xl p-4 bg-emerald-50/20">
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block mb-1.5">
                      Weeding, Fertilizer & Canopy Care
                    </span>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {advisory.growthAdvisory}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* General Tactical Tips (Always 3) */}
            <div className="border-t border-slate-100 pt-5">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 mb-3">
                <Lightbulb className="text-amber-500 h-4.5 w-4.5" />
                This Week's Tactical Farming Tips
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {prediction.generalFarmingTips.map((tip, idx) => (
                  <div key={idx} className="bg-amber-50/30 border border-amber-100 rounded-xl p-3 flex gap-2">
                    <div className="bg-amber-500/10 text-amber-700 h-5 w-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                      {idx + 1}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {tip}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Interactive AI Agronomist Chatbot */}
      <div className="bg-white rounded-2xl shadow-md border border-emerald-100 flex flex-col h-[400px] overflow-hidden" id="ai-chatbot-card">
        {/* Chat Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-5 py-4 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="bg-white/10 p-2 rounded-xl text-white">
              <Sprout className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-sm flex items-center gap-1.5">
                Kato (AI Agronomist)
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="text-[10px] text-emerald-100">Ugandan Crop Consultation Expert</div>
            </div>
          </div>
          <HelpCircle className="h-4.5 w-4.5 opacity-70 cursor-help" title="Ask anything about farming under current conditions" />
        </div>

        {/* Chat Messages */}
        <div 
          className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50" 
          id="chat-messages-container"
        >
          {chatMessages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div 
                key={msg.id} 
                className={`flex gap-2.5 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar Icon */}
                <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
                  isUser ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'
                }`}>
                  {isUser ? <User className="h-4 w-4" /> : <Sprout className="h-4 w-4" />}
                </div>

                {/* Message Bubble */}
                <div>
                  <div className={`p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                    isUser 
                      ? 'bg-amber-500 text-white rounded-tr-none' 
                      : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                  }`}>
                    {/* Preserve linebreaks for bullet points */}
                    <p className="whitespace-pre-line">{msg.content}</p>
                  </div>
                  <span className={`text-[9px] text-slate-400 mt-1 block ${isUser ? 'text-right' : 'text-left'}`}>
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Typing Loading State */}
          {sendingChat && (
            <div className="flex gap-2.5 max-w-[85%] mr-auto" id="chat-typing-bubble">
              <div className="h-8 w-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Sprout className="h-4 w-4" />
              </div>
              <div className="bg-white text-slate-700 border border-slate-100 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin text-emerald-600" />
                <span className="text-xs text-slate-400">Kato is typing advice...</span>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Chat Input Field */}
        <form onSubmit={handleSendChat} className="p-3 border-t border-slate-100 bg-white shrink-0 flex gap-2" id="chat-input-form">
          <input
            type="text"
            id="chat-text-input"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            disabled={sendingChat}
            placeholder={`Ask Kato about ${cropName}...`}
            className="flex-1 px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-slate-50 disabled:bg-slate-100"
          />
          <button
            type="submit"
            id="chat-submit-button"
            disabled={!chatInput.trim() || sendingChat}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white p-2.5 rounded-xl transition shadow-sm flex items-center justify-center shrink-0"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
