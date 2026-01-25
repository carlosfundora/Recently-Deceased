import React, { useState, useRef, useEffect } from 'react';
import { Cemetery } from '../types';
import { generateCemeteryHistory } from '../services/geminiService';
import { MapPin, Check, BookOpen, Sparkles, Loader2, Trash2, Edit3, X, Calendar, Save, Image as ImageIcon, Plus, ArrowRight, Camera, Upload, ChevronDown, ChevronUp } from 'lucide-react';
import { RiPolaroid2Line } from "react-icons/ri";
import { TbPolaroid } from "react-icons/tb";

interface CemeteryCardProps {
  cemetery: Cemetery;
  onUpdate: (id: string, updates: Partial<Cemetery>) => void;
  onOpenGallery: () => void;
  onViewDetails: () => void;
  mode?: 'card' | 'grid' | 'list';
}

export const CemeteryCard: React.FC<CemeteryCardProps> = ({ cemetery, onUpdate, onOpenGallery, onViewDetails, mode = 'card' }) => {
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [noteDraft, setNoteDraft] = useState(cemetery.userNotes);
  const [showCaptureMenu, setShowCaptureMenu] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false); // For List mode
  
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const primaryCameraInputRef = useRef<HTMLInputElement>(null);
  const primaryUploadInputRef = useRef<HTMLInputElement>(null);
  
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isEditingNotes) {
      setNoteDraft(cemetery.userNotes);
    }
  }, [cemetery.userNotes, isEditingNotes]);

  // Handle generating history with Gemini
  const handleSummonHistory = async () => {
    setLoadingHistory(true);
    const history = await generateCemeteryHistory(cemetery.name);
    onUpdate(cemetery.id, { history });
    setLoadingHistory(false);
  };

  // Handle primary photo upload (inserts at start) - Single Photo
  const handlePrimaryPhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        onUpdate(cemetery.id, { photos: [base64String, ...cemetery.photos] });
        setShowCaptureMenu(false); // Reset menu
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle gallery photo upload (appends to end) - Multiple Photos
  const handleGalleryUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
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
                  // Append new photos to existing ones
                  onUpdate(cemetery.id, { photos: [...cemetery.photos, ...newPhotos] });
              }
          };
          reader.readAsDataURL(file);
      });
    }
  };

  // Toggle visited status with date tracking
  const toggleVisited = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = !cemetery.visited;
    onUpdate(cemetery.id, { 
      visited: newStatus,
      visitedDate: newStatus ? new Date().toISOString() : undefined 
    });
  };

  const removePhoto = (indexToRemove: number) => {
    const updatedPhotos = cemetery.photos.filter((_, index) => index !== indexToRemove);
    onUpdate(cemetery.id, { photos: updatedPhotos });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (cardRef.current && mode === 'card') {
      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      cardRef.current.style.setProperty('--mouse-x', `${x}px`);
      cardRef.current.style.setProperty('--mouse-y', `${y}px`);
    }
  };

  const triggerGalleryUpload = (e: React.MouseEvent) => {
      e.stopPropagation();
      galleryInputRef.current?.click();
  };

  // --------------------------------------------------------------------------------
  // Helper to render shared Interactive Controls (Photo, History, Gallery Preview)
  // Used in Card Mode and List Mode (Expanded)
  // --------------------------------------------------------------------------------
  const renderCardInteractiveContent = () => (
    <div className="space-y-[var(--space-sm)]">
        {/* Primary Photo Section */}
        <div className="" onClick={(e) => e.stopPropagation()}>
            <input
               type="file"
               ref={primaryCameraInputRef}
               className="hidden"
               accept="image/*"
               capture="environment"
               onChange={handlePrimaryPhoto}
             />
             <input
               type="file"
               ref={primaryUploadInputRef}
               className="hidden"
               accept="image/*"
               onChange={handlePrimaryPhoto}
             />
             
             {cemetery.photos.length > 0 ? (
                 <div className="w-full h-48 md:h-56 relative border border-zinc-800 rounded-sm overflow-hidden group/primary">
                     <img 
                       src={cemetery.photos[0]} 
                       alt={cemetery.name} 
                       className="w-full h-full object-cover grayscale opacity-80 group-hover/primary:opacity-100 group-hover/primary:grayscale-0 transition-all duration-700" 
                     />
                     <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>
                     <div className="absolute bottom-3 left-3 flex items-center gap-2">
                        <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-700 px-2 py-1 text-[10px] uppercase font-bold text-zinc-300 tracking-widest flex items-center gap-2">
                            <ImageIcon size={10} />
                            Primary Evidence
                        </div>
                     </div>
                     <button 
                       onClick={() => removePhoto(0)}
                       className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-red-900/80 text-white rounded-full opacity-0 group-hover/primary:opacity-100 transition-all"
                       title="Remove Photo"
                     >
                       <Trash2 size={12} />
                     </button>
                 </div>
             ) : (
                 <div className="w-full h-32 md:h-40 relative rounded-sm overflow-hidden">
                    {showCaptureMenu ? (
                        <div className="absolute inset-0 bg-zinc-950 border border-zinc-700 flex items-center justify-around p-4 animate-in zoom-in-95 duration-200 z-20">
                            <button 
                                onClick={() => primaryCameraInputRef.current?.click()}
                                className="flex flex-col items-center gap-2 group/opt hover:scale-105 transition-transform"
                            >
                                <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-600 flex items-center justify-center group-hover/opt:bg-zinc-700 group-hover/opt:border-white transition-colors">
                                    <Camera size={20} className="text-zinc-400 group-hover/opt:text-white" />
                                </div>
                                <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-500 group-hover/opt:text-white">Snap</span>
                            </button>
                            
                            <div className="w-px h-12 bg-zinc-800"></div>

                            <button 
                                onClick={() => primaryUploadInputRef.current?.click()}
                                className="flex flex-col items-center gap-2 group/opt hover:scale-105 transition-transform"
                            >
                                <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-600 flex items-center justify-center group-hover/opt:bg-zinc-700 group-hover/opt:border-white transition-colors">
                                    <Upload size={20} className="text-zinc-400 group-hover/opt:text-white" />
                                </div>
                                <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-500 group-hover/opt:text-white">Upload</span>
                            </button>

                            <button 
                                onClick={(e) => { e.stopPropagation(); setShowCaptureMenu(false); }} 
                                className="absolute top-2 right-2 text-zinc-600 hover:text-white transition-colors"
                            >
                                <X size={16}/>
                            </button>
                        </div>
                    ) : (
                        <div 
                           onClick={() => setShowCaptureMenu(true)}
                           className="w-full h-full border border-zinc-800 border-dashed rounded-sm bg-zinc-900/10 flex flex-col items-center justify-center gap-2 transition-all group/placeholder relative overflow-hidden cursor-pointer hover:bg-zinc-900/30 hover:border-zinc-600"
                        >
                           <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none"></div>
                           
                           <div className="w-12 h-12 rounded-full bg-zinc-800/50 flex items-center justify-center border border-zinc-700 group-hover/placeholder:scale-110 group-hover/placeholder:border-zinc-500 transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)] relative z-10">
                               <Camera size={20} className="text-zinc-500 group-hover/placeholder:text-zinc-200" />
                           </div>
                           <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600 group-hover/placeholder:text-zinc-400 relative z-10">Capture Spirit</span>
                        </div>
                    )}
                 </div>
             )}
        </div>

        {/* History Section */}
        <div className="pb-[var(--space-sm)] border-b border-zinc-800 flex-grow" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2 group-hover:text-zinc-300 transition-colors">
              <BookOpen size={12} /> History
            </h4>
            {!cemetery.history && (
              <button
                onClick={handleSummonHistory}
                disabled={loadingHistory}
                className="text-[10px] font-bold uppercase tracking-[0.15em] flex items-center gap-1.5 text-zinc-300 hover:text-white transition-colors disabled:opacity-30 border border-zinc-700 px-3 py-1.5 hover:border-zinc-500 bg-zinc-900/50 hover:shadow-[0_0_10px_rgba(255,255,255,0.1)] group-hover:border-zinc-600"
              >
                {loadingHistory ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} className={cemetery.history ? '' : 'animate-pulse'} />}
                {loadingHistory ? 'Communing...' : 'Summon Info'}
              </button>
            )}
          </div>
          
          <div className="text-sm text-zinc-200 leading-relaxed font-light font-sans">
            {cemetery.history ? (
              <p className="animate-in fade-in duration-1000 border-l border-zinc-600 pl-4 italic opacity-100 line-clamp-4">{cemetery.history}</p>
            ) : (
              <p className="italic opacity-50 text-xs transition-opacity duration-500 group-hover:opacity-70 text-zinc-300">The past remains buried...</p>
            )}
          </div>
        </div>

        {/* Photos Preview Section (Limited to 3) */}
        <div className="mt-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-3">
             <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2 group-hover:text-zinc-300 transition-colors">
               <TbPolaroid size={16} /> Evidence Preview
             </h4>
             <input
               type="file"
               ref={galleryInputRef}
               className="hidden"
               accept="image/*"
               multiple
               onChange={handleGalleryUpload}
             />
          </div>

          {cemetery.photos.length > 0 ? (
            <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {cemetery.photos.slice(0, 3).map((photo, index) => (
                    <div key={index} className="relative group/photo aspect-square overflow-hidden border border-zinc-800 grayscale hover:grayscale-0 transition-all duration-500">
                      <img src={photo} alt="Evidence" className="w-full h-full object-cover opacity-70 group-hover/photo:opacity-100 transition-opacity" />
                    </div>
                  ))}
                  {Array.from({ length: Math.max(0, 3 - cemetery.photos.length) }).map((_, i) => (
                      <div key={`empty-${i}`} className="aspect-square border border-zinc-800/50 bg-zinc-900/20"></div>
                  ))}
                </div>
                
                <div className="flex gap-2">
                    <button
                        onClick={triggerGalleryUpload}
                        className="flex-1 text-[10px] font-bold uppercase tracking-[0.15em] border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-100 px-3 py-2 transition-colors bg-zinc-900/30 group-hover:border-zinc-600 flex items-center justify-center gap-1"
                    >
                        <Plus size={12} /> Add
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onOpenGallery(); }}
                        className="flex-1 text-[10px] font-bold uppercase tracking-[0.15em] border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white px-3 py-2 transition-colors bg-zinc-900/50 flex items-center justify-center gap-1 group/btn"
                    >
                        Manage Gallery <ArrowRight size={12} className="group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
          ) : (
            <div className="text-[10px] text-zinc-500 italic text-center py-3 border border-zinc-900/50 bg-[#050505] opacity-60">
              No evidence collected.
              <button 
                  onClick={triggerGalleryUpload} 
                  className="block mx-auto mt-2 text-zinc-400 hover:text-zinc-200 underline decoration-zinc-700 underline-offset-2"
              >
                  Upload Evidence
              </button>
            </div>
          )}
        </div>
    </div>
  );

  // --------------------------------------------------------------------------------
  // GRID MODE RENDER
  // --------------------------------------------------------------------------------
  if (mode === 'grid') {
      return (
          <div 
             className="relative aspect-square border border-zinc-800 bg-zinc-900 overflow-hidden group cursor-pointer hover:border-zinc-600 transition-all"
             onClick={onViewDetails}
          >
             {cemetery.photos.length > 0 ? (
                 <img src={cemetery.photos[0]} className="w-full h-full object-cover grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500" alt={cemetery.name} />
             ) : (
                 <div className="w-full h-full flex flex-col items-center justify-center opacity-30 group-hover:opacity-50 transition-opacity">
                     <ImageIcon size={32} className="mb-2" />
                 </div>
             )}
             
             <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-3">
                 <h3 className="font-serif font-bold text-white text-sm md:text-base leading-tight drop-shadow-md group-hover:translate-y-[-2px] transition-transform">
                     {cemetery.name}
                 </h3>
                 <div className="flex items-center justify-between mt-1 opacity-70 group-hover:opacity-100 transition-opacity">
                      {cemetery.visited ? (
                          <span className="text-[9px] uppercase font-bold text-green-500 flex items-center gap-1"><Check size={8} /> Visited</span>
                      ) : (
                          <span className="text-[9px] uppercase font-bold text-zinc-500">Unvisited</span>
                      )}
                 </div>
             </div>
          </div>
      );
  }

  // --------------------------------------------------------------------------------
  // LIST MODE RENDER
  // --------------------------------------------------------------------------------
  if (mode === 'list') {
      return (
          <div className="border border-zinc-800 bg-[#050505] transition-all duration-300 hover:border-zinc-600 overflow-hidden">
             {/* Header Row */}
             <div className="flex items-center p-3 md:p-4 gap-4">
                 {/* Left Info */}
                 <div className="flex-1 min-w-0 cursor-pointer" onClick={onViewDetails}>
                     <h3 className="font-serif font-bold text-zinc-200 hover:text-white truncate transition-colors text-base md:text-lg mb-1">{cemetery.name}</h3>
                     <div className="flex items-center gap-3 text-[10px] md:text-xs text-zinc-500 font-mono uppercase tracking-wider">
                        <span className="truncate flex items-center gap-1"><MapPin size={10} /> {cemetery.address}</span>
                     </div>
                 </div>

                 {/* Thumbnail */}
                 <div className="hidden md:block w-12 h-12 md:w-16 md:h-16 shrink-0 border border-zinc-800 bg-zinc-900">
                    {cemetery.photos.length > 0 ? (
                        <img src={cemetery.photos[0]} className="w-full h-full object-cover grayscale opacity-70" alt="Thumb" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-700"><ImageIcon size={16} /></div>
                    )}
                 </div>

                 {/* Status & Expand */}
                 <div className="flex items-center gap-2 md:gap-4 shrink-0">
                     <button
                        onClick={toggleVisited}
                        className={`w-8 h-8 flex items-center justify-center border transition-all ${cemetery.visited ? 'bg-zinc-800 text-green-500 border-green-900' : 'text-zinc-600 border-zinc-800 hover:text-zinc-400'}`}
                        title={cemetery.visited ? "Mark Unvisited" : "Mark Visited"}
                     >
                        <Check size={14} />
                     </button>
                     <div className="w-px h-8 bg-zinc-800 mx-1"></div>
                     <button 
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={`p-2 hover:bg-zinc-900 text-zinc-500 hover:text-white transition-colors ${isExpanded ? 'bg-zinc-900 text-white' : ''}`}
                     >
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                     </button>
                 </div>
             </div>

             {/* Expanded Content */}
             {isExpanded && (
                 <div className="border-t border-zinc-800 bg-zinc-950/50 p-4 md:p-6 animate-in slide-in-from-top-2 duration-200">
                     {renderCardInteractiveContent()}
                 </div>
             )}
          </div>
      );
  }

  // --------------------------------------------------------------------------------
  // CARD MODE RENDER (Default)
  // --------------------------------------------------------------------------------
  return (
    <div 
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className={`
        relative overflow-hidden transition-all duration-700 ease-in-out border group h-full flex flex-col
        ${cemetery.visited 
          ? 'bg-black border-zinc-500 shadow-[var(--ghost-glow-active)]' 
          : 'bg-[#050505] border-zinc-800 hover:border-zinc-600 hover:shadow-[var(--ghost-glow)]'
        }
      `}
      style={{
        borderRadius: 'var(--card-radius)'
      }}
    >
      {/* Top Status Bar - Subtle Gradient */}
      <div className={`absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent ${cemetery.visited ? 'via-white/60 animate-flicker-glow' : 'via-zinc-600'} to-transparent opacity-70`}></div>
      
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

      <div className="p-[var(--space-md)] relative z-10 flex flex-col flex-grow">
        <div className="flex justify-between items-start gap-4 mb-[var(--space-sm)]">
          <div>
            <h3 
                onClick={onViewDetails}
                className={`cursor-pointer font-serif text-xl md:text-2xl font-bold mb-1 tracking-wide transition-colors ${cemetery.visited ? 'text-zinc-100 drop-shadow-[0_0_8px_rgba(255,255,255,0.2)] animate-ghost-pulse' : 'text-zinc-200 group-hover:text-white hover:text-zinc-100 hover:underline decoration-zinc-600 underline-offset-4'}`}
            >
              {cemetery.name}
            </h3>
            <div className="flex flex-col gap-1">
              <div className="flex items-center text-zinc-300 text-xs uppercase tracking-widest font-medium group-hover:text-zinc-200 transition-colors">
                <MapPin size={12} className="mr-1.5 opacity-80" />
                <span>{cemetery.address}</span>
              </div>
              {cemetery.visited && cemetery.visitedDate && (
                <div className="flex items-center text-zinc-200 text-xs mt-1 font-mono tracking-wide opacity-90">
                  <Calendar size={12} className="mr-1.5" />
                  <span>Visited: {new Date(cemetery.visitedDate).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={toggleVisited}
            className={`
              flex items-center justify-center w-8 h-8 md:w-10 md:h-10 border transition-all duration-500 z-20
              ${cemetery.visited 
                ? 'bg-zinc-300 text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)] hover:bg-white hover:scale-105' 
                : 'bg-transparent border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 group-hover:border-zinc-500'}
            `}
            style={{ borderRadius: '2px' }}
            title={cemetery.visited ? "Mark as unvisited" : "Mark as visited"}
          >
            <Check size={18} strokeWidth={2} />
          </button>
        </div>

        {renderCardInteractiveContent()}

      </div>
    </div>
  );
};