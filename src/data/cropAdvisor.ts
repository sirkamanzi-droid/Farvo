import { WeatherData, WeatherPrediction, CropAdvisory } from '../types';

// ─── CROP SCIENCE THRESHOLDS ────────────────────────────────────────────────
// Based on Uganda's MAAIF crop guidelines and FAO tropical agriculture data

interface CropProfile {
  optimalTempMin: number;
  optimalTempMax: number;
  heatStressTemp: number;
  coldStressTemp: number;
  optimalRainfallWeekly: number;
  droughtThresholdMoisture: number;
  waterlogThresholdMoisture: number;
  humidityDiseaseThreshold: number;
  diseases: string[];
  pests: string[];
  growthTips: string[];
}

const CROP_PROFILES: Record<string, CropProfile> = {
  'Maize': {
    optimalTempMin: 18, optimalTempMax: 32, heatStressTemp: 35, coldStressTemp: 10,
    optimalRainfallWeekly: 25, droughtThresholdMoisture: 0.20, waterlogThresholdMoisture: 0.45,
    humidityDiseaseThreshold: 80,
    diseases: ['Maize Lethal Necrosis (MLN)', 'Gray Leaf Spot', 'Northern Leaf Blight'],
    pests: ['Fall Armyworm', 'Maize Stalk Borer', 'Aphids'],
    growthTips: ['Apply CAN fertilizer 4 weeks after germination', 'Weed within first 3 weeks to prevent yield loss', 'Hill up soil around stems at knee height']
  },
  'Matooke (Bananas)': {
    optimalTempMin: 20, optimalTempMax: 30, heatStressTemp: 38, coldStressTemp: 14,
    optimalRainfallWeekly: 30, droughtThresholdMoisture: 0.25, waterlogThresholdMoisture: 0.50,
    humidityDiseaseThreshold: 75,
    diseases: ['Banana Xanthomonas Wilt (BXW)', 'Black Sigatoka', 'Fusarium Wilt'],
    pests: ['Banana Weevil', 'Root Nematodes', 'Thrips'],
    growthTips: ['Desuck to 1 follower per mat', 'Mulch heavily around base to retain moisture', 'Remove dead leaves to reduce disease spread']
  },
  'Coffee': {
    optimalTempMin: 15, optimalTempMax: 28, heatStressTemp: 32, coldStressTemp: 10,
    optimalRainfallWeekly: 20, droughtThresholdMoisture: 0.22, waterlogThresholdMoisture: 0.42,
    humidityDiseaseThreshold: 85,
    diseases: ['Coffee Leaf Rust', 'Coffee Berry Disease (CBD)', 'Brown Eye Spot'],
    pests: ['Coffee Berry Borer', 'Antestia Bug', 'Scale Insects'],
    growthTips: ['Prune after harvest to open canopy', 'Apply phosphate fertilizer at flowering', 'Maintain shade trees at 30% canopy cover']
  },
  'Beans': {
    optimalTempMin: 16, optimalTempMax: 28, heatStressTemp: 32, coldStressTemp: 12,
    optimalRainfallWeekly: 20, droughtThresholdMoisture: 0.18, waterlogThresholdMoisture: 0.40,
    humidityDiseaseThreshold: 78,
    diseases: ['Bean Angular Leaf Spot', 'Bean Rust', 'Anthracnose'],
    pests: ['Bean Fly', 'Aphids', 'Thrips'],
    growthTips: ['Do not apply nitrogen — beans fix their own', 'Harvest when 80% of pods are dry', 'Rotate with maize or sorghum next season']
  },
  'Cassava': {
    optimalTempMin: 18, optimalTempMax: 35, heatStressTemp: 40, coldStressTemp: 15,
    optimalRainfallWeekly: 15, droughtThresholdMoisture: 0.15, waterlogThresholdMoisture: 0.45,
    humidityDiseaseThreshold: 82,
    diseases: ['Cassava Mosaic Disease (CMD)', 'Cassava Brown Streak Disease (CBSD)', 'Bacterial Blight'],
    pests: ['Cassava Mealybug', 'Whitefly', 'Green Mite'],
    growthTips: ['Plant stakes at 45° angle for better rooting', 'Weed only first 3 months — canopy suppresses later weeds', 'Harvest at 9-12 months for best starch content']
  },
  'Sweet Potatoes': {
    optimalTempMin: 20, optimalTempMax: 30, heatStressTemp: 35, coldStressTemp: 15,
    optimalRainfallWeekly: 18, droughtThresholdMoisture: 0.18, waterlogThresholdMoisture: 0.42,
    humidityDiseaseThreshold: 80,
    diseases: ['Sweet Potato Virus Disease (SPVD)', 'Scab', 'Alternaria Blight'],
    pests: ['Sweet Potato Weevil', 'Mites', 'Aphids'],
    growthTips: ['Ridge soil high for better tuber development', 'Use vine cuttings from disease-free plants only', 'Harvest before heavy rains to prevent rot']
  },
  'Sorghum': {
    optimalTempMin: 20, optimalTempMax: 35, heatStressTemp: 40, coldStressTemp: 12,
    optimalRainfallWeekly: 12, droughtThresholdMoisture: 0.12, waterlogThresholdMoisture: 0.40,
    humidityDiseaseThreshold: 85,
    diseases: ['Sorghum Downy Mildew', 'Head Smut', 'Anthracnose'],
    pests: ['Sorghum Midge', 'Shoot Fly', 'Stem Borer'],
    growthTips: ['Thin to 1 plant per 15cm for optimal grain fill', 'Bird-scare from dough stage to harvest', 'Thresh immediately after harvest to prevent mold']
  },
  'Millet': {
    optimalTempMin: 20, optimalTempMax: 35, heatStressTemp: 42, coldStressTemp: 12,
    optimalRainfallWeekly: 10, droughtThresholdMoisture: 0.10, waterlogThresholdMoisture: 0.38,
    humidityDiseaseThreshold: 82,
    diseases: ['Downy Mildew', 'Blast', 'Smut'],
    pests: ['Quelea Birds', 'Stem Borer', 'Aphids'],
    growthTips: ['Broadcast seed thinly — 5kg per acre maximum', 'Weed at 3 weeks to prevent competition', 'Harvest early morning to reduce shattering losses']
  },
  'Irish Potatoes': {
    optimalTempMin: 12, optimalTempMax: 22, heatStressTemp: 27, coldStressTemp: 8,
    optimalRainfallWeekly: 25, droughtThresholdMoisture: 0.25, waterlogThresholdMoisture: 0.45,
    humidityDiseaseThreshold: 75,
    diseases: ['Late Blight', 'Early Blight', 'Bacterial Wilt'],
    pests: ['Potato Tuber Moth', 'Aphids', 'Colorado Beetle'],
    growthTips: ['Earth up 3 times during growing season', 'Spray fungicide every 7-10 days during wet season', 'Cure tubers 2 weeks before storage']
  },
  'Tea': {
    optimalTempMin: 13, optimalTempMax: 28, heatStressTemp: 32, coldStressTemp: 8,
    optimalRainfallWeekly: 30, droughtThresholdMoisture: 0.28, waterlogThresholdMoisture: 0.50,
    humidityDiseaseThreshold: 70,
    diseases: ['Blister Blight', 'Grey Blight', 'Red Rust'],
    pests: ['Tea Mosquito Bug', 'Thrips', 'Mites'],
    growthTips: ['Pluck every 7-10 days for premium quality', 'Prune to table height every 3-4 years', 'Maintain windbreaks to reduce leaf damage']
  },
  'Cocoa Beans': {
    optimalTempMin: 22, optimalTempMax: 30, heatStressTemp: 35, coldStressTemp: 16,
    optimalRainfallWeekly: 35, droughtThresholdMoisture: 0.30, waterlogThresholdMoisture: 0.52,
    humidityDiseaseThreshold: 78,
    diseases: ['Black Pod Disease', 'Swollen Shoot Virus', 'Witches Broom'],
    pests: ['Cocoa Mirids', 'Mealybug', 'Cocoa Pod Borer'],
    growthTips: ['Remove all mummified pods to reduce Black Pod spread', 'Ferment pods 5-7 days for premium grade export', 'Maintain 30-40% shade canopy cover']
  },
  'Simsim (Sesame)': {
    optimalTempMin: 25, optimalTempMax: 35, heatStressTemp: 40, coldStressTemp: 18,
    optimalRainfallWeekly: 10, droughtThresholdMoisture: 0.12, waterlogThresholdMoisture: 0.35,
    humidityDiseaseThreshold: 80,
    diseases: ['Phytophthora Blight', 'Cercospora Leaf Spot', 'Bacterial Blight'],
    pests: ['Sesame Webworm', 'Gall Midge', 'Aphids'],
    growthTips: ['Harvest when lower capsules begin to open', 'Cut and stook in field for 5 days before threshing', 'Never waterlog — drainage channels essential']
  },
  'Sunflower': {
    optimalTempMin: 20, optimalTempMax: 32, heatStressTemp: 38, coldStressTemp: 14,
    optimalRainfallWeekly: 15, droughtThresholdMoisture: 0.16, waterlogThresholdMoisture: 0.40,
    humidityDiseaseThreshold: 78,
    diseases: ['Downy Mildew', 'Alternaria Blight', 'Sclerotinia Stem Rot'],
    pests: ['Sunflower Beetle', 'Aphids', 'Birds'],
    growthTips: ['Plant in rows of 75cm x 30cm spacing', 'Apply basal fertilizer at planting only', 'Harvest when back of head turns yellow-brown']
  },
  'Vanilla': {
    optimalTempMin: 20, optimalTempMax: 30, heatStressTemp: 35, coldStressTemp: 15,
    optimalRainfallWeekly: 25, droughtThresholdMoisture: 0.25, waterlogThresholdMoisture: 0.48,
    humidityDiseaseThreshold: 72,
    diseases: ['Fusarium Root Rot', 'Anthracnose', 'Bacterial Soft Rot'],
    pests: ['Vanilla Mites', 'Slugs', 'Mealybugs'],
    growthTips: ['Hand-pollinate flowers between 6-10am only', 'Cure green beans in sun for 3 days then shade dry for 3 months', 'Train vines on support poles at 1.5m height']
  },
  'Vegetables': {
    optimalTempMin: 16, optimalTempMax: 28, heatStressTemp: 33, coldStressTemp: 10,
    optimalRainfallWeekly: 20, droughtThresholdMoisture: 0.20, waterlogThresholdMoisture: 0.42,
    humidityDiseaseThreshold: 78,
    diseases: ['Damping Off', 'Powdery Mildew', 'Downy Mildew'],
    pests: ['Aphids', 'Whitefly', 'Caterpillars'],
    growthTips: ['Irrigate in early morning to reduce disease', 'Apply neem-based pesticide as first line of defense', 'Harvest regularly to encourage continued production']
  },
};

