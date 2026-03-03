import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tenta carregar do diretório atual e da raiz
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function testAI() {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log("CHAVE ENCONTRADA (primeiros 10 caracteres):", apiKey ? apiKey.substring(0, 10) + "..." : "NENHUMA");

    if (!apiKey) {
        console.error("ERRO: GEMINI_API_KEY não encontrada.");
        process.exit(1);
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        console.log("Enviando prompt de teste...");
        const result = await model.generateContent("Olá, responda apenas 'OK' se estiver funcionando.");
        const response = await result.response;
        console.log("RESPOSTA DA IA:", response.text());
    } catch (error) {
        console.error("ERRO AO TESTAR IA:", error.message);
        if (error.response) {
            console.error("DETALHES DA RESPOSTA:", error.response.data);
        }
        process.exit(1);
    }
}

testAI();
