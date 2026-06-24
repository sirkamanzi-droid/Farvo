import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with User-Agent header for telemetry
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Proxy Open-Meteo weather endpoint to handle CORS and provide localized agronomy metrics
app.get('/api/weather', async (req: Request, res: Response) => {
  try {
    const { latitude, longitude } = req.query;
    if (!latitude || !longitude) {
       res.status(400).json({ error: 'Latitude and Longitude are required parameters.' });
       return;
    }

    const lat = parseFloat(latitude as string);
    const lon = parseFloat(longitude as string);

    // Call free Open-Meteo API with standard and agricultural agronomy parameters
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m,wind_direction_10m,soil_temperature_6cm,soil_moisture_3_9cm,evapotranspiration&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,et0_fao_evapotranspiration&timezone=Africa/Kampala`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Open-Meteo API responded with status ${response.status}`);
    }

    const data = await response.json();

    // Transform and map to a clean, reliable WeatherData structure for the frontend
    const current = data.current;
    const daily = data.daily;

    const weatherData = {
      elevation: data.elevation,
      timezone: data.timezone,
      current: {
        temperature: current.temperature_2m,
        apparentTemperature: current.apparent_temperature,
        rainfall: current.precipitation || current.rain || 0,
        relativeHumidity: current.relative_humidity_2m,
        windSpeed: current.wind_speed_10m,
        windDirection: current.wind_direction_10m,
        weatherCode: current.weather_code,
        soilTemperature: current.soil_temperature_6cm || 25, // default safe temp if not available
        soilMoisture: current.soil_moisture_3_9cm || 0.25, // default safe moisture if not available
        evapotranspiration: current.evapotranspiration || 0,
        time: current.time,
      },
      daily: daily.time.map((dateString: string, index: number) => ({
        date: dateString,
        maxTemp: daily.temperature_2m_max[index],
        minTemp: daily.temperature_2m_min[index],
        precipitation: daily.precipitation_sum[index] || 0,
        precipitationProbability: daily.precipitation_probability_max[index] || 0,
        windSpeedMax: daily.wind_speed_10m_max[index] || 0,
        weatherCode: daily.weather_code[index],
        soilTempAvg: (daily.temperature_2m_max[index] + daily.temperature_2m_min[index]) / 2 - 2, // approximation for average soil temp at root
        evapotranspiration: daily.et0_fao_evapotranspiration[index] || 0,
      })),
    };

    res.json(weatherData);
  } catch (error: any) {
    console.error('Error in /api/weather proxy:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch weather data' });
  }
});