// ─── SCORING ALGORITHMS ──────────────────────────────────────────────────────

function calcPlantingScore(crop: CropProfile, current: any, weeklyRain: number): number {
  let score = 100;
  // Temperature penalty
  if (current.temperature > crop.heatStressTemp) score -= 40;
  else if (current.temperature > crop.optimalTempMax) score -= 20;
  else if (current.temperature < crop.coldStressTemp) score -= 40;
  else if (current.temperature < crop.optimalTempMin) score -= 15;
  // Soil moisture penalty
  if (current.soilMoisture < crop.droughtThresholdMoisture) score -= 30;
  else if (current.soilMoisture > crop.waterlogThresholdMoisture) score -= 25;
  // Rainfall bonus/penalty
  if (weeklyRain >= crop.optimalRainfallWeekly * 0.7 && weeklyRain <= crop.optimalRainfallWeekly * 1.5) score += 10;
  else if (weeklyRain < crop.optimalRainfallWeekly * 0.3) score -= 20;
  else if (weeklyRain > crop.optimalRainfallWeekly * 2.5) score -= 15;
  return Math.max(0, Math.min(100, score));
}

function calcHarvestScore(crop: CropProfile, daily: any[]): number {
  let score = 100;
  const next3Days = daily.slice(0, 3);
  const avgRainProb = next3Days.reduce((sum: number, d: any) => sum + d.precipitationProbability, 0) / 3;
  const totalRain = next3Days.reduce((sum: number, d: any) => sum + d.precipitation, 0);
  // High rain probability is bad for harvesting/drying
  if (avgRainProb > 70) score -= 40;
  else if (avgRainProb > 50) score -= 20;
  else if (avgRainProb < 20) score += 10;
  // Heavy rainfall penalty
  if (totalRain > 30) score -= 30;
  else if (totalRain > 15) score -= 15;
  // Wind penalty for drying
  const avgWind = next3Days.reduce((sum: number, d: any) => sum + d.windSpeedMax, 0) / 3;
  if (avgWind > 30) score -= 10;
  return Math.max(0, Math.min(100, score));
}

