"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUsers, USER_COLORS } from "@/hooks/use-users";
import { useAppStore } from "@/lib/store";
import type { User } from "@/lib/db";

// ==================== INLINE EDIT FORM ====================

interface UserFormProps {
  initialName?: string;
  initialColor?: string;
  onSave: (name: string, color: string) => void;
  onCancel: () => void;
  submitLabel: string;
}

function UserForm({
  initialName = "",
  initialColor = USER_COLORS[1],
  onSave,
  onCancel,
  submitLabel,
}: UserFormProps) {
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed, color);
  };

  return (
    <form onSubmit={handleSubmit} className="px-4 py-2 space-y-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        maxLength={20}
        autoFocus
        className="w-full px-2 py-1.5 rounded text-sm border outline-none"
        style={{
          backgroundColor: "var(--color-bg-card)",
          borderColor: "var(--color-border)",
          color: "var(--color-text-primary)",
        }}
      />
      <div className="flex gap-1.5">
        {USER_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            className="w-6 h-6 rounded-full border-2 transition-transform cursor-pointer"
            style={{
              backgroundColor: c,
              borderColor: color === c ? "var(--color-text-primary)" : "transparent",
              transform: color === c ? "scale(1.2)" : "scale(1)",
            }}
            onClick={() => setColor(c)}
            aria-label={`Select color ${c}`}
          />
        ))}
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!name.trim()}
          className="flex-1 px-2 py-1.5 rounded text-xs font-semibold cursor-pointer
                     disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          style={{
            backgroundColor: "var(--color-gold)",
            color: "var(--color-bg-deep)",
          }}
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-2 py-1.5 rounded text-xs cursor-pointer transition-colors hover:bg-white/10"
          style={{ color: "var(--color-text-dim)" }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ==================== USER ROW ====================

interface UserRowProps {
  user: User;
  isActive: boolean;
  isFiltered: boolean;
  onToggleFilter: () => void;
  onSwitchUser: () => void;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
}

function UserRow({
  user,
  isActive,
  isFiltered,
  onToggleFilter,
  onSwitchUser,
  onEdit,
  onDelete,
}: UserRowProps) {
  return (
    <div
      className="group flex items-center gap-2 px-4 py-1.5 cursor-pointer transition-colors duration-150 hover:bg-white/5"
      style={{
        backgroundColor: isFiltered ? `${user.color}10` : "transparent",
        borderLeft: isFiltered ? `3px solid ${user.color}` : "3px solid transparent",
      }}
      onClick={onToggleFilter}
    >
      {/* Color dot */}
      <span
        className="w-3 h-3 rounded-full shrink-0"
        style={{ backgroundColor: user.color }}
      />

      {/* Name + label */}
      <div className="flex-1 min-w-0">
        <span
          className="text-sm truncate block"
          style={{ color: isFiltered ? user.color : "var(--color-text-primary)" }}
        >
          {user.name}
          {user.role === "primary" && (
            <span
              className="text-[10px] ml-1"
              style={{ color: "var(--color-text-dim)" }}
            >
              (you)
            </span>
          )}
        </span>
      </div>

      {/* Active indicator — or switch button for inactive users */}
      {isActive ? (
        <span
          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0"
          style={{
            backgroundColor: `${user.color}20`,
            color: user.color,
          }}
        >
          active
        </span>
      ) : (
        <button
          className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] px-1.5 py-0.5 rounded-full font-medium cursor-pointer shrink-0"
          style={{
            backgroundColor: `${user.color}15`,
            color: user.color,
            border: `1px solid ${user.color}40`,
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSwitchUser();
          }}
          aria-label={`Switch to ${user.name}`}
          title={`Switch active user to ${user.name}`}
        >
          switch
        </button>
      )}

      {/* Edit button */}
      <button
        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-white/10 cursor-pointer text-xs"
        style={{ color: "var(--color-text-dim)" }}
        onClick={(e) => {
          e.stopPropagation();
          onEdit(user);
        }}
        aria-label={`Edit ${user.name}`}
      >
        ✏️
      </button>

      {/* Delete button (guests only) */}
      {user.role !== "primary" && (
        <button
          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-red-500/20 cursor-pointer text-xs"
          style={{ color: "var(--color-text-dim)" }}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(user);
          }}
          aria-label={`Remove ${user.name}`}
        >
          ✕
        </button>
      )}
    </div>
  );
}

