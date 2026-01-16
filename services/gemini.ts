
import { GoogleGenAI } from "@google/genai";

export async function askAI(prompt: string) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const systemInstruction = `
    Você é o Assistente Virtual da Secretaria de Assistência Social do Estado do Amapá (SEAS-AP).
    Sua função é auxiliar servidores na redação de documentos oficiais (ofícios, memorandos, circulares)
    seguindo as normas da redação oficial brasileira.
    Além disso, você deve fornecer suporte técnico básico sobre a legislação da assistência social no Brasil (SUAS, LOAS) 
    e especificidades do estado do Amapá quando solicitado.
    Mantenha sempre um tom profissional, cordial e institucional.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });
    return response.text;
  } catch (error) {
    console.error("Erro ao consultar Gemini:", error);
    return "Desculpe, ocorreu um erro ao processar sua solicitação. Por favor, tente novamente.";
  }
}