function calcPestRisk(crop: CropProfile, current: any): 'Low' | 'Medium' | 'High' {
  let riskScore = 0;
  if (current.relativeHumidity > crop.humidityDiseaseThreshold) riskScore += 2;
  if (current.relativeHumidity > 90) riskScore += 1;
  if (current.temperature >= crop.optimalTempMin && current.temperature <= crop.optimalTempMax) riskScore += 1;
  if (current.soilMoisture > crop.waterlogThresholdMoisture * 0.85) riskScore += 1;
  if (riskScore >= 4) return 'High';
  if (riskScore >= 2) return 'Medium';
  return 'Low';
}

function getWeeklyRainfall(daily: any[]): number {
  return daily.reduce((sum: number, d: any) => sum + (d.precipitation || 0), 0);
}

function getPlantingAdvisory(score: number, crop: CropProfile, current: any, weeklyRain: number): string {
  if (score >= 80) return `Excellent planting conditions. Soil moisture at ${Math.round(current.soilMoisture * 100)}% and temperature at ${current.temperature}°C are within optimal range. Plant within the next 3 days.`;
  if (score >= 60) return `Moderate planting conditions. Temperature ${current.temperature}°C is acceptable. Weekly rainfall of ${weeklyRain.toFixed(1)}mm is ${weeklyRain < crop.optimalRainfallWeekly ? 'below' : 'above'} optimal ${crop.optimalRainfallWeekly}mm. Consider irrigating before planting.`;
  if (score >= 40) return `Marginal planting conditions. ${current.soilMoisture < crop.droughtThresholdMoisture ? `Soil moisture critically low at ${Math.round(current.soilMoisture * 100)}% — irrigate to at least ${Math.round(crop.droughtThresholdMoisture * 100)}% before planting.` : `Soil waterlogged at ${Math.round(current.soilMoisture * 100)}% — open drainage channels and wait 5-7 days.`}`;
  return `Poor planting conditions. ${current.temperature > crop.heatStressTemp ? `Heat stress risk — temperature ${current.temperature}°C exceeds ${crop.heatStressTemp}°C threshold. Wait for cooler conditions.` : `Cold stress risk — temperature ${current.temperature}°C below ${crop.coldStressTemp}°C minimum. Delay planting.`}`;
}

