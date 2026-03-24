-- Create RPC function for getting nearby echoes using PostGIS
create or replace function get_nearby_echoes(
  user_lat double precision,
  user_lon double precision,
  radius_meters integer default 500
)
returns table (
  id uuid,
  user_id uuid,
  image_url text,
  latitude double precision,
  longitude double precision,
  "timestamp" timestamp with time zone,
  visibility text,
  rating_score integer,
  created_at timestamp with time zone,
  username text,
  avatar_url text
)
language sql
stable
as $$
  select
    e.id,
    e.user_id,
    e.image_url,
    e.latitude,
    e.longitude,
    e.timestamp,
    e.visibility,
    e.rating_score,
    e.created_at,
    u.username,
    u.avatar_url
  from public.echoes e
  join public.users u on e.user_id = u.id
  where e.visibility = 'public'
    and extensions.st_dwithin(e.location, extensions.st_point(user_lon, user_lat)::extensions.geography, radius_meters)
  order by
    e.rating_score desc,
    e.created_at desc
  limit 100;
$$;

-- Grant permissions
grant execute on function get_nearby_echoes(double precision, double precision, integer) to authenticated, anon;
