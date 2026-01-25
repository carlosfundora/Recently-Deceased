import React, { useState, useEffect, useRef } from 'react';
import { Cemetery } from '../types';
import { X, ChevronLeft, ChevronRight, Image as ImageIcon, Download, MapPin } from 'lucide-react';
import { TbPolaroid } from "react-icons/tb";

interface UnifiedGalleryProps {
  cemeteries: Cemetery[];
  onClose: () => void;
}

interface GalleryItem {
  photo: string;
  cemeteryId: string;
  cemeteryName: string;
  originalIndex: number; // index within that cemetery's array
  globalIndex: number; // index within the unified array
}

export const UnifiedGallery: React.FC<UnifiedGalleryProps> = ({ cemeteries, onClose }) => {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const touchStartX = useRef(0);

  useEffect(() => {
    // Flatten photos
    const allPhotos: GalleryItem[] = [];
    let gIndex = 0;
    cemeteries.forEach(c => {
      c.photos.forEach((photo, pIndex) => {
        allPhotos.push({
          photo,
          cemeteryId: c.id,
          cemeteryName: c.name,
          originalIndex: pIndex,
          globalIndex: gIndex++
        });
      });
    });
    setItems(allPhotos);
  }, [cemeteries]);

  const showNext = () => {
    if (lightboxIndex !== null && lightboxIndex < items.length - 1) {
      setLightboxIndex(lightboxIndex + 1);
    }
  };

  const showPrev = () => {
    if (lightboxIndex !== null && lightboxIndex > 0) {
      setLightboxIndex(lightboxIndex - 1);
    }
  };

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (lightboxIndex === null) return;
        if (e.key === 'Escape') setLightboxIndex(null);
        if (e.key === 'ArrowLeft') showPrev();
        if (e.key === 'ArrowRight') showNext();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, items.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0].screenX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].screenX;
    if (touchStartX.current - touchEndX > 50) showNext();
    if (touchEndX - touchStartX.current > 50) showPrev();
  };

  return (
    <div className="h-full flex flex-col bg-black text-white animate-in fade-in duration-300">
       {/* Header */}
       <div className="p-6 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-black/90 backdrop-blur z-20">
          <div className="flex items-center gap-3">
             <TbPolaroid size={28} className="text-zinc-400" />
             <div>
                <h2 className="text-xl font-serif font-bold tracking-widest text-white uppercase">Evidence</h2>
                <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">{items.length} Evidence Collected</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-900 rounded-full transition-colors text-zinc-400 hover:text-white">
             <X size={24} />
          </button>
       </div>

       {/* Grid */}
       <div className="flex-1 overflow-y-auto p-4 md:p-8">
           {items.length > 0 ? (
               <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {items.map((item, i) => (
                      <div 
                         key={i}
                         onClick={() => setLightboxIndex(i)}
                         className="aspect-square relative group cursor-pointer overflow-hidden border border-zinc-800 bg-zinc-900"
                      >
                         <img src={item.photo} alt={item.cemeteryName} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-500 grayscale group-hover:grayscale-0 group-hover:scale-105" />
                         <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                            <span className="text-[10px] text-zinc-300 font-bold uppercase tracking-wider truncate">{item.cemeteryName}</span>
                         </div>
                      </div>
                  ))}
               </div>
           ) : (
               <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-4">
                   <ImageIcon size={64} className="opacity-20" />
                   <p className="font-serif italic">The collection is empty...</p>
               </div>
           )}
       </div>

       {/* Lightbox */}
       {lightboxIndex !== null && items[lightboxIndex] && (
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
                    src={items[lightboxIndex].photo} 
                    className="max-h-[80vh] max-w-full object-contain shadow-2xl border border-zinc-900" 
                    alt="Expanded Evidence" 
                 />
             </div>

             {/* Footer Info */}
             <div className="w-full bg-black/80 border-t border-zinc-800 p-6 flex flex-col items-center gap-2 z-50 backdrop-blur">
                 <h3 className="text-lg font-serif font-bold text-white tracking-widest">{items[lightboxIndex].cemeteryName}</h3>
                 <div className="flex items-center gap-6 mt-2">
                     <span className="text-xs font-mono text-zinc-500">{lightboxIndex + 1} / {items.length}</span>
                     <a 
                        href={items[lightboxIndex].photo}
                        download={`evidence-${items[lightboxIndex].cemeteryId}-${items[lightboxIndex].originalIndex}.jpg`}
                        className="text-zinc-500 hover:text-white transition-colors"
                        title="Download"
                     >
                        <Download size={20} />
                     </a>
                 </div>
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
             {lightboxIndex < items.length - 1 && (
                <button 
                    onClick={(e) => { e.stopPropagation(); showNext(); }} 
                    className="hidden md:block absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-4 bg-black/20 hover:bg-black/60 rounded-full transition-colors backdrop-blur-sm"
                >
                    <ChevronRight size={48} /> 
                </button>
             )}
          </div>
       )}
    </div>
  );
};