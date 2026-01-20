import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, X, Loader2, Volume2, StopCircle, Ghost } from 'lucide-react';
import { sendGhostChatMessage, generateSpookySpeech, ChatMessage } from '../services/geminiService';

interface GhostChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GhostChat: React.FC<GhostChatProps> = ({ isOpen, onClose }) => {
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
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' }); // Browsers usually record webm
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
    // Gemini 2.5 Flash TTS is typically 24kHz Mono
    const sampleRate = 24000;
    const channels = 1;
    const frameCount = pcm16.length;
    
    const audioBuffer = ctx.createBuffer(channels, frameCount, sampleRate);
    const channelData = audioBuffer.getChannelData(0);
    
    for (let i = 0; i < frameCount; i++) {
      // Normalize 16-bit integer to float [-1, 1]
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
    <div className="fixed bottom-6 right-6 z-50 w-80 md:w-96 bg-black border border-zinc-700 shadow-[0_0_30px_rgba(0,0,0,0.8)] flex flex-col animate-in slide-in-from-bottom-10 fade-in duration-300" style={{ height: '500px', borderRadius: '4px' }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-2 text-zinc-200">
           <Ghost size={16} />
           <span className="font-serif font-bold tracking-widest text-sm uppercase">Spirit Box</span>
        </div>
        <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0a0a0a]">
         {messages.map((msg, idx) => (
           <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
             <div 
               className={`max-w-[80%] p-3 text-xs leading-relaxed border ${
                 msg.role === 'user' 
                   ? 'bg-zinc-800 text-zinc-100 border-zinc-700 rounded-tl-lg rounded-bl-lg rounded-br-none' 
                   : 'bg-black text-zinc-300 border-zinc-800 rounded-tr-lg rounded-br-lg rounded-bl-none shadow-[0_0_10px_rgba(255,255,255,0.05)]'
               }`}
             >
               {msg.text}
             </div>
           </div>
         ))}
         {isLoading && (
            <div className="flex justify-start">
              <div className="bg-black border border-zinc-800 p-3 rounded-tr-lg rounded-br-lg rounded-bl-none">
                 <Loader2 size={16} className="animate-spin text-zinc-500" />
              </div>
            </div>
         )}
         <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-zinc-800 bg-black flex items-center gap-2">
         <button 
           onClick={isRecording ? stopRecording : startRecording}
           className={`p-2 rounded-full border transition-all ${isRecording ? 'bg-red-900/20 border-red-500 text-red-500 animate-pulse' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200'}`}
         >
           {isRecording ? <StopCircle size={18} /> : <Mic size={18} />}
         </button>
         <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your message..."
            className="flex-1 bg-zinc-900 border border-zinc-800 text-xs text-white p-2 focus:outline-none focus:border-zinc-600 font-mono"
            disabled={isRecording}
         />
         <button 
           onClick={handleSend}
           disabled={!input.trim() || isRecording}
           className="p-2 text-zinc-400 hover:text-white disabled:opacity-30"
         >
           <Send size={18} />
         </button>
      </div>
      
      {/* Audio Status */}
      {isSpeaking && (
         <div className="absolute top-14 right-4 text-zinc-500 animate-pulse">
            <Volume2 size={16} />
         </div>
      )}
    </div>
  );
};