
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

export const analyzeMatchup = async (
  myHero: string,
  enemyHero: string,
  enemyItems: string[],
  myRole: string
): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    你是一个《英雄联盟手游》(Wild Rift) 的世界级职业教练。
    我方英雄: ${myHero}
    我方位置: ${myRole}
    敌方对线英雄: ${enemyHero}
    敌方当前已出装备: ${enemyItems.length > 0 ? enemyItems.join(', ') : '尚未出装'}
    
    请根据这些信息，提供专业的对战分析、出装建议和连招指导。
    必须包含：
    1. 对局分析：当前敌我强弱势点。
    2. 针对性出装：推荐3件核心或针对性装备，并说明理由。
    3. 核心连招：针对敌方英雄的2个高效连招。
    4. 对局技巧：3个实战小贴士。
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          matchupAnalysis: { type: Type.STRING },
          recommendedItems: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                item: { type: Type.STRING },
                reason: { type: Type.STRING }
              },
              required: ["item", "reason"]
            }
          },
          combos: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                sequence: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ["sequence", "description"]
            }
          },
          strategyTips: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["matchupAnalysis", "recommendedItems", "combos", "strategyTips"]
      }
    }
  });

  return JSON.parse(response.text);
};

export const recognizeScreen = async (base64Image: string): Promise<{ myHero: string, enemyHero: string, enemyItems: string[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = "这是《英雄联盟手游》的屏幕截图（可能是对局内、加载界面或得分板）。请识别：1. 我方正在使用的英雄。 2. 敌方对线英雄（或者最明显的敌方英雄）。 3. 敌方已经出的主要装备名称。请以 JSON 格式返回。";

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { text: prompt },
        { inlineData: { mimeType: "image/jpeg", data: base64Image } }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          myHero: { type: Type.STRING },
          enemyHero: { type: Type.STRING },
          enemyItems: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["myHero", "enemyHero", "enemyItems"]
      }
    }
  });

  return JSON.parse(response.text);
};
