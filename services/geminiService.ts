
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getOracleAdvice = async (score: number, shotsLeft: number, level: number) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are the "Balloon Oracle", a wise but whimsical game sensei. The player is playing a slingshot balloon popping game.
      Current Stats:
      - Score: ${score}
      - Shots Left: ${shotsLeft}
      - Level: ${level}
      
      Give a short (max 2 sentences), encouraging, and slightly mystical piece of advice or a comment on their performance. Keep it fun and thematic.`,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text || "May your aim be true and your balloons many.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "The winds of fate are shifting. Aim high, young one!";
  }
};

export const getNextLevelConfig = async (currentLevel: number) => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate the next level configuration for a slingshot balloon game. The current level is ${currentLevel}.
        Return a JSON object with the following properties:
        - balloonCount: number
        - balloonSpeedRange: [number, number] (min speed, max speed)
        - targetScore: number
        - shotsAvailable: number
        - wind: number (-2 to 2)
        - themeName: string (a funny name for the level)
        
        Increase difficulty slightly.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              balloonCount: { type: Type.NUMBER },
              balloonSpeedRange: { type: Type.ARRAY, items: { type: Type.NUMBER } },
              targetScore: { type: Type.NUMBER },
              shotsAvailable: { type: Type.NUMBER },
              wind: { type: Type.NUMBER },
              themeName: { type: Type.STRING },
            },
            required: ["balloonCount", "balloonSpeedRange", "targetScore", "shotsAvailable", "wind", "themeName"]
          }
        }
      });
      return JSON.parse(response.text);
    } catch (error) {
      return {
        balloonCount: 8 + currentLevel * 2,
        balloonSpeedRange: [1 + currentLevel * 0.2, 2 + currentLevel * 0.3],
        targetScore: 500 + currentLevel * 200,
        shotsAvailable: 10,
        wind: Math.random() * 2 - 1,
        themeName: `Level ${currentLevel + 1}`
      };
    }
}
