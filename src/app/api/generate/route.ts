import { authorize, sameOrigin, apiError, AccessError } from "@/lib/access";
import { generateCaptions } from "@/lib/captions/generate";
import { MAX_IMAGE_BYTES, imageExtension } from "@/lib/captions/validation";
export const maxDuration = 120;
export async function POST(request: Request) {
  try {
    await authorize();
    sameOrigin(request);
    if (!process.env.GEMINI_API_KEY)
      throw new AccessError(
        503,
        "AI generation is not configured. You can import an existing AI caption, or set the server-only GEMINI_API_KEY.",
      );
    const file = (await request.formData()).get("file");
    if (!(file instanceof File) || !file.size || file.size > MAX_IMAGE_BYTES)
      throw new AccessError(400, "Choose a JPG, PNG, or WebP up to 3 MB.");
    const bytes = Buffer.from(await file.arrayBuffer());
    if (!imageExtension(bytes, file.type))
      throw new AccessError(400, "Invalid photo format.");
    return Response.json(await generateCaptions(bytes, file.type));
  } catch (e) {
    return apiError(e);
  }
}
