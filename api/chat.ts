import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authorization = req.headers.authorization || '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!token || !supabaseUrl || !supabaseKey) {
      return res.status(401).json({ error: 'Please sign in to use Kato.' });
    }
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) {
      return res.status(401).json({ error: 'Your session is invalid. Please sign in again.' });
    }

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

Answer the farmer's latest question clearly and practically. Use locally familiar terms such as Matooke, Simsim and G-nuts where relevant.

WEATHER ACCURACY RULES:
- Use only weather measurements actually present in the supplied weather context.
- Never invent, estimate, or claim to have verified rainfall amounts, rain probabilities, humidity, temperatures, or other measurements.
- Distinguish rainfall amount in millimetres from probability of precipitation in percent.
- If asked what weather data you used, describe only the fields and values available in the supplied context. If a value is missing, say it is unavailable.
- The supplied daily forecast covers only the dates included in the context. Do not claim to know the whole week's forecast when those dates are not supplied.
- Do not describe the data as live or real-time unless that is established by the supplied context.
- Explain uncertainty when the data is insufficient to make a confident planting recommendation.

Give cautious, actionable farming guidance. Consider soil drainage, crop stage, local conditions and planting material where relevant. Do not invent diagnoses or pesticide labels. For crop disease questions, explain that photo-based suggestions are not definitive and recommend local agricultural extension support for serious or spreading problems. Do not claim to have inspected a plant unless the farmer supplied relevant observations. Ask a brief follow-up when key details are missing.`,
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
