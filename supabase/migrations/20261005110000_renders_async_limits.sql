-- Async renders, refinement chains, multi-photo inputs and spend controls.

alter table public.renders
  add column error_kind      text check (error_kind in ('moderation', 'busy', 'timeout', 'failed')),
  add column style_id        text,
  add column sample_venue_id text,
  add column input_photo_ids uuid[] not null default '{}',
  add column item_ids        text[] not null default '{}',
  add column depth           integer not null default 0,  -- 0 = from the venue photo, n = n-th refinement
  add column client_ip_hash  text,                        -- HMAC of the caller's IP, never the raw address
  add column usage           jsonb;                       -- token usage reported by the image model

create index renders_created_at_idx   on public.renders (created_at);
create index renders_ip_created_idx   on public.renders (client_ip_hash, created_at);
create index renders_owner_status_idx on public.renders (owner_id, status);

-- At most one render in flight per guest, enforced by the database so two
-- simultaneous requests can't both start (stale rows are failed by the server
-- before inserting).
create unique index renders_one_in_flight_per_owner
  on public.renders (owner_id)
  where status in ('queued', 'running');

-- Couples can read their renders, but not internals: raw provider error text
-- (may echo request details), token usage, cost and the hashed IP. Server routes
-- use the service role for those.
revoke select on public.renders from anon, authenticated;
grant select (
  id, owner_id, brief_id, parent_render_id, prompt, status, model, image_path,
  error_kind, style_id, sample_venue_id, input_photo_ids, item_ids, depth,
  created_at, completed_at
) on public.renders to authenticated;