// AI Predictor endpoint for Gemini-powered agricultural recommendations
app.post('/api/predict', async (req: Request, res: Response) => {
  try {
    const { districtName, cropName, weatherData } = req.body;
    if (!districtName || !cropName || !weatherData) {
       res.status(400).json({ error: 'Missing required parameters: districtName, cropName, and weatherData are required.' });
       return;
    }

    const { current, daily } = weatherData;

    const systemInstruction = `You are a professional agricultural meteorologist and agronomist in Uganda.
    Your job is to analyze real-time and 7-day meteorological forecasts for a specific district and crop, and provide a highly localized agricultural weather prediction, crop health guide, risk alerts, and tactical farming tips.
    You must be extremely practical and speak in a clear, supportive tone that serves smallholder farmers in Uganda.`;

    const prompt = `Analyze the weather data and provide custom farming predictions for the district of ${districtName} focusing on the crop: ${cropName}.

Current Weather Details:
- Temperature: ${current.temperature}°C (Feels like: ${current.apparentTemperature || current.temperature}°C)
- Current Rainfall/Precipitation: ${current.rainfall} mm
- Relative Humidity: ${current.relativeHumidity}%
- Wind Speed: ${current.windSpeed} km/h (Direction: ${current.windDirection}°)
- Soil Temperature (6cm depth): ${current.soilTemperature}°C
- Soil Moisture (3-9cm depth): ${current.soilMoisture} m³/m³
- Evapotranspiration rate: ${current.evapotranspiration} mm

7-Day Forecast:
${JSON.stringify(daily, null, 2)}

Based on these exact conditions, return a JSON response summarizing the agricultural outlook, a specialized advisory for the selected crop "${cropName}", action-oriented farming tips, and active risk alerts.`;

    // Configure schema-enforced structured JSON output from Gemini
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.2, // low temp for objective agricultural reasoning
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            districtName: { type: Type.STRING },
            summary: { 
              type: Type.STRING, 
              description: 'A 1-2 sentence high-level summary of the agricultural weather conditions.' 
            },
            weeklyOutlook: { 
              type: Type.STRING, 
              description: 'A short paragraph explaining how the weather will evolve and its impact on general farming activities.' 
            },
            cropAdvisories: {
              type: Type.ARRAY,
              description: 'Contains specialized advisory for the specified crop',
              items: {
                type: Type.OBJECT,
                properties: {
                  cropName: { type: Type.STRING },
                  plantingScore: { 
                    type: Type.INTEGER, 
                    description: 'Score from 0 to 100 on how suitable current/upcoming weather is for planting this crop.' 
                  },
                  plantingAdvisory: { 
                    type: Type.STRING, 
                    description: 'Tactical advice on whether to plant, delay planting, prepare seeds, or wait for rains.' 
                  },
                  growthAdvisory: { 
                    type: Type.STRING, 
                    description: 'Specific crop care tips for the vegetative stage based on moisture/temp (e.g. weeding, mulching, fertilizer timing).' 
                  },
                  harvestScore: { 
                    type: Type.INTEGER, 
                    description: 'Score from 0 to 100 on how suitable the upcoming week is for harvesting/drying this crop.' 
                  },
                  harvestAdvisory: { 
                    type: Type.STRING, 
                    description: 'Tactical guidance on harvesting, crop drying, and damp prevention based on rain forecast.' 
                  },
                  pestDiseaseRisk: { 
                    type: Type.STRING, 
                    description: 'Overall threat level: Low, Medium, or High.' 
                  },
                  pestDiseaseAdvisory: { 
                    type: Type.STRING, 
                    description: 'Identify 1-2 specific crop diseases or pests that thrive in this weather (e.g. Armyworm, Maize Lethal Necrosis, Coffee rust, blight) and how to manage them.' 
                  },
                  irrigationGuidance: { 
                    type: Type.STRING, 
                    description: 'Specific advice on irrigation or trenching/drainage. If heavy rain is forecast, instruct on drainage to avoid waterlogging.' 
                  }
                },
                required: [
                  'cropName', 'plantingScore', 'plantingAdvisory', 'growthAdvisory', 
                  'harvestScore', 'harvestAdvisory', 'pestDiseaseRisk', 'pestDiseaseAdvisory', 'irrigationGuidance'
                ]
              }
            },
            generalFarmingTips: {
              type: Type.ARRAY,
              description: 'Exactly 3 action-oriented, practical farming tips for this week.',
              items: { type: Type.STRING }
            },
            riskAlerts: {
              type: Type.ARRAY,
              description: 'Active weather alerts for farmers (e.g., flash flooding, landslides, soil erosion, extreme heat, heavy winds). Return empty array if none.',
              items: { type: Type.STRING }
            }
          },
          required: ['districtName', 'summary', 'weeklyOutlook', 'cropAdvisories', 'generalFarmingTips', 'riskAlerts']
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error('Empty response from Gemini');
    }

    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error('Error in /api/predict:', error);
    res.status(500).json({ error: error.message || 'AI Prediction failed' });
  }
});

// Interactive AI Agronomist Chatbot endpoint
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { messages, districtName, cropName } = req.body;
    if (!messages || !Array.isArray(messages)) {
       res.status(400).json({ error: 'Messages array is required.' });
       return;
    }

    const systemInstruction = `You are "Kato", a friendly and highly knowledgeable Ugandan AI Agronomist and farming counselor.
    You help smallholder farmers in Uganda maximize yields and protect crops based on local weather conditions.
    The farmer is currently asking about ${cropName || 'general farming'} in ${districtName || 'their local'} district.
    Keep your answers highly practical, action-oriented, and customized to Uganda\'s climate (two wet seasons, dry spells, soil types, local terminology like "Matooke", "Simsim", "G-nuts").
    Structure your response with bullet points if explaining steps, and maintain a friendly, supportive tone.`;

    // Map conversation history to the format required by the GoogleGenAI SDK
    const contents = messages.map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    res.json({ content: response.text });
  } catch (error: any) {
    console.error('Error in /api/chat:', error);
    res.status(500).json({ error: error.message || 'Chat generation failed' });
  }
});

// Vite Middleware integration for development and static assets serving for production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Uganda Weather Predictor listening on http://localhost:${PORT}`);
  });
}

startServer();
