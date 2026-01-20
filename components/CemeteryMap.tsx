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
    // Using a simpler icon structure that doesn't rely on complex external CSS classes
    const customIcon = L.divIcon({
      className: '', // Intentionally empty to avoid default styles
      html: `<div style="
        width: 32px; 
        height: 32px; 
        color: #e4e4e7; 
        filter: drop-shadow(0 0 8px rgba(255,255,255,0.6));
        display: flex;
        align-items: center;
        justify-content: center;
        ">
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
        .addTo(mapInstance.current!)
        .bindPopup(`
          <div style="min-width: 160px; font-family: 'Inter', sans-serif;">
            <h3 style="font-family: 'Cinzel', serif; font-weight: 700; font-size: 1.1em; margin-bottom: 4px; color: #fff; letter-spacing: 0.05em;">
              ${cemetery.name}
            </h3>
            <p style="font-size: 0.7rem; color: #a1a1aa; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em;">
              ${cemetery.address}
            </p>
            <button 
              id="btn-${cemetery.id}"
              style="
                width: 100%;
                background-color: transparent; 
                border: 1px solid #ffffff; 
                color: #ffffff; 
                padding: 8px 12px; 
                cursor: pointer;
                font-size: 0.7rem;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.1em;
                transition: all 0.2s;
              "
              onmouseover="this.style.backgroundColor='#ffffff'; this.style.color='#000000'"
              onmouseout="this.style.backgroundColor='transparent'; this.style.color='#ffffff'"
            >
              View Details
            </button>
          </div>
        `);
        
      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-${cemetery.id}`);
        if (btn) {
          btn.onclick = () => onSelectCemetery(cemetery.id);
        }
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