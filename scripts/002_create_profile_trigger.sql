-- Updated trigger to include all school fields
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id, 
    email, 
    display_name,
    user_type,
    level,
    program,
    college,
    matric_number,
    department
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.email),
    coalesce(new.raw_user_meta_data ->> 'user_type', 'regular'),
    new.raw_user_meta_data ->> 'level',
    new.raw_user_meta_data ->> 'program',
    new.raw_user_meta_data ->> 'college',
    new.raw_user_meta_data ->> 'matric_number',
    new.raw_user_meta_data ->> 'department'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
