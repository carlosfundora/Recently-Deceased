import React, { useState, useRef, useEffect } from 'react';
import { Cemetery } from '../types';
import { generateCemeteryHistory } from '../services/geminiService';
import { MapPin, Check, BookOpen, Camera, Sparkles, Loader2, Trash2, Edit3, X, Calendar, Save } from 'lucide-react';

interface CemeteryCardProps {
  cemetery: Cemetery;
  onUpdate: (id: string, updates: Partial<Cemetery>) => void;
}

export const CemeteryCard: React.FC<CemeteryCardProps> = ({ cemetery, onUpdate }) => {
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [noteDraft, setNoteDraft] = useState(cemetery.userNotes);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  // Handle file upload
  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        onUpdate(cemetery.id, { photos: [...cemetery.photos, base64String] });
      };
      reader.readAsDataURL(file);
    }
  };

  // Toggle visited status with date tracking
  const toggleVisited = () => {
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

  const handleSaveNotes = () => {
    onUpdate(cemetery.id, { userNotes: noteDraft });
    setIsEditingNotes(false);
  };

  const handleCancelNotes = () => {
    setNoteDraft(cemetery.userNotes);
    setIsEditingNotes(false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      cardRef.current.style.setProperty('--mouse-x', `${x}px`);
      cardRef.current.style.setProperty('--mouse-y', `${y}px`);
    }
  };

  return (
    <div 
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className={`
        relative overflow-hidden transition-all duration-700 ease-in-out border group
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

      <div className="p-[var(--space-md)] relative z-10">
        <div className="flex justify-between items-start gap-4 mb-[var(--space-sm)]">
          <div>
            <h3 className={`font-serif text-xl md:text-2xl font-bold mb-1 tracking-wide transition-colors ${cemetery.visited ? 'text-zinc-100 drop-shadow-[0_0_8px_rgba(255,255,255,0.2)] animate-ghost-pulse' : 'text-zinc-200 group-hover:text-white'}`}>
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
                  <span>Visited: {new Date(cemetery.visitedDate).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={toggleVisited}
            className={`
              flex items-center justify-center w-8 h-8 md:w-10 md:h-10 border transition-all duration-500
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

        {/* History Section */}
        <div className="mb-[var(--space-sm)] pb-[var(--space-sm)] border-b border-zinc-800">
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
              <p className="animate-in fade-in duration-1000 border-l border-zinc-600 pl-4 italic opacity-100">{cemetery.history}</p>
            ) : (
              <p className="italic opacity-50 text-xs transition-opacity duration-500 group-hover:opacity-70 text-zinc-300">The past remains buried...</p>
            )}
          </div>
        </div>

        {/* User Notes */}
        <div className="mb-[var(--space-sm)]">
          <div className="flex items-center justify-between mb-3">
             <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2 group-hover:text-zinc-300 transition-colors">
               <Edit3 size={12} /> Notes
             </h4>
          </div>
          {isEditingNotes ? (
            <div className="relative animate-in fade-in zoom-in-95 duration-200">
              <textarea
                className="w-full bg-[#0a0a0a] border border-zinc-600 p-3 text-xs text-zinc-100 focus:outline-none focus:border-zinc-400 focus:shadow-[0_0_15px_rgba(255,255,255,0.05)] resize-y min-h-[80px] font-mono tracking-tight"
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Record your observations..."
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-2">
                <button 
                   onClick={handleCancelNotes}
                   className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 hover:text-zinc-200 transition-colors px-3 py-1"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveNotes}
                  className="flex items-center gap-1.5 bg-zinc-300 text-black px-3 py-1 text-[10px] uppercase font-bold tracking-widest hover:bg-white hover:shadow-[0_0_10px_rgba(255,255,255,0.4)] transition-all"
                >
                  <Save size={12} />
                  Save Notes
                </button>
              </div>
            </div>
          ) : (
            <div 
              onClick={() => setIsEditingNotes(true)}
              className="w-full min-h-[2.5rem] p-3 border border-dashed border-zinc-700 text-xs text-zinc-300 cursor-pointer hover:border-zinc-500 hover:text-zinc-100 transition-colors font-mono hover:bg-zinc-900/40 bg-black/40"
            >
              {cemetery.userNotes || "Click to record observations..."}
            </div>
          )}
        </div>

        {/* Photos Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
             <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2 group-hover:text-zinc-300 transition-colors">
               <Camera size={12} /> Evidence
             </h4>
             <button
                onClick={() => fileInputRef.current?.click()}
                className="text-[10px] font-bold uppercase tracking-[0.15em] border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-100 px-3 py-1.5 transition-colors bg-zinc-900/30 group-hover:border-zinc-600"
             >
               + Upload
             </button>
             <input
               type="file"
               ref={fileInputRef}
               className="hidden"
               accept="image/*"
               onChange={handlePhotoUpload}
             />
          </div>

          {cemetery.photos.length > 0 ? (
            <div className="grid grid-cols-4 gap-2">
              {cemetery.photos.map((photo, index) => (
                <div key={index} className="relative group/photo aspect-square overflow-hidden border border-zinc-800 grayscale hover:grayscale-0 transition-all duration-500">
                  <img src={photo} alt="Evidence" className="w-full h-full object-cover opacity-70 group-hover/photo:opacity-100 transition-opacity" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center">
                    <button 
                      onClick={() => removePhoto(index)}
                      className="text-white hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[10px] text-zinc-500 italic text-center py-3 border border-zinc-900/50 bg-[#050505] opacity-60">
              No evidence found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};