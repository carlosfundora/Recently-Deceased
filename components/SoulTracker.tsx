import React from 'react';

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
      
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex flex-col">
           <h2 className="text-xl md:text-2xl font-black uppercase tracking-[0.2em] text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">Soul Collection</h2>
           <p className="text-xs md:text-sm text-zinc-400 font-mono mt-1 tracking-widest uppercase opacity-80">Passport Progress</p>
        </div>
        <div className="text-right">
           <span className="text-4xl font-serif text-white font-bold">{visited}</span>
           <span className="text-zinc-600 font-serif text-xl"> / {total}</span>
        </div>
      </div>

      <div className="h-3 bg-zinc-900 w-full relative overflow-hidden border border-zinc-800/50 rounded-sm">
        <div 
          className="h-full bg-zinc-200 transition-all duration-1000 ease-out relative shadow-[0_0_15px_rgba(255,255,255,0.5)]"
          style={{ width: `${percentage}%` }}
        >
          <div className="absolute inset-0 bg-white/40 animate-pulse"></div>
        </div>
      </div>
      
      <div className="mt-4 flex justify-between text-[10px] uppercase tracking-widest text-zinc-600 font-bold">
        <span>Novice</span>
        <span>Keeper</span>
        <span>Guardian</span>
      </div>
    </div>
  );
};