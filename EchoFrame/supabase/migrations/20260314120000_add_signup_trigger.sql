-- Public function for user creation during signup
-- Uses SECURITY DEFINER to bypass RLS checks
create or replace function public.create_user_profile(
  user_id uuid,
  user_username text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, username, created_at)
  values (user_id, user_username, now())
  on conflict (id) do nothing;
end;
$$;

-- Grant execute permission to anon and authenticated users
grant execute on function public.create_user_profile(uuid, text) to anon, authenticated;
