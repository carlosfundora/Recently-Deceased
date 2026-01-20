import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';

// Initialize the client.
const ai = new GoogleGenAI({ apiKey });

export const generateCemeteryHistory = async (cemeteryName: string): Promise<string> => {
  if (!apiKey) {
    return "Error: API Key is missing. The spirits cannot communicate without an API_KEY.";
  }

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
  if (!apiKey) return "The spirits require an API key to reveal their secrets.";

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