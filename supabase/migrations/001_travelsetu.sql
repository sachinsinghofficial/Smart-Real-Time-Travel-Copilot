-- Run once in a new Supabase project's SQL editor, or with the Supabase CLI.
begin;
create schema if not exists extensions;
create extension if not exists postgis with schema extensions;
grant usage on schema extensions to authenticated;
create table public.trips (
 id uuid primary key,
 owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
 destination text not null check(char_length(destination) between 1 and 100),
 version integer not null default 1 check(version>0),
 document jsonb not null check(jsonb_typeof(document)='object' and octet_length(document::text)<3000000),
 updated_at timestamptz not null default now()
);
create table public.place_reviews (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
 place_id text not null check(char_length(place_id) between 1 and 200),
 place_name text not null check(char_length(place_name) between 1 and 200),
 kind text not null check(kind in ('attraction','restaurant','hotel','experience','transport')),
 stars integer not null check(stars between 1 and 5),
 review text not null default '' check(char_length(review)<=1200),
 visited_on date,
 published boolean not null default false,
 location extensions.geography(point,4326),
 updated_at timestamptz not null default now(),
 unique(owner_id,place_id)
);
create index reviews_location_idx on public.place_reviews using gist(location);
create index reviews_place_idx on public.place_reviews(place_id) where published=true;
create table public.trip_shares (
 token uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
 trip_id uuid not null references public.trips(id) on delete cascade,
 summary jsonb not null check(jsonb_typeof(summary)='object' and octet_length(summary::text)<20000),
 expires_at timestamptz not null default now()+interval '30 days',
 created_at timestamptz not null default now()
);
alter table public.trips enable row level security;
alter table public.place_reviews enable row level security;
alter table public.trip_shares enable row level security;
revoke all on public.trips,public.place_reviews,public.trip_shares from anon,authenticated;
grant select,insert,update,delete on public.trips,public.place_reviews,public.trip_shares to authenticated;
create policy "Own trips" on public.trips for all to authenticated using ((select auth.uid())=owner_id) with check((select auth.uid())=owner_id);
create policy "Own reviews" on public.place_reviews for all to authenticated using ((select auth.uid())=owner_id) with check((select auth.uid())=owner_id);
create policy "Own shares" on public.trip_shares for all to authenticated using ((select auth.uid())=owner_id) with check((select auth.uid())=owner_id and exists(select 1 from public.trips t where t.id=trip_id and t.owner_id=(select auth.uid())));
-- Public links and reviews expose only the exact requested public record, never owner identifiers.
create function public.get_shared_trip(share_token uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select summary from public.trip_shares where token=share_token and expires_at>now() limit 1;
$$;
revoke all on function public.get_shared_trip(uuid) from public;
grant execute on function public.get_shared_trip(uuid) to anon,authenticated;
create function public.public_place_reviews(target_place text)
returns table(stars integer,review text,visited_on date,updated_at timestamptz)
language sql stable security definer set search_path='' as $$
 select r.stars,r.review,r.visited_on,r.updated_at from public.place_reviews r
 where r.place_id=target_place and r.published order by r.updated_at desc limit 50;
$$;
revoke all on function public.public_place_reviews(text) from public;
grant execute on function public.public_place_reviews(text) to anon,authenticated;
-- PostGIS query across the signed-in traveller's own geolocated reviews.
create function public.my_reviews_nearby(lat double precision,lng double precision,radius_m integer default 3000)
returns table(place_id text,place_name text,stars integer,distance_m double precision)
language sql stable security invoker set search_path='' as $$
 select r.place_id,r.place_name,r.stars,extensions.st_distance(r.location,extensions.st_setsrid(extensions.st_makepoint(lng,lat),4326)::extensions.geography)
 from public.place_reviews r
 where r.owner_id=(select auth.uid()) and radius_m between 1 and 10000 and lat between -90 and 90 and lng between -180 and 180
 and extensions.st_dwithin(r.location,extensions.st_setsrid(extensions.st_makepoint(lng,lat),4326)::extensions.geography,radius_m)
 order by 4 limit 100;
$$;
revoke all on function public.my_reviews_nearby(double precision,double precision,integer) from public;
grant execute on function public.my_reviews_nearby(double precision,double precision,integer) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('trip-photos','trip-photos',false,5242880,array['image/jpeg','image/png','image/webp'])
 on conflict(id) do nothing;
create policy "Own trip photo reads" on storage.objects for select to authenticated using(bucket_id='trip-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "Own trip photo inserts" on storage.objects for insert to authenticated with check(bucket_id='trip-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "Own trip photo updates" on storage.objects for update to authenticated using(bucket_id='trip-photos' and (storage.foldername(name))[1]=(select auth.uid())::text) with check(bucket_id='trip-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "Own trip photo deletes" on storage.objects for delete to authenticated using(bucket_id='trip-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
commit;
