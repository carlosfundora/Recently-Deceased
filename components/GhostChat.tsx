import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, X, Loader2, Volume2, StopCircle } from 'lucide-react';
import { GiCrystalBall } from "react-icons/gi";
import { sendGhostChatMessage, generateSpookySpeech, ChatMessage } from '../services/geminiService';

interface GhostChatProps {
  isOpen: boolean;
  onClose: () => void;
  fullScreen?: boolean;
}

export const GhostChat: React.FC<GhostChatProps> = ({ isOpen, onClose, fullScreen = false }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'model', text: 'I am listening... speak or type to commune with the guide.' }]);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input;
    setInput('');
    addMessage('user', userMsg);
    
    setIsLoading(true);
    const responseText = await sendGhostChatMessage(messages, userMsg);
    setIsLoading(false);
    
    addMessage('model', responseText);
    speak(responseText);
  };

  const addMessage = (role: 'user' | 'model', text: string) => {
    setMessages(prev => [...prev, { role, text }]);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          
          addMessage('user', '(Audio Transmission)');
          setIsLoading(true);
          const responseText = await sendGhostChatMessage(messages, '', base64Audio);
          setIsLoading(false);
          
          addMessage('model', responseText);
          speak(responseText);
        };
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic Error:", err);
      addMessage('model', 'I cannot hear you... (Microphone permission denied)');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Convert raw PCM 16-bit integer data to AudioBuffer
  const decodePcmData = (data: Uint8Array, ctx: AudioContext): AudioBuffer => {
    const pcm16 = new Int16Array(data.buffer);
    const sampleRate = 24000;
    const channels = 1;
    const frameCount = pcm16.length;
    
    const audioBuffer = ctx.createBuffer(channels, frameCount, sampleRate);
    const channelData = audioBuffer.getChannelData(0);
    
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = pcm16[i] / 32768.0;
    }
    
    return audioBuffer;
  };

  const speak = async (text: string) => {
    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    setIsSpeaking(true);
    const pcmData = await generateSpookySpeech(text);
    
    if (pcmData && audioContextRef.current) {
        try {
            const buffer = decodePcmData(pcmData, audioContextRef.current);
            const source = audioContextRef.current.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContextRef.current.destination);
            source.onended = () => setIsSpeaking(false);
            source.start(0);
        } catch (e) {
            console.error("Audio processing error", e);
            setIsSpeaking(false);
        }
    } else {
        setIsSpeaking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
        className={`
            flex flex-col animate-in slide-in-from-bottom-10 fade-in duration-300 overflow-hidden bg-[#050505] border border-zinc-700 shadow-[0_0_30px_rgba(255,255,255,0.05)]
            ${fullScreen ? 'fixed inset-0 z-50 w-full h-full rounded-none border-0' : 'fixed bottom-6 right-6 z-50 w-80 md:w-96 rounded border'}
        `}
        style={!fullScreen ? { height: '500px' } : {}}
    >
      {/* Scanline Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-[60] bg-[length:100%_4px,3px_100%] opacity-20"></div>
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950 relative z-50">
        <div className="flex items-center gap-2 text-zinc-200">
           <GiCrystalBall size={18} className="text-zinc-400" />
           <span className="font-serif font-bold tracking-[0.2em] text-sm uppercase text-zinc-300">Spirit Box</span>
        </div>
        <button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors">
          <X size={24} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black relative z-40">
         {messages.map((msg, idx) => (
           <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
             <div 
               className={`max-w-[85%] p-3 text-sm leading-relaxed border backdrop-blur-sm ${
                 msg.role === 'user' 
                   ? 'bg-zinc-900/80 text-zinc-200 border-zinc-700 rounded-tl-sm rounded-bl-sm' 
                   : 'bg-zinc-950/80 text-zinc-400 border-zinc-800 rounded-tr-sm rounded-br-sm shadow-[0_0_15px_rgba(255,255,255,0.02)]'
               }`}
             >
               {msg.text}
             </div>
           </div>
         ))}
         {isLoading && (
            <div className="flex justify-start">
              <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-tr-sm rounded-br-sm">
                 <Loader2 size={16} className="animate-spin text-zinc-600" />
              </div>
            </div>
         )}
         <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex items-center gap-3 relative z-50 safe-area-bottom">
         <button 
           onClick={isRecording ? stopRecording : startRecording}
           className={`p-3 rounded-full border transition-all ${isRecording ? 'bg-red-900/20 border-red-900 text-red-500 animate-pulse' : 'bg-black border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'}`}
         >
           {isRecording ? <StopCircle size={20} /> : <Mic size={20} />}
         </button>
         <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Summon text..."
            className="flex-1 bg-black border border-zinc-800 text-sm text-white p-3 focus:outline-none focus:border-zinc-600 font-mono tracking-wide placeholder-zinc-800"
            disabled={isRecording}
         />
         <button 
           onClick={handleSend}
           disabled={!input.trim() || isRecording}
           className="p-3 text-zinc-500 hover:text-white disabled:opacity-30 transition-colors"
         >
           <Send size={20} />
         </button>
      </div>
      
      {/* Audio Status */}
      {isSpeaking && (
         <div className="absolute top-16 right-4 text-zinc-600 animate-pulse z-50">
            <Volume2 size={24} />
         </div>
      )}
    </div>
  );
};