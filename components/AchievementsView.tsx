import React from 'react';
import { X, Award, Skull, Crown } from 'lucide-react';
import { LiaGhostSolid } from "react-icons/lia";

interface AchievementsViewProps {
  total: number;
  visited: number;
  onClose: () => void;
}

export const AchievementsView: React.FC<AchievementsViewProps> = ({ total, visited, onClose }) => {
  const percentage = Math.round((visited / total) * 100);
  
  const ranks = [
      { name: 'Novice', threshold: 0, icon: <LiaGhostSolid size={24} /> },
      { name: 'Seeker', threshold: 20, icon: <Skull size={24} /> },
      { name: 'Keeper', threshold: 50, icon: <Award size={24} /> },
      { name: 'Guardian', threshold: 80, icon: <Crown size={24} /> },
      { name: 'Necromancer', threshold: 100, icon: <LiaGhostSolid size={24} className="text-purple-500" /> }
  ];

  const currentRank = ranks.reverse().find(r => percentage >= r.threshold) || ranks[ranks.length-1];

  return (
    <div className="h-full bg-black text-white overflow-y-auto animate-in fade-in duration-500">
       <div className="sticky top-0 bg-black/90 backdrop-blur z-20 border-b border-zinc-800 p-6 flex justify-between items-center">
           <h2 className="text-xl font-serif font-bold tracking-[0.2em] uppercase">Soul Collection</h2>
           <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors">
               <X size={24} />
           </button>
       </div>

       <div className="max-w-3xl mx-auto p-8 space-y-12">
            
            {/* Main Stats Card */}
            <div className="relative p-8 border border-zinc-800 bg-zinc-900/20 overflow-hidden shadow-[0_0_30px_rgba(255,255,255,0.05)]">
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_70%)]"></div>
                 <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                     <div>
                         <div className="flex items-center gap-3 mb-2 text-zinc-400">
                             {currentRank.icon}
                             <span className="text-sm font-mono uppercase tracking-widest">Current Rank</span>
                         </div>
                         <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-white mb-2">{currentRank.name}</h1>
                         <p className="text-zinc-500 italic font-serif">You have communed with {visited} of {total} known cemeteries.</p>
                     </div>
                     <div className="text-right">
                        <div className="text-6xl font-serif font-bold text-white">{percentage}%</div>
                        <div className="text-zinc-600 text-xs uppercase tracking-[0.3em] mt-1">Completion</div>
                     </div>
                 </div>

                 <div className="mt-8 h-4 bg-zinc-950 w-full relative overflow-hidden border border-zinc-800 rounded-sm">
                    <div 
                      className="h-full bg-white transition-all duration-1000 ease-out relative shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                      style={{ width: `${percentage}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-full animate-[shimmer_2s_infinite]"></div>
                    </div>
                 </div>
            </div>

            {/* Ranks Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ranks.slice().reverse().map((rank, i) => { // Reverse back to low-to-high for display
                    const isUnlocked = percentage >= rank.threshold;
                    return (
                        <div key={i} className={`p-6 border ${isUnlocked ? 'border-zinc-700 bg-zinc-900/40' : 'border-zinc-900 bg-black opacity-50'} relative group transition-all`}>
                            {isUnlocked && <div className="absolute top-2 right-2 text-green-500"><Award size={16} /></div>}
                            <div className={`mb-4 ${isUnlocked ? 'text-white' : 'text-zinc-700'}`}>{rank.icon}</div>
                            <h3 className={`text-xl font-bold uppercase tracking-widest mb-1 ${isUnlocked ? 'text-white' : 'text-zinc-600'}`}>{rank.name}</h3>
                            <div className="text-xs font-mono text-zinc-500 uppercase">Unlocks at {rank.threshold}%</div>
                        </div>
                    );
                })}
            </div>
       </div>
    </div>
  );
};