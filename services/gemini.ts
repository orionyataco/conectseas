import api from './api';

export async function askAI(prompt: string) {
  try {
    const response = await api.post('/ai/chat', { prompt });
    return response.data.text;
  } catch (error) {
    console.error("Erro ao consultar backend de IA:", error);
    return "Desculpe, ocorreu um erro ao processar sua solicitação. Por favor, tente novamente.";
  }
}
