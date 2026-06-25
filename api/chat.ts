import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  const { messages, districtName, cropName } = req.body;
  if (!messages || !Array.isArray(messages)) { res.status(400).json({ error: 'Messages array is required.' }); return; }
  const contents = messages.map((m: any) => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] }));
  const response = await ai.models.generateContent({
    model: 'gemini-1.5-flash',
    contents,
    config: {
      systemInstruction: `You are Kato, a friendly Ugandan AI Agronomist helping smallholder farmers in ${districtName || 'Uganda'} with ${cropName || 'general farming'}. Be practical and use local terms like Matooke, Simsim, G-nuts.`,
      temperature: 0.7,
    }
  });
  res.json({ content: response.text });
}
