
import { GoogleGenAI } from "@google/genai";
// Use relative path for types
import { Assessment } from "../types";

export const getAIInsights = async (assessments: Assessment[], contextName: string) => {
  // Check for API key presence
  if (!process.env.API_KEY) return "AI Insights are unavailable without an API key.";

  // Create a new GoogleGenAI instance right before making an API call
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Use a more robust model for reasoning as this is a complex text task
  const model = 'gemini-3-pro-preview';

  const prompt = `
    Analyze the following ECCD (Early Childhood Care and Development) assessment summary for: ${contextName}.
    The assessments cover domains like Gross Motor, Fine Motor, Self-Help, Language, Cognitive, and Socio-Emotional.
    
    Summary Data: ${JSON.stringify(assessments)}
    
    Based on this data, provide a professional, encouraging, and highly structured summary in Markdown format that covers:
    1. Overall Developmental Status (A broad summary of how the group or individual is doing).
    2. Primary Strengths (The domains where scores are consistently high).
    3. Areas of Concern (Specific domains or tasks that show low completion rates or delays).
    4. Actionable Recommendations (Concrete activities for teachers and parents to support further development).
    
    Keep the tone academic yet accessible. Ensure the output is concise.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 4000 }
      }
    });
    // Access the text property directly (getter)
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Failed to generate AI insights. Please check your connectivity or API key configuration.";
  }
};
