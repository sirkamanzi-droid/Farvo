import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, districtName, cropName, weatherContext } = req.body ?? {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Please send a question to Kato.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error('Kato chat unavailable: GEMINI_API_KEY is not configured.');
      return res.status(503).json({
        error: 'Kato is not configured on the server yet. Please try again later.',
      });
    }

    const contents = messages
      .filter(
        (message: any) =>
          message &&
          (message.role === 'user' || message.role === 'assistant') &&
          typeof message.content === 'string' &&
          message.content.trim().length > 0,
      )
      .slice(-12)
      .map((message: any) => ({
        role: message.role === 'user' ? 'user' : 'model',
        parts: [{ text: message.content.trim().slice(0, 4000) }],
      }));

    const firstUserIndex = contents.findIndex((message: any) => message.role === 'user');
    if (firstUserIndex === -1) {
      return res.status(400).json({ error: 'Please send a valid question to Kato.' });
    }
    contents.splice(0, firstUserIndex);

    const context = JSON.stringify(weatherContext ?? {}).slice(0, 5000);
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents,
      config: {
        systemInstruction: `You are Kato, a practical agricultural advisor for smallholder farmers in Uganda.
The farmer's district is ${String(districtName || 'Uganda').slice(0, 100)}.
Their selected crop is ${String(cropName || 'not specified').slice(0, 100)}.
Recent weather context from the app: ${context || 'No weather context supplied'}.

Answer the farmer's latest question clearly and practically. Use locally familiar terms such as Matooke, Simsim and G-nuts where relevant. Consider the supplied weather context when useful, but do not invent weather measurements, diagnoses, pesticide labels, or certainty you do not have. Ask a brief follow-up when key details are missing. For crop disease questions, explain that photo-based suggestions are not definitive and recommend local agricultural extension support for serious or spreading problems. Give cautious, actionable guidance and do not claim to have inspected a plant unless the farmer supplied relevant observations.`,
        temperature: 0.7,
      },
    });

    const answer = response.text;
    if (!answer || !answer.trim()) {
      console.error('Kato chat returned an empty answer.');
      return res.status(502).json({ error: 'Kato could not prepare an answer. Please try again.' });
    }

    return res.status(200).json({ content: answer.trim() });
  } catch (error: unknown) {
    const details =
      error instanceof Error
        ? {
            name: error.name,
            message: error.message.slice(0, 500),
            status: (error as any).status ?? (error as any).statusCode,
            code: (error as any).code,
          }
        : { name: 'UnknownError', message: 'Unknown server error' };

    console.error('Kato chat error details:', details);

    return res.status(500).json({
      error: 'Kato could not answer just now. Please try again in a moment.',
    });
  }
}
