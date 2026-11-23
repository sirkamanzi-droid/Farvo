import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, Check, Download, FileText, Play, Search, Wifi, WifiOff } from 'lucide-react';
import { SUPPORTED_CROPS } from '../data/supportedCrops';
import { getCropLesson } from '../data/cropGuides';
import { MAIZE_MANUAL_ANNEXES, MAIZE_MANUAL_MODULES, MAIZE_MANUAL_SOURCE_URL, MAIZE_MANUAL_TOC } from '../data/maizeManual';

type Topic = { id: string; title: string; description: string };
type LessonSection = { heading: string; body: string };
type SavedLesson = { id: string; cropId: string; cropName: string; topicId: string; topicDescription: string; title: string; summary: string; sections: LessonSection[]; savedAt: string };

const TOPICS: Topic[] = [
  { id: 'getting-started', title: 'Getting started', description: 'Understand the crop and plan a growing season.' },
  { id: 'land-preparation', title: 'Land preparation', description: 'Learn what to consider before planting.' },
  { id: 'planting', title: 'Seed and planting', description: 'Explore planting material, timing and establishment.' },
  { id: 'crop-care', title: 'Crop care', description: 'Learn about field care and regular crop checks.' },
  { id: 'pests-diseases', title: 'Pests and diseases', description: 'Recognise problems and learn prevention principles.' },
  { id: 'soil-nutrients', title: 'Soil and nutrients', description: 'Understand soil health and responsible nutrient management.' },
  { id: 'harvest', title: 'Harvest and storage', description: 'Learn about maturity, harvesting and post-harvest handling.' },
];

const MAIZE_TOPICS: Topic[] = MAIZE_MANUAL_TOC.map(module => ({
  id: module.id,
  title: module.title.replace(/^MODULE \\d+:? /, '').replace(/^ANNEXES$/, 'Annexes'),
  description: module.items.length + ' sections · Source manual page ' + module.page
}));

function getTopicsForCrop(cropId: string): Topic[] {
  return cropId === 'maize' ? MAIZE_TOPICS : TOPICS;
}

const DB_NAME = 'omulimi-knowledge';
const STORE_NAME = 'saved-lessons';

function openKnowledgeDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('Offline storage is not supported by this browser.'));
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open offline storage.'));
  });
}

async function readSavedLessons(): Promise<SavedLesson[]> {
  const db = await openKnowledgeDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
    request.onsuccess = () => { db.close(); resolve(request.result as SavedLesson[]); };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

async function saveLessonOffline(lesson: SavedLesson): Promise<void> {
  const db = await openKnowledgeDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(lesson);
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => { db.close(); reject(transaction.error); };
  });
}

async function removeSavedLesson(id: string): Promise<void> {
  const db = await openKnowledgeDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).delete(id);
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => { db.close(); reject(transaction.error); };
  });
}

