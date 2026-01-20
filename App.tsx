import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Cemetery, CemeteryUpdate } from './types';
import { INITIAL_CEMETERIES } from './constants';
import { CemeteryCard } from './components/CemeteryCard';
import { CemeteryMap } from './components/CemeteryMap';
import { CemeteryOfTheDay } from './components/CemeteryOfTheDay';
import { Ghost, Info, Map as MapIcon, List, X, SortAsc, CalendarClock } from 'lucide-react';

const STORAGE_KEY = 'nola_cemetery_passport_v2';

// Custom Above-Ground Tomb Icon
const TombIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    {/* Base/Steps */}
    <path d="M2 21h20" />
    <path d="M4 21v-2h16v2" />
    
    {/* Main Structure */}
    <path d="M6 19V8l6-5 6 5v11" />
    <path d="M6 8h12" />
    
    {/* Door/Plaque */}
    <rect x="9" y="12" width="6" height="7" rx="1" />
    
    {/* Cross/Decoration on top */}
    <path d="M12 3v2" />
    <path d="M11 4h2" />
  </svg>
);

const App: React.FC = () => {
  const [cemeteries, setCemeteries] = useState<Cemetery[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [filter, setFilter] = useState<'all' | 'visited' | 'pending'>('all');
  const [sortType, setSortType] = useState<'name' | 'date'>('name');
  const [selectedCemeteryId, setSelectedCemeteryId] = useState<string | null>(null);

  // Header spotlight refs
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        // Robust merge to ensure history and notes persist while keeping code/constants up to date
        const merged = INITIAL_CEMETERIES.map(init => {
            const saved = parsed.find((p: Cemetery) => p.id === init.id);
            // If saved exists, prioritize its data for user-editable fields
            return saved ? { 
              ...init, 
              visited: saved.visited,
              visitedDate: saved.visitedDate,
              history: saved.history || init.history, // Persist history if it exists
              userNotes: saved.userNotes || init.userNotes,
              dailyFacts: saved.dailyFacts, // Persist cached facts
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
  const progressPercentage = Math.round((visitedCount / cemeteries.length) * 100);

  const processedCemeteries = useMemo(() => {
    let result = cemeteries.filter(c => {
      if (filter === 'visited') return c.visited;
      if (filter === 'pending') return !c.visited;
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
  }, [cemeteries, filter, sortType]);

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
      {/* Sticky Header with Ghostly Spotlight */}
      <header 
        ref={headerRef}
        onMouseMove={handleHeaderMouseMove}
        className="sticky top-0 z-40 bg-[#050505] border-b border-zinc-900 transition-all duration-300 group relative overflow-hidden"
      >
        {/* Spotlight Overlay */}
        <div 
          className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: 'radial-gradient(600px circle at var(--mouse-x) var(--mouse-y), rgba(255, 255, 255, 0.06), transparent 40%)'
          }}
        />

        <div className="w-full mx-auto relative z-10" style={{ maxWidth: 'var(--container-max-width)', padding: 'var(--space-md)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-zinc-950 text-white rounded-[2px] border border-zinc-700 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                <TombIcon className="w-7 h-7" />
              </div>
              <div className="hidden sm:block">
                <h1 className="font-serif text-xl md:text-2xl font-bold leading-tight text-white tracking-[0.15em] uppercase drop-shadow-md">
                  Travel Guide
                </h1>
                <p className="text-xs text-zinc-400 uppercase tracking-[0.3em] font-bold">
                  For the Recently Deceased
                </p>
              </div>
              {/* Mobile Only Title */}
              <div className="sm:hidden">
                 <h1 className="font-serif text-lg font-bold text-white tracking-widest uppercase">Travel Guide</h1>
              </div>
            </div>
            
            {/* View Toggle */}
            <div className="flex bg-zinc-950 rounded-[2px] p-1 border border-zinc-800">
              <button
                onClick={() => setView('list')}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-widest transition-all ${view === 'list' ? 'bg-zinc-200 text-black' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <List size={14} />
                <span className="hidden sm:inline">List</span>
              </button>
              <button
                onClick={() => setView('map')}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-widest transition-all ${view === 'map' ? 'bg-zinc-200 text-black' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <MapIcon size={14} />
                <span className="hidden sm:inline">Map</span>
              </button>
            </div>
          </div>
          
          {/* Stats Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
              <span>Soul Collection</span>
              <span className="text-zinc-300">{visitedCount} / {cemeteries.length}</span>
            </div>
            <div className="h-[2px] bg-zinc-900 overflow-hidden w-full">
              <div 
                className="h-full bg-zinc-200 transition-all duration-1000 ease-out"
                style={{ width: `${progressPercentage}%`, boxShadow: '0 0 10px rgba(255, 255, 255, 0.5)' }}
              ></div>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full mx-auto relative z-0 bg-black" style={{ maxWidth: 'var(--container-max-width)', padding: 'var(--space-md)' }}>
        
        {view === 'list' && (
          <>
            {/* Cemetery of the Day Section */}
            {cemeteryOfTheDay && (
              <CemeteryOfTheDay 
                cemetery={cemeteryOfTheDay} 
                onUpdate={handleUpdateCemetery}
                onViewDetails={(id) => setSelectedCemeteryId(id)}
              />
            )}

            {/* Filters and Sort */}
            <div 
              className="flex flex-col md:flex-row gap-[var(--space-md)] mb-[var(--space-lg)] justify-between items-start md:items-center bg-black/50 p-[var(--space-sm)] border-y border-zinc-900"
            >
              <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 scrollbar-hide">
                 <button 
                   onClick={() => setFilter('all')}
                   className={`px-5 py-2 text-xs uppercase font-bold tracking-[0.2em] transition-colors border whitespace-nowrap ${filter === 'all' ? 'bg-zinc-100 text-black border-zinc-100' : 'border-zinc-900 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'}`}
                 >
                   All
                 </button>
                 <button 
                   onClick={() => setFilter('visited')}
                   className={`px-5 py-2 text-xs uppercase font-bold tracking-[0.2em] transition-colors border whitespace-nowrap ${filter === 'visited' ? 'bg-zinc-100 text-black border-zinc-100' : 'border-zinc-900 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'}`}
                 >
                   Visited
                 </button>
                 <button 
                   onClick={() => setFilter('pending')}
                   className={`px-5 py-2 text-xs uppercase font-bold tracking-[0.2em] transition-colors border whitespace-nowrap ${filter === 'pending' ? 'bg-zinc-100 text-black border-zinc-100' : 'border-zinc-900 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'}`}
                 >
                   Pending
                 </button>
              </div>

              <div className="relative w-full md:w-auto min-w-[220px]">
                <select
                  value={sortType}
                  onChange={(e) => setSortType(e.target.value as 'name' | 'date')}
                  className="w-full md:w-auto appearance-none bg-black border border-zinc-800 text-zinc-300 text-xs font-bold uppercase tracking-wider pl-9 pr-8 py-2.5 focus:outline-none focus:border-zinc-500 cursor-pointer hover:bg-zinc-900 transition-colors"
                  style={{ borderRadius: '0' }}
                >
                  <option value="name">Sort: Name (A-Z)</option>
                  <option value="date">Sort: Visited</option>
                </select>
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
                  {sortType === 'name' ? <SortAsc size={16} /> : <CalendarClock size={16} />}
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
                  <p className="text-lg font-serif">No spirits found.</p>
                </div>
              )}
            </div>
          </>
        )}

        {view === 'map' && (
          <div className="animate-in fade-in zoom-in-95 duration-500">
             <div className="mb-[var(--space-sm)] p-[var(--space-sm)] border border-zinc-900 bg-black text-xs font-mono text-zinc-400 flex items-center gap-3">
                <div className="p-1.5 bg-zinc-200 text-black rounded-full">
                  <Info size={12} />
                </div>
                <span className="uppercase tracking-wide">Displaying {processedCemeteries.length} locations. Select a marker to proceed.</span>
             </div>
             <CemeteryMap 
               cemeteries={processedCemeteries} 
               onSelectCemetery={(id) => setSelectedCemeteryId(id)} 
             />
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-[var(--space-xl)] p-[var(--space-lg)] bg-black border-t border-zinc-900 text-center">
            <div className="flex items-center justify-center gap-2 text-zinc-500 mb-3">
                <Info size={14} />
                <span className="text-xs font-bold uppercase tracking-[0.2em]">Travel Advisory</span>
            </div>
            <p className="text-xs text-zinc-600 max-w-lg mx-auto leading-relaxed font-mono">
                Some cemeteries require guided tours for entry. 
                Respect the resting places. Data is local.
            </p>
        </div>
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
    </div>
  );
};

export default App;