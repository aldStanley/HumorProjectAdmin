import { requireAdmin } from "@/lib/access";
import { pageNumber, date, type Profile } from "@/lib/data";
import { PromoteButton } from "./promote-button";
import { Pagination } from "@/app/pagination";
export default async function Profiles({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const params = await searchParams;
  const page = pageNumber(params.page);
  const q = (params.q ?? "").slice(0, 100);
  const { client } = await requireAdmin();
  let request = client
    .from("profiles")
    .select("id,first_name,last_name,is_superadmin,created_at,updated_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .order("id");
  if (q) {
    const safe = q.replace(/[^\p{L}\p{N} @.-]/gu, "");
    if (safe)
      request = request.or(
        `first_name.ilike.%${safe}%,last_name.ilike.%${safe}%`,
      );
  }
  const { data, error, count } = await request.range(
    (page - 1) * 25,
    page * 25 - 1,
  );
  if (error) throw error;
  return (
    <main>
      <div className="page-heading">
        <div>
          <div className="eyebrow">THE PEOPLE BEHIND THE PUNCHLINES</div>
          <h1>Good company.</h1>
          <p>
            Browse profiles and grant trusted Google users superadmin access.
          </p>
        </div>
        <span className="tag">ACCESS MANAGEMENT</span>
      </div>
      <form className="filters">
        <label>
          Find a person
          <input
            name="q"
            defaultValue={q}
            placeholder="First or last name…"
            maxLength={100}
          />
        </label>
        <button className="secondary">Search</button>
      </form>
      <section className="panel table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Person</th>
                <th>Profile ID</th>
                <th>Access</th>
                <th>Joined</th>
                <th>Updated</th>
                <th>Manage access</th>
              </tr>
            </thead>
            <tbody>
              {(data as Profile[]).map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="person">
                      <b>{(p.first_name?.[0] ?? "?").toUpperCase()}</b>
                      <span>
                        {[p.first_name, p.last_name]
                          .filter(Boolean)
                          .join(" ") || "Profile not completed"}
                      </span>
                    </div>
                  </td>
                  <td>
                    <code>{p.id}</code>
                  </td>
                  <td>
                    <span className={`tag ${p.is_superadmin ? "green" : ""}`}>
                      {p.is_superadmin ? "Superadmin" : "Member"}
                    </span>
                  </td>
                  <td>{date(p.created_at)}</td>
                  <td>{date(p.updated_at)}</td>
                  <td>
                    {p.is_superadmin ? (
                      <span className="subtext">Full admin access</span>
                    ) : (
                      <PromoteButton
                        id={p.id}
                        name={
                          [p.first_name, p.last_name]
                            .filter(Boolean)
                            .join(" ") || "this user"
                        }
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!data?.length && (
          <div className="empty">No profiles match your search.</div>
        )}
        <Pagination
          page={page}
          count={count ?? 0}
          size={25}
          path="/profiles"
          params={{ q }}
        />
      </section>
    </main>
  );
}
