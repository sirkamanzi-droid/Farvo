import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Leave enough time for the vision request to finish on Vercel.
export const config = { maxDuration: 30, api: { bodyParser: { sizeLimit: '5mb' } } };

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
      return res.status(401).json({ error: 'Please sign in to analyse a soil photo.' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: 'Bearer ' + token } },
    });
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) {
      return res.status(401).json({ error: 'Your session is invalid. Please sign in again.' });
    }

    const image = req.body && typeof req.body.image === 'string' ? req.body.image : '';
    if (!/^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(image) || image.length > 4_800_000) {
      return res.status(400).json({ error: 'Choose a valid soil photo smaller than 3.5 MB.' });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error('Soil vision is not configured: GROQ_API_KEY is missing.');
      return res.status(503).json({ error: 'Soil photo scanning is not configured yet. Please contact Omulimi support.' });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    let response: Response;
    try {
      response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Current Groq vision model documented for image understanding.
          model: 'qwen/qwen3.8-27b',
          temperature: 0.2,
          max_completion_tokens: 350,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Inspect this farm soil photo. Return concise plain-text visual observations only: visible colour, apparent surface texture, visible particles or stones, visible organic matter clues, moisture appearance, and image quality. State uncertainty. Do not infer or claim pH, nitrogen, phosphorus, potassium, organic carbon, exact soil classification, fertility, or drainage from the image. Do not recommend fertiliser or chemicals. If it is not clearly a soil photo, say so.',
              },
              { type: 'image_url', image_url: { url: image } },
            ],
          }],
        }),
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted) {
        console.error('Soil vision request timed out after 25 seconds.');
        return res.status(504).json({ error: 'Soil photo scanning took too long. Please try again with a clear, well-lit photo.' });
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      // Keep provider diagnostics in server logs; never return credentials or raw provider payloads.
      console.error('Soil vision provider failed:', response.status, detail.slice(0, 500));
      if (response.status === 401 || response.status === 403) {
        return res.status(503).json({ error: 'The soil-scanning service needs its API connection checked. Please try again later.' });
      }
      if (response.status === 429) {
        return res.status(503).json({ error: 'The soil-scanning service is busy. Please try again shortly.' });
      }
      return res.status(502).json({ error: 'Soil photo scanning is temporarily unavailable. Please try again.' });
    }

    const payload = await response.json() as {
      choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }>;
      error?: { message?: string };
    };
    const rawContent = payload.choices?.[0]?.message?.content;
    const observations = typeof rawContent === 'string'
      ? rawContent
      : Array.isArray(rawContent)
        ? rawContent.map(part => part.text || '').join('\n')
        : '';

    if (!observations.trim()) {
      console.error('Soil vision returned an empty observation response.');
      return res.status(502).json({ error: 'The soil photo could not be interpreted. Try a clearer photo in natural light.' });
    }

    return res.status(200).json({
      observations: observations.trim().slice(0, 1800),
      provider: 'Groq vision · Qwen 3.8',
      limitation: 'Visual observations only; not chemical soil measurements.',
    });
  } catch (error) {
    console.error('Soil photo scan failed:', error instanceof Error ? error.message : 'Unknown error');
    return res.status(502).json({ error: 'Soil photo scanning is temporarily unavailable. Please try again.' });
  }
}
