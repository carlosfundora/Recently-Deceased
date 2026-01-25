import React, { useState, useEffect, useRef } from 'react';
import { X, Activity, Zap, Radio, Mic, Battery, LayoutGrid, BarChart3, Camera, Image as ImageIcon, Video, Disc, Thermometer, Gauge, Fingerprint, Sun, AlertTriangle } from 'lucide-react';
import { TbAntenna } from "react-icons/tb";

interface GhostMeterProps {
  isOpen: boolean;
  onClose: () => void;
}

const GHOST_WORDS = [
  "BELOW", "COLD", "WAIT", "HELP", "RUN", "HIDE", "LOOK", "BURIED", "ASH", "BONE", 
  "DARK", "LEAVE", "NOW", "HERE", "GONE", "LOST", "SINK", "RISE", "FALL", "SEEK",
  "MOTHER", "FATHER", "SIN", "PRAY", "WATCH", "CLOSE", "BEHIND", "DOOR", "USHERS",
  "SILENCE", "WEEP", "ROT", "BELOW", "UNDER", "EARTH", "STONE", "NAME", "FORGOT",
  "LISTEN", "SPEAK", "TOUCH", "FEEL", "BURNING", "ICE", "EMPTY", "ALONE", "WITH YOU"
];

interface SpiritWord {
  id: number;
  text: string;
  xOffset: number;
  intensity: number;
}

type ViewMode = 'dashboard' | 'spectral' | 'visual' | 'rf';

