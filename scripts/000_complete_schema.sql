-- Complete schema with all tables and columns

-- Create profiles table (user management)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  user_type text not null check (user_type in ('regular', 'rep')),
  display_name text,
  profile_image_url text,
  bio text,
  level text,
  program text,
  college text,
  matric_number text,
  department text,
  read_receipt_visibility boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create notices table
create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  author_id uuid not null references auth.users(id) on delete cascade,
  is_important boolean default false,
  is_featured boolean default false,
  view_count integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  expires_at timestamp with time zone
);

-- Create notice_media table for images, videos, files
create table if not exists public.notice_media (
  id uuid primary key default gen_random_uuid(),
  notice_id uuid not null references public.notices(id) on delete cascade,
  media_type text not null check (media_type in ('image', 'video', 'file')),
  media_url text not null,
  is_link boolean default false,
  created_at timestamp with time zone default now()
);

-- Create tags table
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamp with time zone default now()
);

-- Create notice_tags junction table
create table if not exists public.notice_tags (
  id uuid primary key default gen_random_uuid(),
  notice_id uuid not null references public.notices(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique(notice_id, tag_id)
);

-- Create reactions table
create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  notice_id uuid references public.notices(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  reaction_type text not null check (reaction_type in ('like', 'love', 'helpful')),
  created_at timestamp with time zone default now(),
  unique(user_id, notice_id, comment_id, reaction_type)
);

-- Create comments table
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  notice_id uuid not null references public.notices(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_comment_id uuid references public.comments(id) on delete cascade,
  content text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create saved_notices table
create table if not exists public.saved_notices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  notice_id uuid not null references public.notices(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique(user_id, notice_id)
);

-- Create notice_views table for tracking viewers
create table if not exists public.notice_views (
  id uuid primary key default gen_random_uuid(),
  notice_id uuid not null references public.notices(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  viewed_at timestamp with time zone default now()
);

-- Create notice_requests table for regular users requesting to post
create table if not exists public.notice_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  rep_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create notice_request_media table
create table if not exists public.notice_request_media (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.notice_requests(id) on delete cascade,
  media_type text not null check (media_type in ('image', 'video', 'file')),
  media_url text not null,
  created_at timestamp with time zone default now()
);

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.notices enable row level security;
alter table public.notice_media enable row level security;
alter table public.tags enable row level security;
alter table public.notice_tags enable row level security;
alter table public.reactions enable row level security;
alter table public.comments enable row level security;
alter table public.saved_notices enable row level security;
alter table public.notice_views enable row level security;
alter table public.notice_requests enable row level security;
alter table public.notice_request_media enable row level security;

-- Drop existing policies if they exist
drop policy if exists "profiles_select_public" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_delete_own" on public.profiles;
drop policy if exists "notices_select_all" on public.notices;
drop policy if exists "notices_insert_author" on public.notices;
drop policy if exists "notices_update_author" on public.notices;
drop policy if exists "notices_delete_author" on public.notices;
drop policy if exists "notice_media_select_all" on public.notice_media;
drop policy if exists "notice_media_insert_own_notice" on public.notice_media;
drop policy if exists "notice_media_delete_own_notice" on public.notice_media;
drop policy if exists "tags_select_all" on public.tags;
drop policy if exists "tags_insert_admin" on public.tags;
drop policy if exists "notice_tags_select_all" on public.notice_tags;
drop policy if exists "notice_tags_insert_own_notice" on public.notice_tags;
drop policy if exists "reactions_select_all" on public.reactions;
drop policy if exists "reactions_insert_own" on public.reactions;
drop policy if exists "reactions_delete_own" on public.reactions;
drop policy if exists "comments_select_all" on public.comments;
drop policy if exists "comments_insert_own" on public.comments;
drop policy if exists "comments_update_own" on public.comments;
drop policy if exists "comments_delete_own" on public.comments;
drop policy if exists "saved_notices_select_own" on public.saved_notices;
drop policy if exists "saved_notices_insert_own" on public.saved_notices;
drop policy if exists "saved_notices_delete_own" on public.saved_notices;
drop policy if exists "notice_views_select_own_notice" on public.notice_views;
drop policy if exists "notice_views_insert_tracked" on public.notice_views;

-- RLS Policies for profiles
create policy "profiles_select_public" on public.profiles for select using (true);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_delete_own" on public.profiles for delete using (auth.uid() = id);

-- RLS Policies for notices
create policy "notices_select_all" on public.notices for select using (true);
create policy "notices_insert_author" on public.notices for insert with check (auth.uid() = author_id);
create policy "notices_update_author" on public.notices for update using (auth.uid() = author_id);
create policy "notices_delete_author" on public.notices for delete using (auth.uid() = author_id);

-- RLS Policies for notice_media
create policy "notice_media_select_all" on public.notice_media for select using (true);
create policy "notice_media_insert_own_notice" on public.notice_media for insert 
  with check (notice_id in (select id from public.notices where author_id = auth.uid()));
create policy "notice_media_delete_own_notice" on public.notice_media for delete 
  using (notice_id in (select id from public.notices where author_id = auth.uid()));

-- RLS Policies for tags
create policy "tags_select_all" on public.tags for select using (true);
create policy "tags_insert_public" on public.tags for insert with check (auth.uid() is not null);

-- RLS Policies for notice_tags
create policy "notice_tags_select_all" on public.notice_tags for select using (true);
create policy "notice_tags_insert_own_notice" on public.notice_tags for insert 
  with check (notice_id in (select id from public.notices where author_id = auth.uid()));

-- RLS Policies for reactions
create policy "reactions_select_all" on public.reactions for select using (true);
create policy "reactions_insert_own" on public.reactions for insert with check (auth.uid() = user_id);
create policy "reactions_delete_own" on public.reactions for delete using (auth.uid() = user_id);

-- RLS Policies for comments
create policy "comments_select_all" on public.comments for select using (true);
create policy "comments_insert_own" on public.comments for insert with check (auth.uid() = user_id);
create policy "comments_update_own" on public.comments for update using (auth.uid() = user_id);
create policy "comments_delete_own" on public.comments for delete using (auth.uid() = user_id);

-- RLS Policies for saved_notices
create policy "saved_notices_select_own" on public.saved_notices for select using (auth.uid() = user_id);
create policy "saved_notices_insert_own" on public.saved_notices for insert with check (auth.uid() = user_id);
create policy "saved_notices_delete_own" on public.saved_notices for delete using (auth.uid() = user_id);

-- RLS Policies for notice_views
create policy "notice_views_select_own_notice" on public.notice_views for select 
  using (
    (notice_id in (select id from public.notices where author_id = auth.uid())) or
    (user_id = auth.uid() and user_id is not null)
  );
create policy "notice_views_insert_tracked" on public.notice_views for insert with check (true);

-- RLS Policies for notice_requests
create policy "notice_requests_select_own_or_rep" on public.notice_requests for select 
  using (auth.uid() = requester_id or auth.uid() = rep_id);
create policy "notice_requests_insert_own" on public.notice_requests for insert 
  with check (auth.uid() = requester_id);
create policy "notice_requests_update_rep" on public.notice_requests for update 
  using (auth.uid() = rep_id);

-- RLS Policies for notice_request_media
create policy "notice_request_media_select" on public.notice_request_media for select 
  using (
    request_id in (
      select id from public.notice_requests 
      where auth.uid() = requester_id or auth.uid() = rep_id
    )
  );
create policy "notice_request_media_insert" on public.notice_request_media for insert 
  with check (
    request_id in (
      select id from public.notice_requests 
      where auth.uid() = requester_id
    )
  );
