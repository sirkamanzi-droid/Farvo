import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export const config = { maxDuration: 20, api: { bodyParser: { sizeLimit: '5mb' } } };

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
    if (!token || !supabaseUrl || !supabaseKey) return res.status(401).json({ error: 'Please sign in to analyse a soil photo.' });

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: 'Bearer ' + token } },
    });
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) return res.status(401).json({ error: 'Your session is invalid. Please sign in again.' });

    const image = req.body && typeof req.body.image === 'string' ? req.body.image : '';
    if (!/^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(image) || image.length > 4_800_000) {
      return res.status(400).json({ error: 'Choose a valid soil photo smaller than 3.5 MB.' });
    }
    if (!process.env.GROQ_API_KEY) return res.status(503).json({ error: 'Soil photo scanning is not configured yet.' });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 16000);
    let response: Response;
    try {
      response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + process.env.GROQ_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          temperature: 0.1,
          max_completion_tokens: 350,
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: 'Inspect this farm soil photo. Return concise plain-text visual observations only: visible colour, apparent surface texture, visible particles or stones, organic matter clues, moisture appearance, and image quality. State uncertainty. Do not infer or claim pH, nitrogen, phosphorus, potassium, organic carbon, exact soil classification, fertility, or drainage from the image. Do not recommend fertiliser or chemicals. If it is not clearly a soil photo, say so.' },
              { type: 'image_url', image_url: { url: image } },
            ],
          }],
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error('Soil vision provider failed:', response.status, detail.slice(0, 300));
      return res.status(502).json({ error: 'Soil photo scanning is temporarily unavailable. Please try again.' });
    }
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const observations = payload.choices?.[0]?.message?.content;
    if (typeof observations !== 'string' || !observations.trim()) {
      return res.status(502).json({ error: 'The soil photo could not be interpreted. Try a clearer photo in natural light.' });
    }
    return res.status(200).json({ observations: observations.trim().slice(0, 1800), provider: 'Groq vision', limitation: 'Visual observations only; not chemical soil measurements.' });
  } catch (error) {
    console.error('Soil photo scan failed:', error instanceof Error ? error.message : 'Unknown error');
    return res.status(502).json({ error: 'Soil photo scanning is temporarily unavailable. Please try again.' });
  }
}
