import { GoogleGenAI, Modality, Type } from "@google/genai";

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

export const generateCemeteryDetails = async (cemeteryName: string): Promise<any> => {
  try {
    const prompt = `Provide detailed historical data for ${cemeteryName} in New Orleans. Include the founding date (or consecration), estimated number of interments (dead people), and a detailed history (approx 200 words) focusing on its lore, architecture, and significance.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
             founded: { type: Type.STRING, description: "Year or date founded/consecrated" },
             interments: { type: Type.STRING, description: "Estimated number of interments (e.g. 'Over 100,000' or 'Unknown')" },
             longHistory: { type: Type.STRING, description: "A detailed 2-3 paragraph history." }
          },
          required: ["founded", "interments", "longHistory"]
        }
      }
    });

    if (response.text) {
        return JSON.parse(response.text);
    }
    return null;
  } catch (error) {
    console.error("Gemini Details Error:", error);
    return null;
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
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [...contents, prompt] as any, 
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

export const generateSpookySpeech = async (text: string): Promise<Uint8Array | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO], 
        speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Charon' }, 
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
      return bytes;
    }
    return null;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
};