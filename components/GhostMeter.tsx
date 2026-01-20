import React, { useState, useEffect, useRef } from 'react';
import { X, Activity, Zap, Radio, Mic, MapPin, Battery, AlertTriangle, LayoutGrid, BarChart3, Camera, Wifi } from 'lucide-react';
import { TbAntenna } from "react-icons/tb";

interface GhostMeterProps {
  isOpen: boolean;
  onClose: () => void;
}

const GHOST_WORDS = [
  "BELOW", "COLD", "WAIT", "HELP", "RUN", "HIDE", "LOOK", "BURIED", "ASH", "BONE", 
  "DARK", "LEAVE", "NOW", "HERE", "GONE", "LOST", "SINK", "RISE", "FALL", "SEEK",
  "MOTHER", "FATHER", "SIN", "PRAY", "WATCH", "CLOSE", "BEHIND", "DOOR"
];

type ViewMode = 'dashboard' | 'spectral' | 'visual' | 'rf';

export const GhostMeter: React.FC<GhostMeterProps> = ({ isOpen, onClose }) => {
  const [calibrated, setCalibrated] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [sensors, setSensors] = useState({ 
    x: 0, y: 0, z: 0, // Motion
    mag: 0,           // Orientation/Compass
    audio: 0,         // Microphone volume (0-100)
    gpsAcc: 0,        // GPS Accuracy in meters
    battery: 100,     // Battery Level
    rfNoise: 0,       // Simulated RF Noise
    drainRate: 0      // Calculated Drain Rate
  });
  
  const [activeWord, setActiveWord] = useState<string>("");
  const [history, setHistory] = useState<string[]>([]);
  const [batteryHistory, setBatteryHistory] = useState<number[]>(new Array(20).fill(100));
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationRef = useRef<number>(0);

  // cleanup on close
  useEffect(() => {
    if (!isOpen) {
      setCalibrated(false);
      setSensors({ x: 0, y: 0, z: 0, mag: 0, audio: 0, gpsAcc: 0, battery: 100, rfNoise: 0, drainRate: 0 });
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      cancelAnimationFrame(animationRef.current);
      stopCamera();
    }
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

  // Switch camera on/off based on mode
  useEffect(() => {
      if (viewMode === 'visual') {
          startCamera();
      } else {
          stopCamera();
      }
  }, [viewMode]);

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

    // 2. Motion (Accelerometer)
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

    // 4. Battery Monitoring
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
      setSensors(prev => ({
          ...prev,
          mag: e.alpha || prev.mag
      }));
  };

  // Main Loop
  useEffect(() => {
     if (!isOpen || !calibrated) return;

     let offset = 0;
     let frameCount = 0;

     const updateLoop = () => {
         frameCount++;
         let currentVol = 0;

         // Process Audio
         if (analyserRef.current && dataArrayRef.current) {
             analyserRef.current.getByteFrequencyData(dataArrayRef.current);
             const average = dataArrayRef.current.reduce((a, b) => a + b, 0) / dataArrayRef.current.length;
             currentVol = average; // 0-255 approx
             
             // Update sensor state for volume occasionally to avoid react thrashing
             if (frameCount % 10 === 0) {
                setSensors(prev => ({ ...prev, audio: currentVol }));
             }
         }

         // Update Battery Telemetry Simulation
         if (frameCount % 60 === 0) { // Every second approx
             setSensors(prev => {
                 // Simulate micro-fluctuations in drain rate based on sensor stress
                 const sensorStress = (Math.abs(prev.x) + Math.abs(prev.y) + Math.abs(prev.z)) / 20;
                 const baseDrain = 0.01;
                 const flux = (Math.random() - 0.4) * 0.05 * sensorStress;
                 const newDrain = Math.max(0, baseDrain + flux);
                 
                 // Shift history
                 const newHistory = [...batteryHistory.slice(1), prev.battery - (newDrain * 10)]; // exaggerated drop for viz
                 setBatteryHistory(newHistory);
                 
                 return { ...prev, drainRate: newDrain * 100 }; // amplify for display
             });
         }

         // Simulated RF Noise
         setSensors(prev => ({
             ...prev,
             rfNoise: Math.random() * 100
         }));

         // Draw Canvas
         const canvas = canvasRef.current;
         if (canvas) {
             const ctx = canvas.getContext('2d');
             if (ctx) {
                 ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear transparently for overlays

                 const motionTotal = Math.abs(sensors.x) + Math.abs(sensors.y) + Math.abs(sensors.z);
                 
                 // Mode Specific Drawing
                 if (viewMode === 'dashboard') {
                     // Audio Waveform
                     ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; 
                     ctx.fillRect(0, 0, canvas.width, canvas.height);

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
                 } else if (viewMode === 'spectral') {
                     // Sine Wave
                     ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; 
                     ctx.fillRect(0, 0, canvas.width, canvas.height);

                     offset += 2;
                     const activityLevel = motionTotal / 20;
                     let color = '#22c55e';
                     if (activityLevel > 0.8) color = '#ef4444';
                     else if (activityLevel > 0.5) color = '#eab308';
                     ctx.strokeStyle = color;
                     ctx.lineWidth = 2;
                     ctx.beginPath();
                     for (let i = 0; i < canvas.width; i+=5) {
                        const y = canvas.height / 2 + Math.sin((i + offset) * 0.1) * (30 * Math.max(0.2, activityLevel)) + (Math.random() - 0.5) * (currentVol/5);
                        if (i === 0) ctx.moveTo(i, y);
                        else ctx.lineTo(i, y);
                     }
                     ctx.stroke();
                 } else if (viewMode === 'visual') {
                     // Visual/Camera Overlay - Ghost Boxes
                     ctx.clearRect(0, 0, canvas.width, canvas.height);
                     
                     // Randomly draw detection boxes
                     if (Math.random() > 0.95) {
                         const bx = Math.random() * canvas.width;
                         const by = Math.random() * canvas.height;
                         ctx.strokeStyle = '#22c55e';
                         ctx.lineWidth = 2;
                         ctx.strokeRect(bx, by, 50, 50);
                         ctx.font = '10px monospace';
                         ctx.fillStyle = '#22c55e';
                         ctx.fillText('ANOMALY', bx, by - 5);
                     }
                 } else if (viewMode === 'rf') {
                     // RF Frequency Analyzer
                     ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'; 
                     ctx.fillRect(0, 0, canvas.width, canvas.height);
                     
                     const barWidth = 10;
                     const barCount = canvas.width / barWidth;
                     
                     for (let i = 0; i < barCount; i++) {
                         const noise = Math.random() * 0.5 + 0.5;
                         const freq = Math.sin((frameCount * 0.05) + (i * 0.2)) * 0.5 + 0.5; // Sine wave pattern
                         const height = (freq * noise) * canvas.height * 0.8;
                         
                         const hue = 120 + (height / canvas.height) * -120; // Green to Red
                         ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
                         ctx.fillRect(i * barWidth, canvas.height - height, barWidth - 2, height);
                     }
                     
                     ctx.fillStyle = '#ffffff';
                     ctx.font = '12px monospace';
                     ctx.fillText(`CHANNELS: ${Math.floor(barCount)} | SIGNAL_DENSITY: ${(sensors.rfNoise/100).toFixed(2)}`, 10, 20);
                 }
             }
         }

         animationRef.current = requestAnimationFrame(updateLoop);
     };

     animationRef.current = requestAnimationFrame(updateLoop);
     return () => cancelAnimationFrame(animationRef.current);
  }, [isOpen, calibrated, sensors.x, sensors.y, sensors.z, viewMode, batteryHistory, sensors.rfNoise]);

  // Word Generation Logic
  useEffect(() => {
    if (!isOpen || !calibrated) return;
    
    const interval = setInterval(() => {
      const motionTotal = Math.abs(sensors.x) + Math.abs(sensors.y) + Math.abs(sensors.z);
      const audioScore = sensors.audio; 
      
      const thresholdScore = (motionTotal * 2) + (audioScore * 0.5); 
      
      if (thresholdScore > 40 || Math.random() > 0.95) {
         const word = GHOST_WORDS[Math.floor(Math.random() * GHOST_WORDS.length)];
         setActiveWord(word);
         setHistory(prev => [word, ...prev].slice(0, 5));
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
          <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50 z-20 relative">
            <div className="flex items-center gap-3 text-zinc-200">
               <Activity className="text-green-500 animate-pulse" size={20} />
               <span className="font-mono font-bold tracking-widest text-sm uppercase text-green-500">P.K.E. Meter</span>
               
               {/* Mode Switcher Buttons */}
               <div className="flex items-center gap-2 ml-4 border-l border-zinc-700 pl-4">
                  <button 
                    onClick={() => setViewMode('dashboard')}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${viewMode === 'dashboard' ? 'bg-zinc-800 text-green-500 border border-green-900 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'text-zinc-600 hover:text-zinc-400 border border-transparent'}`}
                    title="Dashboard"
                  >
                    <LayoutGrid size={14} />
                  </button>
                  <button 
                    onClick={() => setViewMode('spectral')}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${viewMode === 'spectral' ? 'bg-zinc-800 text-green-500 border border-green-900 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'text-zinc-600 hover:text-zinc-400 border border-transparent'}`}
                    title="Spectral"
                  >
                    <BarChart3 size={14} />
                  </button>
                  <button 
                    onClick={() => setViewMode('visual')}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${viewMode === 'visual' ? 'bg-zinc-800 text-green-500 border border-green-900 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'text-zinc-600 hover:text-zinc-400 border border-transparent'}`}
                    title="Ghost Vision"
                  >
                    <Camera size={14} />
                  </button>
                  <button 
                    onClick={() => setViewMode('rf')}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${viewMode === 'rf' ? 'bg-zinc-800 text-green-500 border border-green-900 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'text-zinc-600 hover:text-zinc-400 border border-transparent'}`}
                    title="RF Analyzer"
                  >
                    <TbAntenna size={14} />
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
                    To detect spiritual phenomena, this device requires access to your phone's microphone, accelerometer, camera and location sensors.
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
                <div className="h-48 bg-black relative border-b border-zinc-800 overflow-hidden">
                    {/* Camera Element - visible only in Visual Mode */}
                    <video 
                       ref={videoRef} 
                       autoPlay 
                       muted 
                       playsInline 
                       className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${viewMode === 'visual' ? 'opacity-50 invert brightness-125 contrast-125 sepia-100 hue-rotate-90' : 'opacity-0'}`}
                    />
                    
                    <canvas ref={canvasRef} width={400} height={192} className="w-full h-full relative z-10" />
                    
                    <div className="absolute top-2 left-2 text-[10px] font-mono text-green-700 animate-pulse z-20 bg-black/50 px-1">
                        MODE: {viewMode.toUpperCase()}
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

                            {/* Battery Telemetry Analyzer */}
                            <div className="col-span-2 bg-zinc-900/50 p-3 border border-zinc-800 rounded-sm relative overflow-hidden">
                                <div className="flex justify-between items-center mb-2">
                                     <div className="flex items-center gap-2 text-zinc-500">
                                        <Battery size={14} />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Telemetry Drain Analysis</span>
                                     </div>
                                     <span className={`text-xs font-mono font-bold ${sensors.drainRate > 2 ? 'text-red-500 animate-pulse' : 'text-green-500'}`}>
                                        {sensors.drainRate > 2 ? 'CRITICAL DRAIN' : 'STABLE'}
                                     </span>
                                </div>
                                
                                <div className="flex items-end gap-1 h-12 w-full">
                                    {batteryHistory.map((val, i) => (
                                        <div 
                                          key={i} 
                                          className="flex-1 bg-zinc-800 relative group"
                                          style={{ height: '100%' }}
                                        >
                                            <div 
                                               className={`absolute bottom-0 w-full transition-all duration-500 ${val < 90 ? 'bg-red-500' : 'bg-green-500'}`}
                                               style={{ height: `${val}%` }}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-1 flex justify-between text-[8px] font-mono text-zinc-600">
                                    <span>T-20s</span>
                                    <span>DRAIN_RATE: {sensors.drainRate.toFixed(4)}% / sec</span>
                                    <span>NOW</span>
                                </div>
                            </div>
                        </div>
                    ) : viewMode === 'rf' ? (
                        // MODE 4: RF Info
                        <div className="p-4 space-y-4 animate-in slide-in-from-right-4 duration-300">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-zinc-900/50 p-4 border border-zinc-800 text-center">
                                    <div className="text-[10px] text-zinc-500 uppercase">Bluetooth Devices</div>
                                    <div className="text-2xl font-mono text-blue-500">{Math.floor(sensors.rfNoise / 10)}</div>
                                </div>
                                <div className="bg-zinc-900/50 p-4 border border-zinc-800 text-center">
                                    <div className="text-[10px] text-zinc-500 uppercase">Wi-Fi Congestion</div>
                                    <div className="text-2xl font-mono text-green-500">{Math.floor(sensors.rfNoise * 1.5)}%</div>
                                </div>
                            </div>
                            <div className="p-4 border border-zinc-800 bg-zinc-900/30 font-mono text-xs text-zinc-400">
                                <h4 className="text-green-500 font-bold mb-2 uppercase">Spectrum Analysis Log</h4>
                                <ul className="space-y-1 opacity-70">
                                    <li>Scanning 2.4GHz band... [OK]</li>
                                    <li>Scanning 5GHz band... [OK]</li>
                                    <li>NFC Field: {(sensors.rfNoise / 20).toFixed(2)} μT</li>
                                    <li className="text-yellow-500">{sensors.rfNoise > 80 ? 'WARNING: HIGH INTERFERENCE DETECTED' : 'Signal levels within normal parameters'}</li>
                                </ul>
                            </div>
                        </div>
                    ) : (
                        // MODE 2 & 3: Minimal or Spectral Bars (Reused from previous code)
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
                <div className="flex-none bg-zinc-950 p-6 flex flex-col items-center justify-center border-t border-zinc-800 relative overflow-hidden">
                    <div className="absolute top-2 left-3 flex items-center gap-2 text-[10px] font-mono text-zinc-600">
                        <Radio size={12} className="animate-ping" />
                        <span>SPIRIT_BOX_SCANNING...</span>
                    </div>
                    
                    {/* Animated Ghost Word */}
                    <div 
                        key={activeWord}
                        className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-t from-zinc-500 to-white tracking-widest font-serif min-h-[3rem] drop-shadow-[0_0_10px_rgba(255,255,255,0.2)] animate-in zoom-in-50 fade-in duration-300 slide-in-from-bottom-2"
                    >
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