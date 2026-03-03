import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("ERRO: GEMINI_API_KEY não encontrada.");
        process.exit(1);
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    try {
        console.log("Tentando inicializar com 'gemini-1.5-flash'...");
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Oi");
        console.log("Sucesso com gemini-1.5-flash");
    } catch (error) {
        console.error("FALHA com gemini-1.5-flash:", error.message);

        try {
            console.log("Tentando inicializar com 'gemini-pro'...");
            const modelPro = genAI.getGenerativeModel({ model: "gemini-pro" });
            const resultPro = await modelPro.generateContent("Oi");
            console.log("Sucesso com gemini-pro");
        } catch (errorPro) {
            console.error("FALHA com gemini-pro:", errorPro.message);

            try {
                console.log("Tentando inicializar com 'gemini-flash-latest'...");
                const modelLatest = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
                const resultLatest = await modelLatest.generateContent("Oi");
                console.log("Sucesso com gemini-flash-latest");
            } catch (errorLatest) {
                console.error("FALHA com gemini-flash-latest:", errorLatest.message);

                try {
                    console.log("Tentando inicializar com 'gemini-2.0-flash-lite'...");
                    const modelLite = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
                    const resultLite = await modelLite.generateContent("Oi");
                    console.log("Sucesso com gemini-2.0-flash-lite");
                } catch (errorLite) {
                    console.error("FALHA com gemini-2.0-flash-lite:", errorLite.message);
                }
            }
        }
    }
}

listModels();
