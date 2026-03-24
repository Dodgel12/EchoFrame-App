-- RLS Policies for EchoFrame Tables

-- Users table - allow public read, authenticated write own profile
create policy "Users are viewable by everyone" on public.users for select using (true);
create policy "Users can update own profile" on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
create policy "Users can insert own profile" on public.users for insert
  with check (auth.uid() = id);

-- Echoes table - allow public read of public echoes, authenticated create
create policy "Public echoes are viewable by everyone" on public.echoes for select
  using (visibility = 'public' or auth.uid() = user_id);
create policy "Authenticated users can create echoes" on public.echoes for insert
  with check (auth.uid() = user_id);
create policy "Users can update their own echoes" on public.echoes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Users can delete their own echoes" on public.echoes for delete
  using (auth.uid() = user_id);

-- Ratings table - allow authenticated users to rate
create policy "Ratings are viewable by everyone" on public.ratings for select using (true);
create policy "Authenticated users can create ratings" on public.ratings for insert
  with check (auth.uid() = user_id);
create policy "Users can update their own ratings" on public.ratings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Comments table - allow authenticated users to comment (phase 2)
create policy "Comments are viewable by everyone" on public.comments for select using (true);
create policy "Authenticated users can create comments" on public.comments for insert
  with check (auth.uid() = user_id);
create policy "Users can update their own comments" on public.comments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Users can delete their own comments" on public.comments for delete
  using (auth.uid() = user_id);

-- Messages table - allow messages between users (phase 2)
create policy "Users can read messages sent to them" on public.messages for select
  using (auth.uid() = receiver_id or auth.uid() = sender_id);
create policy "Authenticated users can send messages" on public.messages for insert
  with check (auth.uid() = sender_id);
create policy "Users can delete messages they sent" on public.messages for delete
  using (auth.uid() = sender_id);
