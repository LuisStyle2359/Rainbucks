-- ============================================================
-- Rainbucks: Datenbank-Schema
-- Lokal: wird von "npm run db:start" automatisch ausgeführt.
-- ============================================================
-- Hinweis: E-Mail und Passwort speichert Supabase selbst in der
-- geschützten Tabelle "auth.users". Passwörter liegen dort nur als
-- bcrypt-Hash vor, niemals im Klartext.

-- 1) Tabelle für zusätzliche Profildaten
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

-- 2) Row Level Security: Jeder darf nur sein eigenes Profil sehen/ändern
alter table public.profiles enable row level security;

drop policy if exists "Eigenes Profil lesen" on public.profiles;
create policy "Eigenes Profil lesen"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Eigenes Profil ändern" on public.profiles;
create policy "Eigenes Profil ändern"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- 3) Bei jeder Registrierung automatisch ein Profil anlegen
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
