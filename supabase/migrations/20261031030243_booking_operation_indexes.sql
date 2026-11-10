begin;
create index booking_claims_actor_idx on public.booking_claims(created_by);
create index booking_notifications_supplier_idx on public.booking_notifications(supplier_id);
create index booking_quotes_creator_idx on public.booking_quotes(created_by);
create index booking_quotes_acceptor_idx on public.booking_quotes(accepted_by);
create index supplier_reviews_submitter_idx on public.supplier_reviews(submitted_by);
create index supplier_reviews_reviewer_idx on public.supplier_reviews(reviewed_by);
create index booking_notifications_due_idx on public.booking_notifications(status,due_at,created_at);
create table public.supplier_review_history (
 id uuid primary key default gen_random_uuid(),supplier_id uuid not null references public.suppliers(id) on delete cascade,
 revision integer not null,state text not null,declarations jsonb not null,snapshot jsonb not null,feedback text,
 submitted_by uuid,reviewed_by uuid,recorded_at timestamptz not null default now()
);
create index supplier_review_history_supplier_idx on public.supplier_review_history(supplier_id,recorded_at desc);
alter table public.supplier_review_history enable row level security;
revoke all on public.supplier_review_history from anon,authenticated;
grant select,insert,delete on public.supplier_review_history to service_role;
create function public.record_supplier_review_history() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 insert into public.supplier_review_history(supplier_id,revision,state,declarations,snapshot,feedback,submitted_by,reviewed_by) values(new.supplier_id,new.revision,new.state,new.declarations,new.snapshot,new.feedback,new.submitted_by,new.reviewed_by);
 return new;
end;$$;
create trigger supplier_review_history after insert or update on public.supplier_reviews for each row execute function public.record_supplier_review_history();
revoke all on function public.record_supplier_review_history() from public,anon,authenticated;
insert into public.supplier_review_history(supplier_id,revision,state,declarations,snapshot,feedback,submitted_by,reviewed_by) select supplier_id,revision,state,declarations,snapshot,feedback,submitted_by,reviewed_by from public.supplier_reviews;
commit;
