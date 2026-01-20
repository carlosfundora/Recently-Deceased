import React, { useState, useRef } from 'react';
import { Cemetery } from '../types';
import { generateDailyFacts } from '../services/geminiService';
import { Sparkles, Calendar, MapPin, Loader2, ArrowRight } from 'lucide-react';

interface CemeteryOfTheDayProps {
  cemetery: Cemetery;
  onUpdate: (id: string, updates: Partial<Cemetery>) => void;
  onViewDetails: (id: string) => void;
}

export const CemeteryOfTheDay: React.FC<CemeteryOfTheDayProps> = ({ cemetery, onUpdate, onViewDetails }) => {
  const [loading, setLoading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleRevealFacts = async () => {
    setLoading(true);
    const dailyFacts = await generateDailyFacts(cemetery.name);
    onUpdate(cemetery.id, { dailyFacts });
    setLoading(false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      cardRef.current.style.setProperty('--mouse-x', `${x}px`);
      cardRef.current.style.setProperty('--mouse-y', `${y}px`);
    }
  };

  return (
    <div 
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className="mb-[var(--space-lg)] relative overflow-hidden border border-zinc-800 bg-[#050505] shadow-[var(--ghost-glow)] group transition-all duration-700 hover:border-zinc-600 hover:shadow-[var(--ghost-glow-active)]" 
      style={{ borderRadius: 'var(--card-radius)' }}
    >
      {/* Top Status Bar - Subtle Gradient */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-600 to-transparent opacity-70 group-hover:via-white/40 group-hover:animate-flicker-glow"></div>
      
      {/* Animated Mist/Fog Overlay on Hover */}
      <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-1000 z-0">
         <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-zinc-800/60 to-transparent animate-mist-rise mix-blend-screen"></div>
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_70%)] mix-blend-overlay"></div>
      </div>

      {/* Mouse Following Spotlight */}
      <div 
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0"
        style={{
          background: 'radial-gradient(600px circle at var(--mouse-x) var(--mouse-y), rgba(255, 255, 255, 0.08), transparent 40%)'
        }}
      />

      <div className="p-[var(--space-lg)] relative z-10">
        <div className="flex items-center gap-2 mb-[var(--space-md)] text-zinc-300 text-[10px] font-bold uppercase tracking-[0.2em] border-b border-zinc-800 pb-2">
           <Calendar size={12} />
           <span>Cemetery of the Day</span>
        </div>

        <div className="flex flex-col md:flex-row gap-[var(--space-lg)] md:items-start justify-between">
          <div className="flex-1">
             <h2 className="font-serif text-2xl md:text-4xl font-bold text-zinc-100 mb-2 tracking-tight drop-shadow-md group-hover:text-white transition-colors">
               {cemetery.name}
             </h2>
             <div className="flex items-center text-zinc-300 text-xs mb-6 uppercase tracking-wider font-mono">
               <MapPin size={12} className="mr-1 opacity-70" />
               {cemetery.address}
             </div>

             <div className="min-h-[80px]">
                {cemetery.dailyFacts ? (
                  <div className="prose prose-invert prose-sm text-zinc-200 animate-in fade-in slide-in-from-bottom-2">
                     <div className="whitespace-pre-line leading-relaxed border-l border-zinc-600 pl-4 italic font-serif">
                        {cemetery.dailyFacts}
                     </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-start gap-4">
                     <p className="text-zinc-400 italic text-sm font-serif">
                       The veil is thin here today. Summon the spirits to learn their secrets.
                     </p>
                     <button 
                       onClick={handleRevealFacts}
                       disabled={loading}
                       className="flex items-center gap-2 bg-transparent hover:bg-zinc-900 text-zinc-300 hover:text-white px-4 py-2 text-[10px] uppercase tracking-[0.15em] transition-all border border-zinc-700 hover:border-zinc-500"
                     >
                       {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                       {loading ? 'Consulting...' : 'Reveal Facts'}
                     </button>
                  </div>
                )}
             </div>
          </div>

          <div className="flex flex-col gap-3 justify-end min-w-[200px]">
            <button
               onClick={() => onViewDetails(cemetery.id)}
               className="group/btn flex items-center justify-center gap-2 w-full bg-zinc-950 hover:bg-zinc-900 text-zinc-300 hover:text-white py-4 px-4 text-[10px] font-bold uppercase tracking-[0.2em] transition-colors border border-zinc-800 hover:border-zinc-600"
            >
              Full Details
              <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform text-zinc-500 group-hover/btn:text-white" />
            </button>
            {cemetery.photos.length > 0 && (
              <div className="hidden md:block h-32 w-full overflow-hidden border border-zinc-800 relative grayscale hover:grayscale-0 transition-all duration-700">
                 <img src={cemetery.photos[0]} alt="Preview" className="w-full h-full object-cover opacity-60 hover:opacity-100 transition-opacity" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};