
import { GoogleGenAI } from "@google/genai";
import { Assessment } from "../types";

// Always use the process.env.API_KEY directly for initialization as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getAIInsights = async (assessments: Assessment[], learnerName: string) => {
  if (!process.env.API_KEY) return "AI Insights are unavailable without an API key.";

  const prompt = `
    Analyze the following ECCD (Early Childhood Care and Development) assessment data for a learner named ${learnerName}.
    The assessments cover domains like Gross Motor, Fine Motor, Self-Help, Language, Cognitive, and Socio-Emotional.
    Data: ${JSON.stringify(assessments)}
    
    Provide a concise, professional summary of:
    1. Overall developmental progress.
    2. Specific strengths.
    3. Areas needing intervention or additional support.
    4. Suggested activities for teachers/parents.
    Keep the tone encouraging and professional.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    // Access the text property directly from the response as it is a getter, not a method.
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Failed to generate AI insights. Please try again later.";
  }
};
