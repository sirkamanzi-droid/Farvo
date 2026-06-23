export interface District {
  id: string;
  name: string;
  region: 'Central' | 'Eastern' | 'Northern' | 'Western';
  latitude: number;
  longitude: number;
  elevation?: number;
  mainCrops: string[];
  description: string;
}

export interface CurrentWeather {
  temperature: number;
  apparentTemperature?: number;
  rainfall: number;
  relativeHumidity: number;
  windSpeed: number;
  windDirection: number;
  weatherCode: number;
  soilTemperature: number; // in Celsius (at 10cm depth if possible)
  soilMoisture: number; // in m³/m³ (or index)
  evapotranspiration: number; // in mm
  uvIndex?: number;
  time: string;
}

export interface DailyForecast {
  date: string;
  maxTemp: number;
  minTemp: number;
  precipitation: number; // in mm
  precipitationProbability: number; // in %
  windSpeedMax: number;
  weatherCode: number;
  soilTempAvg: number;
  evapotranspiration: number;
}

export interface WeatherData {
  current: CurrentWeather;
  daily: DailyForecast[];
  elevation: number;
  timezone: string;
}

export interface CropAdvisory {
  cropName: string;
  plantingScore: number; // 0 - 100
  plantingAdvisory: string;
  growthAdvisory: string;
  harvestScore: number; // 0 - 100
  harvestAdvisory: string;
  pestDiseaseRisk: 'Low' | 'Medium' | 'High';
  pestDiseaseAdvisory: string;
  irrigationGuidance: string;
}

export interface WeatherPrediction {
  districtName: string;
  summary: string;
  weeklyOutlook: string;
  cropAdvisories: CropAdvisory[];
  generalFarmingTips: string[];
  riskAlerts: string[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
