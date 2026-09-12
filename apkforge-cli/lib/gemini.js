const { GoogleGenAI } = require('@google/genai');

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
  return new GoogleGenAI({ apiKey });
}

async function chat(prompt) {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-lite',
    contents: prompt
  });
  return response.text;
}

module.exports = { chat };
