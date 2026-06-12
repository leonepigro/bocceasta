-- Cap massimo Quotazione totale wishlist. 0 = usa media auto-calcolata.
alter table config
  add column if not exists wishlist_max_fvm integer not null default 0;