function getHarvestAdvisory(score: number, daily: any[]): string {
  const next3Rain = daily.slice(0, 3).reduce((sum: number, d: any) => sum + d.precipitation, 0);
  const avgRainProb = daily.slice(0, 3).reduce((sum: number, d: any) => sum + d.precipitationProbability, 0) / 3;
  if (score >= 80) return `Excellent harvest window. Rain probability averaging ${Math.round(avgRainProb)}% over next 3 days with only ${next3Rain.toFixed(1)}mm expected. Harvest and dry now.`;
  if (score >= 60) return `Acceptable harvest conditions. ${next3Rain.toFixed(1)}mm of rain expected over 3 days. Harvest in morning hours and use covered drying if possible.`;
  if (score >= 40) return `Risky harvest period. ${next3Rain.toFixed(1)}mm expected with ${Math.round(avgRainProb)}% rain probability. Delay if crop not fully mature. If urgent, harvest and dry under cover.`;
  return `Do not harvest now. Heavy rainfall of ${next3Rain.toFixed(1)}mm expected over next 3 days with ${Math.round(avgRainProb)}% probability. Risk of crop rot and post-harvest losses is very high.`;
}

function getIrrigationGuidance(crop: CropProfile, current: any, weeklyRain: number): string {
  const moisturePct = Math.round(current.soilMoisture * 100);
  if (current.soilMoisture < crop.droughtThresholdMoisture) {
    const deficit = crop.optimalRainfallWeekly - weeklyRain;
    return `URGENT: Soil moisture at ${moisturePct}% is below critical threshold of ${Math.round(crop.droughtThresholdMoisture * 100)}%. Apply ${Math.max(10, Math.round(deficit))}mm of irrigation immediately. Water in early morning to reduce evaporation loss.`;
  }
  if (current.soilMoisture > crop.waterlogThresholdMoisture) {
    return `WARNING: Soil moisture at ${moisturePct}% exceeds safe limit of ${Math.round(crop.waterlogThresholdMoisture * 100)}%. Open drainage channels immediately. Root rot risk is high. Do not irrigate.`;
  }
  if (weeklyRain < crop.optimalRainfallWeekly * 0.5) {
    return `Soil moisture at ${moisturePct}% is adequate but weekly rainfall of ${weeklyRain.toFixed(1)}mm is below optimal ${crop.optimalRainfallWeekly}mm. Supplement with light irrigation of 10-15mm every 3 days.`;
  }
  return `Soil moisture at ${moisturePct}% is in optimal range. Weekly rainfall of ${weeklyRain.toFixed(1)}mm is sufficient. No irrigation needed. Monitor daily if temperatures exceed ${crop.optimalTempMax}°C.`;
}

