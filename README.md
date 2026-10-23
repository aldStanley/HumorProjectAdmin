# Caption Lab — Control Room

Admin area for the existing Caption Lab Supabase database. Separate GitHub repository and Vercel project: `aldStanley/HumorProjectAdmin` / `humorprojectadmin`.

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
2. Apply `supabase/migrations/20261017000100_admin.sql` once, after the media app's migrations, then `supabase/migrations/20261023000100_domain_model.sql`. Do not rerun migrations already applied.
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

The October 23 update is deployed for review only. No assignment submission is made by this update.

## Verification record — October 17, 2026

The admin migration was applied to the existing connected Supabase project through SQL Editor. `supabase/tests/admin_security.sql` passed there, including transactional CRUD and access checks, with all fixtures rolled back. The production build and 16 local HTTP access tests passed. Real-account bootstrap, exact deployed Google OAuth, and Incognito verification are recorded separately when complete.

## Expanded domain administration — October 23, 2026

The connected Caption Lab database originally had no prompt-chain, model, term, example, or signup-policy tables. The new migration adds these resources with RLS, rather than displaying placeholder data. It seeds the actual existing Gemini provider, model and two-step caption prompts; historical generation logs are not fabricated.

- Read prompt chains and ordered steps; inspect full prompts and related model names.
- Read/update prompt-chain mix weights and enabled state. Enabled positive weights control weighted routing for new generations **from this admin app**. All-zero/disabled mixes pause generation.
- Create/read/update/delete terms, generation examples, LLM models and providers, allowed signup domains, and whitelisted email addresses. Referenced records cannot be deleted. No provider credentials are stored in these tables or exposed in the UI.
- Read generation requests and per-step LLM responses, prompts, timing and usage. New admin generations are logged; older requests and generation in the separate media app do not gain historical logs.
- Terms and enabled examples provide context to the admin caption step. Examples can be global or tied to a chain.
- The current runner supports the existing Google Gemini endpoint. Other provider records can be managed, but selecting them for an active chain returns an explicit unsupported-provider error.
- Manage images separately, including private uploads (JPG/PNG/WebP, maximum 3 MB), description edits, replacement, viewing and deletion. Replacing a photo updates linked captions. Delete published captions in Media library before deleting their image. Storage cleanup failures are reported rather than hidden.
- Signup lists apply to **new registrations** in the shared Supabase project. With no enabled entries, signup keeps its previous open behavior. Once either list has enabled entries, an exact email match OR a domain match permits signup. Existing accounts and superadmin permissions are unaffected; allowed signup never grants admin access.

Every new page, API and database table keeps the Google + superadmin access requirement. Resource names and writable fields are allowlisted, mutation requests require same-origin checks, logs are read-only, and mix edits cannot change chain IDs.

Validation: `npm run build`; 53 tests in `npm test` against a running production build (47 HTTP access checks and 6 domain/generation tests); `supabase/tests/domain_security.sql` in SQL Editor for rolled-back CRUD, image lifecycle, logs, signup enforcement and anonymous/member/admin permission tests. Both database migrations and transactional domain tests passed on the connected database. The generation tests use mocked provider responses and incur no model charges.
