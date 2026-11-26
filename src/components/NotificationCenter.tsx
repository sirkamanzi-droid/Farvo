import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, ArrowLeft, Check, ExternalLink, Loader2, MapPin, ShieldCheck, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

type IntelligenceItem = {
  id: string;
  title: string;
  summary: string | null;
  canonical_url: string;
  category: 'threat' | 'news' | 'opportunity' | 'market' | 'research' | 'environment';
  geography_scope: 'global' | 'national' | 'region' | 'district' | 'local';
  region: string | null;
  district: string | null;
  affected_crops: string[];
  affected_livestock: string[];
  published_at: string | null;
  source_name: string;
  verification_status: 'unverified' | 'corroborating' | 'verified' | 'disputed' | 'expired';
  confidence: number | null;
  expires_at: string | null;
};

type NotificationRow = {
  id: string;
  read_at: string | null;
  created_at: string;
  relevance_reason: string;
  item: IntelligenceItem | null;
  farm: { label: string; district_name: string; village: string | null; parish: string | null; subcounty: string | null } | null;
};

const CATEGORY_LABELS: Record<IntelligenceItem['category'], string> = {
  threat: 'Risk alert',
  news: 'Agricultural news',
  opportunity: 'Farmer opportunity',
  market: 'Market update',
  research: 'Research discovery',
  environment: 'Environmental update',
};

const CATEGORY_STYLES: Record<IntelligenceItem['category'], string> = {
  threat: 'bg-[#f8e5dc] text-[#8c3e27]',
  news: 'bg-[#e6ebf4] text-[#405a83]',
  opportunity: 'bg-[#e4efdf] text-[#285b40]',
  market: 'bg-[#f5ebd2] text-[#80602b]',
  research: 'bg-[#ece5f3] text-[#674c83]',
  environment: 'bg-[#e0eeec] text-[#28635c]',
};

