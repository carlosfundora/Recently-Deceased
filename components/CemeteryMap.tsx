import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Cemetery } from '../types';
import { Loader2 } from 'lucide-react';
import { TbMapPin } from "react-icons/tb";

interface CemeteryMapProps {
  cemeteries: Cemetery[];
  onSelectCemetery: (id: string) => void;
}

export const CemeteryMap: React.FC<CemeteryMapProps> = ({ cemeteries, onSelectCemetery }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    // Initialize Map centered on New Orleans
    mapInstance.current = L.map(mapContainer.current, {
        scrollWheelZoom: false, // Prevent page scroll hijacking on desktop
        touchZoom: true,        // Allow pinch zoom on mobile
        dragging: true
    }).setView([29.9511, -90.0715], 13);

    // Add Dark Mode Tiles (CartoDB Dark Matter)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(mapInstance.current);

    // Force map resize calculation after a short delay to handle animation transitions
    setTimeout(() => {
      mapInstance.current?.invalidateSize();
    }, 100);

    return () => {
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, []);

  // Update markers when cemeteries change
  useEffect(() => {
    if (!mapInstance.current) return;

    // Clear existing markers
    mapInstance.current.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        layer.remove();
      }
    });

    // Custom "Ghostly" Marker Icon
    const customIcon = L.divIcon({
      className: '', 
      html: `<div style="
        width: 32px; 
        height: 32px; 
        color: #e4e4e7; 
        filter: drop-shadow(0 0 8px rgba(255,255,255,0.6));
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s;
        " class="hover:scale-125">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="#000" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                <circle cx="12" cy="9" r="2.5" fill="#000"/>
              </svg>
             </div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    });

    cemeteries.forEach(cemetery => {
      const marker = L.marker([cemetery.lat, cemetery.lng], { icon: customIcon })
        .addTo(mapInstance.current!);

      // Hover Tooltip
      marker.bindTooltip(
        `<div class="text-center">
           <div class="font-bold text-white text-xs tracking-wider">${cemetery.name}</div>
           <div class="text-[10px] text-zinc-400">${cemetery.address}</div>
         </div>`, 
        { 
          direction: 'top', 
          offset: [0, -36], 
          className: 'custom-ghost-tooltip',
          opacity: 1
        }
      );

      // Click Navigation
      marker.on('click', () => {
        onSelectCemetery(cemetery.id);
      });
    });
  }, [cemeteries, onSelectCemetery]);

  const handleLocate = () => {
      if (!mapInstance.current) return;
      setLocating(true);
      
      navigator.geolocation.getCurrentPosition(
          (pos) => {
              const { latitude, longitude } = pos.coords;
              mapInstance.current?.flyTo([latitude, longitude], 15, { duration: 1.5 });
              
              // Add a "You Are Here" indicator
              L.circleMarker([latitude, longitude], {
                  radius: 8,
                  fillColor: '#22c55e',
                  color: '#ffffff',
                  weight: 2,
                  opacity: 1,
                  fillOpacity: 0.8
              }).addTo(mapInstance.current!)
              .bindPopup("Your Location")
              .openPopup();
              
              setLocating(false);
          },
          (err) => {
              console.error(err);
              setLocating(false);
              alert("Unable to retrieve location. Please check permissions.");
          }
      );
  };

  return (
    <div className="w-full h-full relative group overflow-hidden bg-black z-0">
       <div ref={mapContainer} className="w-full h-full z-10 relative" />
       
       {/* Overlay vignette */}
       <div className="absolute inset-0 border-b border-zinc-800 pointer-events-none z-20 shadow-[inset_0_0_50px_rgba(0,0,0,0.8)]"></div>
       
       {/* GPS Button */}
       <button 
         onClick={handleLocate}
         className="absolute bottom-6 right-6 z-[400] bg-black/80 hover:bg-green-900/80 text-zinc-400 hover:text-green-400 p-3 rounded-full border border-zinc-700 backdrop-blur-md transition-all shadow-lg active:scale-95 opacity-50 hover:opacity-100"
         title="Locate Me"
       >
           {locating ? <Loader2 size={24} className="animate-spin" /> : <TbMapPin size={24} />}
       </button>
    </div>
  );
};