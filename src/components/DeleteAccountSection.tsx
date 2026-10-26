"use client";

/**
 * DeleteAccountSection — "Delete my account" at the foot of the Cloud Sync
 * panel (Play page), for an account someone signed in to: Apple (Cloud
 * Sync), or the Google or email-link sign-ins collaborators join trips with.
 * Not for an anonymous session: the Planner makes one silently while Cloud
 * Sync waits for a sign-in, and there's no account there to speak of.
 * Asks first, explains what goes and what stays, then runs
 * deleteMyAccount() (src/lib/account-deletion.ts).
 */

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { onAuthChanged } from "@/lib/auth";
import { AccountDeletionCancelled, deleteMyAccount, describeDeletion, signInKind } from "@/lib/account-deletion";

interface Props {
  /** Turns Cloud Sync off in the store once the account is gone */
  onDeleted: () => void;
}

type Stage = "idle" | "confirm" | "deleting" | "done";

export default function DeleteAccountSection({ onDeleted }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => onAuthChanged(setUser), []);

  const kind = signInKind(user);
  if (stage === "done") {
    return (
      <p role="status" className="text-xs mt-4" style={{ color: "var(--color-text-secondary)" }}>
        {message}
      </p>
    );
  }
  if (!user || kind === "anonymous") return null;

  async function handleDelete() {
    setStage("deleting");
    setError(null);
    try {
      const result = await deleteMyAccount(onDeleted);
      setMessage(describeDeletion(result, kind));
      setStage("done");
    } catch (err) {
      if (err instanceof AccountDeletionCancelled) { setStage("confirm"); return; }
      console.error("[DeleteAccountSection] Account deletion failed:", err);
      setError("Your account couldn't be deleted. Check your connection and try again, or email hello@parqwish.com.");
      setStage("confirm");
    }
  }

  const confirmStep = kind === "apple" ? "You'll be asked to sign in with Apple again to confirm."
    : kind === "google" ? "You'll be asked to sign in with Google again to confirm." : "";

  return (
    <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
      {stage === "idle" ? (
        <button
          onClick={() => setStage("confirm")}
          className="w-full py-2 rounded-xl text-xs cursor-pointer transition-colors hover:opacity-80"
          style={{ color: "var(--color-error)", backgroundColor: "transparent" }}
        >
          Delete my account
        </button>
      ) : (
        <div
          role="alertdialog"
          aria-labelledby="delete-account-title"
          className="rounded-xl p-3"
          style={{
            backgroundColor: "color-mix(in srgb, var(--color-error) 8%, transparent)",
            border: "1px solid color-mix(in srgb, var(--color-error) 35%, transparent)",
          }}
        >
          <p id="delete-account-title" className="text-xs font-semibold mb-1" style={{ color: "var(--color-error)" }}>
            Delete your ParQwish account?
          </p>
          <p className="text-xs mb-3" style={{ color: "var(--color-text-secondary)" }}>
            This deletes your account, everything it synced, and your place in shared trips: a trip
            you created passes to another member, or is deleted if you were the only one. The trips
            and wishes saved in this browser stay here. {confirmStep}
          </p>
          {error && (
            <p role="alert" className="text-xs mb-3" style={{ color: "var(--color-error)" }}>{error}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => { setStage("idle"); setError(null); }}
              disabled={stage === "deleting"}
              className="flex-1 py-2 rounded-xl text-xs cursor-pointer disabled:opacity-50"
              style={{ color: "var(--color-text-secondary)", backgroundColor: "var(--color-surface-raised)" }}
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={stage === "deleting"}
              className="flex-1 py-2 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
              style={{ color: "var(--color-bg-deep)", backgroundColor: "var(--color-error)" }}
            >
              {stage === "deleting" ? "Deleting…" : "Delete account"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
