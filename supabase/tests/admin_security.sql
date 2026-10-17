-- Run in Supabase SQL Editor after the admin migration. All fixtures roll back.
begin;
insert into auth.users(id,email,raw_app_meta_data) values
 ('a0000000-0000-4000-8000-000000000001','admin-fixture@example.invalid','{"provider":"google"}'),
 ('a0000000-0000-4000-8000-000000000002','member-fixture@example.invalid','{"provider":"google"}');
update public.profiles set is_superadmin=true where id='a0000000-0000-4000-8000-000000000001';
insert into storage.objects(bucket_id,name) values('caption-images','a0000000-0000-4000-8000-000000000001/admin-security-test.png');

set local role anon;
do $$ begin
  begin perform public.admin_statistics();raise exception 'FAIL: anonymous RPC';exception when insufficient_privilege then null;end;
  begin perform public.admin_delete_media(gen_random_uuid());raise exception 'FAIL: anonymous delete';exception when insufficient_privilege then null;end;
end $$;

reset role;
select set_config('request.jwt.claims','{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated","app_metadata":{"provider":"google"}}',true);
set local role authenticated;
do $$ begin
  if public.is_superadmin() then raise exception 'FAIL: member is admin';end if;
  if exists(select 1 from public.profiles where id='a0000000-0000-4000-8000-000000000001') then raise exception 'FAIL: private profile visible';end if;
  begin update public.profiles set is_superadmin=true where id=auth.uid();raise exception 'FAIL: self promotion';exception when insufficient_privilege then null;end;
  begin perform public.admin_statistics();raise exception 'FAIL: member statistics';exception when insufficient_privilege then null;end;
  begin perform public.admin_save_media(null,'test','test',null,'ai');raise exception 'FAIL: member create';exception when insufficient_privilege then null;end;
  begin perform public.admin_delete_media(gen_random_uuid());raise exception 'FAIL: member delete';exception when insufficient_privilege then null;end;
  update public.profiles set first_name='Still editable' where id=auth.uid();
end $$;

reset role;
select set_config('request.jwt.claims','{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated","app_metadata":{"provider":"google"}}',true);
set local role authenticated;
do $$ declare media uuid; file_path text; begin
  if not public.is_superadmin() then raise exception 'FAIL: admin rejected';end if;
  if not exists(select 1 from public.profiles where id='a0000000-0000-4000-8000-000000000002') then raise exception 'FAIL: admin profiles';end if;
  perform public.admin_statistics();
  media:=public.admin_save_media(null,'AI fixture','Test description','a0000000-0000-4000-8000-000000000001/admin-security-test.png','ai');
  if not exists(select 1 from public.jokes where id=media and caption_source='ai') then raise exception 'FAIL: create';end if;
  perform public.admin_save_media(media,'Edited fixture','Edited description',null,'human');
  if not exists(select 1 from public.jokes where id=media and text='Edited fixture' and caption_source='human') then raise exception 'FAIL: update';end if;
  begin update public.profiles set is_superadmin=false where id=auth.uid();raise exception 'FAIL: admin role editor';exception when insufficient_privilege then null;end;
  file_path:=public.admin_delete_media(media);
  if file_path<>'a0000000-0000-4000-8000-000000000001/admin-security-test.png' or exists(select 1 from public.jokes where id=media) then raise exception 'FAIL: delete';end if;
end $$;

reset role;
select set_config('request.jwt.claims','{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated","app_metadata":{"provider":"email"}}',true);
set local role authenticated;
do $$ begin if public.is_superadmin() then raise exception 'FAIL: non-Google session';end if;end $$;
reset role;
rollback;
select 'PASS: anonymous denial, member denial, self-promotion blocked, profile editing preserved, admin CRUD, and Google provider enforcement; fixtures rolled back.' as result;
