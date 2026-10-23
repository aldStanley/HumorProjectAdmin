import Link from "next/link";
import { requireAdmin } from "@/lib/access";
import { resources } from "@/lib/domain/resources";
export default async function Catalog() {
  await requireAdmin();
  return (
    <main>
      <div className="page-heading">
        <div>
          <div className="eyebrow">BEHIND THE GENERATION</div>
          <h1>The lab’s domain.</h1>
          <p>
            Inspect pipelines, curate the vocabulary, and manage the services
            behind every caption.
          </p>
        </div>
      </div>
      <div className="catalog-grid">
        {Object.entries(resources).map(([slug, r]) => (
          <Link
            href={`/manage/${slug}`}
            className="panel catalog-card"
            key={slug}
          >
            <span className="tag">
              {r.mode === "crud"
                ? "CREATE / READ / UPDATE / DELETE"
                : r.mode === "update"
                  ? "READ / UPDATE"
                  : "READ ONLY"}
            </span>
            <h2>{r.title} ↗</h2>
            <p>{r.description}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