export default function KnowledgeCentre({ onBack, onAskKato }: { onBack: () => void; onAskKato: (question: string) => void }) {
  const [selectedCrop, setSelectedCrop] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [saved, setSaved] = useState<SavedLesson[]>([]);
  const [query, setQuery] = useState('');
  const [online, setOnline] = useState(navigator.onLine);
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    readSavedLessons().then(setSaved).catch(() => setNotice('Offline storage could not be opened on this device.'));
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);

  const crop = SUPPORTED_CROPS.find(item => item.id === selectedCrop);
  const visibleCrops = useMemo(() => SUPPORTED_CROPS.filter(item => item.name.toLowerCase().includes(query.toLowerCase())), [query]);
  const lessonId = selectedCrop && selectedTopic ? selectedCrop + ':' + selectedTopic.id : '';
  const isSaved = saved.some(item => item.id === lessonId);
  const currentMaizeModule = selectedCrop === 'maize' && selectedTopic ? MAIZE_MANUAL_MODULES.find(module => module.id === selectedTopic.id) : undefined;
  const currentMaizeAnnex = selectedCrop === 'maize' && selectedTopic?.id === 'annexes' ? MAIZE_MANUAL_ANNEXES : undefined;
  const currentLesson = selectedCrop && selectedTopic && selectedCrop !== 'maize' ? getCropLesson(selectedCrop, selectedTopic.id) : undefined;

  const saveCurrentLesson = async () => {
    if (!crop || !selectedTopic) return;
    setSaving(true); setNotice('');
    try {
      const offlineSections: LessonSection[] = currentMaizeModule ? currentMaizeModule.sections.map(section => ({ heading: section.title, body: section.content })) : currentMaizeAnnex ? currentMaizeAnnex.map(section => ({ heading: section.title, body: section.content })) : currentLesson?.sections || [];
      if (!currentLesson && !currentMaizeModule && !currentMaizeAnnex) throw new Error('This lesson is not available yet.');
      const lessonTitle = currentMaizeModule?.title || (currentMaizeAnnex ? 'Maize manual annexes' : currentLesson!.title);
      const lessonSummary = currentMaizeModule?.introduction || (currentMaizeAnnex ? 'Reference annexes for maize production.' : currentLesson!.summary);
      await saveLessonOffline({ id: lessonId, cropId: crop.id, cropName: crop.name, topicId: selectedTopic.id, topicDescription: selectedTopic.description, title: lessonTitle, summary: lessonSummary, sections: offlineSections, savedAt: new Date().toISOString() });
      setSaved(await readSavedLessons());
      setNotice('This lesson is saved on this device.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not save this lesson offline.');
    } finally { setSaving(false); }
  };

  const deleteSaved = async (id: string) => {
    try { await removeSavedLesson(id); setSaved(await readSavedLessons()); }
    catch { setNotice('Could not remove this saved lesson.'); }
  };

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-[#f1ebdc]">
      <div className="mx-auto min-h-full w-full max-w-3xl pb-10">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-[#e4dac7] bg-[#f2ecdf]/95 px-4 py-3 backdrop-blur">
          <button onClick={selectedTopic ? () => setSelectedTopic(null) : selectedCrop ? () => setSelectedCrop(null) : onBack} aria-label="Go back" className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e7eddf] text-[#174432]"><ArrowLeft className="h-5 w-5"/></button>
          <div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#879188]">OMULIMI LEARNING</p><h1 className="truncate text-xl font-semibold text-[#1d2d27]">{selectedTopic ? selectedTopic.title : selectedCrop ? crop?.name : 'Farming Knowledge'}</h1></div>
          <span className={online ? 'flex items-center gap-1 rounded-full bg-[#e7eddf] px-2.5 py-1 text-[10px] font-semibold text-[#285b40]' : 'flex items-center gap-1 rounded-full bg-[#f5ebd2] px-2.5 py-1 text-[10px] font-semibold text-[#8b6531]'}>{online ? <Wifi className="h-3 w-3"/> : <WifiOff className="h-3 w-3"/>}{online ? 'Online' : 'Offline'}</span>
        </header>

        {!selectedCrop && !selectedTopic && <div className="px-4 pt-5 sm:px-6">
          <section className="rounded-[26px] bg-[#174432] p-5 text-white"><div className="flex items-center gap-2 text-[#e8d6a8]"><BookOpen className="h-5 w-5"/><span className="text-xs font-semibold uppercase tracking-wider">Learn at your own pace</span></div><h2 className="mt-3 text-2xl font-semibold">Knowledge for every growing season.</h2><p className="mt-2 max-w-md text-sm leading-6 text-white/75">Choose a crop to explore its lessons.</p></section>
          <div className="my-5 flex items-center gap-2 rounded-2xl border border-[#e4dac7] bg-[#faf7ef] px-3"><Search className="h-4 w-4 text-[#879188]"/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Find a crop" className="w-full bg-transparent py-3 text-sm outline-none"/></div>
          <div className="grid grid-cols-2 gap-3">{visibleCrops.map(item => <button key={item.id} onClick={() => setSelectedCrop(item.id)} className="flex min-h-28 flex-col items-start justify-between rounded-[22px] border border-[#e4dac7] bg-[#faf7ef] p-4 text-left"><span className="text-2xl">{item.emoji}</span><span className="text-sm font-semibold text-[#1d2d27]">{item.name}</span><span className="text-[11px] text-[#879188]">Open learning guide →</span></button>)}</div>
          <section className="mt-6 rounded-2xl border border-[#e4dac7] bg-[#faf7ef] p-4"><div className="flex items-center justify-between"><h2 className="font-semibold text-[#1d2d27]">Saved for offline</h2><span className="rounded-full bg-[#e7eddf] px-2 py-1 text-xs font-semibold text-[#285b40]">{saved.length}</span></div>
            {saved.length === 0 ? <p className="mt-2 text-xs leading-5 text-[#879188]">Lessons you save will appear here and remain on this device.</p> : <div className="mt-3 space-y-2">{saved.map(item => <div key={item.id} className="flex items-center gap-2 rounded-xl bg-white p-3"><FileText className="h-4 w-4 shrink-0 text-[#285b40]"/><span className="min-w-0 flex-1 text-xs font-medium text-[#1d2d27]">{item.title}</span><button onClick={() => { setSelectedCrop(item.cropId); setSelectedTopic(getTopicsForCrop(item.cropId).find(topic => topic.id === item.topicId) || TOPICS[0]); }} className="text-xs font-semibold text-[#285b40]">Open</button><button onClick={() => void deleteSaved(item.id)} className="text-xs text-[#a94d2e]">Remove</button></div>)}</div>}
          </section>
          <p className="mt-4 text-[11px] leading-5 text-[#879188]"></p>
        </div>}

        {selectedCrop && !selectedTopic && <div className="px-4 py-5 sm:px-6">
          <div className="mb-4 rounded-[24px] bg-[#e7eddf] p-5"><p className="text-xs font-semibold text-[#52645a]">CROP LEARNING GUIDE</p><h2 className="mt-1 text-2xl font-semibold text-[#1d2d27]">{crop?.emoji} {crop?.name}</h2><p className="mt-2 text-sm leading-6 text-[#52645a]">Choose a topic.</p></div>
          <div className="space-y-2">{getTopicsForCrop(selectedCrop).map((topic, index) => <button key={topic.id} onClick={() => setSelectedTopic(topic)} className="flex w-full items-center gap-3 rounded-2xl border border-[#e4dac7] bg-[#faf7ef] p-4 text-left"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e7eddf] text-xs font-bold text-[#285b40]">{index + 1}</span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-[#1d2d27]">{topic.title}</span><span className="mt-1 block text-xs leading-5 text-[#879188]">{topic.description}</span></span><span className="text-[#879188]">›</span></button>)}</div>


        </div>}

        {selectedCrop && selectedTopic && <article className="px-4 py-5 sm:px-6">
          <div className="mb-4 rounded-2xl bg-[#e7eddf] p-4"><p className="text-xs font-semibold uppercase tracking-wide text-[#52645a]">{crop?.name} · Crop manual</p><h2 className="mt-1 text-xl font-semibold text-[#1d2d27]">{currentMaizeModule?.title || (currentMaizeAnnex ? 'Maize manual annexes' : currentLesson?.title) || selectedTopic.title}</h2><p className="mt-2 text-sm text-[#52645a]">{currentMaizeModule?.introduction || (currentMaizeAnnex ? 'Reference material and supporting schedules.' : currentLesson?.summary) || selectedTopic.description}</p>{selectedCrop === 'maize' && <a href={MAIZE_MANUAL_SOURCE_URL} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-xl border border-[#cfc3ad] bg-white/70 px-3 py-2 text-xs font-semibold text-[#285b40]">View original MAAIF manual and illustrations ↗</a>}</div>
          <div className="space-y-3">{currentMaizeModule?.sections.map(section => <section key={section.id} className="rounded-2xl border border-[#e4dac7] bg-[#faf7ef] p-4"><h3 className="font-semibold text-[#1d2d27]">{section.title}</h3><p className="mt-2 text-sm leading-6 text-[#52645a]">{section.content}</p></section>)}
            {currentMaizeAnnex?.map(section => <section key={section.id} className="rounded-2xl border border-[#e4dac7] bg-[#faf7ef] p-4"><h3 className="font-semibold text-[#1d2d27]">{section.title}</h3><p className="mt-2 text-sm leading-6 text-[#52645a]">{section.content}</p></section>)}
            {!currentMaizeModule && !currentMaizeAnnex && (currentLesson?.sections || []).map(section => <section key={section.heading} className="rounded-2xl border border-[#e4dac7] bg-[#faf7ef] p-4"><h3 className="font-semibold text-[#1d2d27]">{section.heading}</h3><p className="mt-2 text-sm leading-6 text-[#52645a]">{section.body}</p></section>)}</div>
          <section className="mt-4 rounded-2xl border border-[#e4dac7] bg-[#faf7ef] p-4"><div className="flex items-center gap-2 text-sm font-semibold text-[#1d2d27]"><Play className="h-4 w-4 text-[#285b40]"/>Practical video</div><p className="mt-2 text-xs text-[#879188]">A verified Ugandan demonstration for this lesson will appear here.</p></section>
          <div className="mt-4 rounded-2xl border border-[#e4dac7] bg-white/60 p-4"><p className="text-xs leading-5 text-[#879188]"></p><div className="mt-3 flex flex-wrap gap-2"><button onClick={() => void saveCurrentLesson()} disabled={saving || isSaved} className="flex items-center gap-2 rounded-xl bg-[#174432] px-4 py-3 text-xs font-semibold text-white disabled:opacity-50">{isSaved ? <Check className="h-4 w-4"/> : <Download className="h-4 w-4"/>}{saving ? 'Saving…' : isSaved ? 'Saved offline' : 'Save lesson offline'}</button><button onClick={() => onAskKato('Explain the ' + (currentMaizeModule?.title || selectedTopic.title).toLowerCase() + ' topic for ' + crop?.name + ' on my farm. Use the Omulimi learning manual as context. Keep the advice practical and explain what depends on my location and crop variety.')} className="rounded-xl border border-[#cfc3ad] px-4 py-3 text-xs font-semibold text-[#285b40]">Ask Kato about this</button></div></div>
          {notice && <p role="status" className="mt-3 rounded-xl bg-[#e7eddf] p-3 text-xs text-[#285b40]">{notice}</p>}
        </article>}
      </div>
    </div>
  );
}
