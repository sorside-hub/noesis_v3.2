const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function test() {
  try {
    await ai.models.get({ model: 'gemini-3.6-flash' });
    console.log('Success 3.6');
  } catch(e) {
    console.log('Error 3.6:', e.message);
  }
}
test();
