-- Private project-document storage for the LLM Application Routing Advisor.
-- Apply once in the Supabase SQL editor for project xlegwbkktgibzktaqpib.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'advisor-files',
  'advisor-files',
  false,
  8388608,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Advisor users upload their own project files" on storage.objects;
create policy "Advisor users upload their own project files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'advisor-files'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Advisor users read their own project files" on storage.objects;
create policy "Advisor users read their own project files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'advisor-files'
  and owner_id = (select auth.uid()::text)
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Advisor users delete their own project files" on storage.objects;
create policy "Advisor users delete their own project files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'advisor-files'
  and owner_id = (select auth.uid()::text)
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
