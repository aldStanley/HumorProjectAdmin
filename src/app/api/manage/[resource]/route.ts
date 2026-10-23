import { authorize, sameOrigin, AccessError, apiError } from "@/lib/access";
import { getResource, validateFields } from "@/lib/domain/resources";
import { UUID } from "@/lib/captions/validation";
type Context = { params: Promise<{ resource: string }> };
async function mutate(
  request: Request,
  context: Context,
  method: "POST" | "PATCH" | "DELETE",
) {
  try {
    const { client } = await authorize();
    sameOrigin(request);
    const resource = getResource((await context.params).resource);
    if (!resource) throw new AccessError(404, "Unknown resource.");
    if (
      resource.mode === "read" ||
      (resource.mode === "update" && method !== "PATCH")
    )
      throw new AccessError(
        405,
        "This operation is not allowed for this resource.",
      );
    let body;
    try {
      body = await request.json();
    } catch {
      throw new AccessError(400, "Invalid JSON request.");
    }
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new AccessError(400, "Invalid request.");
    if (
      method !== "POST" &&
      (typeof body.id !== "string" || !UUID.test(body.id))
    )
      throw new AccessError(400, "Invalid record ID.");
    let values: Record<string, unknown> = {};
    if (method !== "DELETE") {
      try {
        values = validateFields(resource, body.values);
      } catch (e) {
        throw new AccessError(
          400,
          e instanceof Error ? e.message : "Invalid record.",
        );
      }
      if (resource.table === "prompt_chain_mix")
        values.updated_at = new Date().toISOString();
    }
    const query =
      method === "POST"
        ? client.from(resource.table).insert(values)
        : method === "PATCH"
          ? client.from(resource.table).update(values).eq("id", body.id)
          : client.from(resource.table).delete().eq("id", body.id);
    const result = await query.select("id").single();
    if (result.error) {
      if (result.error.code === "23503")
        throw new AccessError(
          409,
          "This record is referenced by other records, or a selected reference no longer exists. Remove those references first.",
        );
      if (result.error.code === "23505")
        throw new AccessError(
          409,
          "A record with these unique values already exists.",
        );
      if (result.error.code === "23514" || result.error.code === "23502")
        throw new AccessError(
          400,
          "The record does not satisfy the database field constraints.",
        );
      if (result.error.code === "PGRST116")
        throw new AccessError(
          404,
          "This record is no longer available. Refresh and retry.",
        );
      throw result.error;
    }
    return Response.json(
      { id: result.data.id },
      { status: method === "POST" ? 201 : 200 },
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(r: Request, c: Context) {
  return mutate(r, c, "POST");
}
export async function PATCH(r: Request, c: Context) {
  return mutate(r, c, "PATCH");
}
export async function DELETE(r: Request, c: Context) {
  return mutate(r, c, "DELETE");
}
