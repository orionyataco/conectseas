import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

export async function askAI(prompt) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error("ERRO: GEMINI_API_KEY não configurada no ambiente.");
        throw new Error("Configuração de IA ausente");
    }

    const genAI = new GoogleGenerativeAI(apiKey);

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
            model: 'gemini-flash-latest',
            systemInstruction: systemInstruction
        });

        // Adicionando um timeout manual simples para a chamada da API
        const generatePromise = model.generateContent(prompt);
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout ao consultar Gemini API")), 30000)
        );

        const result = await Promise.race([generatePromise, timeoutPromise]);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("--- ERRO DETALHADO GEMINI ---");
        console.error("Mensagem:", error.message);
        if (error.status) console.error("Status HTTP:", error.status);
        if (error.response) {
            try {
                const errorData = await error.response.json();
                console.error("Detalhes do erro:", JSON.stringify(errorData, null, 2));
            } catch (e) {
                console.error("Não foi possível extrair detalhes do erro.");
            }
        }
        console.error("-----------------------------");
        throw error;
    }
}
