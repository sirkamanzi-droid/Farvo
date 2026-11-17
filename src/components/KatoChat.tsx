import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowUp, Bot, Check, ChevronDown, Clock3, Leaf, Loader2,
  Menu, MessageCircle, MoreHorizontal, Plus, Search, Sprout, Trash2, X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { District, WeatherData } from '../types';

type Conversation = {
  id: string;
  title: string;
  district_name: string | null;
  crop_name: string | null;
  created_at: string;
  updated_at: string;
};
type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
};

interface KatoChatProps {
  userId: string;
  district: District;
  cropName: string;
  weatherData: WeatherData | null;
  initialQuestion?: string | null;
  onInitialQuestionHandled?: () => void;
}

function timeLabel(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function dateLabel(value: string) {
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

export default function KatoChat({ userId, district, cropName, weatherData, initialQuestion, onInitialQuestionHandled }: KatoChatProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastInitialQuestion = useRef<string | null>(null);

  const loadConversations = useCallback(async () => {
    const { data, error: queryError } = await supabase
      .from('kato_conversations')
      .select('id,title,district_name,crop_name,created_at,updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(60);
    if (queryError) throw queryError;
    const rows = (data || []) as Conversation[];
    setConversations(rows);
    return rows;
  }, [userId]);

  const loadMessages = useCallback(async (conversationId: string) => {
    const { data, error: queryError } = await supabase
      .from('kato_messages')
      .select('id,role,content,created_at')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(250);
    if (queryError) throw queryError;
    setMessages((data || []) as ChatMessage[]);
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingHistory(true);
      try {
        const rows = await loadConversations();
        if (cancelled) return;
        if (rows.length && !initialQuestion?.trim()) {
          setActiveId(rows[0].id);
          await loadMessages(rows[0].id);
        } else {
          setActiveId(null);
          setMessages([]);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load saved chats.');
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    })();
    return () => { cancelled = true; };
  }, [loadConversations, loadMessages, initialQuestion]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sending]);

  const startNewChat = () => {
    setActiveId(null);
    setMessages([]);
    setInput('');
    setError('');
    setHistoryOpen(false);
  };

  const openConversation = async (conversation: Conversation) => {
    setActiveId(conversation.id);
    setHistoryOpen(false);
    setError('');
    try { await loadMessages(conversation.id); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not open this conversation.'); }
  };

  const sendMessage = async (event?: React.FormEvent, preset?: string) => {
    event?.preventDefault();
    const question = (preset ?? input).trim();
    if (!question || sending) return;
    setError('');
    setInput('');
    setSending(true);
    let streamedAnswer = '';

    const now = new Date().toISOString();
    const optimisticUser: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: question, created_at: now };
    const history = [...messages, optimisticUser];
    setMessages(history);

    try {
      let conversationId = activeId;
      if (!conversationId) {
        const title = question.length > 58 ? question.slice(0, 55).trimEnd() + '…' : question;
        const { data: created, error: createError } = await supabase
          .from('kato_conversations')
          .insert({ user_id: userId, title, district_name: district.name, crop_name: cropName })
          .select('id,title,district_name,crop_name,created_at,updated_at')
          .single();
        if (createError) throw createError;
        conversationId = created.id;
        setActiveId(conversationId);
      }

      const { error: saveUserError } = await supabase.from('kato_messages').insert({
        conversation_id: conversationId, user_id: userId, role: 'user', content: question,
      });
      if (saveUserError) throw saveUserError;
      // Do not reload the entire chat list before the AI request. The farmer's
      // message is already safely stored; update the list after the answer arrives.
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (sessionError || !token) throw new Error('Your session has expired. Please sign in again.');

      setStreamingText('');
      const controller = new AbortController();
      const requestTimeout = window.setTimeout(() => controller.abort(), 30000);
      let response: Response;
      try {
        response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          signal: controller.signal,
          body: JSON.stringify({
            messages: history.slice(-12).map(({ role, content }) => ({ role, content })),
            districtName: district.name,
            cropName,
            weatherContext: weatherData ? { current: weatherData.current, daily: weatherData.daily.slice(0, 5) } : null,
          }),
        });
        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(typeof result.error === 'string' ? result.error : 'Kato is temporarily unavailable. Try again.');
        }
        if (!response.body) throw new Error('Your browser could not receive Kato’s live response. Please try again.');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let answer = '';
        let completed = false;
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (!line.trim()) continue;
            const event = JSON.parse(line) as { text?: string; content?: string; done?: boolean; error?: string };
            if (event.error) throw new Error(event.error);
            if (typeof event.text === 'string' && event.text) {
              answer += event.text;
              streamedAnswer = answer;
              setStreamingText(answer);
            }
            if (event.done) completed = true;
          }
        }
        buffer += decoder.decode();
        if (buffer.trim()) {
          const event = JSON.parse(buffer) as { text?: string; content?: string; done?: boolean; error?: string };
          if (event.error) throw new Error(event.error);
          if (typeof event.text === 'string' && event.text) {
            answer += event.text;
            streamedAnswer = answer;
            setStreamingText(answer);
          }
          if (event.done) completed = true;
        }
        if (!completed || !answer.trim()) throw new Error('Kato’s response was interrupted. Your question is saved—please retry.');
      } finally {
        window.clearTimeout(requestTimeout);
      }
      const answer = streamedAnswer.trim();

      const { data: savedAnswer, error: saveAnswerError } = await supabase
        .from('kato_messages')
        .insert({ conversation_id: conversationId, user_id: userId, role: 'assistant', content: answer })
        .select('id,role,content,created_at')
        .single();
      if (saveAnswerError) throw saveAnswerError;

      setMessages(prev => [...prev, savedAnswer as ChatMessage]);
      await Promise.all([
        supabase.from('kato_conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId),
        loadConversations(),
      ]);
    } catch (err) {
      const timedOut = err instanceof Error && (err.name === 'AbortError' || err.name.toLowerCase().includes('timeout'));
      setStreamingText('');
      setError(timedOut
        ? 'Kato is taking too long to respond. Your question is saved—please try again in a moment.'
        : err instanceof Error ? err.message : 'Kato could not reply. Please try again.');
      // Restore the question in the composer so the farmer can retry or edit it.
      setInput(question);
    } finally {
      setStreamingText('');
      setSending(false);
    }
  };

  useEffect(() => {
    const question = initialQuestion?.trim();
    if (!question) { lastInitialQuestion.current = null; return; }
    if (lastInitialQuestion.current === question) return;
    lastInitialQuestion.current = question;
    if (activeId) {
      startNewChat();
    }
    void sendMessage(undefined, question);
    onInitialQuestionHandled?.();
  }, [initialQuestion]);

  const deleteConversation = async (id: string) => {
    const { error: deleteError } = await supabase.from('kato_conversations').delete().eq('id', id).eq('user_id', userId);
    if (deleteError) { setError('Could not delete this chat. Please try again.'); return; }
    const remaining = conversations.filter(item => item.id !== id);
    setConversations(remaining);
    if (activeId === id) {
      if (remaining[0]) await openConversation(remaining[0]);
      else startNewChat();
    }
  };

  const filteredConversations = useMemo(() => conversations.filter(item => item.title.toLowerCase().includes(search.toLowerCase())), [conversations, search]);
  const activeConversation = conversations.find(item => item.id === activeId);

  return (
    <div className="min-h-[calc(100vh-138px)] bg-[#f2ecdf] flex flex-col">
      <header className="sticky top-0 z-20 border-b border-[#ded5c3] bg-[#faf7ef]/95 backdrop-blur px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button onClick={() => setHistoryOpen(v => !v)} className="lg:hidden rounded-xl p-2 text-[#285b40] hover:bg-[#e7eddf]" aria-label="Open chat history"><Menu className="h-5 w-5"/></button>
            <div className="h-10 w-10 rounded-2xl bg-[#174432] flex items-center justify-center text-white"><Sprout className="h-5 w-5"/></div>
            <div className="min-w-0"><h1 className="font-bold text-lg text-[#1d2d27]" style={{fontFamily:'Fraunces, Georgia, serif'}}>Kato</h1><p className="text-[10px] text-[#52645a] truncate">Your Omulimi farm advisor · {district.name}</p></div>
          </div>
          <button onClick={startNewChat} className="inline-flex items-center gap-2 rounded-xl bg-[#174432] px-3.5 py-2.5 text-xs font-bold text-white hover:bg-[#285b40]"><Plus className="h-4 w-4"/>New chat</button>
        </div>
      </header>

      <div className="relative flex-1 w-full max-w-6xl mx-auto lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-4 lg:p-4">
        {historyOpen && <button className="fixed inset-0 z-30 bg-[#1d2d27]/35 lg:hidden" onClick={() => setHistoryOpen(false)} aria-label="Close history"/>}
        <aside className={`fixed inset-y-0 left-0 z-40 w-[min(84vw,320px)] bg-[#faf7ef] border-r border-[#ded5c3] p-3 transition-transform lg:static lg:z-auto lg:w-auto lg:translate-x-0 lg:rounded-2xl lg:border lg:h-[calc(100vh-190px)] lg:sticky lg:top-20 ${historyOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
          <div className="flex items-center justify-between mb-3 lg:hidden"><span className="font-bold text-sm text-[#1d2d27]">Chat history</span><button onClick={() => setHistoryOpen(false)} className="p-2"><X className="h-4 w-4"/></button></div>
          <button onClick={startNewChat} className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#cdd9c8] bg-[#e7eddf] text-[#174432] py-3 text-xs font-bold"><Plus className="h-4 w-4"/>Start a new conversation</button>
          <div className="relative mt-3 mb-2"><Search className="absolute left-3 top-2.5 h-4 w-4 text-[#879188]"/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search your chats" className="w-full rounded-xl border border-[#e6dece] bg-white pl-9 pr-3 py-2.5 text-xs outline-none focus:border-[#719579]"/></div>
          <div className="flex items-center justify-between px-1 py-2"><span className="text-[10px] font-bold uppercase tracking-wider text-[#879188]">Recent conversations</span><span className="text-[10px] text-[#879188]">{filteredConversations.length}</span></div>
          <div className="overflow-y-auto max-h-[calc(100%-125px)] space-y-1">
            {loadingHistory && <div className="flex items-center gap-2 p-3 text-xs text-[#52645a]"><Loader2 className="h-4 w-4 animate-spin"/>Loading saved chats…</div>}
            {!loadingHistory && filteredConversations.length === 0 && <p className="p-3 text-xs leading-relaxed text-[#879188]">Your saved conversations will appear here.</p>}
            {filteredConversations.map(item => <div key={item.id} className={`group flex items-center gap-1 rounded-xl ${activeId===item.id?'bg-[#e7eddf]':'hover:bg-[#f2ecdf]'}`}>
              <button onClick={() => void openConversation(item)} className="flex-1 min-w-0 text-left px-3 py-2.5"><span className="block truncate text-xs font-semibold text-[#1d2d27]">{item.title}</span><span className="block mt-1 text-[9px] text-[#879188]">{dateLabel(item.updated_at)}</span></button>
              <button onClick={() => void deleteConversation(item.id)} aria-label="Delete conversation" className="p-2 mr-1 rounded-lg text-[#879188] hover:text-[#a94d2e] hover:bg-white"><Trash2 className="h-3.5 w-3.5"/></button>
            </div>)}
          </div>
        </aside>

        <section className="min-w-0 flex flex-col min-h-[calc(100vh-138px)] lg:min-h-0 lg:h-[calc(100vh-170px)] lg:rounded-2xl lg:border lg:border-[#ded5c3] lg:bg-[#faf7ef] overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[#e6dece] bg-[#faf7ef]">
            <div className="min-w-0"><p className="text-xs font-bold text-[#1d2d27] truncate">{activeConversation?.title || 'New conversation'}</p><p className="text-[10px] text-[#879188] mt-0.5">{cropName} · {district.name} District</p></div>
            <div className="flex items-center gap-1 text-[10px] text-[#52645a]"><span className="h-2 w-2 rounded-full bg-[#719579]"/>Ready to help</div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 space-y-5">
            {messages.length === 0 && !loadingHistory && <div className="max-w-xl mx-auto pt-8 sm:pt-16 text-center">
              <div className="mx-auto h-16 w-16 rounded-[22px] bg-[#e7eddf] flex items-center justify-center"><Sprout className="h-8 w-8 text-[#174432]"/></div>
              <p className="mt-5 text-xs font-bold uppercase tracking-[.18em] text-[#719579]">Omulimi farm intelligence</p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-[#1d2d27]" style={{fontFamily:'Fraunces, Georgia, serif'}}>What’s happening on your farm?</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#52645a]">Ask Kato about crop care, pests, soil, planting, harvesting or the weather in your district.</p>
              <div className="mt-6 grid sm:grid-cols-2 gap-2 text-left">
                {[`How should I care for my ${cropName} this week?`,'How can I recognise common crop diseases?','When is a good time to plant?','How can I improve my soil?'].map(prompt => <button key={prompt} onClick={() => void sendMessage(undefined,prompt)} className="rounded-xl border border-[#e6dece] bg-white p-3 text-xs text-[#285b40] hover:border-[#719579] hover:bg-[#f7f4eb]">{prompt}<ArrowUp className="inline h-3.5 w-3.5 ml-1 rotate-45"/></button>)}
              </div>
            </div>}
            {messages.map(message => <div key={message.id} className={`flex gap-3 max-w-3xl ${message.role==='user'?'ml-auto flex-row-reverse':'mr-auto'}`}>
              <div className={`h-8 w-8 rounded-xl shrink-0 flex items-center justify-center ${message.role==='user'?'bg-[#d7a442] text-[#1d2d27]':'bg-[#174432] text-white'}`}>{message.role==='user'?<MessageCircle className="h-4 w-4"/>:<Sprout className="h-4 w-4"/>}</div>
              <div className={`max-w-[88%] sm:max-w-[80%] ${message.role==='user'?'text-right':''}`}>
                <div className={`rounded-2xl px-4 py-3 text-sm leading-7 whitespace-pre-wrap ${message.role==='user'?'bg-[#174432] text-white rounded-tr-sm':'bg-white border border-[#e6dece] text-[#1d2d27] rounded-tl-sm'}`}>{message.content}</div>
                <p className="mt-1 px-1 text-[9px] text-[#879188]">{timeLabel(message.created_at)}</p>
              </div>
            </div>)}
            {sending && <div className="flex gap-3 max-w-3xl mr-auto"><div className="h-8 w-8 rounded-xl bg-[#174432] text-white flex items-center justify-center shrink-0"><Sprout className="h-4 w-4"/></div><div className="max-w-[88%] rounded-2xl rounded-tl-sm bg-white border border-[#e6dece] px-4 py-3 text-sm leading-7 text-[#1d2d27] whitespace-pre-wrap">{streamingText || <span className="inline-flex items-center gap-2 text-xs text-[#52645a]"><Loader2 className="h-4 w-4 animate-spin"/>Kato is thinking…</span>}{streamingText && <span className="inline-block ml-1 h-4 w-1 animate-pulse bg-[#719579] align-middle"/>}</div></div>}
            <div ref={bottomRef}/>
          </div>

          {error && <div className="mx-4 mb-2 rounded-xl border border-[#e8c8b8] bg-[#fff3e9] px-3 py-2 text-xs text-[#8f3e25]">{error}</div>}
          <form onSubmit={e => void sendMessage(e)} className="border-t border-[#e6dece] bg-[#faf7ef] p-3 sm:p-4">
            <div className="max-w-3xl mx-auto flex items-end gap-2 rounded-2xl border border-[#d8d0c0] bg-white p-2 focus-within:border-[#719579] focus-within:ring-2 focus-within:ring-[#e7eddf]">
              <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => {if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void sendMessage();}}} rows={1} placeholder="Ask Kato anything about your farm…" className="min-h-10 max-h-32 flex-1 resize-y bg-transparent px-2 py-2 text-sm text-[#1d2d27] outline-none placeholder:text-[#9a9f96]" />
              <button type="submit" disabled={!input.trim()||sending} aria-label="Send message" className="h-10 w-10 shrink-0 rounded-xl bg-[#174432] text-white flex items-center justify-center disabled:opacity-40 hover:bg-[#285b40]"><ArrowUp className="h-5 w-5"/></button>
            </div>
            <p className="max-w-3xl mx-auto mt-2 px-1 text-[9px] text-[#879188]">Kato can make mistakes. Check important treatment decisions with a qualified local agricultural adviser.</p>
          </form>
        </section>
      </div>
    </div>
  );
}
