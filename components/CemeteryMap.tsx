import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Cemetery } from '../types';

interface CemeteryMapProps {
  cemeteries: Cemetery[];
  onSelectCemetery: (id: string) => void;
}

export const CemeteryMap: React.FC<CemeteryMapProps> = ({ cemeteries, onSelectCemetery }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    // Initialize Map centered on New Orleans
    mapInstance.current = L.map(mapContainer.current).setView([29.9511, -90.0715], 13);

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

  return (
    <div className="w-full h-[600px] border border-zinc-800 relative group overflow-hidden bg-black" style={{ borderRadius: 'var(--card-radius)' }}>
       <div ref={mapContainer} className="w-full h-full z-10 relative" />
       {/* Overlay vignette */}
       <div className="absolute inset-0 border-[1px] border-white/10 pointer-events-none z-20 shadow-[inset_0_0_50px_rgba(0,0,0,0.8)]"></div>
    </div>
  );
};