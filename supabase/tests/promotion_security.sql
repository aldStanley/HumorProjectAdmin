begin;
update public.allowed_signup_domains set enabled=false;
update public.whitelisted_email_addresses set enabled=false;
insert into auth.users(id,email,raw_app_meta_data) values
('d0000000-0000-4000-8000-000000000001','promotion-admin@example.invalid','{"provider":"google"}'),
('d0000000-0000-4000-8000-000000000002','promotion-member@example.invalid','{"provider":"google"}'),
('d0000000-0000-4000-8000-000000000003','promotion-target@example.invalid','{"provider":"google"}'),
('d0000000-0000-4000-8000-000000000004','promotion-other@example.invalid','{"provider":"email"}');
update public.profiles set is_superadmin=true where id='d0000000-0000-4000-8000-000000000001';
set local role anon;
do $$ begin begin perform public.admin_promote_superadmin('d0000000-0000-4000-8000-000000000003');raise exception 'FAIL anon';exception when insufficient_privilege then null;end;end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"d0000000-0000-4000-8000-000000000002","app_metadata":{"provider":"google"}}',true);
set local role authenticated;
do $$ begin
begin perform public.admin_promote_superadmin('d0000000-0000-4000-8000-000000000002');raise exception 'FAIL self promotion';exception when insufficient_privilege then null;end;
begin perform public.admin_promote_superadmin('d0000000-0000-4000-8000-000000000003');raise exception 'FAIL member promotion';exception when insufficient_privilege then null;end;
begin update public.profiles set is_superadmin=true where id=auth.uid();raise exception 'FAIL direct role update';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"d0000000-0000-4000-8000-000000000001","app_metadata":{"provider":"google"}}',true);
set local role authenticated;
do $$ begin
begin perform public.admin_promote_superadmin('d0000000-0000-4000-8000-000000000004');raise exception 'FAIL non-Google target';exception when invalid_parameter_value then null;end;
begin perform public.admin_promote_superadmin('d0000000-0000-4000-8000-000000000009');raise exception 'FAIL missing target';exception when no_data_found then null;end;
perform public.admin_promote_superadmin('d0000000-0000-4000-8000-000000000003');
perform public.admin_promote_superadmin('d0000000-0000-4000-8000-000000000003');
if not exists(select 1 from public.profiles where id='d0000000-0000-4000-8000-000000000003' and is_superadmin) then raise exception 'FAIL grant';end if;
if (select count(*) from public.admin_role_grants where actor_id=auth.uid() and target_id='d0000000-0000-4000-8000-000000000003')<>1 then raise exception 'FAIL audit/idempotency';end if;
begin insert into public.admin_role_grants(actor_id,target_id) values(auth.uid(),auth.uid());raise exception 'FAIL audit tampering';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"d0000000-0000-4000-8000-000000000002","app_metadata":{"provider":"google"}}',true);
set local role authenticated;
do $$ begin if (select count(*) from public.admin_role_grants)<>0 then raise exception 'FAIL member audit read';end if;end $$;
reset role;
rollback;
select 'PASS: promotion authorization, direct role denial, target validation, audit and idempotency. Fixtures rolled back.' as result;
