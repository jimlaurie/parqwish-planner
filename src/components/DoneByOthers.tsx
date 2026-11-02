// ==================== DONE BY OTHER HOUSEHOLDS ====================
// "✓ Smiths" on a wish or packing card: other households on the trip that
// have ticked it. Their tick never ticks this household's box
// (src/lib/completions.ts); this just shows it.

interface DoneByOthersProps {
  names?: string[];
  /** "Done" for wishes, "Packed" for packing, in the tooltip */
  verb: "Done" | "Packed";
}

export default function DoneByOthers({ names, verb }: DoneByOthersProps) {
  if (!names?.length) return null;
  const list = names.join(", ");
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
      style={{
        backgroundColor: "color-mix(in srgb, var(--color-success) 10%, transparent)",
        color: "var(--color-success)",
      }}
      title={`${verb} by ${list}`}
      aria-label={`${verb} by ${list}`}
    >
      {"✓"} {list}
    </span>
  );
}
