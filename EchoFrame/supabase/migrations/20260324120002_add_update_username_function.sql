-- Create a function to allow users to update their own username
create or replace function public.update_user_username(new_username text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  result json;
begin
  -- Get the current authenticated user
  current_user_id := auth.uid();
  
  if current_user_id is null then
    return json_build_object('success', false, 'message', 'Not authenticated');
  end if;
  
  -- Check if username already exists (excluding the current user)
  if exists(select 1 from public.users where username = new_username and id != current_user_id) then
    return json_build_object('success', false, 'message', 'Username already taken');
  end if;
  
  -- Update the username
  update public.users 
  set username = new_username 
  where id = current_user_id;
  
  return json_build_object('success', true, 'message', 'Username updated successfully', 'username', new_username);
end;
$$;

grant execute on function public.update_user_username(text) to authenticated;
