import Link from "next/link";
import { Navigation } from "@/app/navigation";
import { requireAdmin } from "@/lib/access";
export const dynamic = "force-dynamic";
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireAdmin();
  return (
    <div className="shell">
      <aside>
        <Link className="brand" href="/">
          <b className="brand-symbol">c.</b>
          <span>
            CAPTION LAB<small>CONTROL ROOM</small>
          </span>
        </Link>

        <Navigation />
        <div className="aside-bottom">
          <div className="secure-tag">● SUPERADMIN ACCESS</div>
          <p>{user.email}</p>
          <form action="/auth/signout" method="post">
            <button className="text-button">Sign out ↗</button>
          </form>
        </div>
      </aside>
      <div className="main-area">
        <header>
          <span>
            THE HUMOR PROJECT <b>/</b> ADMINISTRATION
          </span>
          <span className="live-dot">Live database</span>
        </header>
        {children}
        <footer>
          MADE FOR A BETTER PUNCHLINE. <span>CAPTION LAB / ADMIN</span>
        </footer>
      </div>
    </div>
  );
}
