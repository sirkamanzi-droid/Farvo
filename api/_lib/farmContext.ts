import type { SupabaseClient } from '@supabase/supabase-js';

export type FarmContext = {
  farm: Record<string, any>;
  crops: Record<string, any>[];
  livestock: Record<string, any>[];
  soilAssessments: Record<string, any>[];
  cropCarePlans: Record<string, any>[];
};

export async function loadFarmContext(
  supabase: SupabaseClient,
  userId: string,
  farmId: string,
  soilAssessmentLimit = 5,
  cropCarePlanLimit = 10,
): Promise<FarmContext | null> {
  const { data: farm, error: farmError } = await supabase
    .from('farms')
    .select('id,user_id,label,crop,district_id,district_name,region,latitude,longitude,location_accuracy_m,location_source,location_captured_at,location_label,village,parish,subcounty,farm_size_value,farm_size_unit')
    .eq('id', farmId)
    .eq('user_id', userId)
    .maybeSingle();

  if (farmError) throw new Error(`Could not load farm: ${farmError.message}`);
  if (!farm) return null;

  const [cropsResult, livestockResult, soilResult, carePlansResult] = await Promise.all([
    supabase.from('farm_crops')
      .select('id,crop_name,variety,planting_date,growth_stage,area_value,area_unit,notes,is_active,created_at,updated_at')
      .eq('user_id', userId).eq('farm_id', farmId).eq('is_active', true)
      .order('created_at', { ascending: true }),
    supabase.from('farm_livestock')
      .select('id,species,breed,animal_count,production_purpose,age_group,notes,is_active,created_at,updated_at')
      .eq('user_id', userId).eq('farm_id', farmId).eq('is_active', true)
      .order('created_at', { ascending: true }),
    supabase.from('soil_assessments')
      .select('id,crop,mode,measured_ph,texture,drainage,findings,created_at,location_label,latitude,longitude,weather_snapshot,ai_report')
      .eq('user_id', userId).eq('farm_id', farmId)
      .order('created_at', { ascending: false }).limit(soilAssessmentLimit),
    supabase.from('crop_care_plans')
      .select('id,crop_name,issue_name,diagnosis_status,status,care_plan,source_scan,started_at,next_review_at,created_at,updated_at')
      .eq('user_id', userId).eq('farm_id', farmId)
      .order('created_at', { ascending: false }).limit(cropCarePlanLimit),
  ]);

  const failed = [
    cropsResult.error && `crops: ${cropsResult.error.message}`,
    livestockResult.error && `livestock: ${livestockResult.error.message}`,
    soilResult.error && `soil assessments: ${soilResult.error.message}`,
    carePlansResult.error && `crop-care plans: ${carePlansResult.error.message}`,
  ].filter(Boolean);

  if (failed.length) throw new Error(`Could not load complete farm context (${failed.join('; ')}).`);

  return {
    farm,
    crops: cropsResult.data || [],
    livestock: livestockResult.data || [],
    soilAssessments: soilResult.data || [],
    cropCarePlans: carePlansResult.data || [],
  };
}
