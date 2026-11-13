alter table public.stationery_requests
 add column history jsonb not null default '[]'::jsonb check (jsonb_typeof(history)='array'),
 add column quote jsonb,
 add column quote_versions jsonb not null default '[]'::jsonb check (jsonb_typeof(quote_versions)='array'),
 add column accepted_version integer,
 add column accepted_at timestamptz;
-- Preserve replies already sent before conversation history was introduced.
update public.stationery_requests set history=jsonb_build_array(jsonb_build_object('role','supplier','text',supplier_reply,'at',updated_at)) where supplier_reply<>'';
-- All mutations continue through the server's verified actor and scoped lookup.
-- Browser roles retain owner SELECT only; no additional grants are introduced.
