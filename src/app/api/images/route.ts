import { authorize, sameOrigin, AccessError, apiError } from "@/lib/access";
import {
  MAX_IMAGE_BYTES,
  imageExtension,
  UUID,
} from "@/lib/captions/validation";
export const maxDuration = 60;
async function save(request: Request, update: boolean) {
  try {
    const { client, user } = await authorize();
    sameOrigin(request);
    const form = await request.formData();
    const id = form.get("id");
    if (update && (typeof id !== "string" || !UUID.test(id)))
      throw new AccessError(400, "Invalid image ID.");
    const description = String(form.get("description") ?? "").trim();
    if (description.length > 4000)
      throw new AccessError(
        400,
        "Description must be at most 4000 characters.",
      );
    const file = form.get("file");
    let path: string | null = null;
    if (file instanceof File && file.size) {
      if (file.size > MAX_IMAGE_BYTES)
        throw new AccessError(400, "Choose an image up to 3 MB.");
      const bytes = Buffer.from(await file.arrayBuffer());
      const extension = imageExtension(bytes, file.type);
      if (!extension)
        throw new AccessError(400, "Choose a valid JPG, PNG, or WebP.");
      path = `${user.id}/${crypto.randomUUID()}.${extension}`;
      const upload = await client.storage
        .from("caption-images")
        .upload(path, bytes, { contentType: file.type, upsert: false });
      if (upload.error) throw upload.error;
    } else if (!update)
      throw new AccessError(400, "Choose a JPG, PNG, or WebP to upload.");
    const saved = await client.rpc("admin_save_image", {
      target_id: update ? id : null,
      image_description: description,
      new_path: path,
    });
    if (saved.error) {
      if (path) await client.storage.from("caption-images").remove([path]);
      throw saved.error;
    }
    let warning = "";
    if (saved.data.previous_path) {
      const cleanup = await client.storage
        .from("caption-images")
        .remove([saved.data.previous_path]);
      if (cleanup.error)
        warning =
          "Saved. The old unreferenced storage file still needs cleanup in Supabase Storage.";
    }
    return Response.json(
      { id: saved.data.id, warning },
      { status: update ? 200 : 201 },
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(r: Request) {
  return save(r, false);
}
export async function PATCH(r: Request) {
  return save(r, true);
}
export async function DELETE(request: Request) {
  try {
    const { client } = await authorize();
    sameOrigin(request);
    let body;
    try {
      body = await request.json();
    } catch {
      throw new AccessError(400, "Invalid request.");
    }
    if (!body || typeof body.id !== "string" || !UUID.test(body.id))
      throw new AccessError(400, "Invalid image ID.");
    const result = await client.rpc("admin_delete_image", {
      target_id: body.id,
    });
    if (result.error) {
      if (result.error.code === "23503")
        throw new AccessError(
          409,
          "This image has published captions. Remove them in Media library before deleting the image.",
        );
      throw result.error;
    }
    const cleanup = await client.storage
      .from("caption-images")
      .remove([result.data]);
    return Response.json({
      ok: true,
      warning: cleanup.error
        ? "Image record deleted. Its storage file still needs cleanup in Supabase Storage."
        : "",
    });
  } catch (e) {
    return apiError(e);
  }
}
