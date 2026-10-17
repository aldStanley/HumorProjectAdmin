import "server-only";
import { requireAdmin } from "./access";
export type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  is_superadmin: boolean;
  created_at: string;
  updated_at: string;
};
export type Media = {
  id: string;
  text: string;
  picture: string;
  image_id: string | null;
  caption_source: string;
  created_at: string;
  caption_images: {
    description: string | null;
    user_id: string;
    status: string;
  } | null;
  url?: string | null;
};
export function pageNumber(value?: string) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? Math.min(n, 100000) : 1;
}
export function date(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  }).format(new Date(value));
}
export async function mediaPage(page: number, query: string, source: string) {
  const { client } = await requireAdmin();
  let request = client
    .from("jokes")
    .select(
      "id,text,picture,image_id,caption_source,created_at,caption_images(description,user_id,status)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .order("id");
  if (query)
    request = request.ilike("text", `%${query.replace(/[%_\\]/g, "")}%`);
  if (["ai", "human", "unknown"].includes(source))
    request = request.eq("caption_source", source);
  const { data, error, count } = await request.range(
    (page - 1) * 12,
    page * 12 - 1,
  );
  if (error) throw error;
  const rows = (data ?? []) as unknown as Media[];
  const paths = [
    ...new Set(rows.filter((x) => x.image_id).map((x) => x.picture)),
  ];
  const urls = paths.length
    ? await client.storage.from("caption-images").createSignedUrls(paths, 300)
    : null;
  const map = new Map(urls?.data?.map((x) => [x.path, x.signedUrl]) ?? []);
  return {
    rows: rows.map((x) => ({
      ...x,
      url: x.image_id
        ? map.get(x.picture)
        : x.picture.startsWith("/jokes/")
          ? `https://humor-project-hello-world-eta.vercel.app${x.picture}`
          : x.picture,
    })),
    count: count ?? 0,
  };
}
