import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Cemetery, CemeteryUpdate } from './types';
import { INITIAL_CEMETERIES } from './constants';
import { CemeteryCard } from './components/CemeteryCard';
import { CemeteryMap } from './components/CemeteryMap';
import { CemeteryOfTheDay } from './components/CemeteryOfTheDay';
import { SoulTracker } from './components/SoulTracker';
import { GhostChat } from './components/GhostChat';
import { GhostMeter } from './components/GhostMeter';
import { Ghost, Map as MapIcon, List, SortAsc, CalendarClock, Search, X } from 'lucide-react';
import { GiThermometerScale } from "react-icons/gi";

const STORAGE_KEY = 'nola_cemetery_passport_v2';

const App: React.FC = () => {
  const [cemeteries, setCemeteries] = useState<Cemetery[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [filter, setFilter] = useState<'all' | 'visited' | 'pending'>('all');
  const [sortType, setSortType] = useState<'name' | 'date'>('name');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCemeteryId, setSelectedCemeteryId] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMeterOpen, setIsMeterOpen] = useState(false);

  // Header spotlight refs
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        const merged = INITIAL_CEMETERIES.map(init => {
            const saved = parsed.find((p: Cemetery) => p.id === init.id);
            return saved ? { 
              ...init, 
              visited: saved.visited,
              visitedDate: saved.visitedDate,
              history: saved.history || init.history,
              userNotes: saved.userNotes || init.userNotes,
              dailyFacts: saved.dailyFacts,
              photos: saved.photos || [] 
            } : init;
        });
        setCemeteries(merged);
      } catch (e) {
        console.error("Failed to parse saved passport data", e);
        setCemeteries(INITIAL_CEMETERIES);
      }
    } else {
      setCemeteries(INITIAL_CEMETERIES);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cemeteries));
      } catch (e) {
        console.warn("Storage quota exceeded, photos might be too large.");
      }
    }
  }, [cemeteries, isLoaded]);

  const handleUpdateCemetery = (id: string, updates: CemeteryUpdate) => {
    setCemeteries(prev => prev.map(c => 
      c.id === id ? { ...c, ...updates } : c
    ));
  };

  const handleHeaderMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (headerRef.current) {
      const rect = headerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      headerRef.current.style.setProperty('--mouse-x', `${x}px`);
      headerRef.current.style.setProperty('--mouse-y', `${y}px`);
    }
  };

  const cemeteryOfTheDay = useMemo(() => {
    if (cemeteries.length === 0) return null;
    const today = new Date();
    const start = new Date(today.getFullYear(), 0, 0);
    const diff = today.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    const index = dayOfYear % cemeteries.length;
    return cemeteries[index];
  }, [cemeteries]);

  const visitedCount = cemeteries.filter(c => c.visited).length;

  const processedCemeteries = useMemo(() => {
    let result = cemeteries.filter(c => {
      // Filter by status
      if (filter === 'visited' && !c.visited) return false;
      if (filter === 'pending' && c.visited) return false;
      
      // Filter by search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return c.name.toLowerCase().includes(query) || c.address.toLowerCase().includes(query);
      }
      return true;
    });

    return result.sort((a, b) => {
      if (sortType === 'name') {
        return a.name.localeCompare(b.name);
      } else {
        if (a.visited && b.visited) {
           const dateA = a.visitedDate ? new Date(a.visitedDate).getTime() : 0;
           const dateB = b.visitedDate ? new Date(b.visitedDate).getTime() : 0;
           return dateB - dateA;
        }
        if (a.visited) return -1;
        if (b.visited) return 1;
        return a.name.localeCompare(b.name);
      }
    });
  }, [cemeteries, filter, sortType, searchQuery]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <Ghost className="animate-pulse w-12 h-12" />
      </div>
    );
  }

  const selectedCemetery = cemeteries.find(c => c.id === selectedCemeteryId);

  return (
    <div className="min-h-screen bg-black text-zinc-300 font-sans selection:bg-white selection:text-black pb-24 relative">
      {/* Sticky Header */}
      <header 
        ref={headerRef}
        onMouseMove={handleHeaderMouseMove}
        className="sticky top-0 z-40 bg-[#050505] border-b border-zinc-900 transition-all duration-300 group relative overflow-hidden shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)]"
      >
        {/* Subtle Fog/Mist Background Effect */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
           <div className="absolute -inset-[100%] bg-[radial-gradient(circle,rgba(255,255,255,0.05)_0%,transparent_60%)] animate-[spin_60s_linear_infinite_reverse] blur-3xl origin-bottom-left" />
           <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay" />
        </div>

        {/* Mouse Spotlight */}
        <div 
          className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 mix-blend-screen"
          style={{
            background: 'radial-gradient(600px circle at var(--mouse-x) var(--mouse-y), rgba(255, 255, 255, 0.05), transparent 40%)'
          }}
        />

        <div className="w-full mx-auto relative z-10 flex items-center justify-between" style={{ maxWidth: 'var(--container-max-width)', padding: '0.75rem var(--space-md)' }}>
            <div className="flex items-center gap-5">
              {/* Ghost Chat Button with Pulse Effect */}
              <button 
                 onClick={() => setIsChatOpen(!isChatOpen)}
                 className="relative group/ghost text-zinc-400 hover:text-white transition-all duration-500 hover:scale-105 active:scale-95 flex items-center justify-center w-12 h-12"
                 title="Commune with the guide"
              >
                {/* Pulsing Glow Background */}
                <div className={`absolute inset-0 rounded-full bg-zinc-600/30 blur-md transition-opacity duration-1000 ${isChatOpen ? 'opacity-100 animate-pulse' : 'opacity-0 group-hover/ghost:opacity-50'}`}></div>
                <div className="absolute inset-0 rounded-full bg-white/5 blur-sm animate-ghost-pulse"></div>
                
                <Ghost size={36} strokeWidth={1.5} className={`relative z-10 drop-shadow-[0_0_5px_rgba(255,255,255,0.3)] ${isChatOpen ? 'text-white' : ''}`} />
              </button>

              <div className="flex flex-col">
                <h1 className="font-serif text-lg md:text-xl font-bold leading-tight text-zinc-200 tracking-[0.15em] uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                  <span className="animate-flicker-glow block">Travel Guide</span>
                </h1>
                <p className="text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-bold hidden sm:block opacity-80">
                  For the Recently Deceased
                </p>
              </div>
            </div>
            {/* Empty right side to balance layout if needed, or minimalistic */}
        </div>
      </header>

      <main className="w-full mx-auto relative z-0 bg-black" style={{ maxWidth: 'var(--container-max-width)', padding: 'var(--space-md)' }}>
        
        {/* Soul Collection Section */}
        <SoulTracker total={cemeteries.length} visited={visitedCount} />

        {view === 'list' && (
          <>
            {/* Cemetery of the Day */}
            {cemeteryOfTheDay && (
              <CemeteryOfTheDay 
                cemetery={cemeteryOfTheDay} 
                onUpdate={handleUpdateCemetery}
                onViewDetails={(id) => setSelectedCemeteryId(id)}
              />
            )}

            {/* Toolbar */}
            <div className="mb-[var(--space-lg)] p-[var(--space-sm)] bg-[#050505] border border-zinc-800 flex flex-col lg:flex-row gap-4 items-center justify-between shadow-[var(--ghost-glow)]" style={{ borderRadius: 'var(--card-radius)' }}>
              
              {/* Filter Buttons */}
              <div className="flex gap-2 w-full lg:w-auto justify-center lg:justify-start">
                 {(['all', 'visited', 'pending'] as const).map((f) => (
                   <button 
                     key={f}
                     onClick={() => setFilter(f)}
                     className={`px-4 py-2 text-[10px] uppercase font-bold tracking-[0.2em] transition-colors border ${filter === f ? 'bg-[#d4d4d8] text-black border-zinc-300' : 'border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'}`}
                   >
                     {f}
                   </button>
                 ))}
              </div>

              {/* Center Controls: Sort | Search | View */}
              <div className="flex flex-1 w-full gap-0 border border-zinc-800 bg-black items-center">
                  {/* Sort Dropdown */}
                  <div className="relative border-r border-zinc-800 min-w-[40px] md:min-w-[140px]">
                    <select
                      value={sortType}
                      onChange={(e) => setSortType(e.target.value as 'name' | 'date')}
                      className="w-full appearance-none bg-black text-zinc-400 text-[10px] font-bold uppercase tracking-wider pl-9 pr-4 py-3 focus:outline-none cursor-pointer hover:bg-zinc-900 transition-colors h-full"
                    >
                      <option value="name">Name</option>
                      <option value="date">Date</option>
                    </select>
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none">
                      {sortType === 'name' ? <SortAsc size={14} /> : <CalendarClock size={14} />}
                    </div>
                  </div>

                  {/* Search Bar - Flex 1 to take space */}
                  <div className="flex-1 relative border-r border-zinc-800">
                     <input 
                       type="text"
                       value={searchQuery}
                       onChange={(e) => setSearchQuery(e.target.value)}
                       placeholder="SEARCH..."
                       className="w-full bg-black text-zinc-200 text-[10px] font-mono p-3 pl-9 focus:outline-none placeholder-zinc-700 uppercase tracking-widest"
                     />
                     <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none">
                       <Search size={14} />
                     </div>
                  </div>

                  {/* View Toggle (Pin Button) */}
                  <div className="flex">
                    <button
                      onClick={() => setView('list')}
                      className={`p-3 border-r border-zinc-800 transition-colors ${view === 'list' ? 'text-zinc-200 bg-zinc-900' : 'text-zinc-600 hover:text-zinc-400'}`}
                      title="List View"
                    >
                      <List size={16} />
                    </button>
                    <button
                      onClick={() => setView('map')}
                      className={`p-3 border-r border-zinc-800 transition-colors ${view === 'map' ? 'text-zinc-200 bg-zinc-900' : 'text-zinc-600 hover:text-zinc-400'}`}
                      title="Map View"
                    >
                      <MapIcon size={16} /> 
                    </button>
                    
                    {/* Ghost Meter Button */}
                    <button
                       onClick={() => setIsMeterOpen(true)}
                       className="p-3 text-zinc-600 hover:text-green-500 hover:bg-zinc-900 transition-colors"
                       title="Ghost Meter"
                    >
                       <GiThermometerScale size={16} />
                    </button>
                  </div>
              </div>

            </div>

            {/* Grid */}
            <div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" 
              style={{ gap: 'var(--space-md)' }}
            >
              {processedCemeteries.length > 0 ? (
                processedCemeteries.map(cemetery => (
                  <CemeteryCard 
                    key={cemetery.id} 
                    cemetery={cemetery} 
                    onUpdate={handleUpdateCemetery} 
                  />
                ))
              ) : (
                <div className="col-span-full py-20 text-center text-zinc-700 bg-zinc-950/30 border border-zinc-900 border-dashed">
                  <Ghost className="w-16 h-16 mx-auto mb-4 opacity-10" />
                  <p className="text-lg font-serif">No spirits found matching your inquiry.</p>
                </div>
              )}
            </div>
          </>
        )}

        {view === 'map' && (
          <div className="animate-in fade-in zoom-in-95 duration-500">
             <div className="mb-4 flex justify-between items-center">
               <button 
                  onClick={() => setView('list')} 
                  className="flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-400 hover:text-white transition-colors"
               >
                 &larr; Back to List
               </button>
               <div className="text-[10px] font-mono text-zinc-500 uppercase">{processedCemeteries.length} Locations Found</div>
             </div>
             <CemeteryMap 
               cemeteries={processedCemeteries} 
               onSelectCemetery={(id) => setSelectedCemeteryId(id)} 
             />
          </div>
        )}
      </main>

      {/* Detail Modal Overlay */}
      {selectedCemetery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-[var(--space-sm)] md:p-[var(--space-md)] bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
          <div 
             className="bg-black w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-zinc-800 shadow-[0_0_50px_rgba(255,255,255,0.05)] relative animate-in zoom-in-95 duration-300"
             onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-black/95 backdrop-blur z-10 border-b border-zinc-900 p-[var(--space-md)] flex justify-between items-center">
               <h2 className="font-serif text-lg md:text-xl text-white tracking-widest">{selectedCemetery.name}</h2>
               <button 
                 onClick={() => setSelectedCemeteryId(null)}
                 className="p-2 hover:bg-zinc-900 rounded-full transition-colors text-zinc-500 hover:text-white"
               >
                 <X size={20} />
               </button>
            </div>
            <div className="p-[var(--space-md)] md:p-[var(--space-lg)] bg-black">
               <CemeteryCard 
                  cemetery={selectedCemetery} 
                  onUpdate={handleUpdateCemetery}
               />
            </div>
          </div>
          <div className="absolute inset-0 -z-10 cursor-pointer" onClick={() => setSelectedCemeteryId(null)}></div>
        </div>
      )}

      {/* Ghost Chat Widget */}
      <GhostChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      
      {/* Ghost Meter Overlay */}
      <GhostMeter isOpen={isMeterOpen} onClose={() => setIsMeterOpen(false)} />
    </div>
  );
};

export default App;