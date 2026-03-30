# Multi-College News & Events CMS

A production-oriented SMVEC CMS starter built with React, Vite, SCSS, React Router, Tiptap, Supabase, and Cloudflare R2.

## What is included

- Login-first flow with enforced college selection.
- Supabase-backed profile binding so each user is linked to one selected college.
- Staff dashboard with content stats, drafts, and quick create.
- Admin review queue with college filters, preview, approve, reject, revision, and publish actions.
- CMS-style post editor with title, slug, summary, featured image, Tiptap rich content, event metadata, categories, tags, and SEO.
- Live preview panel that mirrors the public post layout.
- Cloudflare R2 upload flow through a Supabase Edge Function, with media metadata stored in Supabase.
- Optional local Node.js + Cloudflare R2 upload server for debugging media issues before redeploying Edge Functions.
- Starter database schema, RLS policies, audit logs, and a `post_overview` view.

## Stack

- React 18 + Vite
- React Router
- SCSS
- React Hook Form
- Tiptap
- Supabase Auth, Postgres, Edge Functions
- Cloudflare R2

## Project structure

```text
src/
  components/
  context/
  lib/
  pages/
  router/
  services/
  styles/
supabase/
  functions/r2-upload/
  migrations/
```

## Setup

1. Install dependencies.

```bash
npm install
```

2. Create `.env` from `.env.example`.

```bash
Copy-Item .env.example .env
```

3. Fill in:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_APP_NAME`
- `VITE_SUPABASE_MEDIA_FUNCTION` set to `r2-upload`
- `VITE_MEDIA_PROVIDER` set to `r2` (use `r2-direct` for direct browser-to-R2 uploads)
- `VITE_SUPABASE_R2_SIGN_FUNCTION` set to `r2-sign-upload` (only for `r2-direct`)

4. Create a Supabase project.

5. Run the SQL in `supabase/migrations/20260319_initial_cms.sql` inside the Supabase SQL editor.

6. Create at least one Auth user in Supabase Authentication.

7. After the first login, update the user role in `public.profiles`:

```sql
update public.profiles
set role = 'admin'
where email = 'admin@yourcollege.edu';
```

All other users can stay as `staff`.

8. Create a Cloudflare R2 bucket and expose it through a public custom domain or public bucket URL.

9. In Supabase Edge Function secrets, add:

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_PUBLIC_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

10. Deploy the Edge Function. If your deployed name is `r2-upload`, keep `VITE_SUPABASE_MEDIA_FUNCTION=r2-upload`.

```bash
supabase functions deploy r2-upload
```

Optional for faster direct uploads (client -> R2):

```bash
supabase functions deploy r2-sign-upload
```

Then set:

- `VITE_MEDIA_PROVIDER=r2-direct`
- `VITE_SUPABASE_R2_SIGN_FUNCTION=r2-sign-upload`

11. Start the app:

```bash
npm run dev
```

## Temporary local upload backend

Use this when you want to debug image upload separately from Supabase Edge Functions.

1. Fill these root `.env` values:

- `VITE_MEDIA_UPLOAD_URL=http://localhost:4000/api/upload`
- `UPLOAD_SERVER_PORT=4000`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET` or `R2_BUCKET_NAME`
- `R2_PUBLIC_BASE_URL` or `R2_PUBLIC_URL`
- `R2_UPLOAD_FOLDER`

2. Start the local upload server in a second terminal:

```bash
npm run dev:upload-server
```

3. Start the frontend:

```bash
npm run dev
```

4. Test the server directly if needed:

Open `http://localhost:4000/api/health`

5. To switch back to Supabase uploads:

- Clear `VITE_MEDIA_UPLOAD_URL`
- Restart Vite

The frontend upload service checks `VITE_MEDIA_UPLOAD_URL` first. If it is set, uploads go only to the local Node.js server. If it is empty, uploads go back to Supabase.

## Editorial workflow

1. Sign in.
2. Choose one college.
3. Enter the dashboard.
4. Create a post from `New Post`.
5. Save draft or submit for approval.
6. Admin opens `Review Queue`.
7. Admin approves, rejects, requests revision, or publishes.

## Step-by-step after project creation

1. Install packages with `npm install`.
2. Create `.env` and add the two Vite Supabase values.
3. Run the SQL migration in Supabase.
4. Create your first admin user in Supabase Auth.
5. Sign in once so the profile row is created.
6. Promote that profile row to `admin`.
7. Configure Cloudflare R2 and the `r2-upload` function secrets.
8. Deploy the Edge Function.
9. Run `npm run dev` and verify login, college selection, post creation, and publishing.
10. Seed additional staff users and test cross-college approval behavior.

## Recommended next improvements

- Add a public-facing website that reads published posts only.
- Add revision history snapshots for `content_json`.
- Add image transformations and signed delivery URLs.
- Add notification emails when a post changes status.
- Add test coverage for services and route guards.
