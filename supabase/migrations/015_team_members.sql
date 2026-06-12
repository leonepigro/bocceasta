-- Junction table per associare più utenti a una stessa squadra.
-- teams.user_id resta il "proprietario primario" per retrocompatibilità.
-- team_members contiene tutti gli utenti collaboratori (primario + co-gestori).

create table if not exists team_members (
  team_id    uuid not null references teams(id) on delete cascade,
  user_id    uuid not null,
  added_at   timestamptz not null default now(),
  primary key (team_id, user_id)
);

create index if not exists idx_team_members_user on team_members(user_id);

-- Migrazione: ogni team con user_id non null → riga in team_members
insert into team_members (team_id, user_id)
select id, user_id from teams
where user_id is not null
on conflict do nothing;

alter table team_members enable row level security;

-- RLS: ogni utente vede solo le proprie associazioni. Admin vede tutto.
create policy team_members_self_read on team_members
  for select to authenticated
  using (
    user_id = auth.uid()
    or (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );
