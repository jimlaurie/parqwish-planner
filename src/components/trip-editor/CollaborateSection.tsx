"use client";

// ==================== COLLABORATE ====================
// Who has access to the trip, and (for its owner) invite links and role
// changes. These act straight away rather than waiting for the page's Save.
// A new, unsaved trip can't have collaborators yet: invites need the trip to
// exist in Cloud Sync.

import { useEffect, useState } from "react";
import type { Trip } from "@/lib/db";
import type { TripMember, TripMemberRole } from "@shared/types/trip";
import { auth, canCollaborate } from "@/lib/auth";
import { createInvite, updateMemberRole, updateMemberDisplayName, removeMember } from "@/lib/wish-sync";
import { Section, labelClass } from "./fields";

const ROLE_LABEL: Record<TripMemberRole, string> = { owner: "👑 Owner", editor: "✏️ Editor", viewer: "👀 Viewer" };

function Notice({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="flex flex-col gap-2 items-center text-center py-4">
      <span className="text-3xl" aria-hidden>{icon}</span>
      <p className="text-sm font-medium" style={{ color: "var(--color-heading)" }}>{title}</p>
      <p className="text-xs max-w-sm" style={{ color: "var(--color-text-muted)" }}>{body}</p>
    </div>
  );
}

export default function CollaborateSection({ trip }: { trip: Trip | null }) {
  const user = auth.currentUser;
  let body: React.ReactNode;
  if (!trip) {
    body = <Notice icon="💾" title="Save the trip first to invite people"
                   body="Invites need the trip in Cloud Sync, which happens when you save it." />;
  } else if (!canCollaborate(user)) {
    body = <Notice icon="☁️" title="Sign in to invite collaborators"
                   body="Inviting someone to plan a trip together needs Cloud Sync turned on. Head to the Play page and sign in, then come back here." />;
  } else {
    // No members map yet = a solo trip that hasn't finished its first sync;
    // the local user is its de facto owner until createSharedTrip stamps it.
    const isOwner = !trip.members || trip.members[user!.uid]?.role === "owner";
    body = (
      <div className="flex flex-col gap-5">
        <Roster trip={trip} isOwnerView={isOwner} />
        {isOwner ? <InviteForm trip={trip} /> : (
          <p className="text-xs text-center" style={{ color: "var(--color-text-dim)" }}>
            Only the trip owner can invite people or change access.
          </p>
        )}
      </div>
    );
  }
  return <Section id="collaborate" icon={"\u{1F465}"} title="Collaborate">{body}</Section>;
}

// ==================== ROSTER ====================

function Roster({ trip, isOwnerView }: { trip: Trip; isOwnerView: boolean }) {
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmRemoveUid, setConfirmRemoveUid] = useState<string | null>(null);
  const [editingNameUid, setEditingNameUid] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  if (!trip.members) return null;

  const run = async (uid: string, action: () => Promise<void>, failure: string) => {
    setBusyUid(uid);
    setError(null);
    try { await action(); } catch { setError(failure); } finally { setBusyUid(null); }
  };
  const changeRole = (uid: string, role: "editor" | "viewer") =>
    run(uid, () => updateMemberRole(trip.id, uid, role), "Couldn't update that person's role — please try again.");
  const remove = (uid: string) => {
    if (confirmRemoveUid !== uid) { setConfirmRemoveUid(uid); return; }
    run(uid, async () => { await removeMember(trip.id, uid); setConfirmRemoveUid(null); }, "Couldn't remove that person — please try again.");
  };
  const saveName = (uid: string) => {
    if (!nameDraft.trim() || busyUid) return;
    run(uid, async () => { await updateMemberDisplayName(trip.id, uid, nameDraft.trim()); setEditingNameUid(null); }, "Couldn't save that name — please try again.");
  };

  const rows = Object.entries(trip.members).sort(([, a], [, b]) =>
    a.role === "owner" ? -1 : b.role === "owner" ? 1 : a.joinedAt.localeCompare(b.joinedAt));
  return (
    <div className="flex flex-col gap-2">
      <span className={labelClass} style={{ color: "var(--color-text-secondary)" }}>Who has access</span>
      {rows.map(([uid, member]) => (
        <MemberRow
          key={uid} uid={uid} member={member} isOwnerView={isOwnerView} busy={busyUid === uid}
          confirmingRemove={confirmRemoveUid === uid}
          editingName={editingNameUid === uid} nameDraft={nameDraft} onNameDraft={setNameDraft}
          onStartEditName={() => { setEditingNameUid(uid); setNameDraft(member.displayName ?? ""); setError(null); }}
          onCancelEditName={() => setEditingNameUid(null)} onSaveName={() => saveName(uid)}
          onChangeRole={() => changeRole(uid, member.role === "editor" ? "viewer" : "editor")} onRemove={() => remove(uid)}
        />
      ))}
      {error && <p className="text-xs text-center" style={{ color: "var(--color-error)" }}>{error}</p>}
    </div>
  );
}

