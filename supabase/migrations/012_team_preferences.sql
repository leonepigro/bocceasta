-- Wishlist preferenze: ogni team segna giocatori preferiti.
-- Durante il sorteggio, a parità di Quotazione vince chi ha il giocatore in wishlist.

create table if not exists team_preferences (
  team_id   uuid    not null references teams(id)   on delete cascade,
  player_id integer not null references players(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (team_id, player_id)
);

create index if not exists idx_team_preferences_team   on team_preferences(team_id);
create index if not exists idx_team_preferences_player on team_preferences(player_id);

alter table team_preferences enable row level security;

-- Solo il proprietario del team può vedere/scrivere le sue preferenze.
-- L'admin vede tutto.
create policy team_preferences_owner_read on team_preferences
  for select to authenticated
  using (
    exists (
      select 1 from teams t
      where t.id = team_preferences.team_id
        and (t.user_id = auth.uid() or (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
    )
  );

create policy team_preferences_owner_write on team_preferences
  for insert to authenticated
  with check (
    exists (
      select 1 from teams t
      where t.id = team_preferences.team_id
        and t.user_id = auth.uid()
    )
  );

create policy team_preferences_owner_delete on team_preferences
  for delete to authenticated
  using (
    exists (
      select 1 from teams t
      where t.id = team_preferences.team_id
        and t.user_id = auth.uid()
    )
  );
