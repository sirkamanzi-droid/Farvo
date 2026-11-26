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
  soilTemperature?: number;
  soilMoisture?: number;
  evapotranspiration: number;
  uvIndex?: number;
  time: string;
}

export interface DailyForecast {
  date: string;
  maxTemp: number;
  minTemp: number;
  precipitation: number;
  precipitationProbability: number;
  windSpeedMax: number;
  weatherCode: number;
  soilTempAvg?: number;
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
  plantingScore: number;
  plantingAdvisory: string;
  growthAdvisory: string;
  harvestScore: number;
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

export interface Farm {
  id: string;
  label: string;
  district: District;
  crop: string;
  latitude?: number | null;
  longitude?: number | null;
  locationAccuracyM?: number | null;
  locationSource?: 'phone_gps' | 'manual_pin' | 'legacy_district';
  locationCapturedAt?: string | null;
  locationLabel?: string | null;
  village?: string | null;
  parish?: string | null;
  subcounty?: string | null;
}
