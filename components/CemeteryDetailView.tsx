import React, { useState, useRef, useEffect } from 'react';
import { Cemetery, NotableInterment } from '../types';
import { generateCemeteryDetails } from '../services/geminiService';
import { 
  MapPin, Calendar, Users, BookOpen, 
  Trash2, Edit3, Save, X, Plus, 
  Loader2, Sparkles, Image as ImageIcon,
  Check, Star, ChevronLeft, ChevronRight,
  LayoutGrid, Film, LayoutDashboard, AlertTriangle, Download, Camera
} from 'lucide-react';
import { LiaGhostSolid } from "react-icons/lia";
import { GiTombstone, GiGraveFlowers } from "react-icons/gi";
import { RiPolaroid2Line } from "react-icons/ri";
import { TbPolaroid } from "react-icons/tb";

interface CemeteryDetailViewProps {
  cemetery: Cemetery;
  onUpdate: (id: string, updates: Partial<Cemetery>) => void;
  onClose: () => void;
  initialTab?: 'overview' | 'spirits' | 'gallery';
}

export const CemeteryDetailView: React.FC<CemeteryDetailViewProps> = ({ cemetery, onUpdate, onClose, initialTab = 'overview' }) => {
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'spirits' | 'gallery'>(initialTab);
  const [isAddingSpirit, setIsAddingSpirit] = useState(false);
  const [newSpirit, setNewSpirit] = useState<Partial<NotableInterment>>({
      name: '', deathDate: '', epitaph: '', bio: '', photo: ''
  });
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [galleryViewMode, setGalleryViewMode] = useState<'grid' | 'reel' | 'mosaic'>('grid');
  const [photoToDelete, setPhotoToDelete] = useState<number | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const heroFileInputRef = useRef<HTMLInputElement>(null);
  const spiritPhotoInputRef = useRef<HTMLInputElement>(null);
  const touchStartX = useRef(0);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowLeft') showPrev();
      if (e.key === 'ArrowRight') showNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, cemetery.photos.length]);

  const handleSummonDetails = async () => {
    setLoadingDetails(true);
    const details = await generateCemeteryDetails(cemetery.name);
    if (details) {
        onUpdate(cemetery.id, {
            founded: details.founded,
            interments: details.interments,
            longHistory: details.longHistory
        });
    }
    setLoadingDetails(false);
  };

  const handleMultiplePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const newPhotos: string[] = [];
      let processedCount = 0;

      Array.from(files).forEach((file: File) => {
          const reader = new FileReader();
          reader.onloadend = () => {
              newPhotos.push(reader.result as string);
              processedCount++;
              
              if (processedCount === files.length) {
                  // All processed, update state
                  onUpdate(cemetery.id, { photos: [...newPhotos, ...cemetery.photos] });
              }
          };
          reader.readAsDataURL(file);
      });
    }
  };

  const handleSpiritPhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setNewSpirit(prev => ({ ...prev, photo: base64String }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = (indexToRemove: number) => {
    const updatedPhotos = cemetery.photos.filter((_, index) => index !== indexToRemove);
    onUpdate(cemetery.id, { photos: updatedPhotos });
    
    // Intelligent lightbox navigation after delete
    if (lightboxIndex !== null) {
         if (updatedPhotos.length === 0) {
             setLightboxIndex(null);
         } else if (indexToRemove === lightboxIndex) {
             const newIndex = indexToRemove >= updatedPhotos.length ? updatedPhotos.length - 1 : indexToRemove;
             setLightboxIndex(newIndex);
         } else if (indexToRemove < lightboxIndex) {
             setLightboxIndex(lightboxIndex - 1);
         }
    }
  };

  const initiateDelete = (e: React.MouseEvent, index: number) => {
      e.stopPropagation();
      setPhotoToDelete(index);
  };

  const confirmDelete = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (photoToDelete !== null) {
          removePhoto(photoToDelete);
          setPhotoToDelete(null);
      }
  };

  const cancelDelete = (e: React.MouseEvent) => {
      e.stopPropagation();
      setPhotoToDelete(null);
  };

  const makePrimary = (index: number) => {
    if (index === 0) return;
    const photo = cemetery.photos[index];
    const newPhotos = [...cemetery.photos];
    newPhotos.splice(index, 1);
    newPhotos.unshift(photo);
    onUpdate(cemetery.id, { photos: newPhotos });
    if (lightboxIndex === index) setLightboxIndex(0);
    else if (lightboxIndex !== null && lightboxIndex < index) {
        setLightboxIndex(lightboxIndex + 1);
    }
  };

  const handleAddSpirit = () => {
    if (!newSpirit.name) return;
    const spirit: NotableInterment = {
        id: Date.now().toString(),
        name: newSpirit.name || 'Unknown Soul',
        deathDate: newSpirit.deathDate || '',
        epitaph: newSpirit.epitaph || '',
        bio: newSpirit.bio || '',
        photo: newSpirit.photo
    };
    const updated = [...(cemetery.notableInterments || []), spirit];
    onUpdate(cemetery.id, { notableInterments: updated });
    setIsAddingSpirit(false);
    setNewSpirit({ name: '', deathDate: '', epitaph: '', bio: '', photo: '' });
  };

  const removeSpirit = (id: string) => {
      const updated = (cemetery.notableInterments || []).filter(s => s.id !== id);
      onUpdate(cemetery.id, { notableInterments: updated });
  };

  // Lightbox Navigation
  const showNext = () => {
    if (lightboxIndex !== null && lightboxIndex < cemetery.photos.length - 1) {
      setLightboxIndex(lightboxIndex + 1);
    }
  };

  const showPrev = () => {
    if (lightboxIndex !== null && lightboxIndex > 0) {
      setLightboxIndex(lightboxIndex - 1);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0].screenX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].screenX;
    if (touchStartX.current - touchEndX > 50) showNext();
    if (touchEndX - touchStartX.current > 50) showPrev();
  };

  // Helper to format date if ISO
  const formatDate = (dateString?: string) => {
      if (!dateString) return '';
      try {
          return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
      } catch {
          return dateString;
      }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-zinc-200 overflow-hidden relative">
        {/* Hero Section - Adaptive Aspect Ratio */}
        <div className="relative w-full shrink-0 group bg-[#0a0a0a]">
             {cemetery.photos.length > 0 ? (
                 <div className="w-full max-h-[100vw] md:max-h-[60vh] flex items-center justify-center overflow-hidden relative">
                    <img 
                        src={cemetery.photos[0]} 
                        alt="Hero" 
                        onClick={() => setLightboxIndex(0)}
                        className="w-full h-auto object-cover transition-all duration-700 grayscale group-hover:grayscale-0 opacity-60 group-hover:opacity-80 cursor-pointer" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/20 to-transparent pointer-events-none"></div>
                 </div>
             ) : (
                 <div className="w-full aspect-square md:max-h-[60vh] bg-[#050505] flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05),transparent_60%)]"></div>
                      <ImageIcon size={64} className="text-zinc-800 opacity-20" />
                 </div>
             )}
             
             {/* Header Content */}
             <div className="absolute bottom-0 left-0 w-full p-6 md:p-8 z-20 pointer-events-none">
                 <div className="flex justify-between items-end pointer-events-auto">
                     <div>
                        <div className="flex items-center gap-2 mb-2">
                             <div className="px-2 py-0.5 bg-black/50 backdrop-blur-sm border border-zinc-800 rounded text-[10px] uppercase font-bold tracking-widest text-zinc-400">
                                 {cemetery.visited ? <span className="text-green-500 flex items-center gap-1"><Check size={10} /> Visited</span> : "Unvisited"}
                             </div>
                             {cemetery.visitedDate && <span className="text-[10px] font-mono text-zinc-500">{formatDate(cemetery.visitedDate)}</span>}
                        </div>
                        <h1 className="text-2xl md:text-5xl font-serif font-bold text-white tracking-wide drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] mb-2 leading-tight">
                            {cemetery.name}
                        </h1>
                        <div className="flex items-center text-zinc-300 text-xs uppercase tracking-widest">
                            <MapPin size={12} className="mr-2 opacity-80" />
                            {cemetery.address}
                        </div>
                     </div>
                     
                     {/* Add Photo Button (Easy Camera Access) */}
                     <button 
                        onClick={() => heroFileInputRef.current?.click()}
                        className="flex flex-col items-center justify-center w-16 h-16 rounded-full bg-white text-black hover:bg-zinc-200 transition-transform active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.3)] z-30"
                        title="Add Evidence"
                     >
                        <Camera size={24} />
                        <span className="text-[9px] font-bold uppercase mt-1">Snap</span>
                     </button>
                     <input 
                        type="file" 
                        ref={heroFileInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        multiple 
                        capture="environment"
                        onChange={handleMultiplePhotoUpload} 
                     />
                 </div>
             </div>
             
             {/* Close Button */}
             <button 
                onClick={onClose}
                className="absolute top-4 right-4 md:top-6 md:right-6 p-2 rounded-full bg-black/40 hover:bg-black/80 text-white backdrop-blur border border-white/10 transition-colors z-50"
             >
                <X size={24} />
             </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-zinc-800 bg-zinc-950/80 backdrop-blur z-10 sticky top-0 overflow-x-auto no-scrollbar">
            {(['overview', 'spirits', 'gallery'] as const).map(tab => (
                <button
                   key={tab}
                   onClick={() => setActiveTab(tab)}
                   className={`flex-1 py-4 px-4 md:px-6 text-xs uppercase font-bold tracking-[0.2em] transition-colors whitespace-nowrap border-b-2 ${activeTab === tab ? 'text-white border-white bg-white/5' : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-zinc-900'}`}
                >
                    {tab}
                </button>
            ))}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 bg-[#0a0a0a] pb-24">
            
            {activeTab === 'overview' && (
                <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 border border-zinc-800 bg-zinc-900/30 rounded-sm">
                            <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-2">
                                <Calendar size={14} /> Founded
                            </div>
                            <div className="text-lg md:text-xl font-serif text-white break-words">
                                {cemetery.founded || <span className="text-zinc-700 italic text-sm">Unknown...</span>}
                            </div>
                        </div>
                        <div className="p-4 border border-zinc-800 bg-zinc-900/30 rounded-sm">
                             <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-2">
                                <Users size={14} /> Interments
                            </div>
                            <div className="text-lg md:text-xl font-serif text-white break-words">
                                {cemetery.interments || <span className="text-zinc-700 italic text-sm">Counting souls...</span>}
                            </div>
                        </div>
                    </div>

                    {/* History Content */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                             <h3 className="text-lg font-serif font-bold text-zinc-300">Historical Records</h3>
                             {(!cemetery.longHistory || !cemetery.founded) && (
                                 <button 
                                    onClick={handleSummonDetails}
                                    disabled={loadingDetails}
                                    className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest px-3 py-1.5 border border-zinc-700 hover:border-zinc-400 hover:text-white text-zinc-400 transition-all bg-zinc-900/50"
                                 >
                                     {loadingDetails ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                     {loadingDetails ? "Consulting..." : "Summon Deep History"}
                                 </button>
                             )}
                        </div>
                        
                        <div className="prose prose-invert prose-zinc max-w-none font-serif leading-relaxed text-zinc-300 opacity-90 text-sm md:text-base">
                            {cemetery.longHistory ? (
                                <p className="whitespace-pre-line">{cemetery.longHistory}</p>
                            ) : cemetery.history ? (
                                <p>{cemetery.history}</p>
                            ) : (
                                <p className="italic text-zinc-600">The archives are sealed. Summon deep history to break the seal.</p>
                            )}
                        </div>
                    </div>

                    {/* User Notes Inline */}
                    <div className="space-y-2 pt-4 border-t border-zinc-800">
                         <div className="text-xs uppercase font-bold tracking-widest text-zinc-500 mb-2 flex items-center gap-2"><Edit3 size={12} /> Field Notes</div>
                         <textarea 
                            value={cemetery.userNotes}
                            onChange={(e) => onUpdate(cemetery.id, { userNotes: e.target.value })}
                            className="w-full bg-black/40 border border-zinc-800 p-4 text-sm font-mono text-zinc-300 focus:outline-none focus:border-zinc-600 transition-colors min-h-[120px]"
                            placeholder="Record your observations here..."
                         />
                    </div>
                </div>
            )}

            {activeTab === 'spirits' && (
                <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                             <GiTombstone size={24} className="text-zinc-500" />
                             <h2 className="text-xl font-serif font-bold text-white">Notable Spirits Registry</h2>
                        </div>
                        <button 
                           onClick={() => setIsAddingSpirit(true)}
                           className="flex items-center gap-2 bg-zinc-100 hover:bg-white text-black px-4 py-2 text-xs font-bold uppercase tracking-widest transition-transform hover:scale-105"
                        >
                            <Plus size={14} /> Log Spirit
                        </button>
                    </div>

                    {/* Add Spirit Form */}
                    {isAddingSpirit && (
                        <div className="bg-zinc-900/50 border border-zinc-700 p-6 rounded-sm space-y-4 animate-in fade-in zoom-in-95">
                             <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4">New Registry Entry</h3>
                             
                             <div className="flex flex-col md:flex-row gap-4 mb-4">
                                <div 
                                    onClick={() => spiritPhotoInputRef.current?.click()}
                                    className="w-full md:w-32 h-32 border border-zinc-700 border-dashed rounded flex items-center justify-center cursor-pointer hover:bg-zinc-800 transition-colors relative overflow-hidden group"
                                >
                                    {newSpirit.photo ? (
                                        <img src={newSpirit.photo} className="w-full h-full object-cover" alt="Spirit" />
                                    ) : (
                                        <div className="text-center text-zinc-500">
                                            <ImageIcon size={20} className="mx-auto mb-1" />
                                            <span className="text-[10px] uppercase">Photo</span>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Plus size={20} className="text-white" />
                                    </div>
                                    <input type="file" ref={spiritPhotoInputRef} className="hidden" accept="image/*" onChange={handleSpiritPhotoUpload} />
                                </div>
                                <div className="flex-1 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <input 
                                            type="text" 
                                            placeholder="Name of Deceased"
                                            value={newSpirit.name}
                                            onChange={(e) => setNewSpirit({...newSpirit, name: e.target.value})}
                                            className="bg-black border border-zinc-700 p-3 text-sm focus:outline-none focus:border-zinc-400 text-white w-full"
                                        />
                                        <input 
                                            type="text" 
                                            placeholder="Date of Death/Burial"
                                            value={newSpirit.deathDate}
                                            onChange={(e) => setNewSpirit({...newSpirit, deathDate: e.target.value})}
                                            className="bg-black border border-zinc-700 p-3 text-sm focus:outline-none focus:border-zinc-400 text-white w-full"
                                        />
                                    </div>
                                    <input 
                                        type="text" 
                                        placeholder="Epitaph (if readable)"
                                        value={newSpirit.epitaph}
                                        onChange={(e) => setNewSpirit({...newSpirit, epitaph: e.target.value})}
                                        className="w-full bg-black border border-zinc-700 p-3 text-sm focus:outline-none focus:border-zinc-400 text-white italic"
                                    />
                                </div>
                             </div>

                             <textarea 
                                placeholder="Short Biography / Significance..."
                                value={newSpirit.bio}
                                onChange={(e) => setNewSpirit({...newSpirit, bio: e.target.value})}
                                className="w-full bg-black border border-zinc-700 p-3 text-sm focus:outline-none focus:border-zinc-400 text-white min-h-[80px]"
                             />
                             <div className="flex justify-end gap-3 pt-2">
                                 <button onClick={() => setIsAddingSpirit(false)} className="text-xs uppercase font-bold text-zinc-500 hover:text-white px-3 py-2">Cancel</button>
                                 <button onClick={handleAddSpirit} className="bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 text-xs uppercase font-bold tracking-widest">Add to Registry</button>
                             </div>
                        </div>
                    )}

                    {/* List */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(cemetery.notableInterments && cemetery.notableInterments.length > 0) ? (
                            cemetery.notableInterments.map(spirit => (
                                <div key={spirit.id} className="bg-zinc-900/20 border border-zinc-800 p-6 hover:border-zinc-600 transition-colors group relative flex gap-4 items-start">
                                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => removeSpirit(spirit.id)} className="text-zinc-600 hover:text-red-500"><Trash2 size={14} /></button>
                                    </div>
                                    
                                    {spirit.photo && (
                                        <div className="w-16 h-20 shrink-0 border border-zinc-700 rounded-sm overflow-hidden">
                                            <img src={spirit.photo} alt={spirit.name} className="w-full h-full object-cover grayscale opacity-80" />
                                        </div>
                                    )}

                                    <div className="flex-1">
                                        <h4 className="font-serif text-lg font-bold text-white mb-1">{spirit.name}</h4>
                                        <div className="text-xs font-mono text-zinc-500 mb-4">{spirit.deathDate}</div>
                                        
                                        {spirit.epitaph && (
                                            <div className="mb-4 pl-3 border-l-2 border-zinc-700 italic text-zinc-400 text-sm">
                                                "{spirit.epitaph}"
                                            </div>
                                        )}
                                        <p className="text-sm text-zinc-300 leading-relaxed">{spirit.bio}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full py-12 text-center border border-dashed border-zinc-800 text-zinc-600">
                                <GiGraveFlowers className="mx-auto mb-3 opacity-20" size={32} />
                                <p className="text-sm italic">No spirits have been logged in the registry yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'gallery' && (
                <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
                    <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
                        <h2 className="text-lg font-serif font-bold text-zinc-300">Photographic Evidence</h2>
                        
                        <div className="flex flex-wrap items-center gap-4 justify-end">
                            {/* View Mode Toggles */}
                            <div className="flex bg-zinc-900 border border-zinc-700 rounded-sm p-1 gap-1">
                                <button 
                                    onClick={() => setGalleryViewMode('grid')} 
                                    className={`p-1.5 rounded-sm transition-colors ${galleryViewMode === 'grid' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    title="Grid View"
                                >
                                    <LayoutGrid size={16} />
                                </button>
                                <button 
                                    onClick={() => setGalleryViewMode('reel')} 
                                    className={`p-1.5 rounded-sm transition-colors ${galleryViewMode === 'reel' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    title="Reel View"
                                >
                                    <Film size={16} />
                                </button>
                                <button 
                                    onClick={() => setGalleryViewMode('mosaic')} 
                                    className={`p-1.5 rounded-sm transition-colors ${galleryViewMode === 'mosaic' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    title="Mosaic View"
                                >
                                    <LayoutDashboard size={16} />
                                </button>
                            </div>

                            <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2 border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white px-4 py-2 text-xs uppercase font-bold tracking-widest transition-colors"
                            >
                                <RiPolaroid2Line size={14} /> <span className="hidden sm:inline">Upload</span>
                            </button>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleMultiplePhotoUpload} />
                        </div>
                    </div>

                    {cemetery.photos.length > 0 ? (
                        <div className={`
                            transition-all duration-300
                            ${galleryViewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4' : ''}
                            ${galleryViewMode === 'reel' ? 'flex flex-col space-y-8 max-w-2xl mx-auto' : ''}
                            ${galleryViewMode === 'mosaic' ? 'grid grid-cols-2 md:grid-cols-4 gap-2 auto-rows-[150px] md:auto-rows-[200px] grid-flow-dense' : ''}
                        `}>
                            {cemetery.photos.map((photo, index) => {
                                const isLargeMosaic = galleryViewMode === 'mosaic' && (index % 6 === 0);
                                const isWideMosaic = galleryViewMode === 'mosaic' && (index % 6 === 3);

                                return (
                                    <div 
                                        key={index} 
                                        className={`
                                            relative group border border-zinc-800 bg-zinc-900 overflow-hidden cursor-pointer shadow-lg
                                            ${galleryViewMode === 'grid' ? 'aspect-square' : ''}
                                            ${galleryViewMode === 'reel' ? 'aspect-[4/3] md:aspect-[16/9]' : ''}
                                            ${isLargeMosaic ? 'col-span-2 row-span-2' : ''}
                                            ${isWideMosaic ? 'col-span-2' : ''}
                                            ${galleryViewMode === 'mosaic' && !isLargeMosaic && !isWideMosaic ? 'col-span-1' : ''}
                                        `}
                                        onClick={() => setLightboxIndex(index)}
                                    >
                                        <img src={photo} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Evidence" />
                                        
                                        {/* Overlay (Shown on hover/tap if not deleting) */}
                                        {photoToDelete !== index && (
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                                                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                                    <button onClick={(e) => initiateDelete(e, index)} className="p-2 bg-red-900/80 text-white rounded-full hover:bg-red-700 transition-colors" title="Delete">
                                                        <Trash2 size={16} />
                                                    </button>
                                                    <a href={photo} download={`evidence-${cemetery.id}-${index}.jpg`} className="p-2 bg-zinc-800 text-white rounded-full hover:bg-zinc-600 transition-colors" title="Download">
                                                        <Save size={16} />
                                                    </a>
                                                </div>
                                                {index !== 0 && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); makePrimary(index); }} 
                                                        className="px-3 py-1 bg-zinc-800 hover:bg-zinc-200 text-zinc-300 hover:text-black text-[10px] uppercase font-bold rounded-full border border-zinc-600 transition-colors flex items-center gap-1"
                                                    >
                                                        <Star size={10} /> Make Primary
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {/* Delete Confirmation Overlay (Grid/Inline) */}
                                        {photoToDelete === index && (
                                            <div className="absolute inset-0 bg-black/90 z-20 flex flex-col items-center justify-center p-4 text-center animate-in fade-in cursor-default" onClick={(e) => e.stopPropagation()}>
                                                <AlertTriangle size={24} className="text-red-500 mb-2 animate-bounce" />
                                                <p className="text-[10px] md:text-xs text-zinc-300 mb-4 font-bold tracking-wider">DESTROY EVIDENCE?</p>
                                                <div className="flex gap-2">
                                                    <button onClick={confirmDelete} className="bg-red-900 hover:bg-red-800 text-white text-[10px] uppercase font-bold px-3 py-2 rounded border border-red-700 transition-colors">
                                                        Confirm
                                                    </button>
                                                    <button onClick={cancelDelete} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] uppercase font-bold px-3 py-2 rounded border border-zinc-600 transition-colors">
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {index === 0 && photoToDelete !== index && (
                                            <div className="absolute top-2 left-2 bg-green-600/90 text-white text-[9px] uppercase font-bold px-2 py-0.5 rounded-sm shadow-md flex items-center gap-1 pointer-events-none">
                                                <Star size={8} fill="currentColor" /> Primary
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="py-20 text-center bg-zinc-900/20 border border-zinc-800">
                             <ImageIcon className="mx-auto mb-4 text-zinc-700" size={48} />
                             <p className="text-zinc-500 text-sm">No evidence collected.</p>
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* Lightbox Overlay */}
        {lightboxIndex !== null && cemetery.photos[lightboxIndex] && (
            <div 
                className="fixed inset-0 z-[60] bg-black/95 flex flex-col items-center justify-center backdrop-blur-md animate-in fade-in duration-200"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                 <button 
                    onClick={() => setLightboxIndex(null)} 
                    className="absolute top-4 right-4 text-zinc-400 hover:text-white p-2 z-50 bg-black/50 rounded-full hover:bg-black/80 transition-colors"
                 >
                    <X size={28} />
                 </button>
                 
                 {/* Main Image */}
                 <div className="relative w-full flex-1 flex items-center justify-center p-4 overflow-hidden">
                     <img 
                        src={cemetery.photos[lightboxIndex]} 
                        className="max-h-[85vh] max-w-full object-contain shadow-2xl" 
                        alt="Expanded Evidence" 
                     />
                     
                     {/* Delete Confirmation in Lightbox */}
                     {photoToDelete === lightboxIndex && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
                            <div className="bg-zinc-900 border border-zinc-700 p-8 rounded shadow-2xl text-center max-w-sm mx-4">
                                <AlertTriangle size={32} className="text-red-500 mb-4 mx-auto" />
                                <h3 className="text-lg font-serif text-white mb-2">Delete Evidence?</h3>
                                <p className="text-zinc-400 text-sm mb-6">This photo will be permanently removed from your collection.</p>
                                <div className="flex gap-3 justify-center">
                                    <button onClick={confirmDelete} className="bg-red-900 hover:bg-red-800 text-white font-bold py-2 px-6 rounded border border-red-700">Delete</button>
                                    <button onClick={cancelDelete} className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-2 px-6 rounded border border-zinc-600">Cancel</button>
                                </div>
                            </div>
                        </div>
                     )}
                 </div>

                 {/* Navigation Buttons (Desktop) */}
                 {lightboxIndex > 0 && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); showPrev(); }} 
                        className="hidden md:block absolute left-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-4 bg-black/20 hover:bg-black/60 rounded-full transition-colors backdrop-blur-sm"
                    >
                        <ChevronLeft size={48} /> 
                    </button>
                 )}
                 {lightboxIndex < cemetery.photos.length - 1 && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); showNext(); }} 
                        className="hidden md:block absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-4 bg-black/20 hover:bg-black/60 rounded-full transition-colors backdrop-blur-sm"
                    >
                        <ChevronRight size={48} /> 
                    </button>
                 )}
                 
                 {/* Lightbox Footer Controls */}
                 <div className="w-full bg-gradient-to-t from-black via-black/90 to-transparent pt-8 pb-8 px-6 flex flex-col items-center gap-4 z-40">
                     <div className="flex items-center gap-8 justify-center">
                         {/* Make Primary */}
                         {lightboxIndex !== 0 && (
                             <button 
                                onClick={() => makePrimary(lightboxIndex)}
                                className="flex flex-col items-center gap-1 group text-zinc-500 hover:text-yellow-500 transition-colors"
                             >
                                <div className="p-3 rounded-full border border-zinc-800 bg-zinc-900 group-hover:bg-zinc-800 group-hover:border-yellow-500/50 transition-all">
                                    <Star size={20} />
                                </div>
                                <span className="text-[10px] uppercase tracking-widest font-bold">Primary</span>
                             </button>
                         )}

                         {/* Info Counter */}
                         <div className="flex flex-col items-center gap-1 text-zinc-500">
                             <div className="h-11 flex items-center font-mono text-sm tracking-widest">
                                {lightboxIndex + 1} / {cemetery.photos.length}
                             </div>
                         </div>

                         {/* Download */}
                         <a 
                            href={cemetery.photos[lightboxIndex]} 
                            download={`evidence-${cemetery.id}-${lightboxIndex}.jpg`}
                            className="flex flex-col items-center gap-1 group text-zinc-500 hover:text-blue-400 transition-colors"
                         >
                            <div className="p-3 rounded-full border border-zinc-800 bg-zinc-900 group-hover:bg-zinc-800 group-hover:border-blue-500/50 transition-all">
                                <Download size={20} />
                            </div>
                            <span className="text-[10px] uppercase tracking-widest font-bold">Save</span>
                         </a>

                         {/* Delete */}
                         <button 
                            onClick={(e) => initiateDelete(e, lightboxIndex)}
                            className="flex flex-col items-center gap-1 group text-zinc-500 hover:text-red-500 transition-colors"
                         >
                            <div className="p-3 rounded-full border border-zinc-800 bg-zinc-900 group-hover:bg-zinc-800 group-hover:border-red-500/50 transition-all">
                                <Trash2 size={20} />
                            </div>
                            <span className="text-[10px] uppercase tracking-widest font-bold">Delete</span>
                         </button>
                     </div>
                 </div>
            </div>
        )}
    </div>
  );
};