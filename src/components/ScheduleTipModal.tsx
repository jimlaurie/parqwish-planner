"use client";

const ACCENT = "var(--color-accent-plan)";

interface ScheduleTipModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * One-time tip shown the first time a user adds a Show or Dining item to
 * their Plan — explains where showtimes/reservation times actually get set,
 * since neither is scheduled from the Plan page itself.
 */
export default function ScheduleTipModal({ visible, onClose }: ScheduleTipModalProps) {
  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center px-4"
      style={{ backgroundColor: "var(--color-overlay)", zIndex: 10000 }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl p-5"
        style={{
          backgroundColor: "var(--color-bg-card)",
          border: "1px solid var(--color-border-default)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-2xl mb-2">🕐</p>
        <h2 className="text-sm font-semibold mb-2" style={{ color: ACCENT }}>
          One thing to know
        </h2>
        <p className="text-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>
          Showtimes and dining times are scheduled in the mobile app. Reservation
          times can be entered on the Prepare screen.
        </p>
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80"
          style={{ backgroundColor: ACCENT, color: "var(--color-bg-deep)" }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}
