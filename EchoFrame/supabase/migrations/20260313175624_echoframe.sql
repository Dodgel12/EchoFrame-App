-- Enable the PostGIS extension (if not already enabled) in the extensions schema
-- The geography type is then available as extensions.geography
create extension if not exists postgis with schema extensions;

-- Users table
create table if not exists public.users (
  id uuid default gen_random_uuid() primary key,
  username text not null unique,
  avatar_url text,
  created_at timestamp with time zone default now() not null
);

-- Echoes table
create table if not exists public.echoes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  image_url text not null,
  latitude double precision,
  longitude double precision,
  -- Use schema-qualified geography type from the extensions schema
  location extensions.geography(point),
  timestamp timestamp with time zone default now() not null,
  visibility text default 'public' check (visibility in ('public', 'circle')),
  rating_score integer default 0,
  created_at timestamp with time zone default now() not null
);

-- Create a spatial index on the location column for efficient geo queries
create index if not exists echoes_location_idx on public.echoes using gist (location);

-- Ratings table
create table if not exists public.ratings (
  id bigint generated always as identity primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  echo_id uuid references public.echoes(id) on delete cascade not null,
  value smallint check (value in (1, -1)) not null,
  created_at timestamp with time zone default now() not null,
  unique(user_id, echo_id) -- Prevent duplicate ratings from the same user on the same echo
);

-- Comments table
create table if not exists public.comments (
  id bigint generated always as identity primary key,
  echo_id uuid references public.echoes(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default now() not null
);

-- Messages table
create table if not exists public.messages (
  id bigint generated always as identity primary key,
  sender_id uuid references public.users(id) on delete cascade not null,
  receiver_id uuid references public.users(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default now() not null
);

-- Enable Row Level Security on all tables
alter table public.users enable row level security;
alter table public.echoes enable row level security;
alter table public.ratings enable row level security;
alter table public.comments enable row level security;
alter table public.messages enable row level security;

-- Note: RLS policies are not included in this migration.
-- They should be added in a separate migration after defining the tables.