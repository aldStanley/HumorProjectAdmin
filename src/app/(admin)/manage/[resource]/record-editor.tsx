"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Resource, RecordRow, Choices } from "@/lib/domain/resources";
export function RecordEditor({
  slug,
  resource,
  record,
  choices,
}: {
  slug: string;
  resource: Resource;
  record?: RecordRow;
  choices: Choices;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [confirm, setConfirm] = useState(false);
  async function send(method: string, values?: Record<string, unknown>) {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(`/api/manage/${slug}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: record?.id, values }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (!record) router.push(`/manage/${slug}`);
      else
        setNotice(method === "DELETE" ? "Record deleted." : "Changes saved.");
      setConfirm(false);
      router.refresh();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "The request failed.");
    } finally {
      setBusy(false);
    }
  }
  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const values: Record<string, unknown> = {};
    for (const f of resource.fields.filter((f) => !f.readonly))
      values[f.key] =
        f.type === "boolean"
          ? data.has(f.key)
          : f.type === "number"
            ? Number(data.get(f.key))
            : data.get(f.key);
    void send(record ? "PATCH" : "POST", values);
  }
  const fields = resource.fields.filter((f) => !f.readonly);
  return (
    <form className="editor domain-editor" onSubmit={save}>
      <fieldset disabled={busy}>
        {fields.map((f) => {
          const value = record?.[f.key];
          if (f.type === "boolean")
            return (
              <label className="check-field" key={f.key}>
                <input
                  name={f.key}
                  type="checkbox"
                  defaultChecked={typeof value === "boolean" ? value : true}
                />
                {f.label}
              </label>
            );
          return (
            <label key={f.key}>
              {f.label}
              {f.type === "textarea" ? (
                <textarea
                  name={f.key}
                  defaultValue={String(value ?? "")}
                  required={f.required}
                  maxLength={f.max}
                  rows={4}
                />
              ) : f.type === "relation" || f.type === "select" ? (
                <select
                  name={f.key}
                  defaultValue={String(value ?? "")}
                  required={f.required}
                >
                  <option value="">
                    {f.nullable ? "Any / none" : "Choose…"}
                  </option>
                  {(f.type === "relation"
                    ? (choices[f.relation!] ?? [])
                    : f.options!.map((x) => ({ value: x, label: x }))
                  ).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  name={f.key}
                  type={
                    f.type === "number"
                      ? "number"
                      : f.key === "email"
                        ? "email"
                        : "text"
                  }
                  defaultValue={String(
                    value ?? (f.type === "number" ? 100 : ""),
                  )}
                  min={f.type === "number" ? 0 : undefined}
                  max={f.type === "number" ? f.max : undefined}
                  step={f.type === "number" ? 1 : undefined}
                  maxLength={f.type !== "number" ? f.max : undefined}
                  required={f.required}
                />
              )}
            </label>
          );
        })}
      </fieldset>
      <div className="editor-actions">
        <button className="primary" disabled={busy}>
          {busy
            ? "Saving…"
            : record
              ? "Save changes"
              : `Create ${resource.singular.toLowerCase()}`}
        </button>
        {record && resource.mode === "crud" && (
          <button
            className="danger-text"
            type="button"
            disabled={busy}
            onClick={() => setConfirm(true)}
          >
            Delete record
          </button>
        )}
      </div>
      {confirm && (
        <div className="delete-confirm" role="alert">
          <b>Permanently delete this {resource.singular.toLowerCase()}?</b>
          <p>
            This cannot be undone. Referenced providers/models cannot be
            deleted. Signup-policy changes affect new registrations.
          </p>
          <button
            type="button"
            className="danger"
            disabled={busy}
            onClick={() => void send("DELETE")}
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
