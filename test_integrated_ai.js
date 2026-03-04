import { askAI } from './server/services/aiService.js';
import dotenv from 'dotenv';
dotenv.config();

async function runTest() {
    console.log('--- TESTE INTEGRADO AI SERVICE ---');
    try {
        const response = await askAI("Olá, você está funcionando?");
        console.log('RESPOSTA:', response);
        console.log('--- SUCESSO ---');
    } catch (error) {
        console.error('--- FALHA ---');
        console.error(error);
    }
}

runTest();
