import FormattedResponse from './FormattedResponse';
import React, { useEffect, useState } from 'react';
import { MessageCircle, Send, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { WeatherData } from '../types';

type Message = { role: 'user' | 'assistant'; content: string };
type Props = {
  planId: string;
  userId: string;
  cropName: string;
  districtName: string;
  issueName: string;
  observations: string;
  confidence: number;
  weatherData: WeatherData | null;
  weatherDistrictName: string | null;
};

export default function DiagnosisKatoPanel(props: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error: readError } = await supabase.from('crop_care_plans')
        .select('care_plan').eq('id', props.planId).eq('user_id', props.userId).single();
      if (!alive) return;
      if (readError) setError('Could not load this plant’s saved Kato conversation.');
      else {
        const carePlan = (data?.care_plan || {}) as Record<string, unknown>;
        const saved = carePlan.kato_conversation;
        if (Array.isArray(saved)) setMessages(saved.filter((m): m is Message =>
          !!m && typeof m === 'object' &&
          ((m as Message).role === 'user' || (m as Message).role === 'assistant') &&
          typeof (m as Message).content === 'string'
        ));
        else if (typeof carePlan.kato_guidance === 'string' && carePlan.kato_guidance.trim()) {
          setMessages([{ role: 'assistant', content: carePlan.kato_guidance }]);
        }
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [props.planId, props.userId]);

  const saveMessages = async (next: Message[]) => {
    const { data, error: readError } = await supabase.from('crop_care_plans')
      .select('care_plan').eq('id', props.planId).eq('user_id', props.userId).single();
    if (readError) throw readError;
    const current = (data?.care_plan || {}) as Record<string, unknown>;
    const { error: writeError } = await supabase.from('crop_care_plans')
      .update({ care_plan: { ...current, kato_conversation: next.slice(-24) } })
      .eq('id', props.planId).eq('user_id', props.userId);
    if (writeError) throw writeError;
  };

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const question = draft.trim();
    if (!question || sending) return;
    const next = [...messages, { role: 'user' as const, content: question }].slice(-24);
    setMessages(next); setDraft(''); setSending(true); setError('');
    try {
      await saveMessages(next);
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (sessionError || !token) throw new Error('Please sign in again to speak with Kato.');
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          messages: [{ role: 'user', content: `Diagnosis context for this conversation: Crop: ${props.cropName}. District selected in Omulimi: ${props.districtName}. Possible diagnosis: ${props.issueName} (unconfirmed). Image-service match score: ${props.confidence}% (not diagnostic accuracy). Scan observations: ${props.observations}. Keep this diagnosis context in mind when answering the farmer's following message.` }, ...next.slice(-11)],
          cropName: props.cropName,
          districtName: props.districtName,
          weatherContext: props.weatherData,
          weatherDistrictName: props.weatherDistrictName,
        }),
      });
      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => ({}));
        throw new Error(typeof body.error === 'string' ? body.error : 'Kato is unavailable. Please try again.');
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let answer = '';
      const consume = (line: string) => {
        if (!line.trim()) return;
        const event = JSON.parse(line) as { text?: string; error?: string };
        if (event.error) throw new Error(event.error);
        if (typeof event.text === 'string') answer += event.text;
      };
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || '';
        lines.forEach(consume);
      }
      buffer += decoder.decode();
      if (buffer.trim()) consume(buffer);
      if (!answer.trim()) throw new Error('Kato returned an empty answer. Please try again.');
      const completed = [...next, { role: 'assistant' as const, content: answer.trim() }].slice(-24);
      setMessages(completed);
      await saveMessages(completed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kato could not answer right now.');
    } finally { setSending(false); }
  };

  return <section className="overflow-hidden rounded-2xl border border-[#dce5d8] bg-white">
    <button type="button" onClick={() => setOpen(v => !v)} className="flex w-full items-center gap-3 p-4 text-left">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e7eddf] text-[#285b40]"><MessageCircle className="h-5 w-5"/></span>
      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-[#1d2d27]">Ask Kato about this plant</span><span className="mt-0.5 block text-xs text-[#718074]">A private conversation saved to this diagnosis</span></span>
      {open ? <ChevronUp className="h-4 w-4 text-[#718074]"/> : <ChevronDown className="h-4 w-4 text-[#718074]"/>}
    </button>
    {open && <div className="border-t border-[#edf0e9] p-3">
      {loading ? <div className="py-5 text-center text-xs text-[#718074]">Loading your conversation…</div> :
        <div className="mb-3 max-h-64 space-y-2 overflow-y-auto">
          {messages.length === 0 && <p className="rounded-xl bg-[#f4f6f0] p-3 text-xs leading-relaxed text-[#617064]">Ask anything about this scan. Kato knows the crop, possible diagnosis and selected farm district.</p>}
          {messages.map((message, index) => <div key={index} className={`max-w-[90%] rounded-2xl px-3 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${message.role === 'user' ? 'ml-auto bg-[#174432] text-white' : 'bg-[#f2f5ee] text-[#263b2d]'}`}>{message.role === 'assistant' ? <FormattedResponse content={message.content}/> : message.content}</div>)}
          {sending && <div className="flex items-center gap-2 text-xs text-[#718074]"><Loader2 className="h-3.5 w-3.5 animate-spin"/>Kato is thinking…</div>}
        </div>}
      {error && <p role="alert" className="mb-2 text-xs text-[#a34e32]">{error}</p>}
      <form onSubmit={send} className="flex items-center gap-2">
        <input value={draft} onChange={e => setDraft(e.target.value)} disabled={loading || sending} placeholder="Ask about this plant…" className="min-w-0 flex-1 rounded-xl bg-[#f4f6f0] px-3 py-3 text-sm text-[#1d2d27] outline-none focus:ring-2 focus:ring-[#9eb39a]"/>
        <button type="submit" disabled={!draft.trim() || loading || sending} aria-label="Send to Kato" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#174432] text-white disabled:opacity-40"><Send className="h-4 w-4"/></button>
      </form>
    </div>}
  </section>;
}
