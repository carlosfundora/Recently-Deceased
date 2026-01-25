import React, { useState, useMemo, useRef } from 'react';
import { Cemetery, NotableInterment } from '../types';
import { X, Search, Trash2, Edit3, Image as ImageIcon, Plus, Save, AlertTriangle } from 'lucide-react';
import { TbCoffin } from "react-icons/tb";

interface NotableSpiritsRegistryProps {
  cemeteries: Cemetery[];
  onUpdateCemetery: (id: string, updates: Partial<Cemetery>) => void;
  onClose: () => void;
}

interface FlattenedSpirit extends NotableInterment {
  cemeteryId: string;
  cemeteryName: string;
}

export const NotableSpiritsRegistry: React.FC<NotableSpiritsRegistryProps> = ({ cemeteries, onUpdateCemetery, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSpirit, setEditingSpirit] = useState<FlattenedSpirit | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null); // spirit ID
  const fileInputRef = useRef<HTMLInputElement>(null);

  const spirits = useMemo(() => {
    const all: FlattenedSpirit[] = [];
    cemeteries.forEach(c => {
      (c.notableInterments || []).forEach(s => {
        all.push({
          ...s,
          cemeteryId: c.id,
          cemeteryName: c.name
        });
      });
    });
    
    if (!searchQuery) return all;
    
    const lowerQ = searchQuery.toLowerCase();
    return all.filter(s => 
      s.name.toLowerCase().includes(lowerQ) || 
      s.cemeteryName.toLowerCase().includes(lowerQ)
    );
  }, [cemeteries, searchQuery]);

  const handleDelete = (cemeteryId: string, spiritId: string) => {
    const cemetery = cemeteries.find(c => c.id === cemeteryId);
    if (!cemetery) return;
    
    const updatedSpirits = (cemetery.notableInterments || []).filter(s => s.id !== spiritId);
    onUpdateCemetery(cemeteryId, { notableInterments: updatedSpirits });
    setDeleteConfirmation(null);
  };

  const handleUpdateSpirit = () => {
    if (!editingSpirit) return;
    
    const cemetery = cemeteries.find(c => c.id === editingSpirit.cemeteryId);
    if (!cemetery) return;

    const updatedSpirits = (cemetery.notableInterments || []).map(s => {
      if (s.id === editingSpirit.id) {
        // Return updated spirit, removing flat properties
        const { cemeteryId, cemeteryName, ...rest } = editingSpirit;
        return rest;
      }
      return s;
    });

    onUpdateCemetery(editingSpirit.cemeteryId, { notableInterments: updatedSpirits });
    setEditingSpirit(null);
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && editingSpirit) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setEditingSpirit({ ...editingSpirit, photo: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="h-full bg-black text-white flex flex-col animate-in fade-in duration-300">
       
       {/* Header */}
       <div className="p-6 border-b border-zinc-800 flex justify-between items-center sticky top-0 bg-black/95 backdrop-blur z-20">
           <div className="flex items-center gap-3">
               <TbCoffin size={28} className="text-zinc-500" />
               <div>
                   <h2 className="text-xl font-serif font-bold tracking-widest uppercase">Notable Spirits</h2>
                   <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">{spirits.length} Souls Recorded</p>
               </div>
           </div>
           <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors p-2">
               <X size={24} />
           </button>
       </div>

       {/* Search */}
       <div className="p-4 border-b border-zinc-800 bg-zinc-900/30">
           <div className="relative max-w-2xl mx-auto">
               <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
               <input 
                  type="text" 
                  placeholder="SEARCH THE REGISTRY..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-black border border-zinc-700 py-3 pl-10 pr-4 text-sm font-mono tracking-wider focus:outline-none focus:border-zinc-500 text-white placeholder-zinc-700"
               />
           </div>
       </div>

       {/* List */}
       <div className="flex-1 overflow-y-auto p-4 md:p-8">
           <div className="max-w-4xl mx-auto space-y-4">
               {spirits.map(spirit => (
                   <div key={spirit.id} className="bg-zinc-900/20 border border-zinc-800 p-4 md:p-6 flex flex-col md:flex-row gap-6 relative group hover:border-zinc-700 transition-colors">
                       
                       {/* Spirit Photo */}
                       <div className="w-24 h-32 shrink-0 border border-zinc-700 bg-black overflow-hidden relative">
                           {spirit.photo ? (
                               <img src={spirit.photo} alt={spirit.name} className="w-full h-full object-cover grayscale opacity-80" />
                           ) : (
                               <div className="w-full h-full flex items-center justify-center text-zinc-700">
                                   <TbCoffin size={32} />
                               </div>
                           )}
                       </div>

                       {/* Details */}
                       <div className="flex-1 min-w-0">
                           <div className="flex justify-between items-start">
                               <div>
                                   <h3 className="text-xl font-serif font-bold text-white mb-1">{spirit.name}</h3>
                                   <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">{spirit.cemeteryName}</div>
                                   <div className="text-xs font-mono text-zinc-600 mb-3">{spirit.deathDate}</div>
                               </div>
                               
                               {/* Actions */}
                               <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                   <button 
                                      onClick={() => setEditingSpirit(spirit)}
                                      className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                                      title="Edit"
                                   >
                                       <Edit3 size={16} />
                                   </button>
                                   <button 
                                      onClick={() => setDeleteConfirmation(spirit.id)}
                                      className="p-2 hover:bg-red-900/30 text-zinc-400 hover:text-red-500 transition-colors"
                                      title="Delete"
                                   >
                                       <Trash2 size={16} />
                                   </button>
                               </div>
                           </div>
                           
                           {spirit.epitaph && (
                               <div className="text-sm italic text-zinc-400 border-l-2 border-zinc-800 pl-3 mb-3 font-serif">
                                   "{spirit.epitaph}"
                               </div>
                           )}
                           <p className="text-sm text-zinc-400 line-clamp-2 md:line-clamp-none leading-relaxed">
                               {spirit.bio}
                           </p>
                       </div>

                       {/* Delete Confirmation Overlay */}
                       {deleteConfirmation === spirit.id && (
                           <div className="absolute inset-0 bg-black/95 z-10 flex flex-col items-center justify-center text-center p-4 animate-in fade-in">
                               <AlertTriangle className="text-red-500 mb-2" size={24} />
                               <p className="text-zinc-300 font-bold mb-4">EXORCISE THIS SPIRIT FROM REGISTRY?</p>
                               <div className="flex gap-3">
                                   <button 
                                      onClick={() => handleDelete(spirit.cemeteryId, spirit.id)} 
                                      className="px-4 py-2 bg-red-900 hover:bg-red-800 text-white text-xs font-bold uppercase tracking-widest border border-red-700"
                                   >
                                       Confirm
                                   </button>
                                   <button 
                                      onClick={() => setDeleteConfirmation(null)} 
                                      className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold uppercase tracking-widest border border-zinc-600"
                                   >
                                       Cancel
                                   </button>
                               </div>
                           </div>
                       )}
                   </div>
               ))}

               {spirits.length === 0 && (
                   <div className="text-center py-20 text-zinc-600">
                       <TbCoffin size={48} className="mx-auto mb-4 opacity-30" />
                       <p className="font-serif italic">No spirits found matching your inquiry.</p>
                   </div>
               )}
           </div>
       </div>

       {/* Edit Modal */}
       {editingSpirit && (
           <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
               <div className="bg-zinc-950 border border-zinc-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
                   <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900">
                       <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-300">Edit Registry Entry</h3>
                       <button onClick={() => setEditingSpirit(null)} className="text-zinc-500 hover:text-white">
                           <X size={20} />
                       </button>
                   </div>
                   
                   <div className="p-6 space-y-6">
                       <div className="flex flex-col md:flex-row gap-6">
                           {/* Photo Edit */}
                           <div 
                               onClick={() => fileInputRef.current?.click()}
                               className="w-full md:w-40 h-52 border border-zinc-700 border-dashed shrink-0 flex items-center justify-center cursor-pointer hover:bg-zinc-900 relative group"
                           >
                               {editingSpirit.photo ? (
                                   <img src={editingSpirit.photo} className="w-full h-full object-cover" alt="Spirit" />
                               ) : (
                                   <div className="text-center text-zinc-600">
                                       <ImageIcon size={24} className="mx-auto mb-2" />
                                       <span className="text-xs uppercase">Add Photo</span>
                                   </div>
                               )}
                               <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                   <Plus size={24} />
                               </div>
                               <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                           </div>

                           {/* Fields */}
                           <div className="flex-1 space-y-4">
                               <div>
                                   <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">Name</label>
                                   <input 
                                      type="text" 
                                      value={editingSpirit.name} 
                                      onChange={(e) => setEditingSpirit({...editingSpirit, name: e.target.value})}
                                      className="w-full bg-black border border-zinc-700 p-2 text-white focus:border-zinc-500 outline-none"
                                   />
                               </div>
                               <div>
                                   <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">Date of Death</label>
                                   <input 
                                      type="text" 
                                      value={editingSpirit.deathDate} 
                                      onChange={(e) => setEditingSpirit({...editingSpirit, deathDate: e.target.value})}
                                      className="w-full bg-black border border-zinc-700 p-2 text-white focus:border-zinc-500 outline-none"
                                   />
                               </div>
                               <div>
                                   <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">Epitaph</label>
                                   <input 
                                      type="text" 
                                      value={editingSpirit.epitaph} 
                                      onChange={(e) => setEditingSpirit({...editingSpirit, epitaph: e.target.value})}
                                      className="w-full bg-black border border-zinc-700 p-2 text-white focus:border-zinc-500 outline-none italic"
                                   />
                               </div>
                           </div>
                       </div>
                       
                       <div>
                           <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">Biography / Notes</label>
                           <textarea 
                              value={editingSpirit.bio} 
                              onChange={(e) => setEditingSpirit({...editingSpirit, bio: e.target.value})}
                              className="w-full bg-black border border-zinc-700 p-3 text-white focus:border-zinc-500 outline-none min-h-[120px]"
                           />
                       </div>

                       <div className="flex justify-end pt-4 border-t border-zinc-800">
                           <button 
                              onClick={handleUpdateSpirit}
                              className="flex items-center gap-2 bg-zinc-100 hover:bg-white text-black px-6 py-3 text-xs font-bold uppercase tracking-widest transition-colors"
                           >
                               <Save size={16} /> Save Changes
                           </button>
                       </div>
                   </div>
               </div>
           </div>
       )}
    </div>
  );
};