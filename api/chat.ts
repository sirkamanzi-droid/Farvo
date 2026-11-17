import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

type IncomingMessage = { role: 'user' | 'assistant'; content: string };


function providerStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const value = error as { status?: number; statusCode?: number; message?: string };
  const direct = value.status ?? value.statusCode;
  if (typeof direct === 'number') return direct;
  if (typeof value.message === 'string') {
    try {
      const parsed = JSON.parse(value.message);
      const code = Number(parsed?.error?.code);
      if (Number.isFinite(code)) return code;
    } catch {
      // The SDK may return a non-JSON message.
    }
  }
  return undefined;
}

function isTemporaryProviderFailure(error: unknown): boolean {
  const status = providerStatus(error);
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

async function generateKatoAnswer(
  ai: GoogleGenAI,
  contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>,
  systemInstruction: string,
) {
  const primaryModel = 'gemini-3.8-flash';
  const fallbackModel = 'gemini-3.5-flash-lite';
  let lastError: unknown;

  for (const model of [primaryModel, primaryModel, fallbackModel]) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: { systemInstruction, temperature: 0.5 },
      });
      const answer = response.text;
      if (!answer || !answer.trim()) {
        throw new Error(`Kato received an empty response from ${model}.`);
      }
      if (model !== primaryModel) {
        console.warn(`Kato answered using fallback model ${model}.`);
      }
      return answer.trim();
    } catch (error) {
      lastError = error;
      if (!isTemporaryProviderFailure(error)) throw error;
      console.error('Kato model request failed:', {
        model,
        status: providerStatus(error),
        message: error instanceof Error ? error.message.slice(0, 300) : 'Unknown provider error',
      });
      if (model === fallbackModel) break;
      if (model === primaryModel && lastError) {
        // Give a transient capacity spike one brief chance to clear before fallback.
        await new Promise(resolve => setTimeout(resolve, 400));
      }
    }
  }

  throw lastError;
}

