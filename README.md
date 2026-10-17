# Caption Lab — Control Room

Week 6 admin area for the existing Caption Lab Supabase database. Separate GitHub repository and Vercel project: `aldStanley/HumorProjectAdmin` / `humorprojectadmin`.

## Features

- Live overview: exact profile, caption, vote and voter counts; funny share; 14-day reaction chart in Eastern time; AI/human reaction comparison; top five captions by net score; jury participation and unpublished-image count.
- Read profiles, search by name and paginate. No profile mutation or role editor.
- Create media from a photo with generated or imported captions; inspect, edit caption/description/source, and permanently delete with explicit confirmation. Removing a caption removes its board votes; removing the last caption for an image also removes its image row and storage object. Historical jury snapshots remain.
- Read individual funny/meh votes and sealed jury ballots, with reaction filtering and pagination. Ratings cannot be edited through the admin app.

## Access model

Google login uses the existing Supabase provider and same-origin PKCE callback. Every app route passes through `src/proxy.ts`, excluding only static framework assets and the public login/callback/signout endpoints. Unauthorized pages redirect to login; APIs return 401/403. Pages, the data layer, and each mutation independently verify the Supabase user and database superadmin flag. Responses are private/no-store.

The database independently enforces access through `is_superadmin()`, RLS, and guarded, transaction-safe RPCs. The helper checks the current profile flag, the account's Google provider, and the JWT provider. Ordinary users cannot update `is_superadmin`: the previous table-wide UPDATE grant is replaced with grants on the original editable profile columns. No service-role key is used or needed by the app.

## Setup

1. `npm ci` and copy `.env.example` to `.env.local`. Use the **same** Supabase URL/publishable key as the media app. Set the server-only Gemini key to enable caption generation.
2. Apply `supabase/migrations/20261017000100_admin.sql` once, after the media app's migrations. Do not rerun its policy creation statements.
3. Bootstrap your own existing Google profile directly in the trusted Supabase SQL Editor:

   ```sql
   update public.profiles p set is_superadmin = true
   from auth.users u
   where p.id = u.id and u.email = 'YOUR_APPROVED_GOOGLE_EMAIL'
     and u.raw_app_meta_data->>'provider' = 'google'
   returning p.id, p.is_superadmin;
   ```

   This answers the assignment's lockout question: use the database owner's existing dashboard access for a one-time grant. Never add a public bootstrap endpoint, grant the role to the first visitor, or trust editable user metadata. To revoke access, set that same field false in SQL Editor.
4. Add Supabase Auth redirect URLs without removing the media app's entries:
   - `http://localhost:3001/auth/callback`
   - `https://humorprojectadmin-indol.vercel.app/auth/callback`
   - `https://humorprojectadmin-*-aldstanleys-projects.vercel.app/auth/callback`
5. `npm run dev` starts on port 3001.
6. Configure the Vercel project as Next.js, root directory `.`. Supply the public Supabase variables and server-only Gemini key for Production and Preview. Disable Vercel Deployment Protection so Incognito visitors reach the application's own login wall.

## Verification

- `npm run build` checks compilation and TypeScript.
- Start the production build with `npm start`, then `npm test`. The HTTP suite checks every admin page, direct API requests, unknown routes, callback rejection, cross-origin signout, and public login rendering.
- Run `supabase/tests/admin_security.sql` in SQL Editor. Fixtures and mutations roll back. Tests cover anonymous/member denial, profile isolation, blocked self-promotion, preserved ordinary profile editing, admin create/read/update/delete, and Google-provider enforcement.
- Manual acceptance on the exact deployment URL: Google admin sign-in, profile/vote reads, create/edit/delete a disposable media record, sign out, and confirm Incognito redirects. A second, ordinary Google account must get the access-denied screen.

## Previous feedback

The user reported that last week's feedback was “the project looks awesome,” with no improvement requests. The existing media/rating application's behavior is preserved. This admin area extends the same product with oversight and data management.

Submit the immutable deployment URLs tied to the final commits of both applications, not moving production or branch aliases. See `SUBMISSION.md` for verified deployment details when available.

## Verification record — October 17, 2026

The admin migration was applied to the existing connected Supabase project through SQL Editor. `supabase/tests/admin_security.sql` passed there, including transactional CRUD and access checks, with all fixtures rolled back. The production build and 16 local HTTP access tests passed. Real-account bootstrap, exact deployed Google OAuth, and Incognito verification are recorded separately when complete.
