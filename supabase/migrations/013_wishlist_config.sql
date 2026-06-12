-- Config wishlist: abilita/disabilita, limiti totale e per ruolo

alter table config
  add column if not exists wishlist_enabled boolean not null default true,
  add column if not exists wishlist_max_total integer not null default 30,
  add column if not exists wishlist_max_per_role jsonb not null default
    '{"Por":1,"Dc":4,"B":2,"Dd":2,"Ds":2,"E":2,"M":3,"C":3,"T":2,"W":3,"A":3,"Pc":3}'::jsonb;
