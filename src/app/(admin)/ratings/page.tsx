import Link from "next/link";
import { requireAdmin } from "@/lib/access";
import { pageNumber, date } from "@/lib/data";
import { Pagination } from "@/app/pagination";
export default async function Ratings({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; kind?: string; value?: string }>;
}) {
  const p = await searchParams;
  const page = pageNumber(p.page);
  const jury = p.kind === "jury";
  const value = ["1", "-1"].includes(p.value ?? "") ? p.value! : "";
  const { client } = await requireAdmin();
  const request = jury
    ? client
        .from("jury_ballots")
        .select("round_day,user_id,pick_id,ratings,submitted_at", {
          count: "exact",
        })
        .order("submitted_at", { ascending: false })
        .order("user_id")
    : client
        .from("caption_votes")
        .select("caption_id,user_id,value,created_at,jokes(text)", {
          count: "exact",
        })
        .order("created_at", { ascending: false })
        .order("caption_id")
        .order("user_id");
  if (!jury && value) request.eq("value", Number(value));
  const { data, error, count } = await request.range(
    (page - 1) * 25,
    page * 25 - 1,
  );
  if (error) throw error;
  const ids = [...new Set((data ?? []).map((x) => x.user_id))];
  const profiles = ids.length
    ? await client
        .from("profiles")
        .select("id,first_name,last_name")
        .in("id", ids)
    : { data: [] };
  const names = new Map(
    profiles.data?.map((x) => [
      x.id,
      [x.first_name, x.last_name].filter(Boolean).join(" ") || x.id,
    ]),
  );
  return (
    <main>
      <div className="page-heading">
        <div>
          <div className="eyebrow">LISTEN TO THE ROOM</div>
          <h1>Every reaction counts.</h1>
          <p>
            Individual board votes and sealed daily jury picks. All times shown
            in Eastern time.
          </p>
        </div>
        <span className="tag">READ ONLY</span>
      </div>
      <div className="tabs">
        <Link className={!jury ? "selected" : ""} href="/ratings">
          Board votes
        </Link>
        <Link className={jury ? "selected" : ""} href="/ratings?kind=jury">
          Daily jury
        </Link>
      </div>
      {!jury && (
        <form className="filters">
          <label>
            Reaction
            <select name="value" defaultValue={value}>
              <option value="">All reactions</option>
              <option value="1">Funny (+1)</option>
              <option value="-1">Meh (−1)</option>
            </select>
          </label>
          <button className="secondary">Filter</button>
        </form>
      )}
      <section className="panel table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Voter</th>
                <th>{jury ? "Round / chosen caption" : "Caption"}</th>
                <th>{jury ? "Saved ratings" : "Reaction"}</th>
                <th>{jury ? "Sealed" : "First cast"}</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((row, i) => {
                const r = row as unknown as {
                  user_id: string;
                  caption_id?: string;
                  value?: number;
                  created_at?: string;
                  jokes?: { text: string };
                  round_day?: string;
                  pick_id?: string;
                  ratings?: Record<string, number>;
                  submitted_at?: string;
                };
                return (
                  <tr key={i}>
                    <td>
                      {names.get(r.user_id) ?? r.user_id}
                      <small className="subtext">{r.user_id}</small>
                    </td>
                    <td>
                      {jury ? (
                        <>
                          {r.round_day}
                          <small className="subtext">{r.pick_id}</small>
                        </>
                      ) : (
                        <>
                          {r.jokes?.text ?? "Unavailable caption"}
                          <small className="subtext">{r.caption_id}</small>
                        </>
                      )}
                    </td>
                    <td>
                      {jury ? (
                        <code>{JSON.stringify(r.ratings)}</code>
                      ) : (
                        <span className={`tag ${r.value === 1 ? "green" : ""}`}>
                          {r.value === 1 ? "↑ Funny +1" : "↓ Meh −1"}
                        </span>
                      )}
                    </td>
                    <td>{date(r.submitted_at ?? r.created_at!)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!data?.length && <div className="empty">No reactions here yet.</div>}
        <Pagination
          page={page}
          count={count ?? 0}
          size={25}
          path="/ratings"
          params={{ kind: jury ? "jury" : "board", value }}
        />
      </section>
    </main>
  );
}