export const GhostMeter: React.FC<GhostMeterProps> = ({ isOpen, onClose }) => {
  const [calibrated, setCalibrated] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [isRecording, setIsRecording] = useState(false);
  const [flashTrigger, setFlashTrigger] = useState(false);
  
  // Sensors State
  const [sensors, setSensors] = useState({ 
    x: 0, y: 0, z: 0, // Motion
    mag: 0,           // Orientation
    audio: 0,         // Mic volume
    gpsAcc: 0,        // GPS Accuracy
    battery: 100,     // Battery
    rfNoise: 0,       // Instant RF Noise
    rfAvg: 0,         // Smoothed RF
    drainRate: 0,     // Battery Drain
    temp: 22.5,       // Simulated Temperature (C)
    pressure: 1013,   // Simulated Pressure (hPa)
    humidity: 65,     // Simulated Humidity (%)
    touchForce: 0,    // Touch Pressure
    lightLevel: 50,   // Camera Light Level
    lightDelta: 0     // Light Shift
  });
  
  // Refs for high-frequency updates to avoid re-render lag in canvas
  const sensorsRef = useRef(sensors);
  useEffect(() => { sensorsRef.current = sensors; }, [sensors]);

  // Ghost Box State
  const [spiritWords, setSpiritWords] = useState<SpiritWord[]>([]);
  
  // Data History
  const [batteryHistory, setBatteryHistory] = useState<number[]>(new Array(20).fill(100));
  
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationRef = useRef<number>(0);

  // Cleanup
  useEffect(() => {
    if (!isOpen) {
      setCalibrated(false);
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      cancelAnimationFrame(animationRef.current);
      stopCamera();
    }
  }, [isOpen]);

  // Touch/Pressure Listener
  useEffect(() => {
    if (!isOpen) return;

    const handleTouch = (e: TouchEvent) => {
        let force = 0;
        if (e.touches.length > 0) {
            force = (e.touches[0] as any).force || 0.5;
            if (!force && e.touches.length > 0) force = 0.5;
        }
        setSensors(prev => ({ ...prev, touchForce: force + (e.touches.length * 0.1) }));
    };

    const handleTouchEnd = () => {
        setSensors(prev => ({ ...prev, touchForce: 0 }));
    };

    window.addEventListener('touchstart', handleTouch);
    window.addEventListener('touchmove', handleTouch);
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
        window.removeEventListener('touchstart', handleTouch);
        window.removeEventListener('touchmove', handleTouch);
        window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isOpen]);

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
       const stream = videoRef.current.srcObject as MediaStream;
       stream.getTracks().forEach(track => track.stop());
       videoRef.current.srcObject = null;
    }
  };

  const startCamera = async () => {
     try {
         const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
         if (videoRef.current) {
             videoRef.current.srcObject = stream;
         }
     } catch (e) {
         console.warn("Camera access denied", e);
     }
  };

  useEffect(() => {
      if (viewMode === 'visual') {
          startCamera();
      } else {
          stopCamera();
      }
  }, [viewMode]);

  const startSensors = async () => {
    // 1. Audio
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(stream);
      analyser.fftSize = 64; 
      source.connect(analyser);
      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
    } catch (e) {
      console.warn("Mic permission denied", e);
    }

    // 2. Motion
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        try {
            const response = await (DeviceMotionEvent as any).requestPermission();
            if (response !== 'granted') console.warn("Motion permission denied");
        } catch (e) { console.error(e); }
    }
    window.addEventListener('devicemotion', handleMotion);
    window.addEventListener('deviceorientation', handleOrientation);

    // 3. Geolocation
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(
            (pos) => setSensors(prev => ({ ...prev, gpsAcc: pos.coords.accuracy })), 
            (err) => console.warn(err), 
            { enableHighAccuracy: true }
        );
    }

    // 4. Battery
    if ((navigator as any).getBattery) {
        (navigator as any).getBattery().then((battery: any) => {
            const level = battery.level * 100;
            setSensors(prev => ({ ...prev, battery: level }));
            setBatteryHistory(new Array(20).fill(level));
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
      setSensors(prev => ({ ...prev, mag: e.alpha || prev.mag }));
  };

  const handleSnapPhoto = () => {
      setFlashTrigger(true);
      setTimeout(() => setFlashTrigger(false), 150);
  };

  // Main Render Loop
  useEffect(() => {
     if (!isOpen || !calibrated) return;

     let offset = 0;
     let frameCount = 0;
     let rfBuffer: number[] = []; 
     
     // Light analysis canvas
     const lightCanvas = document.createElement('canvas');
     lightCanvas.width = 32;
     lightCanvas.height = 32;
     const lightCtx = lightCanvas.getContext('2d');

     const updateLoop = () => {
         frameCount++;
         
         // Access latest refs
         const currentSensors = sensorsRef.current;
         let currentVol = currentSensors.audio;

         // Process Audio
         if (analyserRef.current && dataArrayRef.current) {
             analyserRef.current.getByteFrequencyData(dataArrayRef.current);
             const average = dataArrayRef.current.reduce((a, b) => a + b, 0) / dataArrayRef.current.length;
             currentVol = average;
             // Update state occasionally for React UI components
             if (frameCount % 4 === 0) setSensors(prev => ({ ...prev, audio: currentVol }));
         }

         // Update Environmental Simulators
         if (frameCount % 60 === 0) {
             setSensors(prev => {
                 const tempDrift = (Math.random() - 0.5) * 0.1;
                 const pressDrift = (Math.random() - 0.5) * 0.5;
                 const humidDrift = (Math.random() - 0.5) * 1;
                 const activity = (Math.abs(prev.x) + Math.abs(prev.y) + Math.abs(prev.z)) / 20;
                 return {
                     ...prev,
                     temp: prev.temp + tempDrift - (activity * 0.05),
                     pressure: prev.pressure + pressDrift,
                     humidity: Math.min(100, Math.max(0, prev.humidity + humidDrift))
                 };
             });
         }

         // Battery & Drain
         if (frameCount % 60 === 0) { 
             setSensors(prev => {
                 const sensorStress = (Math.abs(prev.x) + Math.abs(prev.y) + Math.abs(prev.z)) / 20;
                 const baseDrain = 0.01;
                 const flux = (Math.random() - 0.4) * 0.05 * sensorStress;
                 const newDrain = Math.max(0, baseDrain + flux);
                 const newHistory = [...batteryHistory.slice(1), prev.battery - (newDrain * 10)];
                 
                 // Using functional update correctly
                 setBatteryHistory(prevHist => [...prevHist.slice(1), prev.battery - (newDrain * 10)]);
                 return { ...prev, drainRate: newDrain * 100 };
             });
         }

         // RF Signal Logic
         const rawNoise = Math.random() * 100;
         rfBuffer.push(rawNoise);
         if (rfBuffer.length > 10) rfBuffer.shift(); 
         const smoothedRf = rfBuffer.reduce((a, b) => a + b, 0) / rfBuffer.length;
         
         if (frameCount % 5 === 0) {
            setSensors(prev => ({ ...prev, rfNoise: rawNoise, rfAvg: smoothedRf }));
         }

         // Visual Analysis (Light Meter)
         if (viewMode === 'visual' && videoRef.current && lightCtx && frameCount % 10 === 0) {
             try {
                 lightCtx.drawImage(videoRef.current, 0, 0, 32, 32);
                 const frame = lightCtx.getImageData(0, 0, 32, 32);
                 let total = 0;
                 for(let i = 0; i < frame.data.length; i += 4) {
                     total += (frame.data[i] + frame.data[i+1] + frame.data[i+2]) / 3;
                 }
                 const avgLight = total / (32 * 32);
                 const pct = (avgLight / 255) * 100;
                 
                 setSensors(prev => ({
                     ...prev,
                     lightLevel: pct,
                     lightDelta: pct - prev.lightLevel
                 }));
             } catch (e) { /* ignore */ }
         }

         // Draw Main Canvas
         const canvas = canvasRef.current;
         if (canvas) {
             const ctx = canvas.getContext('2d');
             if (ctx) {
                 ctx.clearRect(0, 0, canvas.width, canvas.height);
                 const motionTotal = Math.abs(currentSensors.x) + Math.abs(currentSensors.y) + Math.abs(currentSensors.z);
                 
                 if (viewMode === 'visual') {
                     const isStable = motionTotal < 11.0;
                     if (frameCount % 30 === 0 || Math.random() > 0.9) {
                        const bx = (Math.sin(frameCount * 0.02) * 0.4 + 0.5) * canvas.width + (Math.random() * 40 - 20);
                        const by = (Math.cos(frameCount * 0.03) * 0.4 + 0.5) * canvas.height + (Math.random() * 40 - 20);
                        ctx.strokeStyle = isStable ? '#00ff00' : '#ffff00'; 
                        ctx.lineWidth = 2;
                        
                        // Brackets
                        const size = 60; const len = 15;
                        ctx.beginPath(); ctx.moveTo(bx, by + len); ctx.lineTo(bx, by); ctx.lineTo(bx + len, by); ctx.stroke();
                        ctx.beginPath(); ctx.moveTo(bx + size - len, by); ctx.lineTo(bx + size, by); ctx.lineTo(bx + size, by + len); ctx.stroke();
                        ctx.beginPath(); ctx.moveTo(bx, by + size - len); ctx.lineTo(bx, by + size); ctx.lineTo(bx + len, by + size); ctx.stroke();
                        ctx.beginPath(); ctx.moveTo(bx + size - len, by + size); ctx.lineTo(bx + size, by + size); ctx.lineTo(bx + size, by + size - len); ctx.stroke();

                        ctx.font = '10px monospace';
                        ctx.fillStyle = isStable ? '#00ff00' : '#ffff00';
                        const label = isStable ? `LOCK [${(Math.random()*100).toFixed(0)}%]` : 'SEARCHING...';
                        ctx.fillText(label, bx, by - 5);
                     }
                 } else if (viewMode === 'dashboard') {
                     ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; 
                     ctx.fillRect(0, 0, canvas.width, canvas.height);
                     const intensity = (currentVol / 255) + (motionTotal / 30);
                     let color = '#22c55e'; if (intensity > 0.4) color = '#eab308'; if (intensity > 0.7) color = '#ef4444';
                     ctx.strokeStyle = color; ctx.lineWidth = 2;
                     
                     if (dataArrayRef.current) {
                        ctx.beginPath();
                        const sliceWidth = canvas.width / dataArrayRef.current.length;
                        let x = 0;
                        for (let i = 0; i < dataArrayRef.current.length; i++) {
                            const v = dataArrayRef.current[i] / 128.0;
                            const y = v * canvas.height / 2;
                            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                            x += sliceWidth;
                        }
                        ctx.lineTo(canvas.width, canvas.height / 2);
                        ctx.stroke();
                     }
                 } else if (viewMode === 'spectral') {
                     ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
                     offset += 2;
                     const activityLevel = motionTotal / 20;
                     let color = '#22c55e'; if (activityLevel > 0.8) color = '#ef4444'; else if (activityLevel > 0.5) color = '#eab308';
                     ctx.strokeStyle = color; ctx.lineWidth = 2;
                     ctx.beginPath();
                     for (let i = 0; i < canvas.width; i+=5) {
                        const y = canvas.height / 2 + Math.sin((i + offset) * 0.1) * (30 * Math.max(0.2, activityLevel)) + (Math.random() - 0.5) * (currentVol/5);
                        if (i === 0) ctx.moveTo(i, y); else ctx.lineTo(i, y);
                     }
                     ctx.stroke();
                 } else if (viewMode === 'rf') {
                     ctx.fillStyle = 'rgba(0, 0, 0, 0.9)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
                     const barWidth = 6; const barCount = canvas.width / barWidth;
                     for (let i = 0; i < barCount; i++) {
                         const xRatio = i / barCount;
                         const wave = Math.sin((frameCount * 0.1) + (xRatio * 10)); 
                         const jitter = Math.random(); 
                         const signal = (wave * 0.5 + 0.5) * 0.6 + (jitter * 0.4);
                         const height = signal * canvas.height * 0.9;
                         const hue = 200 + (signal * 100); 
                         ctx.fillStyle = `hsla(${hue}, 80%, 50%, 0.8)`;
                         ctx.fillRect(i * barWidth, canvas.height - height, barWidth - 1, height);
                         if (Math.random() > 0.95) { ctx.fillStyle = '#fff'; ctx.fillRect(i * barWidth, canvas.height - height - 4, barWidth - 1, 2); }
                     }
                     ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'; ctx.lineWidth = 1; ctx.beginPath();
                     ctx.moveTo(0, canvas.height/2); ctx.lineTo(canvas.width, canvas.height/2);
                     ctx.moveTo(0, canvas.height/4); ctx.lineTo(canvas.width, canvas.height/4);
                     ctx.moveTo(0, canvas.height*0.75); ctx.lineTo(canvas.width, canvas.height*0.75);
                     ctx.stroke();
                 }
             }
         }
         animationRef.current = requestAnimationFrame(updateLoop);
     };

     animationRef.current = requestAnimationFrame(updateLoop);
     return () => cancelAnimationFrame(animationRef.current);
  }, [isOpen, calibrated, viewMode]);

  // Dynamic Word Generation Logic
  useEffect(() => {
    if (!isOpen || !calibrated || viewMode === 'visual') return;
    
    // Check interval more frequently for responsiveness (500ms)
    const interval = setInterval(() => {
      const currentSensors = sensorsRef.current;
      
      // Calculate Activity Metrics
      // 1. Motion/EMF: Deviation from 1G (approx 9.8m/s^2) or just high raw movement
      // Assuming device is roughly static, magnitude near 9.8.
      const totalAccel = Math.sqrt(
          Math.pow(currentSensors.x, 2) + 
          Math.pow(currentSensors.y, 2) + 
          Math.pow(currentSensors.z, 2)
      );
      const motionDelta = Math.abs(totalAccel - 9.8); // Deviation from gravity
      const motionScore = Math.min(motionDelta / 5, 1); // Cap at 1 for moderate shaking

      // 2. Audio: Volume level (0-255)
      const audioScore = Math.min(currentSensors.audio / 100, 1); 

      // 3. RF: Random spikes
      const rfScore = currentSensors.rfNoise > 85 ? 1 : 0;

      // Calculate Trigger Probability
      // Base background rate is low (2%)
      // Activity linearly adds to probability
      let spawnProbability = 0.02; 
      spawnProbability += (motionScore * 0.4); // Movement adds up to 40%
      spawnProbability += (audioScore * 0.5);  // Noise adds up to 50%
      spawnProbability += (rfScore * 0.3);     // RF spikes add 30%

      // Hard trigger if really active or random chance
      if (spawnProbability > 0.8 || Math.random() < spawnProbability) {
         const text = GHOST_WORDS[Math.floor(Math.random() * GHOST_WORDS.length)];
         
         // Intensity Calculation (0.8 to 2.5 scale)
         // Determines text size and jitter
         const intensity = 0.8 + (motionScore) + (audioScore);

         const newWord: SpiritWord = {
             id: Date.now() + Math.random(), 
             text,
             xOffset: (Math.random() - 0.5) * 140, // Wider spread
             intensity: Math.min(intensity, 2.5)
         };

         setSpiritWords(prev => [newWord, ...prev].slice(0, 6)); 
         
         // Haptic Feedback based on intensity
         if (navigator.vibrate) {
             const vibeDuration = Math.floor(50 + (intensity * 100));
             navigator.vibrate(vibeDuration);
         }
      }
    }, 500); // Check every 500ms
    return () => clearInterval(interval);
  }, [isOpen, calibrated, viewMode]);

  if (!isOpen) return null;

  // Aggregate signal for Diodes
  const getSignalStrength = () => {
      const motion = (Math.abs(sensors.x) + Math.abs(sensors.y) + Math.abs(sensors.z)); // 0-20ish
      const audio = sensors.audio / 2.5; // 0-100
      const rf = sensors.rfNoise; // 0-100
      const touch = sensors.touchForce * 100; // 0-100
      
      // Weighted average normalized roughly to 0-100
      return (motion * 3 + audio + rf + touch) / 4;
  };
  const signalStrength = getSignalStrength();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in duration-300">
       <div className="w-full max-w-md bg-[#0a0a0a] border border-zinc-700 shadow-[0_0_50px_rgba(34,197,94,0.1)] relative overflow-hidden flex flex-col transition-all duration-500" style={{ borderRadius: '8px', minHeight: '650px' }}>
          
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50 z-20 relative">
            <div className="flex items-center gap-3 text-zinc-200">
               <Activity className="text-green-500 animate-pulse" size={20} />
               <span className="font-mono font-bold tracking-widest text-sm uppercase text-green-500">P.K.E. Meter</span>
               
               {/* Mode Switcher */}
               <div className="flex items-center gap-2 ml-4 border-l border-zinc-700 pl-4">
                  {(['dashboard', 'spectral', 'visual', 'rf'] as const).map(mode => (
                      <button 
                        key={mode}
                        onClick={() => setViewMode(mode)} 
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${viewMode === mode ? 'bg-zinc-800 text-green-500 border border-green-900 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'text-zinc-600 hover:text-zinc-400 border border-transparent'}`} 
                        title={mode.toUpperCase()}
                      >
                        {mode === 'dashboard' && <LayoutGrid size={14} />}
                        {mode === 'spectral' && <BarChart3 size={14} />}
                        {mode === 'visual' && <Camera size={14} />}
                        {mode === 'rf' && <TbAntenna size={14} />}
                      </button>
                  ))}
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
                    Initializing spectral sensors... Permission required for environmental data access.
                 </p>
                 <button onClick={startSensors} className="bg-green-700 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-sm uppercase tracking-[0.2em] transition-all shadow-[0_0_20px_rgba(21,128,61,0.5)] border border-green-500">
                    Engage System
                 </button>
             </div>
          ) : (
             <>
                {/* Main Viewport */}
                <div className={`relative bg-black border-b border-zinc-800 overflow-hidden transition-all duration-500 ${viewMode === 'visual' ? 'flex-1' : 'h-48'}`}>
                    {/* Camera Video */}
                    <video 
                       ref={videoRef} 
                       autoPlay 
                       muted 
                       playsInline 
                       className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${viewMode === 'visual' ? 'opacity-70 invert-[0.1] brightness-110 contrast-125 sepia-[0.6] hue-rotate-[-20deg]' : 'opacity-0'}`}
                    />
                    
                    {/* Flash Effect */}
                    <div className={`absolute inset-0 bg-white z-50 pointer-events-none transition-opacity duration-150 ${flashTrigger ? 'opacity-100' : 'opacity-0'}`}></div>

                    {/* Light Exposure Shift Overlay (Camera Mode Only) */}
                    {viewMode === 'visual' && (
                        <>
                            {/* Top Bar shift visualizer */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-zinc-800 z-30">
                                <div 
                                    className={`h-full transition-all duration-300 ${Math.abs(sensors.lightDelta) > 5 ? 'bg-red-500' : 'bg-green-500'}`}
                                    style={{ 
                                        width: `${Math.min(100, Math.abs(sensors.lightDelta) * 5)}%`,
                                        opacity: Math.min(1, Math.abs(sensors.lightDelta) / 10),
                                        transform: 'translateX(-50%)',
                                        left: '50%'
                                    }}
                                />
                            </div>
                            
                            {/* Top Right Light Meter */}
                            <div className="absolute top-4 right-4 z-30 flex flex-col items-end gap-1">
                                <div className="flex items-center gap-1 text-[10px] text-green-500 font-mono bg-black/60 px-2 py-1 border border-green-900/50">
                                    <Sun size={10} />
                                    <span>ISO: {(sensors.lightLevel * 8).toFixed(0)}</span>
                                </div>
                                <div className="w-16 h-1 bg-zinc-800">
                                    <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${sensors.lightLevel}%` }}></div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Canvas Overlay */}
                    <canvas ref={canvasRef} width={400} height={192} className={`w-full h-full relative z-10 ${viewMode === 'visual' ? 'opacity-80' : 'opacity-100'}`} />
                    
                    <div className="absolute top-2 left-2 text-[10px] font-mono text-green-700 animate-pulse z-20 bg-black/80 px-2 py-1 border border-green-900/50">
                        MODE: {viewMode === 'visual' ? 'SPECTRAL_OPTICS' : viewMode === 'rf' ? 'RF_SPECTRUM_ANALYZER' : viewMode.toUpperCase()}
                    </div>
                </div>

                {/* Secondary Content Area */}
                {viewMode !== 'visual' && (
                    <div className="flex-1 bg-black/20 overflow-y-auto">
                        {viewMode === 'dashboard' && (
                            <div className="p-4 space-y-3 animate-in slide-in-from-right-4 duration-300">
                                <div className="grid grid-cols-2 gap-3">
                                    {/* EMF */}
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
                                    {/* EVP */}
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
                                    {/* Touch Sensor */}
                                    <div className="bg-zinc-900/50 p-3 border border-zinc-800 rounded-sm">
                                        <div className="flex items-center gap-2 text-zinc-500 mb-2">
                                            <Fingerprint size={14} />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">Capacitance</span>
                                        </div>
                                        <div className="text-2xl font-mono text-white font-bold">
                                            {(sensors.touchForce * 100).toFixed(0)} <span className="text-sm text-zinc-600">%</span>
                                        </div>
                                        <div className="h-1 bg-zinc-800 mt-2 overflow-hidden">
                                            <div className="h-full bg-purple-500 transition-all duration-75" style={{ width: `${Math.min(sensors.touchForce * 200, 100)}%` }}></div>
                                        </div>
                                    </div>
                                    {/* Battery Analysis */}
                                    <div className="col-span-1 bg-zinc-900/50 p-3 border border-zinc-800 rounded-sm relative overflow-hidden">
                                        <div className="flex flex-col mb-2">
                                             <div className="flex items-center gap-2 text-zinc-500 mb-1">
                                                <Battery size={14} />
                                                <span className="text-[10px] font-bold uppercase tracking-wider">Ion. Drain</span>
                                             </div>
                                             <span className={`text-[10px] font-mono font-bold ${sensors.drainRate > 2 ? 'text-red-500 animate-pulse' : 'text-green-500'}`}>
                                                {sensors.drainRate > 2 ? 'CRITICAL' : 'NOMINAL'}
                                             </span>
                                        </div>
                                        <div className="flex items-end gap-0.5 h-6 w-full">
                                            {batteryHistory.map((val, i) => (
                                                <div key={i} className="flex-1 bg-zinc-800 h-full relative">
                                                    <div className={`absolute bottom-0 w-full transition-all duration-500 ${val < 90 ? 'bg-red-500' : 'bg-green-500'}`} style={{ height: `${val}%` }} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                
                                {/* P.K.E. Diodes Array */}
                                <div className="bg-black/40 p-4 border border-zinc-800 rounded-sm flex flex-col gap-2 relative overflow-hidden shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]">
                                     {/* Glass reflection effect */}
                                     <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
                                     
                                     <div className="flex justify-between items-end mb-1">
                                        <span className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest">P.K.E. Intensity Array</span>
                                        <span className="text-[10px] font-mono text-zinc-600 animate-pulse">{signalStrength > 80 ? 'HAZARDOUS' : 'ACTIVE'}</span>
                                     </div>
                                     <div className="flex gap-1 h-3 w-full">
                                       {Array.from({length: 12}).map((_, i) => {
                                           const threshold = (i + 1) * (100 / 12);
                                           const isActive = signalStrength >= threshold;
                                           let colorClass = 'bg-green-500';
                                           if (i > 4) colorClass = 'bg-yellow-500';
                                           if (i > 8) colorClass = 'bg-orange-500';
                                           if (i > 10) colorClass = 'bg-red-600';
                                           
                                           return (
                                               <div 
                                                  key={i} 
                                                  className={`flex-1 rounded-[1px] transition-all duration-100 border border-black/30 ${isActive ? `${colorClass} shadow-[0_0_8px_currentColor] opacity-100` : 'bg-zinc-800 opacity-20'}`}
                                               />
                                           );
                                       })}
                                     </div>
                                </div>
                            </div>
                        )}

                        {viewMode === 'spectral' && (
                             <div className="p-6 space-y-4 animate-in slide-in-from-right-4 duration-300">
                                 {/* Alpha */}
                                 <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono text-zinc-500 uppercase">
                                        <span>Alpha (Orientation)</span>
                                        <span>{Math.round(sensors.mag)}°</span>
                                    </div>
                                    <div className="h-2 bg-zinc-900 overflow-hidden rounded-full border border-zinc-800">
                                        <div className="h-full bg-green-600 transition-all duration-100" style={{ width: `${(sensors.mag / 360) * 100}%` }}></div>
                                    </div>
                                 </div>
                                 {/* Beta */}
                                 <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono text-zinc-500 uppercase">
                                        <span>Beta (Acceleration)</span>
                                        <span>{Math.round(sensors.y * 10)}</span>
                                    </div>
                                    <div className="h-2 bg-zinc-900 overflow-hidden rounded-full border border-zinc-800">
                                        <div className="h-full bg-yellow-600 transition-all duration-100" style={{ width: `${Math.min(Math.abs(sensors.y) * 10, 100)}%` }}></div>
                                    </div>
                                 </div>
                                 {/* Temperature */}
                                 <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono text-zinc-500 uppercase">
                                        <span className="flex items-center gap-2"><Thermometer size={10} /> Amb. Temp</span>
                                        <span>{sensors.temp.toFixed(1)}°C</span>
                                    </div>
                                    <div className="h-2 bg-zinc-900 overflow-hidden rounded-full border border-zinc-800">
                                        <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${(sensors.temp / 50) * 100}%` }}></div>
                                    </div>
                                 </div>
                                 {/* Pressure */}
                                 <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono text-zinc-500 uppercase">
                                        <span className="flex items-center gap-2"><Gauge size={10} /> Barometric</span>
                                        <span>{sensors.pressure.toFixed(0)} hPa</span>
                                    </div>
                                    <div className="h-2 bg-zinc-900 overflow-hidden rounded-full border border-zinc-800">
                                        <div className="h-full bg-purple-500 transition-all duration-300" style={{ width: `${((sensors.pressure - 950) / 100) * 100}%` }}></div>
                                    </div>
                                 </div>
                             </div>
                        )}

                        {viewMode === 'rf' && (
                            <div className="p-4 space-y-4 animate-in slide-in-from-right-4 duration-300">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-zinc-900/50 p-4 border border-zinc-800 text-center">
                                        <div className="text-[10px] text-zinc-500 uppercase">2.4GHz ISM Density</div>
                                        <div className="text-2xl font-mono text-blue-500">{(sensors.rfAvg / 10).toFixed(2)} <span className="text-xs text-zinc-600">dBm</span></div>
                                    </div>
                                    <div className="bg-zinc-900/50 p-4 border border-zinc-800 text-center">
                                        <div className="text-[10px] text-zinc-500 uppercase">WLAN Flux</div>
                                        <div className="text-2xl font-mono text-green-500">{Math.floor(sensors.rfAvg * 1.5)} <span className="text-xs text-zinc-600">p/s</span></div>
                                    </div>
                                </div>
                                <div className="p-4 border border-zinc-800 bg-zinc-900/30 font-mono text-xs text-zinc-400 h-40 overflow-hidden relative">
                                    <h4 className="text-green-500 font-bold mb-2 uppercase">Telemetry Log</h4>
                                    <ul className="space-y-1 opacity-70">
                                        <li className="flex justify-between"><span>Scanning Bands...</span> <span className="text-green-500">[ACQ]</span></li>
                                        <li className="flex justify-between"><span>Atmospheric Moisture...</span> <span className="text-blue-400">{sensors.humidity.toFixed(1)}%</span></li>
                                        <li className="flex justify-between"><span>NFC Field...</span> <span className="text-zinc-500">{(sensors.rfNoise / 50).toFixed(3)} μT</span></li>
                                        <li className="flex justify-between"><span>Electrostatic Discharge...</span> <span className="text-zinc-500">NOMINAL</span></li>
                                        <li className="text-blue-400 mt-2 border-t border-zinc-700 pt-1">
                                            Thermal Variance: {(sensors.temp - 22.5).toFixed(2)}
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Footer Controls Container */}
                <div className="flex-none bg-zinc-950 border-t border-zinc-800 relative z-30 h-36 overflow-hidden">
                    
                    {/* Fog Background Layer */}
                    <div className="absolute inset-0 z-0 opacity-40 pointer-events-none select-none overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-800/20 to-transparent w-[200%] animate-fog-flow"></div>
                        <div className="absolute -inset-[50%] bg-[radial-gradient(circle,rgba(255,255,255,0.05)_0%,transparent_60%)] animate-[spin_30s_linear_infinite_reverse] blur-2xl"></div>
                        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60"></div>
                    </div>

                    {/* Spirit Box Layer (Static z-10) */}
                    <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 z-10 ${viewMode === 'visual' ? 'opacity-20 blur-sm scale-95 pointer-events-none' : 'opacity-100'}`}>
                        <div className="absolute top-2 left-3 flex items-center gap-2 text-[10px] font-mono text-zinc-600 z-20">
                            <Radio size={12} className="animate-ping" />
                            <span>SCANNING_ETHER...</span>
                        </div>
                        
                        {/* Drifting Words Container */}
                        <div className="relative w-full h-full flex items-center justify-center">
                            {spiritWords.map((word, index) => {
                                const isNew = index === 0;
                                // Drift Calculation
                                const yOffset = index * 35; 
                                // Scale based on intensity and age
                                const scale = Math.max(0.5, (1 - (index * 0.15))) * (isNew ? 1 : 0.9);
                                const opacity = Math.max(0, 1 - (index * 0.2));
                                const blur = Math.max(0, (index * 2));
                                
                                // Dynamic font size based on intensity
                                const fontSize = `${1.5 * (word.intensity || 1)}rem`;
                                const color = word.intensity > 1.8 ? '#ef4444' : (word.intensity > 1.4 ? '#eab308' : '#71717a');
                                const glow = word.intensity > 1.5 ? `0 0 ${10 * word.intensity}px ${color}` : 'none';

                                return (
                                    <div 
                                        key={word.id}
                                        className={`absolute text-center font-serif font-black tracking-widest transition-all duration-1000 ease-out flex items-center justify-center whitespace-nowrap z-10`}
                                        style={{
                                            top: `50%`,
                                            left: `50%`,
                                            transform: `translate(calc(-50% + ${word.xOffset}px), calc(-50% + ${yOffset}px)) scale(${scale})`,
                                            opacity: opacity,
                                            fontSize: fontSize,
                                            filter: `blur(${blur}px)`,
                                            color: isNew ? '#ffffff' : color,
                                            textShadow: isNew ? `0 0 20px rgba(255,255,255,0.8)` : glow
                                        }}
                                    >
                                        {word.text}
                                    </div>
                                );
                            })}
                            
                            {/* Empty State */}
                            {spiritWords.length === 0 && (
                                <div className="text-zinc-800 font-serif text-sm italic animate-pulse">
                                    ...listening...
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Camera Controls Layer (Sliding z-20) */}
                    <div className={`absolute inset-0 flex items-center justify-around p-4 bg-zinc-950/90 backdrop-blur-sm transition-transform duration-500 ease-in-out z-20 ${viewMode === 'visual' ? 'translate-y-0' : 'translate-y-full'}`}>
                         <button className="p-4 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500">
                            <ImageIcon size={24} />
                         </button>
                         
                         <button 
                            onClick={handleSnapPhoto}
                            className="w-20 h-20 rounded-full border-4 border-zinc-300 bg-white/10 hover:bg-white/30 active:scale-95 transition-all flex items-center justify-center relative"
                         >
                            <div className="w-16 h-16 rounded-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)]"></div>
                         </button>
                         
                         <button 
                            onClick={() => setIsRecording(!isRecording)}
                            className={`p-4 rounded-full bg-zinc-900 border ${isRecording ? 'border-red-900 text-red-500 animate-pulse' : 'border-zinc-700 text-zinc-400 hover:text-white'}`}
                         >
                            {isRecording ? <Disc size={24} className="animate-spin" /> : <Video size={24} />}
                         </button>
                    </div>

                </div>
             </>
          )}

       </div>
    </div>
  );
};