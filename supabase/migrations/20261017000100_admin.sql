begin;

alter table public.profiles add column if not exists is_superadmin boolean not null default false;
-- Existing profile editors keep their fields, but cannot promote themselves.
revoke update on public.profiles from authenticated;
grant update(first_name,last_name,avatar_path,updated_at) on public.profiles to authenticated;

create or replace function public.is_superadmin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles p join auth.users u on u.id=p.id
    where p.id=auth.uid() and p.is_superadmin=true
    and u.raw_app_meta_data->>'provider'='google'
    and auth.jwt()->'app_metadata'->>'provider'='google');
$$;
revoke all on function public.is_superadmin() from public, anon;
grant execute on function public.is_superadmin() to authenticated;

create policy "Superadmins read profiles" on public.profiles for select to authenticated using ((select public.is_superadmin()));
create policy "Superadmins read votes" on public.caption_votes for select to authenticated using ((select public.is_superadmin()));
create policy "Superadmins read ballots" on public.jury_ballots for select to authenticated using ((select public.is_superadmin()));
create policy "Superadmins read images" on public.caption_images for select to authenticated using ((select public.is_superadmin()));
create policy "Superadmins read media files" on storage.objects for select to authenticated
  using(bucket_id='caption-images' and (select public.is_superadmin()));
create policy "Superadmins upload media files" on storage.objects for insert to authenticated
  with check(bucket_id='caption-images' and (storage.foldername(name))[1]=auth.uid()::text and (select public.is_superadmin()));
create policy "Superadmins remove media files" on storage.objects for delete to authenticated
  using(bucket_id='caption-images' and (select public.is_superadmin())
    and not exists(select 1 from public.caption_images i where i.storage_path=name));

create function public.admin_save_media(target_id uuid, caption text, image_description text, file_path text default null, source text default 'ai')
returns uuid language plpgsql security definer set search_path='' as $$
declare image uuid; result uuid;
begin
  if not public.is_superadmin() then raise exception 'Superadmin required' using errcode='42501'; end if;
  if caption is null or char_length(trim(caption)) not between 1 and 240
    or image_description is null or char_length(trim(image_description)) not between 1 and 4000
    or source is null or source not in ('ai','human','unknown') then raise exception 'Invalid media'; end if;
  if target_id is null then
    if file_path is null or split_part(file_path,'/',1)<>auth.uid()::text
      or not exists(select 1 from storage.objects where bucket_id='caption-images' and name=file_path)
      then raise exception 'Uploaded photo required'; end if;
    insert into public.caption_images(user_id,storage_path,description,status,suggestions)
      values(auth.uid(),file_path,trim(image_description),'ready',case when source='ai' then array[trim(caption)] else array[]::text[] end)
      returning id into image;
    insert into public.jokes(picture,text,image_id) values(file_path,trim(caption),image) returning id into result;
  else
    select image_id into image from public.jokes where id=target_id for update;
    if not found then raise exception 'Media not found'; end if;
    if image is not null then
      update public.caption_images set description=trim(image_description) where id=image;
    end if;
    update public.jokes set text=trim(caption),caption_source=source where id=target_id returning id into result;
  end if;
  -- Explicit editorial attribution also handles legacy fixtures without image records.
  update public.jokes set caption_source=source where id=result;
  return result;
end $$;
revoke all on function public.admin_save_media(uuid,text,text,text,text) from public,anon;
grant execute on function public.admin_save_media(uuid,text,text,text,text) to authenticated;

create function public.admin_delete_media(target_id uuid) returns text
language plpgsql security definer set search_path='' as $$
declare image uuid; file_path text;
begin
  if not public.is_superadmin() then raise exception 'Superadmin required' using errcode='42501'; end if;
  select image_id into image from public.jokes where id=target_id for update;
  if not found then raise exception 'Media not found'; end if;
  -- Jury snapshots and trophies intentionally survive removal from the public board.
  delete from public.jokes where id=target_id;
  if image is not null and not exists(select 1 from public.jokes where image_id=image) then
    delete from public.caption_images where id=image returning storage_path into file_path;
  end if;
  return file_path;
end $$;
revoke all on function public.admin_delete_media(uuid) from public,anon;
grant execute on function public.admin_delete_media(uuid) to authenticated;

create function public.admin_statistics() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if not public.is_superadmin() then raise exception 'Superadmin required' using errcode='42501'; end if;
  select jsonb_build_object(
    'profiles',(select count(*) from public.profiles),
    'media',(select count(*) from public.jokes),
    'ai',(select count(*) from public.jokes where caption_source='ai'),
    'human',(select count(*) from public.jokes where caption_source='human'),
    'up',(select count(*) from public.caption_votes where value=1),
    'down',(select count(*) from public.caption_votes where value=-1),
    'voters',(select count(distinct user_id) from public.caption_votes),
    'drafts',(select count(*) from public.caption_images i where not exists(select 1 from public.jokes j where j.image_id=i.id)),
    'ballots',(select count(*) from public.jury_ballots),
    'trend',(select coalesce(jsonb_agg(to_jsonb(t) order by t.day),'[]') from (
      select d::date::text as day,
      (select count(*) from public.caption_votes v where (v.created_at at time zone 'America/New_York')::date=d::date and v.value=1) as up,
      (select count(*) from public.caption_votes v where (v.created_at at time zone 'America/New_York')::date=d::date and v.value=-1) as down
      from generate_series((now() at time zone 'America/New_York')::date-13,(now() at time zone 'America/New_York')::date,'1 day') d
    ) t),
    'leaders',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from (
      select j.id,j.text,count(v.caption_id) filter(where v.value=1) as up,count(v.caption_id) filter(where v.value=-1) as down,
        coalesce(sum(v.value),0) as score from public.jokes j join public.caption_votes v on v.caption_id=j.id
      group by j.id order by score desc,count(v.caption_id) desc,j.id limit 5
    ) t),
    'sources',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from (
      select j.caption_source as source,count(distinct j.id) as media,count(v.caption_id) as votes,
      count(v.caption_id) filter(where v.value=1) as up from public.jokes j left join public.caption_votes v on v.caption_id=j.id group by j.caption_source
    ) t)
  ) into result;
  return result;
end $$;
revoke all on function public.admin_statistics() from public,anon;
grant execute on function public.admin_statistics() to authenticated;
commit;
