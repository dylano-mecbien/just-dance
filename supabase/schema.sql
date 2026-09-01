-- JD Contest — schéma minimal pour les inscriptions et le classement
create extension if not exists pgcrypto;

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  pseudo text not null check (char_length(pseudo) between 2 and 40),
  phone text not null check (char_length(phone) between 6 and 30),
  photo_url text,
  status text not null default 'active' check (status in ('active', 'eliminated', 'winner')),
  seed integer not null default 1,
  created_at timestamptz not null default now()
);

alter table public.participants enable row level security;

-- Pour un événement sans authentification : lecture publique du classement et inscription publique.
-- Les modifications admin sont réalisées depuis le frontend avec le PIN de l'événement.
-- Pour un usage public, remplacez ces politiques par Supabase Auth + une policy d'administration.
drop policy if exists "participants_read_public" on public.participants;
drop policy if exists "participants_insert_public" on public.participants;
drop policy if exists "participants_update_public" on public.participants;
create policy "participants_read_public" on public.participants for select using (true);
create policy "participants_insert_public" on public.participants for insert with check (true);
create policy "participants_update_public" on public.participants for update using (true) with check (true);

grant select, insert, update on public.participants to anon, authenticated;

-- Optionnel : bucket Storage pour des photos persistantes.
-- À créer dans Dashboard > Storage avec le nom participant-photos et l'option Public activée.
