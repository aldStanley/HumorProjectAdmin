import { authorize, sameOrigin, apiError, AccessError } from "@/lib/access";
import {
  MAX_IMAGE_BYTES,
  UUID,
  imageExtension,
} from "@/lib/captions/validation";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const { client, user } = await authorize();
    sameOrigin(request);
    const form = await request.formData();
    const caption = String(form.get("caption") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    const source = String(form.get("source") ?? "ai");
    if (
      !caption ||
      caption.length > 240 ||
      !description ||
      description.length > 4000 ||
      !["ai", "human", "unknown"].includes(source)
    )
      throw new AccessError(
        400,
        "Enter a caption (1–240 characters), description (1–4000), and valid source.",
      );
    const file = form.get("file");
    if (!(file instanceof File) || !file.size || file.size > MAX_IMAGE_BYTES)
      throw new AccessError(400, "Choose a JPG, PNG, or WebP up to 3 MB.");
    const bytes = Buffer.from(await file.arrayBuffer());
    const extension = imageExtension(bytes, file.type);
    if (!extension) throw new AccessError(400, "The photo format is invalid.");
    const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
    const upload = await client.storage
      .from("caption-images")
      .upload(path, bytes, { contentType: file.type, upsert: false });
    if (upload.error) throw upload.error;
    const saved = await client.rpc("admin_save_media", {
      target_id: null,
      caption,
      image_description: description,
      file_path: path,
      source,
    });
    if (saved.error) {
      await client.storage.from("caption-images").remove([path]);
      throw saved.error;
    }
    return Response.json({ id: saved.data }, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
export async function PATCH(request: Request) {
  try {
    const { client } = await authorize();
    sameOrigin(request);
    let body;
    try {
      body = await request.json();
    } catch {
      throw new AccessError(400, "Invalid request.");
    }
    const { id, caption, description, source } = body;
    if (
      typeof id !== "string" ||
      !UUID.test(id) ||
      typeof caption !== "string" ||
      !caption.trim() ||
      caption.trim().length > 240 ||
      typeof description !== "string" ||
      !description.trim() ||
      description.trim().length > 4000 ||
      !["ai", "human", "unknown"].includes(source)
    )
      throw new AccessError(
        400,
        "Enter a valid caption, description, and source.",
      );
    const saved = await client.rpc("admin_save_media", {
      target_id: id,
      caption: caption.trim(),
      image_description: description.trim(),
      source,
    });
    if (saved.error) throw saved.error;
    return Response.json({ id: saved.data });
  } catch (e) {
    return apiError(e);
  }
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
    if (typeof body.id !== "string" || !UUID.test(body.id))
      throw new AccessError(400, "Invalid media ID.");
    const result = await client.rpc("admin_delete_media", {
      target_id: body.id,
    });
    if (result.error) throw result.error;
    let warning = "";
    if (result.data) {
      const removed = await client.storage
        .from("caption-images")
        .remove([result.data]);
      if (removed.error)
        warning =
          "Caption deleted. Storage cleanup failed; remove the unreferenced file in Supabase Storage.";
    }
    return Response.json({ ok: true, warning });
  } catch (e) {
    return apiError(e);
  }
}
