-- Create notice_requests table for regular users to request posting
create table if not exists public.notice_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  rep_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  response_message text
);

-- Create notice_request_media table for files attached to requests
create table if not exists public.notice_request_media (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.notice_requests(id) on delete cascade,
  media_type text not null check (media_type in ('image', 'video', 'file')),
  media_url text not null,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.notice_requests enable row level security;
alter table public.notice_request_media enable row level security;

-- RLS Policies for notice_requests
create policy "notice_requests_select_own_or_rep" on public.notice_requests for select 
  using (auth.uid() = requester_id or auth.uid() = rep_id);
create policy "notice_requests_insert_own" on public.notice_requests for insert 
  with check (auth.uid() = requester_id);
create policy "notice_requests_update_rep" on public.notice_requests for update 
  using (auth.uid() = rep_id);
create policy "notice_requests_delete_own" on public.notice_requests for delete 
  using (auth.uid() = requester_id);

-- RLS Policies for notice_request_media
create policy "notice_request_media_select_own" on public.notice_request_media for select 
  using (request_id in (select id from notice_requests where requester_id = auth.uid() or rep_id = auth.uid()));
create policy "notice_request_media_insert_own" on public.notice_request_media for insert 
  with check (request_id in (select id from notice_requests where requester_id = auth.uid()));
