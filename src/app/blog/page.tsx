import Link from "next/link";
import { getSortedPosts } from "@/lib/blog-posts";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function BlogIndexPage() {
  const posts = getSortedPosts();

  return (
    <div className="max-w-3xl mx-auto px-6 pt-14 pb-24">
      <p
        className="text-xs uppercase tracking-[0.14em] mb-4"
        style={{ color: "var(--color-gold)", fontFamily: "var(--font-mono, ui-monospace, monospace)" }}
      >
        What&rsquo;s new
      </p>
      <h1
        className="font-bold mb-4"
        style={{ fontSize: "clamp(2rem, 5vw, 2.8rem)", lineHeight: 1.08, color: "var(--color-heading)" }}
      >
        Updates
      </h1>
      <p className="text-base leading-relaxed max-w-[58ch] mb-14" style={{ color: "var(--color-text-secondary)" }}>
        Roughly weekly notes on what shipped in ParQ Wish Pal and ParQ Wish Planner —
        features, fixes, and the occasional detour. Written the same informal way the
        apps get built.{" "}
        <Link href="/story" className="underline" style={{ color: "var(--color-gold)", textUnderlineOffset: 2 }}>
          Curious how this started? Read the story →
        </Link>
      </p>

      {posts.length === 0 ? (
        <p style={{ color: "var(--color-text-dim)" }}>Nothing posted yet — check back soon.</p>
      ) : (
        <ul className="list-none m-0 p-0 flex flex-col gap-1">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className="block py-6 group"
                style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
              >
                <time
                  className="block text-xs mb-2"
                  style={{ color: "var(--color-text-dim)", fontFamily: "var(--font-mono, ui-monospace, monospace)" }}
                >
                  {formatDate(post.date)}
                </time>
                <h2
                  className="text-xl font-semibold mb-1.5 transition-colors duration-150"
                  style={{ color: "var(--color-heading)" }}
                >
                  <span className="group-hover:underline" style={{ textUnderlineOffset: 3 }}>
                    {post.title}
                  </span>
                </h2>
                <p className="text-[15px] leading-relaxed max-w-[60ch]" style={{ color: "var(--color-text-secondary)" }}>
                  {post.excerpt}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
