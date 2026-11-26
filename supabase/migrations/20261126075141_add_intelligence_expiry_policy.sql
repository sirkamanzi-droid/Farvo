create or replace function public.set_agri_intelligence_default_expiry()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.expires_at is null then
    new.expires_at := coalesce(new.published_at, now()) +
      case new.category
        when 'opportunity' then interval '30 days'
        when 'market' then interval '7 days'
        when 'threat' then interval '14 days'
        when 'environment' then interval '14 days'
        when 'news' then interval '30 days'
        when 'research' then interval '180 days'
        else interval '30 days'
      end;
  end if;
  return new;
end;
$$;

drop trigger if exists agri_intelligence_default_expiry on public.agri_intelligence_items;
create trigger agri_intelligence_default_expiry
before insert on public.agri_intelligence_items
for each row execute function public.set_agri_intelligence_default_expiry();

update public.agri_intelligence_items
set expires_at = coalesce(published_at, created_at, now()) +
  case category
    when 'opportunity' then interval '30 days'
    when 'market' then interval '7 days'
    when 'threat' then interval '14 days'
    when 'environment' then interval '14 days'
    when 'news' then interval '30 days'
    when 'research' then interval '180 days'
    else interval '30 days'
  end
where expires_at is null;