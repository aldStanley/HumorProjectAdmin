"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function PromoteButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function promote() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/profiles/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Could not update access.");
      setConfirm(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update access.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="role-control">
      {!confirm ? (
        <button className="secondary" onClick={() => setConfirm(true)}>
          Make superadmin ↗
        </button>
      ) : (
        <div className="role-confirm">
          <strong>Give {name} full admin access?</strong>
          <p>
            They will be able to manage media, generation settings, signup
            rules, and grant superadmin access to other users.
          </p>
          <code>{id}</code>
          <div className="editor-actions">
            <button className="primary" disabled={busy} onClick={promote}>
              {busy ? "Granting…" : "Confirm promotion"}
            </button>
            <button
              className="secondary"
              disabled={busy}
              onClick={() => {
                setConfirm(false);
                setError("");
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