interface MemberRowProps {
  uid: string; member: TripMember; isOwnerView: boolean; busy: boolean; confirmingRemove: boolean;
  editingName: boolean; nameDraft: string; onNameDraft: (v: string) => void;
  onStartEditName: () => void; onCancelEditName: () => void; onSaveName: () => void;
  onChangeRole: () => void; onRemove: () => void;
}

function MemberRow(p: MemberRowProps) {
  const isMe = p.uid === auth.currentUser?.uid;
  const canManage = p.isOwnerView && p.member.role !== "owner" && !isMe;
  const label = isMe ? "You" : p.member.displayName || `…${p.uid.slice(-8)}`;
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5" style={{ backgroundColor: "var(--color-surface-raised)" }}>
      {p.editingName ? (
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <input type="text" value={p.nameDraft} onChange={(e) => p.onNameDraft(e.target.value)} placeholder="Your name" autoFocus
                 aria-label="Your name on this trip"
                 className="flex-1 min-w-0 rounded-lg px-2.5 py-1.5 text-sm outline-none border"
                 style={{ backgroundColor: "var(--color-bg-deep)", color: "var(--color-text-primary)", borderColor: "var(--color-gold)" }} />
          <button type="button" disabled={p.busy || !p.nameDraft.trim()} onClick={p.onSaveName}
                  className="text-[11px] px-2.5 py-1.5 rounded-full cursor-pointer font-semibold disabled:opacity-40 flex-shrink-0"
                  style={{ backgroundColor: "var(--color-gold)", color: "var(--color-bg-deep)" }}>Save</button>
          <button type="button" onClick={p.onCancelEditName} className="text-[11px] px-2 py-1.5 rounded-full cursor-pointer flex-shrink-0"
                  style={{ color: "var(--color-text-dim)" }}>Cancel</button>
        </div>
      ) : (
        <div className="min-w-0">
          <p className="text-sm font-medium truncate flex items-center gap-1.5" style={{ color: "var(--color-text-primary)" }}>
            {label}
            {isMe && (
              <button type="button" onClick={p.onStartEditName} className="text-[10px] font-normal cursor-pointer underline decoration-dotted"
                      style={{ color: "var(--color-text-dim)" }}>edit</button>
            )}
          </p>
          <p className="text-[11px]" style={{ color: "var(--color-text-dim)" }}>
            {ROLE_LABEL[p.member.role]} · joined {new Date(p.member.joinedAt).toLocaleDateString()}
          </p>
        </div>
      )}
      {canManage && !p.editingName && (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button type="button" disabled={p.busy} onClick={p.onChangeRole}
                  className="text-[11px] px-2 py-1 rounded-full border cursor-pointer transition-colors duration-200 hover:bg-white/5 disabled:opacity-40"
                  style={{ color: "var(--color-text-muted)", borderColor: "var(--color-border-input)" }}>
            Make {p.member.role === "editor" ? "Viewer" : "Editor"}
          </button>
          <button type="button" disabled={p.busy} onClick={p.onRemove}
                  className="text-[11px] px-2 py-1 rounded-full cursor-pointer transition-colors duration-200 disabled:opacity-40"
                  style={{ color: "var(--color-error)", backgroundColor: p.confirmingRemove ? "color-mix(in srgb, var(--color-error) 15%, transparent)" : "transparent" }}>
            {p.confirmingRemove ? "Confirm?" : "Remove"}
          </button>
        </div>
      )}
    </div>
  );
}

