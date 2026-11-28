import type { SupabaseClient } from '@supabase/supabase-js';

export type FarmContext = {
  farm: Record<string, any>;
  profile: Record<string, any> | null;
  plots: Record<string, any>[];
  farmEvents: Record<string, any>[];
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
    .select('id,user_id,label,crop,district_id,district_name,region,latitude,longitude,location_accuracy_m,location_source,location_captured_at,location_label,village,parish,subcounty,farm_size_value,farm_size_unit,years_farmed_land,previous_season_crops,season_before_previous_crops,water_pools_after_rain,water_access,biggest_challenge,selling_habit,last_season_harvest_kg,last_season_income_ugx,previous_farming_service,previous_farming_service_feedback')
    .eq('id', farmId)
    .eq('user_id', userId)
    .maybeSingle();

  if (farmError) throw new Error(`Could not load farm: ${farmError.message}`);
  if (!farm) return null;

  const [profileResult, plotsResult, cropsResult, livestockResult, soilResult, carePlansResult, eventsResult] = await Promise.all([
    supabase.from('profiles').select('full_name,preferred_language,decision_style').eq('id', userId).maybeSingle(),
    supabase.from('farm_plots')
      .select('id,label,boundary_status,mapping_method,centroid_latitude,centroid_longitude,area_acres,area_hectares,created_at')
      .eq('user_id', userId).eq('farm_id', farmId).order('created_at', { ascending: true }),
    supabase.from('farm_crops')
      .select('id,plot_id,crop_name,variety,planting_date,growth_stage,area_value,area_unit,area_share_percent,input_source,fertiliser_manure_applied,notes,is_active,created_at,updated_at')
      .eq('user_id', userId).eq('farm_id', farmId).eq('is_active', true)
      .order('created_at', { ascending: true }),
    supabase.from('farm_livestock')
      .select('id,species,breed,animal_count,production_purpose,age_group,cattle_status,vaccinated_this_year,vaccination_details,notes,is_active,created_at,updated_at')
      .eq('user_id', userId).eq('farm_id', farmId).eq('is_active', true)
      .order('created_at', { ascending: true }),
    supabase.from('soil_assessments')
      .select('id,plot_id,crop,mode,measured_ph,texture,drainage,findings,created_at,location_label,latitude,longitude,weather_snapshot,ai_report')
      .eq('user_id', userId).eq('farm_id', farmId)
      .order('created_at', { ascending: false }).limit(soilAssessmentLimit),
    supabase.from('crop_care_plans')
      .select('id,plot_id,crop_name,issue_name,diagnosis_status,status,care_plan,source_scan,started_at,next_review_at,created_at,updated_at')
      .eq('user_id', userId).eq('farm_id', farmId)
      .order('created_at', { ascending: false }).limit(cropCarePlanLimit),
    supabase.from('farm_events')
      .select('id,event_type,source,occurred_at,plot_id,payload,related_event_id')
      .eq('user_id', userId).eq('farm_id', farmId)
      .order('occurred_at', { ascending: false }).limit(40),
  ]);

  const failed = [
    profileResult.error && `profile: ${profileResult.error.message}`,
    plotsResult.error && `plots: ${plotsResult.error.message}`,
    cropsResult.error && `crops: ${cropsResult.error.message}`,
    livestockResult.error && `livestock: ${livestockResult.error.message}`,
    soilResult.error && `soil assessments: ${soilResult.error.message}`,
    carePlansResult.error && `crop-care plans: ${carePlansResult.error.message}`,
    eventsResult.error && `farm events: ${eventsResult.error.message}`,
  ].filter(Boolean);

  if (failed.length) throw new Error(`Could not load complete farm context (${failed.join('; ')}).`);

  return {
    farm,
    profile: profileResult.data || null,
    plots: plotsResult.data || [],
    farmEvents: eventsResult.data || [],
    crops: cropsResult.data || [],
    livestock: livestockResult.data || [],
    soilAssessments: soilResult.data || [],
    cropCarePlans: carePlansResult.data || [],
  };
}
