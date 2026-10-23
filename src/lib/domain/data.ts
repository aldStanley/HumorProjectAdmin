import "server-only";
import { requireAdmin } from "@/lib/access";
import type { Resource, RecordRow, Choices } from "./resources";
export async function loadRecords(resource: Resource, page: number, q: string) {
  const { client } = await requireAdmin();
  let request = client
    .from(resource.table)
    .select(
      ["id", ...resource.fields.map((f) => f.key)]
        .filter((x, i, a) => a.indexOf(x) === i)
        .join(","),
      { count: "exact" },
    )
    .order(
      resource.order ??
        (resource.fields.some((f) => f.key === "created_at")
          ? "created_at"
          : "id"),
      { ascending: !!resource.order },
    )
    .order("id");
  if (q) {
    if (resource.titleKey === "id" || resource.titleKey.endsWith("_id")) {
      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          q,
        )
      )
        return { rows: [] as RecordRow[], count: 0 };
      request = request.eq(resource.titleKey, q);
    } else
      request = request.ilike(
        resource.titleKey,
        `%${q.replace(/[%_\\]/g, "")}%`,
      );
  }
  const { data, error, count } = await request.range(
    (page - 1) * 25,
    page * 25 - 1,
  );
  if (error) throw error;
  return { rows: (data ?? []) as unknown as RecordRow[], count: count ?? 0 };
}
export async function loadChoices(
  resource: Resource,
  rows: RecordRow[],
): Promise<Choices> {
  const { client } = await requireAdmin();
  const result: Choices = {};
  const relations = [
    ...new Set(
      resource.fields.filter((f) => f.relation).map((f) => f.relation!),
    ),
  ];
  await Promise.all(
    relations.map(async (table) => {
      const field = table === "caption_images" ? "description" : "name";
      const first = await client
        .from(table)
        .select(`id,${field}`)
        .order("id")
        .limit(500);
      if (first.error) throw first.error;
      let data = first.data ?? [];
      const present = new Set(data.map((r) => r.id));
      const missing = [
        ...new Set(
          resource.fields
            .filter((f) => f.relation === table)
            .flatMap((f) =>
              rows
                .map((r) => r[f.key])
                .filter(
                  (id): id is string =>
                    typeof id === "string" && !present.has(id),
                ),
            ),
        ),
      ];
      if (missing.length) {
        const more = await client
          .from(table)
          .select(`id,${field}`)
          .in("id", missing);
        if (more.error) throw more.error;
        data = data.concat(more.data ?? []);
      }
      result[table] = data.map((r) => ({
        value: r.id as string,
        label: `${String((r as unknown as Record<string, unknown>)[field] || "Untitled").slice(0, 90)} · ${String(r.id).slice(0, 8)}`,
      }));
    }),
  );
  return result;
}
