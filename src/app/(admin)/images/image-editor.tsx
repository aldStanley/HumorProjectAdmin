"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function ImageEditor({
  image,
}: {
  image?: { id: string; description: string | null; linked: number };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [confirm, setConfirm] = useState(false);
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (image) form.set("id", image.id);
    setBusy(true);
    setNotice("");
    try {
      const r = await fetch("/api/images", {
        method: image ? "PATCH" : "POST",
        body: form,
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setNotice(data.warning || "Image saved.");
      if (!image) router.push("/images");
      router.refresh();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    setNotice("");
    try {
      const r = await fetch("/api/images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: image!.id }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setNotice(data.warning || "Image deleted.");
      setConfirm(false);
      router.refresh();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="editor" onSubmit={save}>
      <label>
        {image ? "Replace photo (optional)" : "Photo"}
        <input
          name="file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required={!image}
          disabled={busy}
        />
        <small>
          JPG, PNG, or WebP · Up to 3 MB.{" "}
          {image ? "Replacement also updates photos on linked captions." : ""}
        </small>
      </label>
      <label>
        Description
        <textarea
          name="description"
          defaultValue={image?.description ?? ""}
          maxLength={4000}
          rows={4}
          disabled={busy}
        />
      </label>
      <div className="editor-actions">
        <button className="primary" disabled={busy}>
          {busy ? "Saving…" : image ? "Save image" : "Upload image"}
        </button>
        {image && (
          <button
            type="button"
            className="danger-text"
            disabled={busy || image.linked > 0}
            onClick={() => setConfirm(true)}
          >
            Delete image
          </button>
        )}
      </div>
      {image && image.linked > 0 && (
        <p className="fine-print">
          Remove its {image.linked} linked caption(s) in Media library before
          deleting this image.
        </p>
      )}
      {confirm && (
        <div className="delete-confirm" role="alert">
          <b>Permanently delete this image and its file?</b>
          <p>
            This cannot be undone. Historical jury snapshots may show a photo
            fallback.
          </p>
          <button
            type="button"
            className="danger"
            disabled={busy}
            onClick={remove}
          >
            Delete permanently
          </button>
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={() => setConfirm(false)}
          >
            Cancel
          </button>
        </div>
      )}
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
    </form>
  );
}
