import React from 'react';
import { CloudSun, Leaf, Beef, Wallet, User, Lock } from 'lucide-react';

export type Tab = 'weather' | 'disease' | 'livestock' | 'records' | 'account';

interface BottomNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const TABS: { id: Tab; label: string; icon: React.ElementType; locked: boolean }[] = [
  { id: 'weather', label: 'Weather', icon: CloudSun, locked: false },
  { id: 'disease', label: 'Disease', icon: Leaf, locked: true },
  { id: 'livestock', label: 'Livestock', icon: Beef, locked: true },
  { id: 'records', label: 'Records', icon: Wallet, locked: true },
  { id: 'account', label: 'Account', icon: User, locked: false },
];

export default function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-parchment-100 border-t border-parchment-200 flex justify-around items-center py-2 pb-3 z-20">
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        const Icon = tab.icon;
        return (
          <button key={tab.id} onClick={() => onChange(tab.id)} className="flex flex-col items-center gap-0.5 relative px-2">
            <Icon className={`h-5 w-5 ${isActive ? 'text-leaf-600' : 'text-soil-400'}`} />
            {tab.locked && (
              <div className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-gold-500 flex items-center justify-center">
                <Lock className="h-2 w-2 text-soil-900" />
              </div>
            )}
            <span className={`text-[10px] font-semibold ${isActive ? 'text-leaf-600' : 'text-soil-400'}`}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
