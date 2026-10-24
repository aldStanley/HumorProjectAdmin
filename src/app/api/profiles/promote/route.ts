import { authorize, sameOrigin, AccessError, apiError } from "@/lib/access";
import { UUID } from "@/lib/captions/validation";
export async function POST(request: Request) {
  try {
    const { client } = await authorize();
    sameOrigin(request);
    let body;
    try {
      body = await request.json();
    } catch {
      throw new AccessError(400, "Invalid JSON request.");
    }
    if (
      !body ||
      typeof body.id !== "string" ||
      !UUID.test(body.id) ||
      Object.keys(body).some((k) => k !== "id")
    )
      throw new AccessError(400, "Choose an existing profile.");
    const { data, error } = await client.rpc("admin_promote_superadmin", {
      target_id: body.id,
    });
    if (error) {
      if (error.code === "P0002")
        throw new AccessError(404, "This profile no longer exists.");
      if (error.code === "22023")
        throw new AccessError(
          400,
          "Only Google accounts can become superadmins.",
        );
      if (error.code === "42501")
        throw new AccessError(403, "Superadmin access is required.");
      throw error;
    }
    return Response.json({ id: data });
  } catch (e) {
    return apiError(e);
  }
}
