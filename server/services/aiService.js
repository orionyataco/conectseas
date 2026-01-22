import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

export async function askAI(prompt) {
    const genAI = new GoogleGenerativeAI(process.env.API_KEY || '');

    const systemInstruction = `
    Você é o Assistente Virtual da Secretaria de Assistência Social do Estado do Amapá (SEAS-AP).
    Sua função é auxiliar servidores na redação de documentos oficiais (ofícios, memorandos, circulares)
    seguindo as normas da redação oficial brasileira.
    Além disso, você deve fornecer suporte técnico básico sobre a legislação da assistência social no Brasil (SUAS, LOAS) 
    e especificidades do estado do Amapá quando solicitado.
    Mantenha sempre um tom profissional, cordial e institucional.
  `;

    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            systemInstruction: systemInstruction
        });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Erro ao consultar Gemini no backend:", error);
        throw error;
    }
}