function getPestAdvisory(crop: CropProfile, risk: string, current: any): string {
  const primaryDisease = crop.diseases[0];
  const primaryPest = crop.pests[0];
  if (risk === 'High') return `HIGH RISK: Humidity at ${current.relativeHumidity}% and temperature ${current.temperature}°C create ideal conditions for ${primaryDisease}. Apply preventive fungicide immediately. Scout daily for ${primaryPest} — threshold is 1 per 5 plants.`;
  if (risk === 'Medium') return `MEDIUM RISK: Monitor closely for ${primaryDisease} and ${primaryPest}. Humidity at ${current.relativeHumidity}% is elevated. Scout twice weekly. Apply neem extract as preventive measure.`;
  return `LOW RISK: Current humidity ${current.relativeHumidity}% and temperature ${current.temperature}°C are not favorable for major disease outbreaks. Continue weekly scouting for ${primaryPest}.`;
}

function getGrowthAdvisory(crop: CropProfile, current: any, et0: number): string {
  const tip = crop.growthTips[Math.floor(Math.random() * crop.growthTips.length)];
  const etNote = typeof et0 === 'number' && et0 > 4 ? `High evapotranspiration of ${et0}mm/day means crops are losing water fast — mulch to conserve moisture. ` : '';
  const soilNote = typeof current.soilTemperature === 'number'
    ? ` Soil temperature is ${current.soilTemperature}°C; ${current.soilTemperature < 15 ? 'this may slow active root growth' : current.soilTemperature > 35 ? 'this may increase heat stress around roots' : 'this reading is within a moderate range'}.`
    : ' Soil temperature reading is unavailable.';
  return `${etNote}${tip}.${soilNote}`;
}

