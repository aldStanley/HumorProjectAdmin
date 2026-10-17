import Link from "next/link";
import { requireAdmin } from "@/lib/access";
type Stats = {
  profiles: number;
  media: number;
  ai: number;
  human: number;
  up: number;
  down: number;
  voters: number;
  drafts: number;
  ballots: number;
  trend: { day: string; up: number; down: number }[];
  leaders: {
    id: string;
    text: string;
    up: number;
    down: number;
    score: number;
  }[];
  sources: { source: string; media: number; votes: number; up: number }[];
};
export default async function Overview() {
  const { client } = await requireAdmin();
  const { data, error } = await client.rpc("admin_statistics");
  if (error) throw error;
  const s = data as Stats;
  const votes = s.up + s.down;
  const rate = votes ? Math.round((s.up / votes) * 100) : 0;
  const max = Math.max(1, ...s.trend.map((d) => d.up + d.down));
  return (
    <main>
      <div className="page-heading">
        <div>
          <div className="eyebrow">THE BIG PICTURE</div>
          <h1>How’s the humor?</h1>
          <p>A pulse check on what’s making the lab laugh.</p>
        </div>
        <Link className="primary" href="/media">
          Manage media ↗
        </Link>
      </div>
      <section className="metrics">
        <article>
          <span>THE COLLECTION</span>
          <strong>{s.media.toLocaleString()}</strong>
          <p>
            published punchlines <b>↗</b>
          </p>
        </article>
        <article>
          <span>THE PEOPLE</span>
          <strong>{s.profiles.toLocaleString()}</strong>
          <p>
            profiles in the lab <b>♙</b>
          </p>
        </article>
        <article>
          <span>THE VERDICT</span>
          <strong>{votes.toLocaleString()}</strong>
          <p>
            board votes cast <b>↕</b>
          </p>
        </article>
        <article className="accent">
          <span>THE LAUGH RATE</span>
          <strong>{votes ? `${rate}%` : "—"}</strong>
          <p>
            {votes ? "of board votes are funny" : "waiting for the first vote"}{" "}
            <b>☺</b>
          </p>
        </article>
      </section>
      <div className="overview-grid">
        <section className="panel trend">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">AUDIENCE REACTION</div>
              <h2>Two weeks of laughs.</h2>
            </div>
            <span className="tag">14 DAYS · ET</span>
          </div>
          <div className="legend">
            <span>
              <i className="up" />
              Funny
            </span>
            <span>
              <i className="down" />
              Meh
            </span>
          </div>
          <div
            className="chart"
            role="img"
            aria-label={`Votes first created over the last 14 days, Eastern time. ${s.trend.map((x) => `${x.day}: ${x.up} funny, ${x.down} meh`).join("; ")}`}
          >
            {s.trend.map((d) => (
              <div
                className="chart-column"
                key={d.day}
                title={`${d.day}: ${d.up} funny / ${d.down} meh`}
              >
                <div className="bar-space">
                  <div
                    className="bar"
                    style={{ height: `${((d.up + d.down) / max) * 100}%` }}
                  >
                    <div className="bar-up" style={{ flex: d.up }} />
                    <div className="bar-down" style={{ flex: d.down }} />
                  </div>
                </div>
                <small>{d.day.slice(8)}</small>
              </div>
            ))}
          </div>
          <p className="fine-print">
            First vote date; current vote value. Switching a vote updates its
            original day.
          </p>
        </section>
        <section className="panel source-panel">
          <div className="eyebrow">THE TASTE TEST</div>
          <h2>AI vs. human.</h2>
          <p>Which punchlines get a warmer welcome?</p>
          {["ai", "human", "unknown"].map((source) => {
            const a = s.sources.find((x) => x.source === source);
            const percent = a?.votes
              ? Math.round((a.up / a.votes) * 100)
              : null;
            return (
              <div className="source-row" key={source}>
                <div>
                  <b>
                    {source === "ai"
                      ? "AI-generated"
                      : source === "human"
                        ? "Human-written"
                        : "Unattributed"}
                  </b>
                  <strong>{percent === null ? "—" : `${percent}%`}</strong>
                </div>
                <div className="meter">
                  <span style={{ width: `${percent ?? 0}%` }} />
                </div>
                <small>
                  {a?.media ?? 0} captions · {a?.votes ?? 0} votes · funny share
                </small>
              </div>
            );
          })}
          <p className="fine-print">
            Descriptive results, not a controlled experiment.
          </p>
        </section>
        <section className="panel leaders">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">CROWD FAVORITES</div>
              <h2>The ones that landed.</h2>
            </div>
            <Link href="/ratings">All ratings ↗</Link>
          </div>
          {s.leaders.length ? (
            s.leaders.map((j, i) => (
              <div className="leader" key={j.id}>
                <span className="rank">0{i + 1}</span>
                <p>
                  {j.text}
                  <small>
                    {j.up} funny · {j.down} meh
                  </small>
                </p>
                <b>
                  {j.score > 0 ? "+" : ""}
                  {j.score}
                  <small>NET SCORE</small>
                </b>
              </div>
            ))
          ) : (
            <div className="empty">
              No votes yet. The first laugh is still out there.
            </div>
          )}
        </section>
        <section className="panel notes">
          <div className="eyebrow">AROUND THE LAB</div>
          <h2>Behind the punchlines.</h2>
          <div>
            <strong>{s.voters}</strong>
            <p>distinct board voters</p>
          </div>
          <div>
            <strong>{s.ballots}</strong>
            <p>sealed daily jury ballots</p>
          </div>
          <div>
            <strong>{s.drafts}</strong>
            <p>images without published captions</p>
          </div>
          <Link href="/media">Open the media library ↗</Link>
        </section>
      </div>
    </main>
  );
}
