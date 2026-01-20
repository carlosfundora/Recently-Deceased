import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateCemeteryHistory = async (cemeteryName: string): Promise<string> => {
  try {
    const prompt = `Provide a concise, intriguing historical summary (max 100 words) for ${cemeteryName} in New Orleans. Focus on what makes it unique or spooky.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "The spirits are silent (No response text generated).";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "The connection to the other side was interrupted. Please try again later.";
  }
};

export const generateDailyFacts = async (cemeteryName: string): Promise<string> => {
  try {
    const prompt = `Provide 3 interesting, obscure, or spooky facts about ${cemeteryName} in New Orleans. Format as a bulleted list.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "The archives are empty today.";
  } catch (error) {
    console.error("Gemini API Error (Facts):", error);
    return "Static interferes with the signal...";
  }
};

// Chat & Audio Services

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export const sendGhostChatMessage = async (history: ChatMessage[], newMessage: string, audioBase64?: string): Promise<string> => {
  try {
    const contents = [];
    
    // Add history
    history.forEach(msg => {
      contents.push({
        role: msg.role,
        parts: [{ text: msg.text }]
      });
    });

    // Add new message
    const parts: any[] = [];
    if (audioBase64) {
      parts.push({
        inlineData: {
          mimeType: 'audio/wav',
          data: audioBase64
        }
      });
    }
    parts.push({ text: newMessage || (audioBase64 ? "Respond to this audio." : "...") });
    
    const prompt = {
        role: 'user',
        parts: parts
    };
    
    // We can't easily use chat.sendMessage with ad-hoc history + audio in a stateless way unless we rebuild the chat object or use generateContent with multi-turn structure.
    // Ideally, for a persistent log in the UI, we just send the whole conversation history to generateContent.
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [...contents, prompt] as any, // Cast to any to bypass strict type checking for quick implementation, standard structure is correct though.
      config: {
        systemInstruction: "You are a spirit guide for New Orleans cemeteries. You are spooky, helpful, and knowledgeable about history and the macabre. Keep answers concise.",
      }
    });

    return response.text || "...";
  } catch (error) {
    console.error("Chat Error:", error);
    return "The spirit box is malfunctioning...";
  }
};

export const generateSpookySpeech = async (text: string): Promise<ArrayBuffer | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO], 
        speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Charon' }, // Charon sounds deeper/spookier
            },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes.buffer;
    }
    return null;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
};