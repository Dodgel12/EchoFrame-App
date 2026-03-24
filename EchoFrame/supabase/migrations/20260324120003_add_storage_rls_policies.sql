-- Storage RLS Policies for echoes bucket

-- Allow authenticated users to upload to their own folder
create policy "Users can upload their own echoes" on storage.objects for insert
  with check (
    bucket_id = 'echoes' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow public read access to all objects in echoes bucket
create policy "Public can read echoes" on storage.objects for select
  using (bucket_id = 'echoes');

-- Allow users to delete their own echoes
create policy "Users can delete their own echoes" on storage.objects for delete
  using (
    bucket_id = 'echoes' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
