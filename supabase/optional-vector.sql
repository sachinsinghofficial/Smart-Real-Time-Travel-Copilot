-- Optional, separate from the default migration. Needs Supabase pgvector support.
-- Embeddings must use one consistent 768-dimensional model; none are fabricated.
begin;
create extension if not exists vector with schema extensions;
create table public.place_embeddings (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 place_id text not null,
 model text not null,
 content text not null check(char_length(content)<=8000),
 embedding extensions.vector(768) not null,
 unique(owner_id,place_id,model)
);
alter table public.place_embeddings enable row level security;
revoke all on public.place_embeddings from anon,authenticated;
grant select,insert,update,delete on public.place_embeddings to authenticated;
create policy "Own embeddings" on public.place_embeddings for all to authenticated
 using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create function public.my_similar_places(query_embedding extensions.vector(768),embedding_model text)
returns table(place_id text,content text,distance double precision)
language sql stable security invoker set search_path='' as $$
 select p.place_id,p.content,p.embedding OPERATOR(extensions.<=>) query_embedding
 from public.place_embeddings p
 where p.owner_id=(select auth.uid()) and p.model=embedding_model
 order by 3 limit 10;
$$;
revoke all on function public.my_similar_places(extensions.vector,text) from public;
grant execute on function public.my_similar_places(extensions.vector,text) to authenticated;
commit;
