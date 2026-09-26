-- Optional extension to 001. Analytics remain scoped to the authenticated owner.
begin;
create index if not exists trips_owner_updated_idx on public.trips(owner_id,updated_at desc);
create or replace function public.my_trip_expense_totals()
returns table(trip_id uuid,destination text,expense_count bigint,total_paise numeric)
language sql stable security invoker set search_path='' as $$
 select t.id,t.destination,count(e.value),coalesce(sum(case when jsonb_typeof(e.value->'amountPaise')='number' then (e.value->>'amountPaise')::numeric else 0 end),0)
 from public.trips t
 left join lateral jsonb_array_elements(case when jsonb_typeof(t.document->'expenses')='array' then t.document->'expenses' else '[]'::jsonb end) e(value) on true
 where t.owner_id=(select auth.uid())
 group by t.id,t.destination;
$$;
revoke all on function public.my_trip_expense_totals() from public;
grant execute on function public.my_trip_expense_totals() to authenticated;
commit;
