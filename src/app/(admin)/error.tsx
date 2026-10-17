"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main>
      <div className="notice" role="alert">
        <h2>Couldn’t load the lab.</h2>
        <p>Check your connection and database migration, then try again.</p>
        <button className="primary" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}
