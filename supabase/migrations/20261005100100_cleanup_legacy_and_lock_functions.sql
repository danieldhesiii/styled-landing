-- Remove helper functions left over from the replaced planner prototype. They
-- referenced public.weddings and were executable by anonymous callers.
drop function if exists public.couple_add_comment(uuid, text);
drop function if exists public.couple_approve(uuid);
drop function if exists public.couple_set_board(uuid, text);
drop function if exists public.get_couple_wedding(uuid);

-- is_staff() is only needed inside RLS policies evaluated for signed-in users.
revoke execute on function public.is_staff() from public, anon;
grant execute on function public.is_staff() to authenticated;
