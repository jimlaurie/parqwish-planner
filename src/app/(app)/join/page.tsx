"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  auth,
  onAuthChanged,
  ensureAuth,
  signInWithApple,
  signInWithGoogle,
  sendMagicLink,
  isMagicLinkUrl,
  completeMagicLink,
  hasDurableIdentity,
} from "@/lib/auth";
import { getInvite, acceptInvite, startCollaboratorSync, type TripInvite } from "@/lib/wish-sync";
import { useAppStore } from "@/lib/store";

// ==================== LINK PARSING ====================

interface InviteLink {
  tripId: string;
  inviteId: string;
  secret: string;
}

/** Map common Firebase Auth error codes to a message that actually explains
 *  what happened, instead of a generic "try again" that hides whether this
 *  is a real problem (rate limit, email already used elsewhere) or just a
 *  transient failure. */
function describeAuthError(err: unknown, fallback: string): string {
  const code = err instanceof Error && "code" in err ? String((err as { code: unknown }).code) : "";
  switch (code) {
    case "auth/too-many-requests":
      return "Too many attempts with this email — wait a few minutes and try again.";
    case "auth/invalid-email":
      return "That doesn't look like a valid email address.";
    case "auth/email-already-in-use":
    case "auth/credential-already-in-use":
      return "That email is already linked to a different ParQwish account. Sign in with Apple or Google instead to keep this access.";
    case "auth/unauthorized-continue-uri":
      return "This domain isn't authorized for email sign-in yet — contact support.";
    case "auth/network-request-failed":
      return "Network error — check your connection and try again.";
    default:
      return fallback;
  }
}

function parseInviteHash(): InviteLink | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.replace(/^#/, "");
  const params = new URLSearchParams(hash);
  const tripId = params.get("trip");
  const inviteId = params.get("invite");
  const secret = params.get("secret");
  if (!tripId || !inviteId || !secret) return null;
  return { tripId, inviteId, secret };
}

// ==================== PAGE ====================

type Status =
  | "loading"
  | "need-link"
  | "choose-identity"
  | "email-sent"
  | "need-email-confirm"
  | "invalid"
  | "expired"
  | "ready"
  | "joining"
  | "joined"
  | "save-access"
  | "error";