// ==================== MAIN COMPONENT ====================

export default function UserPanel() {
  const { users, addUser, updateUser, deleteUser, atCapacity } = useUsers();
  const { currentUserId, setCurrentUserId, activeUserFilter, toggleUserFilter, setActiveUserFilter } = useAppStore();

  const [isOpen, setIsOpen] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  if (users.length === 0) return null;

  const handleAddUser = async (name: string, color: string) => {
    const user = await addUser(name);
    if (user) {
      await updateUser(user.id, { color });
    }
    setShowAddForm(false);
  };

  const handleEditSave = async (name: string, color: string) => {
    if (!editingUser) return;
    await updateUser(editingUser.id, { name, color });
    setEditingUser(null);
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    // If deleting the active user, switch to primary
    if (currentUserId === deletingUser.id) {
      setCurrentUserId("user_primary");
    }
    await deleteUser(deletingUser.id);
    setDeletingUser(null);
  };

  const handleSwitchUser = (userId: string) => {
    setCurrentUserId(userId);
  };

  return (
    <div className="mb-2">
      {/* Section header */}
      <button
        className="flex items-center justify-between w-full px-4 py-2 text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-white/5 transition-colors"
        style={{ color: "var(--color-text-dim)" }}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label="Group section"
      >
        <span>Group ({users.length})</span>
        <span className="text-[10px]" aria-hidden="true">{isOpen ? "▲" : "▼"}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {/* Show All / Clear filter */}
            {activeUserFilter && (
              <button
                className="w-full px-4 py-1 text-[10px] text-left cursor-pointer hover:bg-white/5 transition-colors"
                style={{ color: "var(--color-gold)" }}
                onClick={() => setActiveUserFilter(null)}
              >
                ✦ Show All Users
              </button>
            )}

            {/* User list */}
            {users.map((user) => (
              <div key={user.id}>
                {editingUser?.id === user.id ? (
                  <UserForm
                    initialName={user.name}
                    initialColor={user.color}
                    onSave={handleEditSave}
                    onCancel={() => setEditingUser(null)}
                    submitLabel="Save"
                  />
                ) : (
                  <UserRow
                    user={user}
                    isActive={currentUserId === user.id}
                    isFiltered={activeUserFilter?.includes(user.id) ?? false}
                    onToggleFilter={() => toggleUserFilter(user.id)}
                    onSwitchUser={() => handleSwitchUser(user.id)}
                    onEdit={setEditingUser}
                    onDelete={setDeletingUser}
                  />
                )}
              </div>
            ))}

            {/* Add user form or button */}
            {showAddForm ? (
              <UserForm
                onSave={handleAddUser}
                onCancel={() => setShowAddForm(false)}
                submitLabel="Add"
              />
            ) : (
              !atCapacity && (
                <button
                  className="w-full px-4 py-1.5 text-xs text-left cursor-pointer hover:bg-white/5 transition-colors"
                  style={{ color: "var(--color-text-dim)" }}
                  onClick={() => setShowAddForm(true)}
                >
                  + Add Group Member
                </button>
              )
            )}

            {atCapacity && !showAddForm && (
              <div
                className="px-4 py-1 text-[10px] italic"
                style={{ color: "var(--color-text-dim)" }}
              >
                Maximum 6 members reached
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {deletingUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            style={{ willChange: "opacity" }}
            onClick={() => setDeletingUser(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="rounded-xl p-6 max-w-sm mx-4 shadow-xl"
              style={{ backgroundColor: "var(--color-bg-card)", willChange: "transform" }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3
                className="text-lg font-semibold mb-2"
                style={{ color: "var(--color-text-primary)" }}
              >
                Remove {deletingUser.name}?
              </h3>
              <p
                className="text-sm mb-4"
                style={{ color: "var(--color-text-dim)" }}
              >
                Their items will be reassigned to the primary user. This cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setDeletingUser(null)}
                  className="px-4 py-2 rounded-lg text-sm cursor-pointer hover:bg-white/10 transition-colors"
                  style={{ color: "var(--color-text-dim)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer bg-[var(--color-error)] text-white hover:opacity-80 transition-opacity"
                >
                  Remove
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
