import React from 'react';

export default function WeatherGlyph({ code, size = 'md' }: { code: number; size?: 'sm' | 'md' | 'lg' }) {
  const dimension = size === 'lg' ? 58 : size === 'sm' ? 24 : 38;
  const rainy = [51,53,55,61,63,65,80,81,82].includes(code);
  const storm = [95,96,99].includes(code);
  const fog = [45,48].includes(code);
  const clear = code === 0;
  const partly = [1,2].includes(code);
  const sun = clear || partly;
  return (
    <svg width={dimension} height={dimension} viewBox="0 0 64 64" fill="none" aria-hidden="true" className="shrink-0">
      {sun && <><circle cx="43" cy="19" r="10" fill="#E9B94F"/><g stroke="#E9B94F" strokeWidth="3" strokeLinecap="round"><path d="M43 3v4M43 31v4M27 19h-4M59 19h-4M31.7 7.7l-2.8-2.8M57.1 33.1l-2.8-2.8M54.3 7.7l2.8-2.8"/></g></>}
      {!clear && <><path d="M17 43h31a10 10 0 0 0 0-20 15 15 0 0 0-28-3A11.5 11.5 0 0 0 17 43Z" fill="#DCE8E9" stroke="#6F9BA7" strokeWidth="2.5" strokeLinejoin="round"/><path d="M20 34c2-5 6-7 11-7h12" stroke="#F9FCFA" strokeWidth="2.5" strokeLinecap="round"/></>}
      {clear && <circle cx="32" cy="32" r="17" fill="#E9B94F" stroke="#D69B36" strokeWidth="2.5"/>}
      {rainy && <g stroke="#5595B1" strokeWidth="3.5" strokeLinecap="round"><path d="m22 49-3 6M34 49l-3 6M46 49l-3 6"/></g>}
      {storm && <path d="m34 44-8 12h8l-3 7 13-15h-9l4-4Z" fill="#E7B34D" stroke="#C58B2F" strokeWidth="1.2" strokeLinejoin="round"/>}
      {fog && <g stroke="#8CA6A7" strokeWidth="3" strokeLinecap="round"><path d="M10 49h44M16 56h32"/></g>}
    </svg>
  );
}
