import Link from "next/link";
import { notFound } from "next/navigation";
import { getResource, type Field, type Choices } from "@/lib/domain/resources";
import { loadRecords, loadChoices } from "@/lib/domain/data";
import { pageNumber } from "@/lib/data";
import { Pagination } from "@/app/pagination";
import { RecordEditor } from "./record-editor";
function display(value: unknown, field: Field | undefined, choices: Choices) {
  if (value === null || value === undefined || value === "") return "—";
  if (field?.type === "relation")
    return (
      choices[field.relation!]?.find((x) => x.value === value)?.label ??
      String(value)
    );
  if (typeof value === "boolean") return value ? "Enabled" : "Disabled";
  if (field?.type === "json") return JSON.stringify(value, null, 2);
  if (field?.key.endsWith("_at"))
    return new Date(String(value)).toLocaleString("en-US", {
      timeZone: "America/New_York",
    });
  return String(value);
}
export default async function ResourcePage({
  params,
  searchParams,
}: {
  params: Promise<{ resource: string }>;
  searchParams: Promise<{ page?: string; q?: string; create?: string }>;
}) {
  const slug = (await params).resource;
  const resource = getResource(slug);
  if (!resource) notFound();
  const p = await searchParams;
  const page = pageNumber(p.page);
  const q = (p.q ?? "").trim().slice(0, 150);
  const { rows, count } = await loadRecords(resource, page, q);
  const choices = await loadChoices(resource, rows);
  return (
    <main>
      <div className="page-heading">
        <div>
          <div className="eyebrow">DOMAIN CATALOG</div>
          <h1>{resource.title}</h1>
          <p>{resource.description}</p>
        </div>
        {resource.mode === "crud" ? (
          <Link className="primary" href={`/manage/${slug}?create=1`}>
            ＋ New {resource.singular.toLowerCase()}
          </Link>
        ) : (
          <span className="tag">
            {resource.mode === "update" ? "READ / UPDATE" : "READ ONLY"}
          </span>
        )}
      </div>
      {p.create === "1" && resource.mode === "crud" && (
        <section className="panel create-panel">
          <div className="panel-heading">
            <h2>New {resource.singular.toLowerCase()}</h2>
            <Link href={`/manage/${slug}`}>Close ×</Link>
          </div>
          <RecordEditor slug={slug} resource={resource} choices={choices} />
        </section>
      )}
      <form className="filters">
        <label>
          {resource.titleKey === "id" || resource.titleKey.endsWith("_id")
            ? "Find by exact ID"
            : "Search records"}
          <input
            name="q"
            defaultValue={q}
            maxLength={150}
            placeholder={
              resource.titleKey === "id" || resource.titleKey.endsWith("_id")
                ? "Paste the full record / chain ID…"
                : `Search ${resource.singular.toLowerCase()}…`
            }
          />
        </label>
        <button className="secondary">Search</button>
        <Link href={`/manage/${slug}`} className="text-button">
          Reset
        </Link>
      </form>
      <section className="panel table-panel">
        <div className="table-scroll">
          <table className="domain-table">
            <thead>
              <tr>
                {resource.columns.map((c) => (
                  <th key={c}>
                    {resource.fields.find((f) => f.key === c)?.label ?? c}
                  </th>
                ))}
                <th>Record</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  {resource.columns.map((c) => (
                    <td key={c}>
                      {display(
                        row[c],
                        resource.fields.find((f) => f.key === c),
                        choices,
                      )}
                    </td>
                  ))}
                  <td>
                    <details className="record-details">
                      <summary>
                        {resource.mode === "read"
                          ? "Inspect record"
                          : "Inspect & edit"}
                      </summary>
                      <div className="record-inspector">
                        <code>{row.id}</code>
                        <dl>
                          {resource.fields.map((f) => (
                            <div key={f.key}>
                              <dt>{f.label}</dt>
                              <dd>
                                {f.type === "json" || f.type === "textarea" ? (
                                  <pre>{display(row[f.key], f, choices)}</pre>
                                ) : f.key === "request_id" ? (
                                  <Link
                                    href={`/manage/requests?q=${row[f.key]}`}
                                  >
                                    {String(row[f.key])} ↗
                                  </Link>
                                ) : (
                                  display(row[f.key], f, choices)
                                )}
                              </dd>
                            </div>
                          ))}
                        </dl>
                        {resource.mode !== "read" && (
                          <RecordEditor
                            key={JSON.stringify(row)}
                            slug={slug}
                            resource={resource}
                            record={row}
                            choices={choices}
                          />
                        )}
                      </div>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <div className="empty">
            No {resource.title.toLowerCase()} found.
            {resource.mode === "crud" ? " Create a record to get started." : ""}
          </div>
        )}
        <Pagination
          page={page}
          count={count}
          size={25}
          path={`/manage/${slug}`}
          params={{ q }}
        />
      </section>
    </main>
  );
}
