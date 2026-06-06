-- tracker-images is a public bucket; objects are served via signed/public URLs created by
-- edge functions using service_role. The broad authenticated SELECT policy only enabled the
-- storage list/download API, letting any logged-in user enumerate ALL users' image paths
-- (security advisor 0025_public_bucket_allows_listing). The app never lists/downloads this
-- bucket via the authenticated client, so removing it closes the enumeration vector without
-- affecting image rendering. The service_role read + upload policies are retained.
drop policy if exists "Authenticated users can view tracker images" on storage.objects;