// ==================== INVITES ====================

function InviteForm({ trip }: { trip: Trip }) {
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => { setLink(null); setError(null); setCopied(false); }, [trip.id]);

  const generate = async () => {
    const user = auth.currentUser;
    if (busy || !user) return;
    setBusy(true); setError(null); setCopied(false);
    try { setLink(await createInvite(trip.id, role, user.uid)); }
    catch { setError("Couldn't generate an invite link — make sure this trip has finished syncing, then try again."); }
    finally { setBusy(false); }
  };
  const copy = async () => {
    if (!link) return;
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { /* clipboard blocked: the link is shown to copy by hand */ }
  };
  const share = async () => {
    if (!link) return;
    if (!navigator.share) { copy(); return; }
    try { await navigator.share({ title: `Join "${trip.name}" on ParQwish`, url: link }); } catch { /* share sheet cancelled */ }
  };

  return (
    <div className="flex flex-col gap-4 pt-1 border-t" style={{ borderColor: "var(--color-border-subtle)" }}>
      <div>
        <span className={labelClass} style={{ color: "var(--color-text-secondary)" }}>Invite as</span>
        <div className="flex gap-2">
          {(["editor", "viewer"] as const).map((r) => (
            <button key={r} type="button" onClick={() => { setRole(r); setLink(null); }} aria-pressed={role === r}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-colors duration-200 border ${role === r ? "bg-[var(--color-gold)]" : "hover:bg-white/5"}`}
                    style={{ color: role === r ? "var(--color-bg-deep)" : "var(--color-text-secondary)", borderColor: role === r ? "var(--color-gold)" : "var(--color-border-input)" }}>
              {r === "editor" ? "✏️ Editor" : "👀 Viewer"}
            </button>
          ))}
        </div>
        <p className="text-xs mt-1.5" style={{ color: "var(--color-text-dim)" }}>
          {role === "editor" ? "Can add, edit, and check off items. Trip dates and travel details stay owner-only." : "Can view everything but can't make changes."}
        </p>
      </div>
      {!link ? (
        <button type="button" onClick={generate} disabled={busy}
                className="w-full py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-150 disabled:opacity-50"
                style={{ backgroundColor: "color-mix(in srgb, var(--color-gold) 15%, transparent)", color: "var(--color-gold)", border: "1px solid color-mix(in srgb, var(--color-gold) 40%, transparent)" }}>
          {busy ? "Generating…" : "Generate Invite Link"}
        </button>
      ) : (
        <div className="rounded-xl p-3" style={{ backgroundColor: "var(--color-surface-raised)" }}>
          <p className="text-xs mb-2 break-all font-mono" style={{ color: "var(--color-text-secondary)" }}>{link}</p>
          <div className="flex gap-2">
            <button type="button" onClick={copy} className="flex-1 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-200 hover:brightness-110"
                    style={{ backgroundColor: "var(--color-gold)", color: "var(--color-bg-deep)" }}>{copied ? "✓ Copied" : "Copy Link"}</button>
            <button type="button" onClick={share} className="flex-1 py-2 rounded-lg text-xs font-semibold cursor-pointer border transition-colors duration-200 hover:bg-white/5"
                    style={{ color: "var(--color-text-secondary)", borderColor: "var(--color-border-input)" }}>Share…</button>
          </div>
          <p className="text-[10px] mt-2" style={{ color: "var(--color-text-dim)" }}>
            Expires in 48 hours. Anyone with this link can join as {role === "editor" ? "an editor" : "a viewer"} {"—"} share it only with people you trust.
          </p>
        </div>
      )}
      {error && <p className="text-xs text-center" style={{ color: "var(--color-error)" }}>{error}</p>}
    </div>
  );
}
