-- Run in the Supabase SQL editor AFTER migration 001 in a development project.
-- All fixtures and changes roll back. Any failed assertion raises an error.
begin;
insert into auth.users(id,email) values
 ('11111111-1111-4111-8111-111111111111','rls-a@example.invalid'),
 ('22222222-2222-4222-8222-222222222222','rls-b@example.invalid');
insert into public.trips(id,owner_id,destination,document) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','Jaipur','{}'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','Kochi','{}');
insert into public.place_reviews(owner_id,place_id,place_name,kind,stars,review,published,location) values
 ('11111111-1111-4111-8111-111111111111','fixture','Fixture place','restaurant',5,'Public review',true,extensions.st_setsrid(extensions.st_makepoint(75.8,26.9),4326)),
 ('22222222-2222-4222-8222-222222222222','fixture','Fixture place','restaurant',1,'Private review',false,null);
insert into public.trip_shares(token,owner_id,trip_id,summary) values
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','{"destination":"Jaipur"}');
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$ begin
 if (select count(*) from public.trips)<>1 then raise exception 'Trip read isolation failed'; end if;
 if (select count(*) from public.place_reviews)<>1 then raise exception 'Review isolation failed'; end if;
 if (select count(*) from public.my_reviews_nearby(26.9,75.8,1000))<>1 then raise exception 'PostGIS/RLS query failed'; end if;
 update public.trips set destination='Blocked' where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 if found then raise exception 'Cross-user update allowed'; end if;
 begin
   insert into public.place_reviews(owner_id,place_id,place_name,kind,stars) values('22222222-2222-4222-8222-222222222222','forged','forged','hotel',3);
   raise exception 'Cross-user insert allowed';
 exception when insufficient_privilege then null; end;
end $$;
set local role anon;
do $$ begin
 if (select count(*) from public.public_place_reviews('fixture'))<>1 then raise exception 'Public review filtering failed'; end if;
 if public.get_shared_trip('cccccccc-cccc-4ccc-8ccc-cccccccccccc')->>'destination'<>'Jaipur' then raise exception 'Exact public link failed'; end if;
 if public.get_shared_trip('dddddddd-dddd-4ddd-8ddd-dddddddddddd') is not null then raise exception 'Unknown link exposed data'; end if;
 begin
   perform 1 from public.trips;
   raise exception 'Anonymous trip reads allowed';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
update public.trip_shares set expires_at=now()-interval '1 minute';
set local role anon;
do $$ begin
 if public.get_shared_trip('cccccccc-cccc-4ccc-8ccc-cccccccccccc') is not null then raise exception 'Expired share still accessible'; end if;
end $$;
reset role;
rollback;
