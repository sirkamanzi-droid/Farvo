import React from 'react';
import { LucideIcon, ArrowLeft, Bell } from 'lucide-react';

interface ComingSoonProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onBack: () => void;
}

export default function ComingSoon({ icon: Icon, title, description, onBack }: ComingSoonProps) {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6 py-12">
      <div className="bg-leaf-100 h-16 w-16 rounded-2xl flex items-center justify-center mb-5">
        <Icon className="h-8 w-8 text-leaf-600" />
      </div>
      <h2 className="text-xl font-bold text-soil-900 mb-2">{title}</h2>
      <p className="text-sm text-soil-400 max-w-xs leading-relaxed mb-6">{description}</p>
      <a
        href="https://wa.me/000000000000?text=Notify%20me%20when%20this%20launches%20on%20Farvo"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 bg-gold-500 hover:bg-gold-500/90 text-soil-900 font-semibold text-sm px-5 py-2.5 rounded-xl transition shadow-sm mb-4"
      >
        <Bell className="h-4 w-4" />
        Notify me when this launches
      </a>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-leaf-600 font-medium hover:text-leaf-700">
        <ArrowLeft className="h-4 w-4" />
        Back to what's live
      </button>
    </div>
  );
}
