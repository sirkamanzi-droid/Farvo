import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  const { districtName, cropName, weatherData } = req.body;
  if (!districtName || !cropName || !weatherData) { res.status(400).json({ error: 'Missing required parameters.' }); return; }
  const { current, daily } = weatherData;
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: `Analyze the weather data and provide custom farming predictions for ${districtName} focusing on ${cropName}.\n\nCurrent: Temp ${current.temperature}°C, Rain ${current.rainfall}mm, Humidity ${current.relativeHumidity}%, Wind ${current.windSpeed}km/h, Soil Temp ${current.soilTemperature}°C, Soil Moisture ${current.soilMoisture}, ET ${current.evapotranspiration}mm\n\n7-Day: ${JSON.stringify(daily)}`,
    config: {
      systemInstruction: 'You are a professional agricultural meteorologist in Uganda. Analyze weather for smallholder farmers.',
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          districtName: { type: Type.STRING },
          summary: { type: Type.STRING },
          weeklyOutlook: { type: Type.STRING },
          cropAdvisories: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { cropName: { type: Type.STRING }, plantingScore: { type: Type.INTEGER }, plantingAdvisory: { type: Type.STRING }, growthAdvisory: { type: Type.STRING }, harvestScore: { type: Type.INTEGER }, harvestAdvisory: { type: Type.STRING }, pestDiseaseRisk: { type: Type.STRING }, pestDiseaseAdvisory: { type: Type.STRING }, irrigationGuidance: { type: Type.STRING } }, required: ['cropName','plantingScore','plantingAdvisory','growthAdvisory','harvestScore','harvestAdvisory','pestDiseaseRisk','pestDiseaseAdvisory','irrigationGuidance'] } },
          generalFarmingTips: { type: Type.ARRAY, items: { type: Type.STRING } },
          riskAlerts: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ['districtName','summary','weeklyOutlook','cropAdvisories','generalFarmingTips','riskAlerts']
      }
    }
  });
  res.json(JSON.parse(response.text || '{}'));
}
