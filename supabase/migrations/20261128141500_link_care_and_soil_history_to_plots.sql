ALTER TABLE public.crop_care_plans ADD COLUMN IF NOT EXISTS plot_id uuid;
ALTER TABLE public.soil_assessments ADD COLUMN IF NOT EXISTS plot_id uuid;
ALTER TABLE public.crop_care_plans
  ADD CONSTRAINT crop_care_plans_plot_farm_user_fk
  FOREIGN KEY (plot_id,farm_id,user_id)
  REFERENCES public.farm_plots (id,farm_id,user_id)
  ON DELETE RESTRICT;
ALTER TABLE public.soil_assessments
  ADD CONSTRAINT soil_assessments_plot_farm_user_fk
  FOREIGN KEY (plot_id,farm_id,user_id)
  REFERENCES public.farm_plots (id,farm_id,user_id)
  ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS crop_care_plans_plot_created_idx
  ON public.crop_care_plans (plot_id,created_at DESC) WHERE plot_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS soil_assessments_plot_created_idx
  ON public.soil_assessments (plot_id,created_at DESC) WHERE plot_id IS NOT NULL;