export default function JoinPage() {
  const router = useRouter();
  const { setCloudSyncEnabled } = useAppStore();
  const [status, setStatus] = useState<Status>("loading");
  const [link, setLink] = useState<InviteLink | null>(null);
  const [invite, setInvite] = useState<TripInvite | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  // Parse the link once on mount, complete a magic-link return trip if
  // that's what brought us here, then track auth state going forward.
  useEffect(() => {
    const parsed = parseInviteHash();
    setLink(parsed);
    if (!parsed) {
      setStatus("need-link");
      return;
    }

    if (isMagicLinkUrl(window.location.href)) {
      // The link may be opened in a browser/device that never touched
      // Cloud Sync before (e.g. requested on one device, clicked from an
      // email app that opens a different browser) — every other identity
      // path on this page turns it on before signing in; this one has to
      // do it here since there's no button click to hang it off of.
      setCloudSyncEnabled(true);
      completeMagicLink(window.location.href)
        .then((user) => {
          if (!user) setStatus("need-email-confirm"); // opened on a different device
        })
        .catch(() => {
          setErrorMsg("That sign-in link didn't work — it may have expired.");
          setStatus("choose-identity");
        });
    }

    return onAuthChanged(async (user) => {
      if (!user) {
        setStatus((s) => (s === "need-email-confirm" ? s : "choose-identity"));
        return;
      }
      try {
        const found = await getInvite(parsed.tripId, parsed.inviteId);
        if (!found) {
          setStatus("invalid");
          return;
        }
        if (found.expiresAt < Date.now()) {
          setStatus("expired");
          return;
        }
        setInvite(found);
        // Pre-fill from the sign-in provider's profile if it supplied one
        // (Apple/Google often do; anonymous/email-link never do) — still
        // editable, and required either way before accepting.
        setName((prev) => prev || user.displayName || "");
        setStatus("ready");
      } catch {
        setStatus("error");
        setErrorMsg("Couldn't check this invite — check your connection and reload.");
      }
    });
  }, []);

  // ==================== IDENTITY HANDLERS ====================

  async function handleApple() {
    setBusy(true);
    setErrorMsg(null);
    setCloudSyncEnabled(true);
    try {
      await signInWithApple();
    } catch (err: unknown) {
      if (!(err instanceof Error && err.message.includes("popup-closed"))) {
        setErrorMsg("Sign in failed — please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    setErrorMsg(null);
    setCloudSyncEnabled(true);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      if (!(err instanceof Error && err.message.includes("popup-closed"))) {
        setErrorMsg("Sign in failed — please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleContinueWithoutAccount() {
    setBusy(true);
    setErrorMsg(null);
    setCloudSyncEnabled(true);
    try {
      await ensureAuth();
    } catch {
      setErrorMsg("Couldn't get started — please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSendMagicLink() {
    if (!email.trim()) return;
    setBusy(true);
    setErrorMsg(null);
    setCloudSyncEnabled(true);
    try {
      await sendMagicLink(email.trim(), window.location.href);
      setStatus("email-sent");
    } catch (err: unknown) {
      console.error("[join] sendMagicLink failed:", err);
      setErrorMsg(describeAuthError(err, "Couldn't send that link — check the address and try again."));
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmEmail() {
    if (!email.trim()) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      const user = await completeMagicLink(window.location.href, email.trim());
      if (!user) setErrorMsg("That didn't work — the link may have expired.");
      // else onAuthChanged picks up the new session
    } catch (err: unknown) {
      console.error("[join] completeMagicLink failed:", err);
      setErrorMsg(describeAuthError(err, "That didn't work — the link may have expired."));
    } finally {
      setBusy(false);
    }
  }

  // ==================== ACCEPT ====================

  async function handleAccept() {
    if (!link || !name.trim()) return;
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setStatus("joining");
    setErrorMsg(null);
    try {
      await acceptInvite(link.tripId, link.inviteId, link.secret, uid, name.trim());
      await startCollaboratorSync(); // pick up the newly-joined trip immediately
      if (hasDurableIdentity(auth.currentUser)) {
        setStatus("joined");
        setTimeout(() => router.push("/"), 1200);
      } else {
        // Anonymous access works, but is device-local and unrecoverable if
        // lost — offer a one-step upgrade before sending them off.
        setStatus("save-access");
      }
    } catch (err: unknown) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Couldn't join this trip — please try again.");
    }
  }

  const buttonBase =
    "w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-base font-semibold cursor-pointer transition-all duration-150 disabled:opacity-50 active:scale-[0.98]";
  // Inputs must be >=16px or iOS Safari zooms the whole page in on focus —
  // jarring on a small screen and part of what made this page feel broken
  // on mobile. text-base (16px) sidesteps that entirely.
  const inputBase =
    "w-full rounded-xl px-4 py-3.5 text-base outline-none border";

  return (
    <div
      className="max-w-md mx-auto px-5 pb-16 flex flex-col items-center text-center gap-5"
      style={{ paddingTop: "max(2.5rem, env(safe-area-inset-top))" }}
    >
      <div className="flex flex-col items-center gap-1">
        <div className="text-5xl">🏰</div>
        <p
          className="text-xs font-semibold tracking-widest uppercase"
          style={{ color: "var(--color-text-dim)" }}
        >
          ParQwish Planner
        </p>
      </div>

      {status === "loading" && (
        <div className="w-9 h-9 border-2 border-[var(--color-gold)] border-t-transparent rounded-full animate-spin" />
      )}

      {status === "need-link" && (
        <>
          <h1 className="text-2xl font-bold leading-snug" style={{ color: "var(--color-heading)" }}>
            Invalid invite link
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
            This link is missing or malformed. Ask whoever invited you to send a fresh one.
          </p>
        </>
      )}

      {status === "choose-identity" && (
        <>
          <h1 className="text-2xl font-bold leading-snug" style={{ color: "var(--color-heading)" }}>
            You&rsquo;ve been invited to plan a trip
          </h1>
          <p className="text-base leading-relaxed mb-1" style={{ color: "var(--color-text-muted)" }}>
            Sign in below to accept. Your data is encrypted on this device
            before it&rsquo;s ever uploaded.
          </p>

          {!showEmailForm ? (
            <div className="w-full flex flex-col gap-3.5">
              <button
                onClick={handleApple}
                disabled={busy}
                className={buttonBase}
                style={{ backgroundColor: "var(--color-text-primary)", color: "var(--color-bg-deep)" }}
              >
                <svg width="18" height="18" viewBox="0 0 814 1000" fill="currentColor">
                  <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-47.4-148.2-112.7C87.3 754.3 35 683.8 35 604.2c0-123.7 80.4-190.7 158.7-190.7 46.8 0 85.8 31.4 115.5 31.4 28.4 0 73.5-33.5 127-33.5 20.5 0 108.2 2 162.5 75.4zm-170.3-63.9c3.2-44.4 29.5-82.6 59.5-106.9 36.5-29.5 96.6-44.4 100.5-44.4-.6 4.5-3.8 37-21.8 71.9-18 34.9-62.2 77.8-138.2 79.4z"/>
                </svg>
                Sign in with Apple
              </button>
              <button
                onClick={handleGoogle}
                disabled={busy}
                className={buttonBase}
                style={{ backgroundColor: "var(--color-surface-raised)", color: "var(--color-text-primary)", border: "1px solid var(--color-border-input)" }}
              >
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34 5.1 29.3 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.7-.4-3.5z"/>
                  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34 5.1 29.3 3 24 3c-7.5 0-13.9 4.3-17.1 10.6z"/>
                  <path fill="#4CAF50" d="M24 45c5.2 0 9.9-2 13.4-5.3l-6.2-5.2C29.2 36.2 26.7 37 24 37c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.9 40.5 16.4 45 24 45z"/>
                  <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.1 5.7l6.2 5.2C40.5 36.3 43 30.6 43 24c0-1.4-.1-2.7-.4-3.5z"/>
                </svg>
                Continue with Google
              </button>
              <div>
                <button
                  onClick={handleContinueWithoutAccount}
                  disabled={busy}
                  className={buttonBase}
                  style={{ backgroundColor: "transparent", color: "var(--color-text-secondary)", border: "1px solid var(--color-border-input)" }}
                >
                  Continue without an account
                </button>
                <p className="text-sm mt-1.5" style={{ color: "var(--color-text-dim)" }}>
                  Quick, but only works on this device — you can add an email
                  to save your access later
                </p>
              </div>
              <button
                onClick={() => setShowEmailForm(true)}
                className="text-sm cursor-pointer mt-1 py-1"
                style={{ color: "var(--color-text-dim)" }}
              >
                or use your email instead
              </button>
            </div>
          ) : (
            <div className="w-full flex flex-col gap-3.5">
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputBase}
                style={{ backgroundColor: "var(--color-bg-deep)", color: "var(--color-text-primary)", borderColor: "var(--color-border-input)" }}
              />
              <button
                onClick={handleSendMagicLink}
                disabled={busy || !email.trim()}
                className={buttonBase}
                style={{ backgroundColor: "var(--color-gold)", color: "var(--color-bg-deep)" }}
              >
                {busy ? "Sending…" : "Email me a sign-in link"}
              </button>
              <button
                onClick={() => setShowEmailForm(false)}
                className="text-sm cursor-pointer py-1"
                style={{ color: "var(--color-text-dim)" }}
              >
                ← back
              </button>
            </div>
          )}

          {errorMsg && (
            <p className="text-sm leading-relaxed" style={{ color: "var(--color-error)" }}>{errorMsg}</p>
          )}
        </>
      )}

      {status === "email-sent" && (
        <>
          <div className="text-4xl">📬</div>
          <h1 className="text-2xl font-bold leading-snug" style={{ color: "var(--color-heading)" }}>
            Check your email
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
            We sent a sign-in link to <strong>{email}</strong>. Open it on this
            device to continue joining the trip.
          </p>
        </>
      )}

      {status === "need-email-confirm" && (
        <>
          <h1 className="text-2xl font-bold leading-snug" style={{ color: "var(--color-heading)" }}>
            Confirm your email
          </h1>
          <p className="text-base leading-relaxed mb-1" style={{ color: "var(--color-text-muted)" }}>
            This link was opened on a different device or browser than the one
            that requested it. Enter your email to finish signing in.
          </p>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputBase}
            style={{ backgroundColor: "var(--color-bg-deep)", color: "var(--color-text-primary)", borderColor: "var(--color-border-input)" }}
          />
          <button
            onClick={handleConfirmEmail}
            disabled={busy || !email.trim()}
            className={buttonBase}
            style={{ backgroundColor: "var(--color-gold)", color: "var(--color-bg-deep)" }}
          >
            {busy ? "Confirming…" : "Continue"}
          </button>
          {errorMsg && (
            <p className="text-sm leading-relaxed" style={{ color: "var(--color-error)" }}>{errorMsg}</p>
          )}
        </>
      )}

      {status === "invalid" && (
        <>
          <h1 className="text-2xl font-bold leading-snug" style={{ color: "var(--color-heading)" }}>
            This invite isn&rsquo;t valid
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
            It may have been revoked. Ask whoever invited you to send a fresh link.
          </p>
        </>
      )}

      {status === "expired" && (
        <>
          <h1 className="text-2xl font-bold leading-snug" style={{ color: "var(--color-heading)" }}>
            This invite has expired
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
            Invite links only last 48 hours. Ask whoever invited you to send a fresh one.
          </p>
        </>
      )}

      {status === "ready" && invite && (
        <>
          <h1 className="text-2xl font-bold leading-snug" style={{ color: "var(--color-heading)" }}>
            You&rsquo;ve been invited to plan a trip
          </h1>
          <p className="text-base leading-relaxed mb-1" style={{ color: "var(--color-text-muted)" }}>
            You&rsquo;ll join as {invite.role === "editor" ? "an editor — you can add, edit, and check off items" : "a viewer — you can see everything but can't make changes"}.
          </p>
          <div className="w-full text-left">
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-text-secondary)" }}>
              Your name
            </label>
            <input
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="So the other planners know who's who"
              className={inputBase}
              style={{ backgroundColor: "var(--color-bg-deep)", color: "var(--color-text-primary)", borderColor: "var(--color-border-input)" }}
            />
          </div>
          <button
            onClick={handleAccept}
            disabled={!name.trim()}
            className={buttonBase}
            style={{ backgroundColor: "var(--color-gold)", color: "var(--color-bg-deep)" }}
          >
            Accept & Join Trip
          </button>
        </>
      )}

      {status === "joining" && (
        <>
          <div className="w-9 h-9 border-2 border-[var(--color-gold)] border-t-transparent rounded-full animate-spin" />
          <p className="text-base" style={{ color: "var(--color-text-muted)" }}>Joining trip…</p>
        </>
      )}

      {status === "joined" && (
        <>
          <div className="text-4xl">✅</div>
          <p className="text-base leading-relaxed" style={{ color: "var(--color-text-primary)" }}>
            You&rsquo;re in! Taking you to your trips…
          </p>
        </>
      )}

      {status === "save-access" && (
        <>
          <div className="text-4xl">✅</div>
          <h1 className="text-2xl font-bold leading-snug" style={{ color: "var(--color-heading)" }}>
            You&rsquo;re in!
          </h1>
          <p className="text-base leading-relaxed mb-1" style={{ color: "var(--color-text-muted)" }}>
            You joined without an account, so this access only lives on this
            browser — clearing your data or switching devices will lose it.
            Add an email to make it recoverable (optional).
          </p>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputBase}
            style={{ backgroundColor: "var(--color-bg-deep)", color: "var(--color-text-primary)", borderColor: "var(--color-border-input)" }}
          />
          <button
            onClick={handleSendMagicLink}
            disabled={busy || !email.trim()}
            className={buttonBase}
            style={{ backgroundColor: "var(--color-gold)", color: "var(--color-bg-deep)" }}
          >
            {busy ? "Sending…" : "Save my access"}
          </button>
          <button
            onClick={() => router.push("/")}
            className="text-sm cursor-pointer py-1"
            style={{ color: "var(--color-text-dim)" }}
          >
            Skip for now
          </button>
          {errorMsg && (
            <p className="text-sm leading-relaxed" style={{ color: "var(--color-error)" }}>{errorMsg}</p>
          )}
        </>
      )}

      {status === "error" && (
        <>
          <h1 className="text-2xl font-bold leading-snug" style={{ color: "var(--color-heading)" }}>
            Something went wrong
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
            {errorMsg ?? "Please try again."}
          </p>
        </>
      )}
    </div>
  );
}
