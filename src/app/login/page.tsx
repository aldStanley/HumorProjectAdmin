import { GoogleSignIn } from "./google-sign-in";
export const dynamic = "force-dynamic";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="login">
      <div className="login-brand">
        <b className="brand-symbol">c.</b> CAPTION LAB <span>/ ADMIN</span>
      </div>
      <div className="login-grid">
        <section>
          <div className="eyebrow">THE EDITORIAL DESK</div>
          <h1>
            Good humor.
            <br />
            <em>In good hands.</em>
          </h1>
          <p>
            A little oversight for a lot of punchlines.
            <br />
            Your private control room for the Caption Lab.
          </p>
          <div className="login-art" aria-hidden="true">
            <div>“</div>
            <span>
              KEEP THE
              <br />
              GOOD STUFF
              <br />
              <i>COMING.</i>
            </span>
            <b>↗</b>
          </div>
        </section>
        <section className="login-card">
          <div className="eyebrow">AUTHORIZED PERSONNEL ONLY</div>
          <h2>Welcome backstage.</h2>
          <p>Sign in with your approved Google account to manage the lab.</p>
          <GoogleSignIn />
          {error && (
            <div className="notice" role="alert">
              {error === "forbidden"
                ? "This account does not have superadmin access. Ask the database owner to approve your profile, or choose another Google account."
                : "Sign-in could not be completed. Please try again from this page."}
            </div>
          )}
          <div className="security-note">
            <span>◈</span>
            <p>
              Google authentication + database authorization.
              <br />
              Access requires <code>profiles.is_superadmin = true</code>.
            </p>
          </div>
          <form action="/auth/signout" method="post">
            <button className="text-button">
              Clear session / switch account
            </button>
          </form>
        </section>
      </div>
      <footer>
        CAPTION LAB CONTROL ROOM <span>PRIVATE BY DESIGN.</span>
      </footer>
    </main>
  );
}
