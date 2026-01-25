import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Cemetery, CemeteryUpdate } from './types';
import { INITIAL_CEMETERIES } from './constants';
import { CemeteryCard } from './components/CemeteryCard';
import { CemeteryDetailView } from './components/CemeteryDetailView';
import { CemeteryMap } from './components/CemeteryMap';
import { CemeteryOfTheDay } from './components/CemeteryOfTheDay';
import { AchievementsView } from './components/AchievementsView';
import { GhostChat } from './components/GhostChat';
import { GhostMeter } from './components/GhostMeter';
import { UnifiedGallery } from './components/UnifiedGallery';
import { NotableSpiritsRegistry } from './components/NotableSpiritsRegistry';
import { Sidebar } from './components/Sidebar';
import { List, Search, Menu, X, LayoutGrid, LayoutList } from 'lucide-react';
import { GiThermometerScale, GiCrystalBall } from "react-icons/gi";
import { LiaGhostSolid } from "react-icons/lia";
import { TbPolaroid, TbMapPin, TbLayoutCards } from "react-icons/tb";

const STORAGE_KEY = 'nola_cemetery_passport_v2';

// Views configuration for Swipe
const VIEWS = ['chat', 'dashboard', 'gallery', 'meter'] as const;
type MainView = typeof VIEWS[number];

