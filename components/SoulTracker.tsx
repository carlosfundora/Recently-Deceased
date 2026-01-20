import React from 'react';
import { Skull } from 'lucide-react';

interface SoulTrackerProps {
  total: number;
  visited: number;
}

export const SoulTracker: React.FC<SoulTrackerProps> = ({ total, visited }) => {
  const percentage = Math.round((visited / total) * 100);

  return (
    <div className="mb-[var(--space-lg)] p-[var(--space-md)] bg-[#050505] border border-zinc-800 relative overflow-hidden group shadow-[var(--ghost-glow)]" style={{ borderRadius: 'var(--card-radius)' }}>
      {/* Background Effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(255,255,255,0.03),transparent_70%)]"></div>
      
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-zinc-900 border border-zinc-700 rounded-sm text-zinc-300">
             <Skull size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-300">Soul Collection</h2>
            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Passport Progress</p>
          </div>
        </div>
        <div className="text-right">
           <span className="text-2xl font-serif text-white font-bold">{visited}</span>
           <span className="text-zinc-600 font-serif text-lg"> / {total}</span>
        </div>
      </div>

      <div className="h-2 bg-zinc-900 w-full relative overflow-hidden border border-zinc-800/50 rounded-sm">
        <div 
          className="h-full bg-zinc-300 transition-all duration-1000 ease-out relative"
          style={{ width: `${percentage}%` }}
        >
          <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
        </div>
      </div>
      
      <div className="mt-3 flex justify-between text-[10px] uppercase tracking-wider text-zinc-600 font-bold">
        <span>Novice</span>
        <span>Keeper</span>
        <span>Guardian</span>
      </div>
    </div>
  );
};
