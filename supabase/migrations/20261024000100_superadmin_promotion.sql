begin;

create table public.admin_role_grants (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id),
  target_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.admin_role_grants enable row level security;
revoke all on public.admin_role_grants from public, anon, authenticated;
grant select on public.admin_role_grants to authenticated;
create policy "Superadmins read role grants" on public.admin_role_grants
  for select to authenticated using ((select public.is_superadmin()));

create function public.admin_promote_superadmin(target_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare target_google boolean; already_admin boolean;
begin
  if not public.is_superadmin() then
    raise exception 'Superadmin required' using errcode='42501';
  end if;
  select p.is_superadmin, u.raw_app_meta_data->>'provider'='google'
    into already_admin, target_google
    from public.profiles p join auth.users u on u.id=p.id
    where p.id=target_id for update of p;
  if not found then raise exception 'Profile not found' using errcode='P0002'; end if;
  if target_google is distinct from true then
    raise exception 'Only Google accounts can become superadmins' using errcode='22023';
  end if;
  if not already_admin then
    update public.profiles set is_superadmin=true, updated_at=now() where id=target_id;
    insert into public.admin_role_grants(actor_id,target_id) values(auth.uid(),target_id);
  end if;
  return target_id;
end $$;
revoke all on function public.admin_promote_superadmin(uuid) from public, anon;
grant execute on function public.admin_promote_superadmin(uuid) to authenticated;
commit;