function formatDate(value: string | null | undefined) {
  if (!value) return 'Date not provided';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date not provided' : date.toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function NotificationCenter({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from('farmer_notifications')
      .select('id,read_at,created_at,relevance_reason,item:agri_intelligence_items!farmer_notifications_item_id_fkey(id,title,summary,canonical_url,category,geography_scope,region,district,affected_crops,affected_livestock,published_at,source_name,verification_status,confidence,expires_at),farm:farms!farmer_notifications_farm_id_fkey(label,district_name,village,parish,subcounty)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (queryError) {
      setError('Notifications could not be loaded. Please try again.');
      setRows([]);
    } else {
      setRows((data || []) as unknown as NotificationRow[]);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!open) return;
    void loadNotifications();
  }, [open, loadNotifications]);

  useEffect(() => {
    const requestedId = new URLSearchParams(window.location.search).get('notification');
    if (requestedId) {
      setOpen(true);
      setSelectedId(requestedId);
    }
  }, []);

  const unreadCount = useMemo(() => rows.filter(row => !row.read_at).length, [rows]);
  const selected = rows.find(row => row.id === selectedId) || null;

  const markRead = async (row: NotificationRow) => {
    if (row.read_at) return;
    const readAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('farmer_notifications')
      .update({ read_at: readAt })
      .eq('id', row.id)
      .eq('user_id', userId);
    if (!updateError) setRows(current => current.map(item => item.id === row.id ? { ...item, read_at: readAt } : item));
  };

  const openNotification = (row: NotificationRow) => {
    setSelectedId(row.id);
    void markRead(row);
    const url = new URL(window.location.href);
    url.searchParams.set('notification', row.id);
    window.history.replaceState({}, '', url);
  };

  const close = () => {
    setOpen(false);
    setSelectedId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('notification');
    window.history.replaceState({}, '', url);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setSelectedId(null); }}
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-[#285b40] transition hover:bg-[#e4eadc]"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && <span className="absolute right-0.5 top-0.5 flex min-h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[#b65a3c] px-1 text-[9px] font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#17251f]/35 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-label="Omulimi notifications">
          <button type="button" aria-label="Close notifications" onClick={close} className="absolute inset-0 cursor-default" />
          <section className="relative flex h-full w-full max-w-md flex-col border-l border-[#e6dcc8] bg-[#f8f4eb] shadow-2xl">
            <header className="flex items-center gap-3 border-b border-[#e6dcc8] px-5 py-4">
              {selected && <button type="button" onClick={() => setSelectedId(null)} aria-label="Back to notifications" className="rounded-full p-2 text-[#52645a] hover:bg-[#ece5d8]"><ArrowLeft className="h-4 w-4"/></button>}
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-[#1d2d27]">{selected ? 'Alert details' : 'Your updates'}</h2>
                <p className="text-xs text-[#758078]">{selected ? 'Why this information matters to your farm' : unreadCount ? `${unreadCount} unread update${unreadCount === 1 ? '' : 's'}` : 'Agricultural news, risks and opportunities'}</p>
              </div>
              {!selected && <button type="button" onClick={() => void loadNotifications()} aria-label="Refresh notifications" className="rounded-full p-2 text-[#52645a] hover:bg-[#ece5d8]"><Loader2 className={`h-4 w-4 ${loading ? 'animate-spin' : 'hidden'}`}/><span className={loading ? 'hidden' : 'text-xs font-semibold'}>Refresh</span></button>}
              <button type="button" onClick={close} aria-label="Close" className="rounded-full p-2 text-[#52645a] hover:bg-[#ece5d8]"><X className="h-5 w-5"/></button>
            </header>

            {loading && rows.length === 0 && <div className="flex flex-1 items-center justify-center text-sm text-[#758078]"><Loader2 className="mr-2 h-5 w-5 animate-spin"/>Loading updates…</div>}
            {error && <div role="alert" className="m-5 rounded-xl border border-[#e7c7b9] bg-[#fff0e9] p-4 text-sm text-[#8c3e27]">{error}<button type="button" onClick={() => void loadNotifications()} className="mt-2 block font-semibold underline">Try again</button></div>}

            {!loading && !error && !selected && rows.length === 0 && (
              <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e4eadc]"><Bell className="h-7 w-7 text-[#285b40]"/></div>
                <h3 className="mt-5 text-base font-semibold text-[#1d2d27]">You're all caught up</h3>
                <p className="mt-2 max-w-xs text-sm leading-6 text-[#68756d]">When Omulimi finds reliable agricultural news, risks or opportunities relevant to your registered farms, they'll appear here.</p>
              </div>
            )}

            {!selected && rows.length > 0 && (
              <div className="flex-1 overflow-y-auto p-3">
                {rows.map(row => {
                  const item = row.item;
                  if (!item) return null;
                  return (
                    <button key={row.id} type="button" onClick={() => openNotification(row)} className={`mb-2 w-full rounded-2xl border p-4 text-left transition hover:border-[#b7c6b3] ${row.read_at ? 'border-[#e6dcc8] bg-white/55' : 'border-[#c8d6c2] bg-white'}`}>
                      <div className="flex items-center justify-between gap-3">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${CATEGORY_STYLES[item.category]}`}>{CATEGORY_LABELS[item.category]}</span>
                        {!row.read_at && <span className="h-2 w-2 shrink-0 rounded-full bg-[#b65a3c]"/>}
                      </div>
                      <h3 className="mt-3 text-sm font-semibold leading-5 text-[#1d2d27]">{item.title}</h3>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#68756d]">{item.summary || row.relevance_reason || 'Open to review this update.'}</p>
                      <div className="mt-3 flex items-center justify-between gap-2 text-[10px] text-[#879188]">
                        <span className="truncate">{row.farm?.label || 'Your farm'} · {item.source_name}</span>
                        <span className="shrink-0">{formatDate(item.published_at || row.created_at)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {selected && selected.item && (
              <div className="flex-1 overflow-y-auto p-5">
                <span className={`inline-flex rounded-full px-3 py-1.5 text-[11px] font-bold ${CATEGORY_STYLES[selected.item.category]}`}>{CATEGORY_LABELS[selected.item.category]}</span>
                <h3 className="mt-4 text-xl font-semibold leading-7 text-[#1d2d27]">{selected.item.title}</h3>
                <div className="mt-3 flex items-center gap-2 text-xs text-[#758078]"><MapPin className="h-3.5 w-3.5"/>{selected.item.geography_scope === 'national' ? 'Uganda · National coverage' : [selected.item.region, selected.item.district].filter(Boolean).join(' · ') || 'Geographic coverage not specified'}</div>
                <p className="mt-5 whitespace-pre-line text-sm leading-7 text-[#46564c]">{selected.item.summary || 'No additional summary was provided by the source.'}</p>
                {selected.relevance_reason && <div className="mt-5 rounded-xl border border-[#d9e2d2] bg-[#edf3e9] p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-[#52705a]">Why this reached you</p><p className="mt-1 text-sm leading-6 text-[#405648]">{selected.relevance_reason}</p></div>}
                <div className="mt-5 space-y-2 rounded-xl bg-white/70 p-4 text-xs text-[#68756d]">
                  <p><strong className="text-[#43554a]">Source:</strong> {selected.item.source_name}</p>
                  <p><strong className="text-[#43554a]">Published:</strong> {formatDate(selected.item.published_at)}</p>
                  <p className="flex items-center gap-1.5"><strong className="text-[#43554a]">Verification:</strong> {selected.item.verification_status.replace('_', ' ')} {selected.item.verification_status === 'verified' && <ShieldCheck className="h-3.5 w-3.5 text-[#39734b]"/>}</p>
                  {selected.item.confidence !== null && <p><strong className="text-[#43554a]">Assessment confidence:</strong> {Math.round(selected.item.confidence * 100)}%</p>}
                  {selected.farm && <p><strong className="text-[#43554a]">Matched farm:</strong> {[selected.farm.label, selected.farm.village, selected.farm.parish, selected.farm.subcounty, selected.farm.district_name].filter(Boolean).join(' · ')}</p>}
                  {selected.item.affected_crops.length > 0 && <p><strong className="text-[#43554a]">Crops:</strong> {selected.item.affected_crops.join(', ')}</p>}
                  {selected.item.affected_livestock.length > 0 && <p><strong className="text-[#43554a]">Livestock:</strong> {selected.item.affected_livestock.join(', ')}</p>}
                </div>
                <a href={selected.item.canonical_url} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#174432] px-4 py-3 text-sm font-semibold text-white hover:bg-[#20583f]">Read original source <ExternalLink className="h-4 w-4"/></a>
                <p className="mt-3 text-center text-[10px] leading-4 text-[#879188]">Omulimi's summary is not a substitute for the original source. Check dates and eligibility before acting on opportunities.</p>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
