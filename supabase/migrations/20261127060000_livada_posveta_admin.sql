-- Neodobrena posveta ne smije biti vidljiva ni prijavljenim korisnicima: stupac čita samo admin, kroz funkciju.
revoke select (dedication, dedication_status) on public.meadow_flowers from authenticated;

create or replace function public.admin_meadow_dedications(p_status text default 'pending')
returns table (id uuid, number bigint, name text, dedication text, dedication_status text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'samo admin' using errcode = '42501';
  end if;
  return query
    select f.id, f.number, f.name, f.dedication, f.dedication_status, f.created_at
    from public.meadow_flowers f
    where f.dedication_status = p_status
    order by f.created_at desc
    limit 200;
end;
$$;

revoke all on function public.admin_meadow_dedications(text) from public, anon;
grant execute on function public.admin_meadow_dedications(text) to authenticated;
