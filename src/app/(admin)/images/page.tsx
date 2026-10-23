import Link from "next/link";
import { requireAdmin } from "@/lib/access";
import { pageNumber, date } from "@/lib/data";
import { Pagination } from "@/app/pagination";
import { ImageEditor } from "./image-editor";
type ImageRow = {
  id: string;
  user_id: string;
  storage_path: string;
  description: string | null;
  status: string;
  created_at: string;
  jokes: { count: number }[];
};
export default async function Images({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    create?: string;
    status?: string;
  }>;
}) {
  const { client } = await requireAdmin();
  const p = await searchParams;
  const page = pageNumber(p.page);
  const q = (p.q ?? "").slice(0, 100);
  const status = p.status ?? "";
  let request = client
    .from("caption_images")
    .select(
      "id,user_id,storage_path,description,status,created_at,jokes(count)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .order("id");
  if (q)
    request = request.ilike("description", `%${q.replace(/[%_\\]/g, "")}%`);
  if (["ready", "processing", "failed"].includes(status))
    request = request.eq("status", status);
  const { data, count, error } = await request.range(
    (page - 1) * 12,
    page * 12 - 1,
  );
  if (error) throw error;
  const rows = (data ?? []) as unknown as ImageRow[];
  const urls = rows.length
    ? await client.storage.from("caption-images").createSignedUrls(
        rows.map((r) => r.storage_path),
        300,
      )
    : null;
  const urlMap = new Map(urls?.data?.map((x) => [x.path, x.signedUrl]));
  return (
    <main>
      <div className="page-heading">
        <div>
          <div className="eyebrow">THE ORIGINALS</div>
          <h1>Every image, in view.</h1>
          <p>
            Upload, inspect, replace, and remove image files, including
            unpublished drafts. Caption text lives in Media library.
          </p>
        </div>
        <Link className="primary" href="/images?create=1">
          ＋ Upload image
        </Link>
      </div>
      {p.create === "1" && (
        <section className="panel create-panel">
          <div className="panel-heading">
            <h2>A new original.</h2>
            <Link href="/images">Close ×</Link>
          </div>
          <ImageEditor />
        </section>
      )}
      <form className="filters">
        <label>
          Search descriptions
          <input
            name="q"
            defaultValue={q}
            maxLength={100}
            placeholder="Find an image…"
          />
        </label>
        <label>
          Status
          <select name="status" defaultValue={status}>
            <option value="">All images</option>
            <option value="processing">Draft / processing</option>
            <option value="ready">Ready</option>
            <option value="failed">Failed</option>
          </select>
        </label>
        <button className="secondary">Filter images</button>
        <Link className="text-button" href="/images">
          Reset
        </Link>
      </form>
      <div className="media-grid">
        {rows.map((image) => (
          <article className="media-card" key={image.id}>
            <div className="media-photo">
              {urlMap.get(image.storage_path) ? (
                <img
                  src={urlMap.get(image.storage_path)!}
                  alt={image.description || "Uploaded image"}
                />
              ) : (
                <span>File unavailable</span>
              )}
              <span className="tag">
                {image.status === "processing"
                  ? "DRAFT / PROCESSING"
                  : image.status.toUpperCase()}
              </span>
            </div>
            <div className="media-content">
              <small>
                {date(image.created_at)} · {image.jokes[0]?.count ?? 0}{" "}
                caption(s)
              </small>
              <h2>
                {image.description?.slice(0, 140) || "No description yet"}
              </h2>
              <details>
                <summary>
                  Inspect &amp; edit
                  <span className="edit-chevron" aria-hidden="true">
                    ⌄
                  </span>
                </summary>
                <div className="record-meta">
                  <b>Image ID</b>
                  <code>{image.id}</code>
                  <b>Owner</b>
                  <code>{image.user_id}</code>
                  <b>Storage path</b>
                  <code>{image.storage_path}</code>
                </div>
                <ImageEditor
                  image={{
                    id: image.id,
                    description: image.description,
                    linked: image.jokes[0]?.count ?? 0,
                  }}
                />
              </details>
            </div>
          </article>
        ))}
      </div>
      {!rows.length && <div className="panel empty">No matching images.</div>}
      <Pagination
        page={page}
        count={count ?? 0}
        size={12}
        path="/images"
        params={{ q, status }}
      />
    </main>
  );
}
