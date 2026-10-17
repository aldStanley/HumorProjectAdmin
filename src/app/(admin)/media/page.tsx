import Link from "next/link";
import { mediaPage, pageNumber, date } from "@/lib/data";
import { Pagination } from "@/app/pagination";
import { MediaEditor } from "./editor";
export default async function MediaLibrary({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    source?: string;
    create?: string;
  }>;
}) {
  const p = await searchParams;
  const page = pageNumber(p.page);
  const q = (p.q ?? "").slice(0, 100);
  const source = p.source ?? "";
  const { rows, count } = await mediaPage(page, q, source);
  return (
    <main>
      <div className="page-heading">
        <div>
          <div className="eyebrow">THE COLLECTION</div>
          <h1>A home for every punchline.</h1>
          <p>
            Create, inspect, edit, and remove the media on the public board.
          </p>
        </div>
        <Link href="/media?create=1" className="primary">
          ＋ New media
        </Link>
      </div>
      {p.create === "1" && (
        <section className="panel create-panel">
          <div className="panel-heading">
            <h2>Make something funny.</h2>
            <Link href="/media">Close ×</Link>
          </div>
          <MediaEditor />
        </section>
      )}
      <form className="filters">
        <label>
          Search captions
          <input
            name="q"
            defaultValue={q}
            maxLength={100}
            placeholder="Find a punchline…"
          />
        </label>
        <label>
          Source
          <select name="source" defaultValue={source}>
            <option value="">All sources</option>
            <option value="ai">AI-generated</option>
            <option value="human">Human-written</option>
            <option value="unknown">Unattributed</option>
          </select>
        </label>
        <button className="secondary">Filter library</button>
        <Link href="/media" className="text-button">
          Reset
        </Link>
      </form>
      <div className="media-grid">
        {rows.map((m) => (
          <article className="media-card" key={m.id}>
            <div className="media-photo">
              {m.url ? (
                <img
                  src={m.url}
                  alt={m.caption_images?.description ?? "Caption artwork"}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span>Photo unavailable</span>
              )}
              <span className="tag">
                {m.caption_source === "ai"
                  ? "AI-GENERATED"
                  : m.caption_source === "human"
                    ? "HUMAN-WRITTEN"
                    : "UNATTRIBUTED"}
              </span>
            </div>
            <div className="media-content">
              <small>{date(m.created_at)}</small>
              <h2>{m.text}</h2>
              <details>
                <summary>Inspect & edit ↗</summary>
                <div className="record-meta">
                  <b>Record</b>
                  <code>{m.id}</code>
                  {m.caption_images && (
                    <>
                      <b>Owner</b>
                      <code>{m.caption_images.user_id}</code>
                      <b>Status</b>
                      <span>{m.caption_images.status}</span>
                    </>
                  )}
                </div>
                <MediaEditor media={m} />
              </details>
            </div>
          </article>
        ))}
      </div>
      {!rows.length && (
        <div className="panel empty">
          No media found. Try another search or create the first one.
        </div>
      )}
      <Pagination
        page={page}
        count={count}
        size={12}
        path="/media"
        params={{ q, source }}
      />
    </main>
  );
}
