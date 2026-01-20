import React, { useState, useEffect, useRef } from 'react';
import { X, Activity, Zap, Radio, Mic, MapPin, Battery, AlertTriangle, LayoutGrid, BarChart3 } from 'lucide-react';

interface GhostMeterProps {
  isOpen: boolean;
  onClose: () => void;
}

const GHOST_WORDS = [
  "BELOW", "COLD", "WAIT", "HELP", "RUN", "HIDE", "LOOK", "BURIED", "ASH", "BONE", 
  "DARK", "LEAVE", "NOW", "HERE", "GONE", "LOST", "SINK", "RISE", "FALL", "SEEK",
  "MOTHER", "FATHER", "SIN", "PRAY", "WATCH", "CLOSE", "BEHIND", "DOOR"
];

type ViewMode = 'dashboard' | 'spectral';

export const GhostMeter: React.FC<GhostMeterProps> = ({ isOpen, onClose }) => {
  const [calibrated, setCalibrated] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [sensors, setSensors] = useState({ 
    x: 0, y: 0, z: 0, // Motion
    mag: 0,           // Orientation/Compass
    audio: 0,         // Microphone volume (0-100)
    gpsAcc: 0,        // GPS Accuracy in meters
    battery: 100      // Battery Level
  });
  
  const [activeWord, setActiveWord] = useState<string>("");
  const [history, setHistory] = useState<string[]>([]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationRef = useRef<number>(0);

  // cleanup on close
  useEffect(() => {
    if (!isOpen) {
      setCalibrated(false);
      setSensors({ x: 0, y: 0, z: 0, mag: 0, audio: 0, gpsAcc: 0, battery: 100 });
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      cancelAnimationFrame(animationRef.current);
    }
  }, [isOpen]);

  const startSensors = async () => {
    // 1. Audio (Microphone)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(stream);
      
      analyser.fftSize = 64; // Low res for simple volume
      source.connect(analyser);
      
      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
    } catch (e) {
      console.warn("Mic permission denied or not supported", e);
    }

    // 2. Motion (Accelerometer) - iOS 13+ Permission Request
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        try {
            const response = await (DeviceMotionEvent as any).requestPermission();
            if (response !== 'granted') console.warn("Motion permission denied");
        } catch (e) {
            console.error(e);
        }
    }
    
    window.addEventListener('devicemotion', handleMotion);
    window.addEventListener('deviceorientation', handleOrientation);

    // 3. Geolocation
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(
            (pos) => {
                setSensors(prev => ({ ...prev, gpsAcc: pos.coords.accuracy }));
            }, 
            (err) => console.warn(err), 
            { enableHighAccuracy: true }
        );
    }

    // 4. Battery
    if ((navigator as any).getBattery) {
        (navigator as any).getBattery().then((battery: any) => {
            setSensors(prev => ({ ...prev, battery: battery.level * 100 }));
            battery.addEventListener('levelchange', () => {
                 setSensors(prev => ({ ...prev, battery: battery.level * 100 }));
            });
        });
    }

    setCalibrated(true);
  };

  const handleMotion = (e: DeviceMotionEvent) => {
    setSensors(prev => ({
      ...prev,
      x: e.accelerationIncludingGravity?.x || prev.x,
      y: e.accelerationIncludingGravity?.y || prev.y,
      z: e.accelerationIncludingGravity?.z || prev.z
    }));
  };

  const handleOrientation = (e: DeviceOrientationEvent) => {
      setSensors(prev => ({
          ...prev,
          mag: e.alpha || prev.mag
      }));
  };

  // Main Loop: Process Audio & Update Visuals
  useEffect(() => {
     if (!isOpen || !calibrated) return;

     let offset = 0;

     const updateLoop = () => {
         let currentVol = 0;

         // Process Audio
         if (analyserRef.current && dataArrayRef.current) {
             analyserRef.current.getByteFrequencyData(dataArrayRef.current);
             const average = dataArrayRef.current.reduce((a, b) => a + b, 0) / dataArrayRef.current.length;
             currentVol = average; // 0-255 approx
             
             setSensors(prev => ({ ...prev, audio: currentVol }));
         }

         // Draw Canvas
         const canvas = canvasRef.current;
         if (canvas) {
             const ctx = canvas.getContext('2d');
             if (ctx) {
                 ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; // Fade out effect
                 ctx.fillRect(0, 0, canvas.width, canvas.height);

                 const motionTotal = Math.abs(sensors.x) + Math.abs(sensors.y) + Math.abs(sensors.z);
                 
                 // Mode Specific Drawing
                 if (viewMode === 'dashboard') {
                     // MODE 1: Audio Waveform / Radar Style
                     const intensity = (currentVol / 255) + (motionTotal / 30);
                     let color = '#22c55e';
                     if (intensity > 0.4) color = '#eab308';
                     if (intensity > 0.7) color = '#ef4444';

                     ctx.strokeStyle = color;
                     ctx.lineWidth = 2;
                     
                     if (dataArrayRef.current) {
                        ctx.beginPath();
                        const sliceWidth = canvas.width / dataArrayRef.current.length;
                        let x = 0;
                        for (let i = 0; i < dataArrayRef.current.length; i++) {
                            const v = dataArrayRef.current[i] / 128.0;
                            const y = v * canvas.height / 2;
                            if (i === 0) ctx.moveTo(x, y);
                            else ctx.lineTo(x, y);
                            x += sliceWidth;
                        }
                        ctx.lineTo(canvas.width, canvas.height / 2);
                        ctx.stroke();
                     }
                 } else {
                     // MODE 2: Sine Wave Style (The "Previous" Meter)
                     offset += 2;
                     const activityLevel = motionTotal / 20;
                     
                     let color = '#22c55e'; // Green default
                     if (activityLevel > 0.8) color = '#ef4444'; // Red
                     else if (activityLevel > 0.5) color = '#eab308'; // Yellow
                     ctx.strokeStyle = color;

                     ctx.lineWidth = 2;
                     ctx.beginPath();
                     for (let i = 0; i < canvas.width; i+=5) {
                        // Combine sin wave with random noise based on activity
                        const y = canvas.height / 2 + Math.sin((i + offset) * 0.1) * (30 * Math.max(0.2, activityLevel)) + (Math.random() - 0.5) * (currentVol/5);
                        if (i === 0) ctx.moveTo(i, y);
                        else ctx.lineTo(i, y);
                     }
                     ctx.stroke();
                 }
             }
         }

         animationRef.current = requestAnimationFrame(updateLoop);
     };

     animationRef.current = requestAnimationFrame(updateLoop);
     return () => cancelAnimationFrame(animationRef.current);
  }, [isOpen, calibrated, sensors.x, sensors.y, sensors.z, viewMode]);

  // Word Generation Logic
  useEffect(() => {
    if (!isOpen || !calibrated) return;
    
    const interval = setInterval(() => {
      const motionTotal = Math.abs(sensors.x) + Math.abs(sensors.y) + Math.abs(sensors.z);
      const audioScore = sensors.audio; // 0-100ish usually
      
      // Heuristic: If motion is erratic OR audio is loud, generate word
      const thresholdScore = (motionTotal * 2) + (audioScore * 0.5); 
      
      if (thresholdScore > 40 || Math.random() > 0.95) {
         const word = GHOST_WORDS[Math.floor(Math.random() * GHOST_WORDS.length)];
         setActiveWord(word);
         setHistory(prev => [word, ...prev].slice(0, 5));
         
         // Haptic feedback if available
         if (navigator.vibrate) navigator.vibrate(200);
      } else if (Math.random() < 0.1) {
          setActiveWord(""); 
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isOpen, calibrated, sensors]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in duration-300">
       <div className="w-full max-w-md bg-[#0a0a0a] border border-zinc-700 shadow-[0_0_50px_rgba(34,197,94,0.1)] relative overflow-hidden flex flex-col" style={{ borderRadius: '8px', minHeight: '650px' }}>
          
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50">
            <div className="flex items-center gap-3 text-zinc-200">
               <Activity className="text-green-500 animate-pulse" size={20} />
               <span className="font-mono font-bold tracking-widest text-sm uppercase text-green-500">P.K.E. Meter</span>
               
               {/* Mode Switcher Buttons */}
               <div className="flex items-center gap-2 ml-4 border-l border-zinc-700 pl-4">
                  <button 
                    onClick={() => setViewMode('dashboard')}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${viewMode === 'dashboard' ? 'bg-zinc-800 text-green-500 border border-green-900 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'text-zinc-600 hover:text-zinc-400 border border-transparent'}`}
                    title="Dashboard View"
                  >
                    <LayoutGrid size={14} />
                  </button>
                  <button 
                    onClick={() => setViewMode('spectral')}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${viewMode === 'spectral' ? 'bg-zinc-800 text-green-500 border border-green-900 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'text-zinc-600 hover:text-zinc-400 border border-transparent'}`}
                    title="Spectral View"
                  >
                    <BarChart3 size={14} />
                  </button>
               </div>
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>

          {!calibrated ? (
             <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
                 <AlertTriangle size={48} className="text-yellow-500 animate-pulse" />
                 <h2 className="text-xl font-serif text-white tracking-widest">Calibration Required</h2>
                 <p className="text-zinc-400 text-sm">
                    To detect spiritual phenomena, this device requires access to your phone's microphone, accelerometer, and location sensors.
                 </p>
                 <button 
                    onClick={startSensors}
                    className="bg-green-700 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-sm uppercase tracking-[0.2em] transition-all shadow-[0_0_20px_rgba(21,128,61,0.5)] border border-green-500"
                 >
                    Initialize Sensors
                 </button>
             </div>
          ) : (
             <>
                {/* Main Visualizer (Shared Area) */}
                <div className="h-48 bg-black relative border-b border-zinc-800">
                    <canvas ref={canvasRef} width={400} height={192} className="w-full h-full opacity-90" />
                    <div className="absolute top-2 left-2 text-[10px] font-mono text-green-700 animate-pulse">
                        {viewMode === 'dashboard' ? 'MODE: SENSOR_FUSION' : 'MODE: SPECTRAL_ANALYSIS'}
                    </div>
                </div>

                {/* View Mode Content */}
                <div className="flex-1 bg-black/20 overflow-y-auto">
                    {viewMode === 'dashboard' ? (
                        // MODE 1: Dashboard Grid
                        <div className="p-4 grid grid-cols-2 gap-4 animate-in slide-in-from-right-4 duration-300">
                            {/* EMF (Motion) */}
                            <div className="bg-zinc-900/50 p-3 border border-zinc-800 rounded-sm">
                                <div className="flex items-center gap-2 text-zinc-500 mb-2">
                                    <Zap size={14} />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">EMF Level</span>
                                </div>
                                <div className="text-2xl font-mono text-white font-bold">
                                    {Math.round(Math.abs(sensors.x) + Math.abs(sensors.y) + Math.abs(sensors.z))} <span className="text-sm text-zinc-600">mG</span>
                                </div>
                                <div className="h-1 bg-zinc-800 mt-2 overflow-hidden">
                                    <div className="h-full bg-red-500 transition-all duration-100" style={{ width: `${Math.min((Math.abs(sensors.x)+Math.abs(sensors.y)) * 5, 100)}%` }}></div>
                                </div>
                            </div>

                            {/* EVP (Audio) */}
                            <div className="bg-zinc-900/50 p-3 border border-zinc-800 rounded-sm">
                                <div className="flex items-center gap-2 text-zinc-500 mb-2">
                                    <Mic size={14} />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">EVP (Audio)</span>
                                </div>
                                <div className="text-2xl font-mono text-white font-bold">
                                    {Math.round(sensors.audio / 2.5)} <span className="text-sm text-zinc-600">dB</span>
                                </div>
                                <div className="h-1 bg-zinc-800 mt-2 overflow-hidden">
                                    <div className="h-full bg-blue-500 transition-all duration-75" style={{ width: `${(sensors.audio / 255) * 100}%` }}></div>
                                </div>
                            </div>

                            {/* GEO (GPS) */}
                            <div className="bg-zinc-900/50 p-3 border border-zinc-800 rounded-sm">
                                <div className="flex items-center gap-2 text-zinc-500 mb-2">
                                    <MapPin size={14} />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">GPS Variance</span>
                                </div>
                                <div className="text-lg font-mono text-white">
                                    {sensors.gpsAcc > 0 ? `±${Math.round(sensors.gpsAcc)}m` : 'SEARCHING'}
                                </div>
                            </div>

                            {/* PWR (Battery) */}
                            <div className="bg-zinc-900/50 p-3 border border-zinc-800 rounded-sm">
                                <div className="flex items-center gap-2 text-zinc-500 mb-2">
                                    <Battery size={14} />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Life Force</span>
                                </div>
                                <div className={`text-lg font-mono ${sensors.battery < 20 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                                    {Math.round(sensors.battery)}%
                                </div>
                            </div>
                        </div>
                    ) : (
                        // MODE 2: Spectral Bars
                        <div className="p-6 space-y-6 animate-in slide-in-from-right-4 duration-300">
                             <div className="space-y-1">
                                <div className="flex justify-between text-[10px] font-mono text-zinc-500 uppercase">
                                    <span>Alpha (Orientation)</span>
                                    <span>{Math.round(sensors.mag)}°</span>
                                </div>
                                <div className="h-2 bg-zinc-900 overflow-hidden rounded-full border border-zinc-800">
                                    <div className="h-full bg-green-600 transition-all duration-100" style={{ width: `${(sensors.mag / 360) * 100}%` }}></div>
                                </div>
                             </div>

                             <div className="space-y-1">
                                <div className="flex justify-between text-[10px] font-mono text-zinc-500 uppercase">
                                    <span>Beta (Acceleration)</span>
                                    <span>{Math.round(sensors.y * 10)}</span>
                                </div>
                                <div className="h-2 bg-zinc-900 overflow-hidden rounded-full border border-zinc-800">
                                    <div className="h-full bg-yellow-600 transition-all duration-100" style={{ width: `${Math.min(Math.abs(sensors.y) * 10, 100)}%` }}></div>
                                </div>
                             </div>
                             
                             <div className="space-y-1">
                                <div className="flex justify-between text-[10px] font-mono text-zinc-500 uppercase">
                                    <span>Gamma (Gravity)</span>
                                    <span>{Math.round(sensors.z * 10)}</span>
                                </div>
                                <div className="h-2 bg-zinc-900 overflow-hidden rounded-full border border-zinc-800">
                                    <div className="h-full bg-red-600 transition-all duration-100" style={{ width: `${Math.min(Math.abs(sensors.z) * 10, 100)}%` }}></div>
                                </div>
                             </div>
                             
                             <div className="p-4 border border-zinc-800 bg-zinc-900/30 text-center">
                                <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Total Spectral Variance</div>
                                <div className="text-3xl font-mono text-green-500 font-bold">
                                    {(Math.abs(sensors.x) + Math.abs(sensors.y) + Math.abs(sensors.z)).toFixed(2)}
                                </div>
                             </div>
                        </div>
                    )}
                </div>

                {/* Word Generator / Spirit Box */}
                <div className="flex-none bg-zinc-950 p-6 flex flex-col items-center justify-center border-t border-zinc-800 relative">
                    <div className="absolute top-2 left-3 flex items-center gap-2 text-[10px] font-mono text-zinc-600">
                        <Radio size={12} className="animate-ping" />
                        <span>SPIRIT_BOX_SCANNING...</span>
                    </div>
                    
                    <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-t from-zinc-500 to-white tracking-widest font-serif min-h-[3rem] animate-pulse drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
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
             </>
          )}

       </div>
    </div>
  );
};