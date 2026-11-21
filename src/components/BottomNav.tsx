import React from 'react';
import { Home, CloudSun, Leaf, Sparkles, User, CalendarCheck } from 'lucide-react';

export type Tab = 'home' | 'weather' | 'disease' | 'cropcare' | 'kato' | 'account';

interface BottomNavProps { active: Tab; onChange: (tab: Tab) => void; }

const TABS: {id:Tab;label:string;icon:React.ElementType}[] = [
  {id:'home',label:'Home',icon:Home},
  {id:'weather',label:'Weather',icon:CloudSun},
  {id:'disease',label:'Crops',icon:Leaf},
  {id:'cropcare',label:'Care',icon:CalendarCheck},
  {id:'kato',label:'Kato',icon:Sparkles},
  {id:'account',label:'Account',icon:User},
];

export default function BottomNav({active,onChange}:BottomNavProps) {
  return (
    <nav aria-label="Main navigation" className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#e4dac7]/80 bg-[#faf7ef]/96 shadow-[0_-8px_28px_rgba(29,45,39,0.05)] backdrop-blur-xl px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom),10px)]">
      <div className="mx-auto flex max-w-3xl items-center justify-around">
        {TABS.map(tab=>{
          const selected=active===tab.id; const Icon=tab.icon;
          return <button key={tab.id} onClick={()=>onChange(tab.id)} aria-current={selected?'page':undefined} className={`flex min-w-[58px] flex-col items-center gap-1 rounded-xl px-3 py-1 transition ${selected?'text-leaf-700':'text-soil-400 hover:text-soil-700'}`}>
            <span className={`flex h-8 w-10 items-center justify-center rounded-xl ${selected?'bg-leaf-100':'bg-transparent'}`}><Icon className="h-5 w-5"/></span>
            <span className={`text-[11px] font-semibold ${selected?'text-leaf-700':'text-soil-500'}`}>{tab.label}</span>
          </button>;
        })}
      </div>
    </nav>
  );
}
