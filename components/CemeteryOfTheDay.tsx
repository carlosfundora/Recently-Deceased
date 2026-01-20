import React, { useState } from 'react';
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

  const handleRevealFacts = async () => {
    setLoading(true);
    const dailyFacts = await generateDailyFacts(cemetery.name);
    onUpdate(cemetery.id, { dailyFacts });
    setLoading(false);
  };

  return (
    <div className="mb-[var(--space-lg)] relative overflow-hidden border border-zinc-800 bg-black shadow-[var(--ghost-glow)]" style={{ borderRadius: 'var(--card-radius)' }}>
      <div className="p-[var(--space-lg)] relative z-10">
        <div className="flex items-center gap-2 mb-[var(--space-md)] text-zinc-400 text-[10px] font-bold uppercase tracking-[0.2em] border-b border-zinc-900 pb-2">
           <Calendar size={12} />
           <span>Cemetery of the Day</span>
        </div>

        <div className="flex flex-col md:flex-row gap-[var(--space-lg)] md:items-start justify-between">
          <div className="flex-1">
             <h2 className="font-serif text-2xl md:text-4xl font-bold text-zinc-100 mb-2 tracking-tight drop-shadow-md">
               {cemetery.name}
             </h2>
             <div className="flex items-center text-zinc-500 text-xs mb-6 uppercase tracking-wider font-mono">
               <MapPin size={12} className="mr-1" />
               {cemetery.address}
             </div>

             <div className="min-h-[80px]">
                {cemetery.dailyFacts ? (
                  <div className="prose prose-invert prose-sm text-zinc-300 animate-in fade-in slide-in-from-bottom-2">
                     <div className="whitespace-pre-line leading-relaxed border-l border-zinc-600 pl-4 italic font-serif">
                        {cemetery.dailyFacts}
                     </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-start gap-4">
                     <p className="text-zinc-500 italic text-sm font-serif">
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
               className="group flex items-center justify-center gap-2 w-full bg-zinc-950 hover:bg-zinc-900 text-zinc-200 hover:text-white py-4 px-4 text-[10px] font-bold uppercase tracking-[0.2em] transition-colors border border-zinc-800 hover:border-zinc-600"
            >
              Full Details
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform text-zinc-500 group-hover:text-white" />
            </button>
            {cemetery.photos.length > 0 && (
              <div className="hidden md:block h-32 w-full overflow-hidden border border-zinc-900 relative grayscale hover:grayscale-0 transition-all duration-700">
                 <img src={cemetery.photos[0]} alt="Preview" className="w-full h-full object-cover opacity-60 hover:opacity-100 transition-opacity" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};