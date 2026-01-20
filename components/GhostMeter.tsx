import React, { useState, useEffect, useRef } from 'react';
import { X, Activity, Zap, Radio } from 'lucide-react';

interface GhostMeterProps {
  isOpen: boolean;
  onClose: () => void;
}

const GHOST_WORDS = [
  "BELOW", "COLD", "WAIT", "HELP", "RUN", "HIDE", "LOOK", "BURIED", "ASH", "BONE", 
  "DARK", "LEAVE", "NOW", "HERE", "GONE", "LOST", "SINK", "RISE", "FALL", "SEEK"
];

export const GhostMeter: React.FC<GhostMeterProps> = ({ isOpen, onClose }) => {
  const [sensors, setSensors] = useState({ x: 0, y: 0, z: 0, mag: 0 });
  const [activeWord, setActiveWord] = useState<string>("");
  const [history, setHistory] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  // Initialize sensors
  useEffect(() => {
    if (!isOpen) {
      setSensors({ x: 0, y: 0, z: 0, mag: 0 });
      setIsScanning(false);
      return;
    }

    const handleMotion = (e: DeviceMotionEvent) => {
      setSensors(prev => ({
        ...prev,
        x: e.accelerationIncludingGravity?.x || prev.x,
        y: e.accelerationIncludingGravity?.y || prev.y,
        z: e.accelerationIncludingGravity?.z || prev.z
      }));
    };

    const handleOrientation = (e: DeviceOrientationEvent) => {
        // Pseudo-magnetometer using orientation alpha
        setSensors(prev => ({
            ...prev,
            mag: e.alpha || prev.mag
        }));
    };

    // Fallback simulation for devices without sensors (desktop)
    const simulateSensors = () => {
       const time = Date.now() / 1000;
       setSensors({
           x: Math.sin(time) * 5 + (Math.random() - 0.5) * 2,
           y: Math.cos(time) * 5 + (Math.random() - 0.5) * 2,
           z: Math.sin(time * 0.5) * 9 + (Math.random() - 0.5) * 2,
           mag: (Math.sin(time * 0.2) * 180) + 180 + (Math.random() * 20)
       });
       animationRef.current = requestAnimationFrame(simulateSensors);
    };

    if (window.DeviceMotionEvent) {
        window.addEventListener('devicemotion', handleMotion);
    }
    if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', handleOrientation);
    }

    // If on desktop or no sensors trigger, the values will stay 0.
    // We can run a checker to start simulation if no data comes in.
    const checkTimer = setTimeout(() => {
        if (sensors.x === 0 && sensors.y === 0 && sensors.z === 0) {
            simulateSensors();
        }
    }, 1000);

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
      window.removeEventListener('deviceorientation', handleOrientation);
      cancelAnimationFrame(animationRef.current);
      clearTimeout(checkTimer);
    };
  }, [isOpen]);

  // Word Generation Logic
  useEffect(() => {
    if (!isOpen) return;
    
    const interval = setInterval(() => {
      // Logic: If sensors spike, higher chance of word
      const activity = Math.abs(sensors.x) + Math.abs(sensors.y) + Math.abs(sensors.z);
      const threshold = 15; // Arbitrary threshold
      const randomChance = Math.random();
      
      if (activity > threshold || randomChance > 0.85) {
         const word = GHOST_WORDS[Math.floor(Math.random() * GHOST_WORDS.length)];
         setActiveWord(word);
         setHistory(prev => [word, ...prev].slice(0, 5));
      } else if (randomChance < 0.1) {
          setActiveWord(""); // Clear occasionally
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isOpen, sensors]);

  // Canvas Drawing for EMF Visualizer
  useEffect(() => {
     const canvas = canvasRef.current;
     if (!canvas || !isOpen) return;
     const ctx = canvas.getContext('2d');
     if (!ctx) return;

     let offset = 0;
     const draw = () => {
        offset += 2;
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.strokeStyle = '#22c55e'; // Green default
        const activityLevel = (Math.abs(sensors.x) + Math.abs(sensors.y) + Math.abs(sensors.z)) / 20;
        
        if (activityLevel > 0.8) ctx.strokeStyle = '#ef4444'; // Red
        else if (activityLevel > 0.5) ctx.strokeStyle = '#eab308'; // Yellow

        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < canvas.width; i+=5) {
           const y = canvas.height / 2 + Math.sin((i + offset) * 0.1) * (20 * activityLevel) * Math.random();
           if (i === 0) ctx.moveTo(i, y);
           else ctx.lineTo(i, y);
        }
        ctx.stroke();

        requestAnimationFrame(draw);
     };
     
     const id = requestAnimationFrame(draw);
     return () => cancelAnimationFrame(id);
  }, [isOpen, sensors]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 animate-in fade-in duration-300">
       <div className="w-full max-w-md bg-black border border-zinc-700 shadow-[0_0_50px_rgba(0,255,0,0.1)] relative overflow-hidden flex flex-col" style={{ borderRadius: '8px', minHeight: '600px' }}>
          
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50">
            <div className="flex items-center gap-2 text-zinc-200">
               <Activity className="text-green-500 animate-pulse" size={20} />
               <span className="font-mono font-bold tracking-widest text-sm uppercase text-green-500">P.K.E. Meter</span>
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>

          {/* Main Visualizer */}
          <div className="h-48 bg-black relative border-b border-zinc-800">
             <canvas ref={canvasRef} width={400} height={192} className="w-full h-full opacity-80" />
             <div className="absolute top-2 left-2 text-[10px] font-mono text-green-700">EMF_SENSOR_ACTIVE</div>
             <div className="absolute bottom-2 right-2 text-xl font-mono text-green-500 font-bold">
                {Math.round((Math.abs(sensors.x) + Math.abs(sensors.y) + Math.abs(sensors.z)) * 10)} µT
             </div>
          </div>

          {/* Sensor Bars */}
          <div className="p-6 space-y-6">
             <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-zinc-500 uppercase">
                    <span>Alpha (Mag)</span>
                    <span>{Math.round(sensors.mag)}°</span>
                </div>
                <div className="h-2 bg-zinc-900 overflow-hidden rounded-full">
                    <div className="h-full bg-green-600 transition-all duration-100" style={{ width: `${(sensors.mag / 360) * 100}%` }}></div>
                </div>
             </div>

             <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-zinc-500 uppercase">
                    <span>Beta (Accel)</span>
                    <span>{Math.round(sensors.y * 10)}</span>
                </div>
                <div className="h-2 bg-zinc-900 overflow-hidden rounded-full">
                    <div className="h-full bg-yellow-600 transition-all duration-100" style={{ width: `${Math.min(Math.abs(sensors.y) * 10, 100)}%` }}></div>
                </div>
             </div>
             
             <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-zinc-500 uppercase">
                    <span>Gamma (Grav)</span>
                    <span>{Math.round(sensors.z * 10)}</span>
                </div>
                <div className="h-2 bg-zinc-900 overflow-hidden rounded-full">
                    <div className="h-full bg-red-600 transition-all duration-100" style={{ width: `${Math.min(Math.abs(sensors.z) * 10, 100)}%` }}></div>
                </div>
             </div>
          </div>

          {/* Word Generator / Spirit Box */}
          <div className="flex-1 bg-zinc-950 p-6 flex flex-col items-center justify-center border-t border-zinc-800 relative">
             <div className="absolute top-2 left-3 flex items-center gap-2 text-[10px] font-mono text-zinc-600">
                <Radio size={12} className="animate-ping" />
                <span>SPIRIT_BOX_SCANNING...</span>
             </div>
             
             <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-t from-zinc-500 to-white tracking-widest font-serif min-h-[3rem] animate-pulse">
                {activeWord}
             </div>
             
             <div className="mt-4 h-12 flex gap-2 overflow-hidden opacity-50">
                {history.map((word, i) => (
                    <span key={i} className="text-[10px] text-zinc-600 font-mono border border-zinc-800 px-2 py-1 h-fit">
                        {word}
                    </span>
                ))}
             </div>
          </div>

       </div>
    </div>
  );
};