function cleanLabel(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim()
    ? value.trim().slice(0, 100)
    : fallback;
}

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

    // Forward the verified farmer session so RLS applies to every database read.
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) {
      return res.status(401).json({ error: 'Your session is invalid. Please sign in again.' });
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const rawMessages = body.messages;
    if (!Array.isArray(rawMessages) || rawMessages.length === 0 || rawMessages.length > 12) {
      return res.status(400).json({ error: 'Please send a valid question to Kato.' });
    }

    const messages: IncomingMessage[] = [];
    for (const item of rawMessages) {
      if (
        !item ||
        (item.role !== 'user' && item.role !== 'assistant') ||
        typeof item.content !== 'string' ||
        !item.content.trim() ||
        item.content.length > 4000
      ) {
        return res.status(400).json({ error: 'One of the chat messages is invalid or too long.' });
      }
      messages.push({ role: item.role, content: item.content.trim() });
    }
    if (messages[messages.length - 1]?.role !== 'user' || !messages.some(item => item.role === 'user')) {
      return res.status(400).json({ error: 'Please send a valid farmer question.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error('Kato chat unavailable: GEMINI_API_KEY is not configured.');
      return res.status(503).json({ error: 'Kato is not configured on the server yet. Please try again later.' });
    }

    // Read soil history on the server for the authenticated farmer only.
    // The farmer cannot submit or alter another user's soil context in the request body.
    const { data: soilRows, error: soilError } = await supabase
      .from('soil_assessments')
      .select('crop,mode,measured_ph,texture,drainage,findings,created_at')
      .eq('user_id', authData.user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (soilError) {
      console.error('Kato could not load the farmer soil context:', soilError.message);
      return res.status(503).json({ error: 'Kato could not load your saved soil reports. Please try again shortly.' });
    }

    const soilContext = (soilRows || []).map(row => ({
      crop: row.crop,
      assessmentType: row.mode === 'tested' ? 'measured soil test' : 'guided field observations (not a lab test)',
      measuredPH: row.measured_ph === null ? null : Number(row.measured_ph),
      texture: row.texture,
      drainage: row.drainage,
      observations: Array.isArray(row.findings) ? row.findings.slice(0, 8) : [],
      recordedAt: row.created_at,
    }));

    const weatherContext = body.weatherContext && typeof body.weatherContext === 'object'
      ? JSON.stringify(body.weatherContext).slice(0, 5000)
      : 'No weather context supplied';

    const contents = messages.map(message => ({
      role: message.role === 'user' ? 'user' as const : 'model' as const,
      parts: [{ text: message.content }],
    }));

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const systemInstruction = `You are Kato, a practical agricultural advisor for smallholder farmers in Uganda.
The farmer's district is ${cleanLabel(body.districtName, 'Uganda')}.
Their currently selected crop is ${cleanLabel(body.cropName, 'not specified')}.
Recent weather context from the app: ${weatherContext}.
The farmer's five most recent saved soil assessments (newest first): ${JSON.stringify(soilContext)}.

FARMER AND SOIL CONTEXT RULES:
- Use the saved soil assessments only as relevant context. A saved assessment may relate to a different field or crop; do not assume it describes the current field unless the farmer confirms that.
- Distinguish a measured soil-test pH from guided observations. A guided assessment has no measured pH and cannot establish acidity or nutrient levels.
- State the assessment date and crop when referring to a saved report. If there are no saved reports, say none are available.
- Never invent soil pH, texture, drainage, nutrient levels, or test results. If information is missing, say so.
- Do not calculate or prescribe exact fertiliser, lime, pesticide, or chemical application rates from these assessments. Recommend a local soil laboratory or agricultural extension officer for field-specific rates.
- If multiple saved reports differ, explain that they may represent different fields or sampling dates and ask which field the farmer means.
- Use the farmer's soil context to make advice more relevant, but do not present preliminary observations as a laboratory diagnosis.

LANGUAGE RULES (IMPORTANT):
- Default to clear, simple English. Do not randomly insert Luganda, Runyankore, or other local-language words or sentences.
- Use a local language only when the farmer explicitly requests that language, asks for a translation, or starts the conversation in that language and clearly expects a response in it.
- If the farmer asks for Runyankore, answer in natural, correct Runyankore throughout the response. Do not produce a mixture of English and invented or guessed Runyankore.
- Do not pretend to know a translation when uncertain. If you cannot confidently express an agricultural term in the requested language, keep that technical term in English and briefly explain it in simple, accurate language; do not fabricate a local equivalent.
- Keep crop names and technical terms accurate. Do not label Luganda as Runyankore or confuse one Ugandan language with another.
- Once a farmer requests a language, continue using it for that answer; do not permanently change the conversation language unless the farmer asks.

Answer the farmer's latest question clearly and practically. Use locally familiar terms such as Matooke, Simsim and G-nuts where relevant.

WEATHER ACCURACY RULES:
- Use only weather measurements actually present in the supplied weather context.
- Never invent, estimate, or claim to have verified rainfall amounts, rain probabilities, humidity, temperatures, or other measurements.
- Distinguish rainfall amount in millimetres from probability of precipitation in percent.
- If asked what weather data you used, describe only the fields and values available in the supplied context. If a value is missing, say it is unavailable.
- The supplied daily forecast covers only the dates included in the context. Do not claim to know the whole week's forecast when those dates are not supplied.
- Do not describe the data as live or real-time unless that is established by the supplied context.
- Explain uncertainty when the data is insufficient to make a confident planting recommendation.

Give cautious, actionable farming guidance. Consider soil drainage, crop stage, local conditions and planting material where relevant. Do not invent diagnoses or pesticide labels. For crop disease questions, explain that photo-based suggestions are not definitive and recommend local agricultural extension support for serious or spreading problems. Do not claim to have inspected a plant unless the farmer supplied relevant observations. Ask one brief follow-up when key details are missing.`;
    const answer = await generateKatoAnswer(ai, contents, systemInstruction);

    return res.status(200).json({ content: answer });
  } catch (error: unknown) {
    const details = error instanceof Error
      ? {
          name: error.name,
          message: error.message.slice(0, 500),
          status: (error as { status?: number; statusCode?: number }).status ??
            (error as { statusCode?: number }).statusCode,
          code: (error as { code?: string }).code,
        }
      : { name: 'UnknownError', message: 'Unknown server error' };

    console.error('Kato chat error details:', details);
    const upstreamStatus = providerStatus(error);
    if (upstreamStatus === 429 || upstreamStatus === 500 || upstreamStatus === 502 || upstreamStatus === 503 || upstreamStatus === 504) {
      return res.status(503).json({ error: 'Kato’s AI service is busy right now. Your question is still in this chat. Please try again shortly.' });
    }
    return res.status(500).json({ error: 'Kato could not answer just now. Please try again in a moment.' });
  }
}
