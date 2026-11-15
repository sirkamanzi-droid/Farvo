import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

async function requireFarmer(req: VercelRequest) {
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!token || !url || !key) return null;
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.getUser(token);
  return error || !data.user ? null : data.user;
}



const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }
    const user = await requireFarmer(req);
    if (!user) {
      res.status(401).json({ error: 'Please sign in to request a farming prediction.' });
      return;
    }
    const { districtName, cropName, weatherData } = req.body;
    if (!districtName || !cropName || !weatherData) {
      res.status(400).json({ error: 'Missing required parameters.' });
      return;
    }
    const { current, daily } = weatherData;
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Analyze weather for ${districtName}, crop: ${cropName}. Current: Temp ${current.temperature}°C, Rain ${current.rainfall}mm, Humidity ${current.relativeHumidity}%, Soil Temp ${current.soilTemperature}°C, Soil Moisture ${current.soilMoisture}. 7-Day forecast: ${JSON.stringify(daily.slice(0,3))}`,
      config: {
        systemInstruction: 'You are a professional agricultural meteorologist in Uganda. Respond ONLY with valid JSON, no markdown, no explanation.',
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            districtName: { type: Type.STRING },
            summary: { type: Type.STRING },
            weeklyOutlook: { type: Type.STRING },
            cropAdvisories: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  cropName: { type: Type.STRING },
                  plantingScore: { type: Type.INTEGER },
                  plantingAdvisory: { type: Type.STRING },
                  growthAdvisory: { type: Type.STRING },
                  harvestScore: { type: Type.INTEGER },
                  harvestAdvisory: { type: Type.STRING },
                  pestDiseaseRisk: { type: Type.STRING },
                  pestDiseaseAdvisory: { type: Type.STRING },
                  irrigationGuidance: { type: Type.STRING }
                },
                required: ['cropName','plantingScore','plantingAdvisory','growthAdvisory','harvestScore','harvestAdvisory','pestDiseaseRisk','pestDiseaseAdvisory','irrigationGuidance']
              }
            },
            generalFarmingTips: { type: Type.ARRAY, items: { type: Type.STRING } },
            riskAlerts: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ['districtName','summary','weeklyOutlook','cropAdvisories','generalFarmingTips','riskAlerts']
        }
      }
    });

    const text = response.text;
    if (!text) {
      res.status(500).json({ error: 'Empty response from Gemini' });
      return;
    }

    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    res.status(200).json(parsed);

  } catch (error: any) {
    console.error('Predict error:', error?.message || error);
    res.status(500).json({ error: error?.message || 'AI prediction failed' });
  }
}
