alter table public.farms drop constraint if exists farms_crop_check;
alter table public.farms add constraint farms_crop_check check (char_length(crop) between 1 and 80);