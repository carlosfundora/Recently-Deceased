import React from 'react';
import { X, SortAsc, CalendarClock, Filter, Home } from 'lucide-react';
import { TbPolaroid, TbCoffin } from "react-icons/tb";
import { GiGraveFlowers, GiThermometerScale, GiCrystalBall } from "react-icons/gi";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  filter: 'all' | 'visited' | 'pending';
  onFilterChange: (f: 'all' | 'visited' | 'pending') => void;
  sortType: 'name' | 'date';
  onSortChange: (s: 'name' | 'date') => void;
  onOpenGallery: () => void;
  onOpenAchievements: () => void;
  onOpenSpirits: () => void;
  onGoHome: () => void;
  onOpenChat: () => void;
  onOpenMeter: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
    isOpen, onClose, filter, onFilterChange, 
    sortType, onSortChange, onOpenGallery, onOpenAchievements, onOpenSpirits, onGoHome,
    onOpenChat, onOpenMeter
}) => {
  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      {/* Sidebar Panel */}
      <div className={`fixed top-0 left-0 h-full w-80 bg-[#0a0a0a] border-r border-zinc-800 z-[70] transform transition-transform duration-300 shadow-[0_0_50px_rgba(0,0,0,0.8)] ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
         
         <div className="flex flex-col h-full">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
               <h2 className="text-lg font-serif font-bold text-white tracking-[0.2em]">NAVIGATION</h2>
               <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                  <X size={24} />
               </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
               
               {/* Main Links */}
               <div className="space-y-2">
                   <button 
                      onClick={() => { onGoHome(); onClose(); }}
                      className="w-full flex items-center gap-4 p-3 rounded hover:bg-zinc-900 transition-colors text-zinc-300 hover:text-white group"
                   >
                       <Home size={20} className="text-zinc-500 group-hover:text-white" />
                       <span className="text-sm font-bold uppercase tracking-widest">Dashboard</span>
                   </button>
                   <button 
                      onClick={() => { onOpenGallery(); onClose(); }}
                      className="w-full flex items-center gap-4 p-3 rounded hover:bg-zinc-900 transition-colors text-zinc-300 hover:text-white group"
                   >
                       <TbPolaroid size={22} className="text-zinc-500 group-hover:text-white" />
                       <span className="text-sm font-bold uppercase tracking-widest">Evidence</span>
                   </button>
                   <button 
                      onClick={() => { onOpenSpirits(); onClose(); }}
                      className="w-full flex items-center gap-4 p-3 rounded hover:bg-zinc-900 transition-colors text-zinc-300 hover:text-white group"
                   >
                       <TbCoffin size={22} className="text-zinc-500 group-hover:text-white" />
                       <span className="text-sm font-bold uppercase tracking-widest">Notable Spirits</span>
                   </button>
                   <button 
                      onClick={() => { onOpenAchievements(); onClose(); }}
                      className="w-full flex items-center gap-4 p-3 rounded hover:bg-zinc-900 transition-colors text-zinc-300 hover:text-white group"
                   >
                       <GiGraveFlowers size={20} className="text-zinc-500 group-hover:text-white" />
                       <span className="text-sm font-bold uppercase tracking-widest">Achievements</span>
                   </button>
                   <button 
                      onClick={() => { onOpenChat(); onClose(); }}
                      className="w-full flex items-center gap-4 p-3 rounded hover:bg-zinc-900 transition-colors text-zinc-300 hover:text-white group"
                   >
                       <GiCrystalBall size={20} className="text-zinc-500 group-hover:text-white" />
                       <span className="text-sm font-bold uppercase tracking-widest">Spirit Box</span>
                   </button>
                   <button 
                      onClick={() => { onOpenMeter(); onClose(); }}
                      className="w-full flex items-center gap-4 p-3 rounded hover:bg-zinc-900 transition-colors text-zinc-300 hover:text-white group"
                   >
                       <GiThermometerScale size={20} className="text-zinc-500 group-hover:text-white" />
                       <span className="text-sm font-bold uppercase tracking-widest">P.K.E. Meter</span>
                   </button>
               </div>
               
               <div className="h-px bg-zinc-800"></div>

               {/* Filters */}
               <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase text-zinc-500 tracking-widest">
                     <Filter size={14} /> Filter Spirits
                  </div>
                  <div className="flex flex-col gap-2">
                     {(['all', 'visited', 'pending'] as const).map(f => (
                         <button
                            key={f}
                            onClick={() => onFilterChange(f)}
                            className={`p-3 text-left text-xs font-bold uppercase tracking-widest border transition-all ${filter === f ? 'border-white text-white bg-white/5' : 'border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}
                         >
                            {f}
                         </button>
                     ))}
                  </div>
               </div>

               <div className="h-px bg-zinc-800"></div>

               {/* Sort */}
               <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase text-zinc-500 tracking-widest">
                     <SortAsc size={14} /> Sort Registry
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                      <button
                         onClick={() => onSortChange('name')}
                         className={`p-3 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest border transition-all ${sortType === 'name' ? 'border-white text-white bg-white/5' : 'border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}
                      >
                         <SortAsc size={14} /> Name
                      </button>
                      <button
                         onClick={() => onSortChange('date')}
                         className={`p-3 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest border transition-all ${sortType === 'date' ? 'border-white text-white bg-white/5' : 'border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}
                      >
                         <CalendarClock size={14} /> Date
                      </button>
                  </div>
               </div>
            </div>

            <div className="p-6 border-t border-zinc-800 text-[10px] text-zinc-600 font-mono text-center">
               TRAVEL GUIDE v2.1 <br/> FOR THE RECENTLY DECEASED
            </div>
         </div>
      </div>
    </>
  );
};