function generateRiskAlerts(current: any, daily: any[]): string[] {
  const alerts: string[] = [];
  const maxRainNext3 = Math.max(...daily.slice(0, 3).map((d: any) => d.precipitation));
  const maxWindNext3 = Math.max(...daily.slice(0, 3).map((d: any) => d.windSpeedMax));
  const avgRainProb = daily.slice(0, 3).reduce((sum: number, d: any) => sum + d.precipitationProbability, 0) / 3;
  if (maxRainNext3 > 20) alerts.push(`Heavy rainfall alert: Up to ${maxRainNext3.toFixed(1)}mm expected in next 3 days. Risk of flash flooding in low-lying fields. Open drainage channels now.`);
  if (maxWindNext3 > 35) alerts.push(`High wind warning: Winds up to ${maxWindNext3.toFixed(1)}km/h forecast. Stake tall crops like maize and banana. Secure drying crops under cover.`);
  if (current.relativeHumidity > 90) alerts.push(`Extreme humidity alert: ${current.relativeHumidity}% relative humidity. Fungal disease outbreak risk is very high across all crops. Apply preventive fungicide today.`);
  if (current.temperature > 35) alerts.push(`Heat stress alert: Temperature ${current.temperature}°C exceeds safe threshold for most crops. Irrigate immediately and apply mulch.`);
  if (avgRainProb > 80) alerts.push(`Persistent wet weather: Over 80% chance of rain for next 3 days. Delay any harvesting or planting operations. Prepare field drainage.`);
  if (current.soilMoisture < 0.10) alerts.push(`Severe drought conditions: Soil moisture critically low at ${Math.round(current.soilMoisture * 100)}%. Emergency irrigation required for all crops.`);
  return alerts;
}

function generateWeeklySummary(current: any, daily: any[], weeklyRain: number): { summary: string; weeklyOutlook: string } {
  const avgMaxTemp = daily.reduce((sum: number, d: any) => sum + d.maxTemp, 0) / daily.length;
  const avgMinTemp = daily.reduce((sum: number, d: any) => sum + d.minTemp, 0) / daily.length;
  const rainyDays = daily.filter((d: any) => d.precipitation > 1).length;
  const summary = `Current conditions in your district: ${current.temperature}°C with ${current.relativeHumidity}% humidity and ${Math.round(current.soilMoisture * 100)}% soil moisture. ${weeklyRain > 20 ? 'Wet week ahead — drainage management is priority.' : weeklyRain > 5 ? 'Moderate rainfall expected — good growing conditions.' : 'Dry conditions — irrigation planning essential.'}`;
  const weeklyOutlook = `7-day forecast shows temperatures ranging from ${avgMinTemp.toFixed(1)}°C to ${avgMaxTemp.toFixed(1)}°C with ${rainyDays} rainy days and total expected rainfall of ${weeklyRain.toFixed(1)}mm. ${rainyDays >= 5 ? 'Persistent wet conditions favour disease development — increase scouting frequency.' : rainyDays <= 1 ? 'Mostly dry week ahead — prioritise irrigation and soil moisture conservation.' : 'Mixed conditions expected — plan field operations around dry windows mid-week.'}`;
  return { summary, weeklyOutlook };
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────

export function generateCropAdvice(
  districtName: string,
  cropName: string,
  weatherData: WeatherData
): WeatherPrediction {
  const { current, daily } = weatherData;
  const weeklyRain = getWeeklyRainfall(daily);

  // Find crop profile — fallback to Vegetables if unknown
  const cropKey = Object.keys(CROP_PROFILES).find(k => k.toLowerCase() === cropName.toLowerCase()) || 'Vegetables';
  const crop = CROP_PROFILES[cropKey];

  const plantingScore = calcPlantingScore(crop, current, weeklyRain);
  const harvestScore = calcHarvestScore(crop, daily);
  const pestRisk = calcPestRisk(crop, current);

  const advisory: CropAdvisory = {
    cropName,
    plantingScore,
    plantingAdvisory: getPlantingAdvisory(plantingScore, crop, current, weeklyRain),
    growthAdvisory: getGrowthAdvisory(crop, current, current.evapotranspiration),
    harvestScore,
    harvestAdvisory: getHarvestAdvisory(harvestScore, daily),
    pestDiseaseRisk: pestRisk,
    pestDiseaseAdvisory: getPestAdvisory(crop, pestRisk, current),
    irrigationGuidance: getIrrigationGuidance(crop, current, weeklyRain),
  };

  const { summary, weeklyOutlook } = generateWeeklySummary(current, daily, weeklyRain);

  return {
    districtName,
    summary,
    weeklyOutlook,
    cropAdvisories: [advisory],
    generalFarmingTips: crop.growthTips,
    riskAlerts: generateRiskAlerts(current, daily),
  };
}
