"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Media } from "@/lib/data";
export function MediaEditor({ media }: { media?: Media }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [caption, setCaption] = useState(media?.text ?? "");
  const [description, setDescription] = useState(
    media?.caption_images?.description ?? "",
  );
  const [source, setSource] = useState(media?.caption_source ?? "ai");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  async function generate() {
    setBusy("generate");
    setMessage("");
    try {
      const form = new FormData(formRef.current!);
      const response = await fetch("/api/generate", {
        method: "POST",
        body: form,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setDescription(data.description);
      setSuggestions(data.captions);
      setCaption(data.captions[0]);
      setSource("ai");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setBusy("");
    }
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("save");
    setMessage("");
    try {
      const response = await fetch(
        "/api/media",
        media
          ? {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: media.id,
                caption,
                description,
                source,
              }),
            }
          : { method: "POST", body: new FormData(event.currentTarget) },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setMessage(media ? "Changes saved." : "Published to the caption board.");
      if (!media) {
        setCaption("");
        setDescription("");
        setSuggestions([]);
        formRef.current?.reset();
        router.push("/media");
      }
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy("");
    }
  }
  async function remove() {
    setBusy("delete");
    setMessage("");
    try {
      const response = await fetch("/api/media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: media?.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (data.warning) alert(data.warning);
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusy("");
      setConfirm(false);
    }
  }
  return (
    <form ref={formRef} onSubmit={save} className="editor">
      {!media && (
        <>
          <label>
            Photo
            <input
              name="file"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required
              disabled={!!busy}
            />
            <small>JPG, PNG, or WebP · Up to 3 MB</small>
          </label>
          <button
            className="secondary"
            type="button"
            onClick={generate}
            disabled={!!busy}
          >
            {busy === "generate"
              ? "Writing three punchlines…"
              : "✦ Generate AI captions"}
          </button>
          <p className="fine-print">
            Generate from a photo, or import a caption you’ve already made.
          </p>
        </>
      )}
      {suggestions.length > 0 && (
        <div className="suggestions">
          {suggestions.map((s, i) => (
            <button
              key={s}
              type="button"
              className={caption === s ? "selected" : ""}
              onClick={() => {
                setCaption(s);
                setSource("ai");
              }}
            >
              0{i + 1} · {s}
            </button>
          ))}
        </div>
      )}
      <label>
        Caption
        <textarea
          name="caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          maxLength={240}
          required
          rows={3}
          disabled={!!busy}
        />
        <small>{caption.length}/240</small>
      </label>
      <label>
        Image description
        <textarea
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={4000}
          required
          rows={3}
          disabled={!!busy}
        />
      </label>
      <label>
        Caption source
        <select
          name="source"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          disabled={!!busy}
        >
          <option value="ai">AI-generated</option>
          <option value="human">Human-written</option>
          <option value="unknown">Unattributed</option>
        </select>
      </label>
      <div className="editor-actions">
        <button className="primary" disabled={!!busy}>
          {busy === "save"
            ? "Saving…"
            : media
              ? "Save changes"
              : "Publish media ↗"}
        </button>
        {media && (
          <button
            className="danger-text"
            type="button"
            onClick={() => setConfirm(true)}
            disabled={!!busy}
          >
            Delete media
          </button>
        )}
      </div>
      {confirm && (
        <div className="delete-confirm" role="alert">
          <b>Permanently delete this caption?</b>
          <p>
            Its board votes will also be deleted. If this is the last caption
            for the photo, the photo is removed too. Historical jury snapshots
            remain.
          </p>
          <button
            type="button"
            className="danger"
            disabled={!!busy}
            onClick={remove}
          >
            {busy === "delete" ? "Deleting…" : "Yes, delete permanently"}
          </button>
          <button
            type="button"
            className="secondary"
            disabled={!!busy}
            onClick={() => setConfirm(false)}
          >
            Cancel
          </button>
        </div>
      )}
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
    </form>
  );
}
