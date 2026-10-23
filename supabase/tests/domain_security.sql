-- Transactional fixtures only. No real profiles, policy entries, or media persist.
begin;
update public.allowed_signup_domains set enabled=false;
update public.whitelisted_email_addresses set enabled=false;
insert into auth.users(id,email,raw_app_meta_data) values
('c0000000-0000-4000-8000-000000000001','admin-test@example.invalid','{"provider":"google"}'),
('c0000000-0000-4000-8000-000000000002','member-test@example.invalid','{"provider":"google"}');
update public.profiles set is_superadmin=true where id='c0000000-0000-4000-8000-000000000001';
insert into storage.objects(bucket_id,name) values
('caption-images','c0000000-0000-4000-8000-000000000001/domain-test-a.png'),
('caption-images','c0000000-0000-4000-8000-000000000001/domain-test-b.png');
set local role anon;
do $$ begin
 begin perform count(*) from public.terms;raise exception 'FAIL anon terms';exception when insufficient_privilege then null;end;
 begin perform public.admin_start_generation('b0000000-0000-4000-8000-000000000003','{}');raise exception 'FAIL anon logging';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"c0000000-0000-4000-8000-000000000002","role":"authenticated","app_metadata":{"provider":"google"}}',true);
set local role authenticated;
do $$ declare t text;n bigint;begin
 foreach t in array array['llm_providers','llm_models','prompt_chains','prompt_chain_steps','prompt_chain_mix','terms','ai_generation_examples','generation_requests','llm_responses','allowed_signup_domains','whitelisted_email_addresses'] loop
 execute format('select count(*) from public.%I',t) into n;if n<>0 then raise exception 'FAIL member can read %',t;end if;end loop;
 begin insert into public.terms(term,definition) values('blocked','blocked');raise exception 'FAIL member write';exception when insufficient_privilege then null;end;
 begin perform public.admin_save_image(null,'blocked','c0000000-0000-4000-8000-000000000001/domain-test-a.png');raise exception 'FAIL member image';exception when insufficient_privilege then null;end;
 begin perform public.admin_start_generation('b0000000-0000-4000-8000-000000000003','{}');raise exception 'FAIL member logging';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"c0000000-0000-4000-8000-000000000001","role":"authenticated","app_metadata":{"provider":"google"}}',true);
set local role authenticated;
do $$ declare provider uuid;model uuid;term_id uuid;example_id uuid;domain_id uuid;email_id uuid;image jsonb;path text;req uuid;step uuid;begin
 if (select count(*) from public.prompt_chain_steps where chain_id='b0000000-0000-4000-8000-000000000003')<>2 then raise exception 'FAIL pipeline seed';end if;
 insert into public.llm_providers(name,provider_type) values('Fixture provider','other') returning id into provider;
 update public.llm_providers set name='Updated fixture provider' where id=provider;
 insert into public.llm_models(provider_id,name,model_identifier) values(provider,'Fixture model','fixture') returning id into model;
 update public.llm_models set supports_vision=true where id=model;
 begin delete from public.llm_providers where id=provider;raise exception 'FAIL provider reference';exception when foreign_key_violation then null;end;
 delete from public.llm_models where id=model;delete from public.llm_providers where id=provider;
 insert into public.terms(term,definition) values('TestTerm','First') returning id into term_id;
 update public.terms set definition='Updated' where id=term_id;
 if not exists(select 1 from public.terms where id=term_id and definition='Updated') then raise exception 'FAIL term update';end if;
 begin insert into public.terms(term,definition) values('testterm','Duplicate');raise exception 'FAIL term duplicate';exception when unique_violation then null;end;
 delete from public.terms where id=term_id;
 insert into public.ai_generation_examples(input_description,output_caption) values('Photo','Caption') returning id into example_id;
 update public.ai_generation_examples set output_caption='Edited' where id=example_id;delete from public.ai_generation_examples where id=example_id;
 insert into public.allowed_signup_domains(domain) values('example.invalid') returning id into domain_id;
 update public.allowed_signup_domains set notes='Test' where id=domain_id;
 insert into public.whitelisted_email_addresses(email) values('exception@other.invalid') returning id into email_id;
 update public.whitelisted_email_addresses set notes='Test' where id=email_id;
 update public.prompt_chain_mix set weight=50 where chain_id='b0000000-0000-4000-8000-000000000003';
 begin update public.prompt_chain_mix set chain_id=gen_random_uuid();raise exception 'FAIL immutable mix chain';exception when insufficient_privilege then null;end;
 begin insert into public.prompt_chains(name,description) values('blocked','blocked');raise exception 'FAIL chain insert';exception when insufficient_privilege then null;end;
 begin delete from public.prompt_chain_steps;raise exception 'FAIL step delete';exception when insufficient_privilege then null;end;
 image:=public.admin_save_image(null,'Original','c0000000-0000-4000-8000-000000000001/domain-test-a.png');
 image:=public.admin_save_image((image->>'id')::uuid,'Replacement','c0000000-0000-4000-8000-000000000001/domain-test-b.png');
 if image->>'previous_path'<>'c0000000-0000-4000-8000-000000000001/domain-test-a.png' then raise exception 'FAIL image replacement';end if;
 path:=public.admin_delete_image((image->>'id')::uuid);
 if path<>'c0000000-0000-4000-8000-000000000001/domain-test-b.png' then raise exception 'FAIL image delete';end if;
 req:=public.admin_start_generation('b0000000-0000-4000-8000-000000000003','{"source":"rolled-back-test"}');
 select id into step from public.prompt_chain_steps where chain_id='b0000000-0000-4000-8000-000000000003' and step_order=1;
 perform public.admin_log_response(req,step,'b0000000-0000-4000-8000-000000000002','Fixture prompt','Fixture output','{}',200,5);
 perform public.admin_finish_generation(req,true);
 if not exists(select 1 from public.generation_requests where id=req and status='succeeded') then raise exception 'FAIL request lifecycle';end if;
 if not exists(select 1 from public.llm_responses where request_id=req and output_text='Fixture output') then raise exception 'FAIL response log';end if;
 begin update public.llm_responses set output_text='tampered';raise exception 'FAIL response editing';exception when insufficient_privilege then null;end;
end $$;
reset role;
do $$ begin
 if not public.signup_is_allowed('new@example.invalid') or not public.signup_is_allowed('exception@other.invalid') or public.signup_is_allowed('blocked@other.invalid') then raise exception 'FAIL signup policy';end if;
 insert into auth.users(id,email,raw_app_meta_data) values('c0000000-0000-4000-8000-000000000003','new@example.invalid','{"provider":"google"}');
 begin
 insert into auth.users(id,email,raw_app_meta_data) values('c0000000-0000-4000-8000-000000000004','blocked@other.invalid','{"provider":"google"}');
 raise exception 'FAIL signup trigger accepted blocked email';
 exception when raise_exception then if sqlerrm<>'This email is not allowed to sign up' then raise;end if;end;
 delete from public.allowed_signup_domains where domain='example.invalid';
 delete from public.whitelisted_email_addresses where email='exception@other.invalid';
 if not public.signup_is_allowed('anyone@another.invalid') then raise exception 'FAIL empty signup policy';end if;
end $$;
rollback;
select 'PASS: domain CRUD, read-only resources, RLS denial, mix restrictions, image replacement/deletion, logging, and signup policy; all fixtures rolled back.' as result;
