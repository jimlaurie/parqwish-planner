import Link from "next/link";

// ==================== COMPONENT ====================
// Shared chrome for every hand-authored post at src/app/blog/<slug>/page.tsx —
// back link, title, formatted date, and the .blog-prose reading column
// (see globals.css) so post pages only ever write plain JSX prose.

interface BlogPostShellProps {
  title: string;
  date: string; // "YYYY-MM-DD"
  children: React.ReactNode;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function BlogPostShell({ title, date, children }: BlogPostShellProps) {
  return (
    <article className="max-w-3xl mx-auto px-6 pt-10 pb-24">
      <Link
        href="/blog"
        className="inline-flex items-center gap-1.5 text-sm mb-8 hover:underline"
        style={{ color: "var(--color-text-dim)" }}
      >
        &larr; All updates
      </Link>

      <time
        className="block text-xs uppercase tracking-[0.08em] mb-3"
        style={{ color: "var(--color-gold)", fontFamily: "var(--font-mono, ui-monospace, monospace)" }}
      >
        {formatDate(date)}
      </time>

      <h1
        className="font-bold mb-8"
        style={{
          fontSize: "clamp(1.8rem, 4.5vw, 2.6rem)",
          lineHeight: 1.12,
          color: "var(--color-heading)",
          textWrap: "balance",
        }}
      >
        {title}
      </h1>

      <div className="blog-prose">{children}</div>
    </article>
  );
}