const App: React.FC = () => {
  const [cemeteries, setCemeteries] = useState<Cemetery[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // View States
  const [currentViewIndex, setCurrentViewIndex] = useState(1); // Default to Dashboard (index 1)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedCemeteryId, setSelectedCemeteryId] = useState<string | null>(null);
  const [detailViewTab, setDetailViewTab] = useState<'overview' | 'spirits' | 'gallery'>('overview');
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false);
  const [isSpiritsRegistryOpen, setIsSpiritsRegistryOpen] = useState(false);
  
  // Dashboard Mode State: 'card' is default, 'map', 'grid' (1:1), 'list' (compact row)
  const [dashboardMode, setDashboardMode] = useState<'card' | 'grid' | 'list' | 'map'>('card');

  // Search State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter & Sort States
  const [filter, setFilter] = useState<'all' | 'visited' | 'pending'>('all');
  const [sortType, setSortType] = useState<'name' | 'date'>('name');

  // Touch handling for swipe
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

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
              longHistory: saved.longHistory || '',
              founded: saved.founded || '',
              interments: saved.interments || '',
              notableInterments: saved.notableInterments || [],
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

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchStartY.current = e.targetTouches[0].clientY;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartX.current || !touchEndX.current) return;
    
    // Horizontal Swipe (Nav)
    const distanceX = touchStartX.current - touchEndX.current;
    if (Math.abs(distanceX) > 50) {
        const isLeftSwipe = distanceX > 50;
        const isRightSwipe = distanceX < -50;

        if (isLeftSwipe && currentViewIndex < VIEWS.length - 1) {
            setCurrentViewIndex(prev => prev + 1);
        }
        if (isRightSwipe && currentViewIndex > 0) {
            setCurrentViewIndex(prev => prev - 1);
        }
    }

    // Vertical Swipe (Pull Down for Chat)
    if (touchStartY.current && e.changedTouches[0]) {
        const touchEndY = e.changedTouches[0].clientY;
        const distanceY = touchEndY - touchStartY.current;
        
        // Only trigger if starting near top (simulating pull down) and pulling down significantly
        if (distanceY > 100 && touchStartY.current < 150) {
            setCurrentViewIndex(0); // Open Chat
        }
    }
    
    // Reset
    touchStartX.current = null;
    touchEndX.current = null;
    touchStartY.current = null;
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
        <LiaGhostSolid className="animate-pulse w-12 h-12" />
      </div>
    );
  }

  const selectedCemetery = cemeteries.find(c => c.id === selectedCemeteryId);
  const currentView = VIEWS[currentViewIndex];

  return (
    <div 
        className="min-h-screen bg-black text-zinc-300 font-sans selection:bg-white selection:text-black relative overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
    >
      
      {/* Navigation Sidebar */}
      <Sidebar 
         isOpen={isSidebarOpen} 
         onClose={() => setIsSidebarOpen(false)} 
         filter={filter}
         onFilterChange={setFilter}
         sortType={sortType}
         onSortChange={setSortType}
         onOpenGallery={() => { setCurrentViewIndex(2); setIsSidebarOpen(false); }}
         onOpenAchievements={() => { setIsAchievementsOpen(true); setIsSidebarOpen(false); }}
         onOpenSpirits={() => { setIsSpiritsRegistryOpen(true); setIsSidebarOpen(false); }}
         onGoHome={() => { setCurrentViewIndex(1); setIsSidebarOpen(false); }}
         onOpenChat={() => { setCurrentViewIndex(0); setIsSidebarOpen(false); }}
         onOpenMeter={() => { setCurrentViewIndex(3); setIsSidebarOpen(false); }}
      />

      {/* Sticky Header with Integrated Controls */}
      <header 
        ref={headerRef}
        onMouseMove={handleHeaderMouseMove}
        className="sticky top-0 z-40 bg-[#050505] border-b border-zinc-900 transition-all duration-300 group relative shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)]"
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

        <div className="w-full mx-auto relative z-10 flex items-center justify-between gap-4 h-16 md:h-20" style={{ maxWidth: 'var(--container-max-width)', padding: '0 var(--space-md)' }}>
            
            {/* Left: Menu & Brand */}
            <div className="flex items-center gap-4 shrink-0">
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="text-zinc-400 hover:text-white transition-colors p-2"
                >
                    <Menu size={24} />
                </button>
                {/* Chat Icon - Left Aligned */}
                <button
                   onClick={() => setCurrentViewIndex(0)}
                   className={`p-2 rounded transition-colors ${currentView === 'chat' ? 'text-white bg-zinc-800' : 'text-zinc-500 hover:text-white'}`}
                   title="Spirit Box"
                >
                   <GiCrystalBall size={24} />
                </button>

                <div className="hidden md:flex flex-col ml-2">
                  <h1 className="font-serif text-lg font-bold leading-tight text-zinc-200 tracking-[0.15em] uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                    <span className="animate-flicker-glow block">Travel Guide</span>
                  </h1>
                </div>
            </div>

            {/* Right: Tools & Toggles */}
            <div className="flex items-center gap-1 md:gap-3 shrink-0">
               {/* Search Toggle */}
               <button
                  onClick={() => setIsSearchOpen(!isSearchOpen)}
                  className={`p-2 rounded transition-colors ${isSearchOpen || searchQuery ? 'text-white bg-zinc-800' : 'text-zinc-500 hover:text-white'}`}
                  title="Search"
               >
                  <Search size={20} />
               </button>

               {/* View Mode Switcher (Dashboard only) */}
               {currentViewIndex === 1 && (
                   <div className="flex bg-zinc-900 border border-zinc-800 rounded-sm p-1 gap-1">
                       <button
                          onClick={() => setDashboardMode('card')}
                          className={`p-1.5 rounded-sm transition-colors ${dashboardMode === 'card' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                          title="Card View"
                       >
                          <TbLayoutCards size={16} />
                       </button>
                       <button
                          onClick={() => setDashboardMode('grid')}
                          className={`p-1.5 rounded-sm transition-colors ${dashboardMode === 'grid' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                          title="Grid View (1:1)"
                       >
                          <LayoutGrid size={16} />
                       </button>
                       <button
                          onClick={() => setDashboardMode('list')}
                          className={`p-1.5 rounded-sm transition-colors ${dashboardMode === 'list' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                          title="List View"
                       >
                          <LayoutList size={16} />
                       </button>
                       <button
                          onClick={() => setDashboardMode('map')}
                          className={`p-1.5 rounded-sm transition-colors ${dashboardMode === 'map' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                          title="Map View"
                       >
                          <TbMapPin size={16} />
                       </button>
                   </div>
               )}

               <div className="w-px h-6 bg-zinc-800 mx-1"></div>

               {/* Quick Jump Icons */}
               <button
                  onClick={() => setCurrentViewIndex(1)}
                  className={`p-2 rounded transition-colors ${currentView === 'dashboard' ? 'text-white bg-zinc-800' : 'text-zinc-500 hover:text-white'}`}
                  title="Dashboard"
               >
                  <List size={20} />
               </button>
               <button
                  onClick={() => setCurrentViewIndex(2)}
                  className={`p-2 rounded transition-colors ${currentView === 'gallery' ? 'text-white bg-zinc-800' : 'text-zinc-500 hover:text-white'}`}
                  title="Evidence"
               >
                  <TbPolaroid size={20} />
               </button>
               <button
                  onClick={() => setCurrentViewIndex(3)}
                  className={`p-2 rounded transition-colors ${currentView === 'meter' ? 'text-green-500 bg-zinc-800' : 'text-zinc-500 hover:text-green-500'}`}
                  title="P.K.E. Meter"
               >
                  <GiThermometerScale size={20} />
               </button>
            </div>
        </div>

        {/* Global Dropdown Search Bar */}
        <div className={`absolute top-full left-0 w-full bg-[#0a0a0a] border-b border-zinc-800 transition-all duration-300 overflow-hidden ${isSearchOpen ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="max-w-4xl mx-auto p-4 flex items-center gap-3">
                 <Search size={18} className="text-zinc-500 shrink-0" />
                 <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="SEARCH SPIRITS, LOCATIONS, OR HISTORY..."
                    className="flex-1 bg-transparent border-none text-zinc-200 placeholder-zinc-700 focus:outline-none font-mono uppercase tracking-widest text-sm"
                    autoFocus={isSearchOpen}
                 />
                 {searchQuery && (
                     <button onClick={() => setSearchQuery('')} className="text-zinc-600 hover:text-white">
                         <X size={16} />
                     </button>
                 )}
            </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="relative w-full overflow-hidden" style={{ height: 'calc(100vh - 80px)' }}>
          
          {/* View Container with transitions */}
          <div className="w-full h-full relative">
              
              {/* Chat View */}
              {currentView === 'chat' && (
                  <div className="w-full h-full absolute inset-0 animate-in slide-in-from-top duration-500 z-50">
                      <GhostChat isOpen={true} onClose={() => setCurrentViewIndex(1)} fullScreen={true} />
                  </div>
              )}

              {/* Dashboard View */}
              {currentView === 'dashboard' && (
                  <div className="w-full h-full absolute inset-0 overflow-y-auto pb-24 animate-in fade-in duration-300 scroll-smooth">
                      
                      {/* Map Mode: Map on top (edge-to-edge), List below */}
                      {dashboardMode === 'map' && (
                          <div className="flex flex-col w-full h-full">
                              <div className="w-full h-full sticky top-0 z-20">
                                <CemeteryMap 
                                  cemeteries={processedCemeteries} 
                                  onSelectCemetery={(id) => { setSelectedCemeteryId(id); setDetailViewTab('overview'); }}
                                />
                              </div>
                          </div>
                      )}

                      {/* Card / Grid / List Modes */}
                      {dashboardMode !== 'map' && (
                          <main className="w-full mx-auto relative z-0" style={{ maxWidth: 'var(--container-max-width)', padding: 'var(--space-md)' }}>
                            {/* Cemetery of the Day (Only in Card Mode) */}
                            {dashboardMode === 'card' && cemeteryOfTheDay && (
                              <CemeteryOfTheDay 
                                cemetery={cemeteryOfTheDay} 
                                onUpdate={handleUpdateCemetery}
                                onViewDetails={(id) => { setSelectedCemeteryId(id); setDetailViewTab('overview'); }}
                              />
                            )}

                            {/* Info Bar / Result Count */}
                            <div className="flex justify-between items-center mb-6 px-2 border-b border-zinc-900 pb-2">
                              <span className="text-[10px] font-mono uppercase text-zinc-500 tracking-widest">
                                  {filter !== 'all' && <span className="text-white font-bold mr-2">{filter}</span>}
                                  Displaying {processedCemeteries.length} Locations
                              </span>
                              <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-600 uppercase">
                                  <span>Sorted by {sortType}</span>
                              </div>
                            </div>

                            {/* Dynamic Grid Layout based on Mode */}
                            <div 
                              className={`
                                  ${dashboardMode === 'card' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[var(--space-md)]' : ''}
                                  ${dashboardMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3' : ''}
                                  ${dashboardMode === 'list' ? 'flex flex-col gap-3' : ''}
                              `}
                            >
                              {processedCemeteries.length > 0 ? (
                                processedCemeteries.map(cemetery => (
                                  <div key={cemetery.id}>
                                      <CemeteryCard 
                                        cemetery={cemetery} 
                                        onUpdate={handleUpdateCemetery}
                                        onOpenGallery={() => { setSelectedCemeteryId(cemetery.id); setDetailViewTab('gallery'); }}
                                        onViewDetails={() => { setSelectedCemeteryId(cemetery.id); setDetailViewTab('overview'); }}
                                        mode={dashboardMode}
                                      />
                                  </div>
                                ))
                              ) : (
                                <div className="col-span-full py-20 text-center text-zinc-700 bg-zinc-950/30 border border-zinc-900 border-dashed">
                                  <LiaGhostSolid className="w-16 h-16 mx-auto mb-4 opacity-10" />
                                  <p className="text-lg font-serif">No spirits found matching your inquiry.</p>
                                  <button onClick={() => setFilter('all')} className="mt-4 text-xs underline uppercase tracking-widest hover:text-zinc-400">View All</button>
                                </div>
                              )}
                            </div>
                        </main>
                      )}
                  </div>
              )}

              {/* Gallery View */}
              {currentView === 'gallery' && (
                  <div className="w-full h-full absolute inset-0 animate-in fade-in slide-in-from-right-10 duration-300">
                      <UnifiedGallery cemeteries={cemeteries} onClose={() => setCurrentViewIndex(1)} />
                  </div>
              )}

              {/* Meter View */}
              {currentView === 'meter' && (
                  <div className="w-full h-full absolute inset-0 animate-in fade-in slide-in-from-right-10 duration-300">
                      <GhostMeter isOpen={true} onClose={() => setCurrentViewIndex(1)} />
                  </div>
              )}
          </div>
      </div>

      {/* Navigation Dots for Mobile Context */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-30 pointer-events-none">
          {VIEWS.map((v, i) => (
              <div 
                key={v} 
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === currentViewIndex ? 'bg-white scale-125' : 'bg-zinc-700'}`} 
              />
          ))}
      </div>

      {/* Full Page Detail Modal Overlay */}
      {selectedCemetery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
             className="w-full h-full max-w-5xl max-h-[100vh] md:max-h-[95vh] md:rounded-lg overflow-hidden border border-zinc-800 shadow-[0_0_100px_rgba(0,0,0,0.8)] relative animate-in zoom-in-95 duration-300"
             onClick={(e) => e.stopPropagation()}
          >
             <CemeteryDetailView 
                cemetery={selectedCemetery}
                onUpdate={handleUpdateCemetery}
                onClose={() => setSelectedCemeteryId(null)}
                initialTab={detailViewTab}
             />
          </div>
        </div>
      )}

      {/* Achievements Overlay */}
      {isAchievementsOpen && (
          <div className="fixed inset-0 z-50 bg-black animate-in slide-in-from-bottom duration-300">
              <AchievementsView 
                 total={cemeteries.length} 
                 visited={visitedCount} 
                 onClose={() => setIsAchievementsOpen(false)} 
              />
          </div>
      )}

      {/* Notable Spirits Registry Overlay */}
      {isSpiritsRegistryOpen && (
          <div className="fixed inset-0 z-50 bg-black animate-in slide-in-from-bottom duration-300">
              <NotableSpiritsRegistry 
                 cemeteries={cemeteries}
                 onUpdateCemetery={handleUpdateCemetery}
                 onClose={() => setIsSpiritsRegistryOpen(false)} 
              />
          </div>
      )}

    </div>
  );
};

export default App;