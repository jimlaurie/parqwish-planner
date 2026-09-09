import BlogPostShell from "@/components/blog/BlogPostShell";

export const metadata = {
  title: "The Planner gets a Photo Gallery, and Pal heads to TestFlight — ParQwish Updates",
};

export default function Post() {
  return (
    <BlogPostShell title="The Planner gets a Photo Gallery, and Pal heads to TestFlight" date="2026-09-09">
      <p>
        Last post I said I&rsquo;d write here once getting ParQ Wish Pal in front of
        Apple&rsquo;s review was actually moving. It&rsquo;s moving.
      </p>

      <h2>Pal is sitting in Apple&rsquo;s queue</h2>
      <p>
        Build 68 is uploaded and processing at App Store Connect right now. That&rsquo;s
        not the same as &ldquo;live in TestFlight&rdquo; yet — Apple still has to finish
        processing it before it&rsquo;s actually available to test — but it&rsquo;s the
        first real submission, and I&rsquo;ll post here the moment it&rsquo;s something
        you can actually install.
      </p>

      <h2>A bug I found getting there</h2>
      <p>
        While getting that build ready I hit a real one: the Ready Now list on the
        home screen was quietly failing to load, and park hours weren&rsquo;t showing
        up either — no crash, just silently broken. Traced it to a date-formatting
        trick used all over the app (a locale quirk that&rsquo;s supposed to give you{" "}
        <code>2026-09-08</code> but was actually handing back <code>9/8/2026</code> on
        this build) — one wrong character format, breaking things in twenty-three
        different places across sixteen files, because the same trick had been
        copy-pasted everywhere it was needed. Replaced all of it with one shared,
        more reliable helper. Boring bug, satisfying fix — the kind where you go
        looking for one broken screen and find the actual root cause was hiding
        under the whole app the entire time.
      </p>

      <h2>Meanwhile, on the Planner</h2>
      <p>
        I&rsquo;ve been heads-down on Pal long enough that a few real things shipped
        on the web planner without a post to go with them — catching up here:
      </p>
      <ul>
        <li>
          <strong>A Photo Gallery on Catalog.</strong> Every photo on your trip — from
          rides, outfits, dining, wherever it came from — now has one place to browse,
          filter by day or type, and decide whether it shows up on Publish. Standalone
          photos you&rsquo;ve imported can now be linked to more than one item at once,
          which wasn&rsquo;t possible before.
        </li>
        <li>
          <strong>The Story page</strong> at{" "}
          <a href="/story">parqwish.com/story</a> got a proper opening — where the
          name actually comes from, why the data model is built the way it is, and
          the honest version of learning to build this with Claude Code.
        </li>
        <li>
          A handful of smaller fixes: the Guide/Story/Blog pages got noticeably
          lighter and faster to load, and I fixed a couple of navigation dead-ends
          that only showed up once real people started clicking around.
        </li>
      </ul>

      <h2>What&rsquo;s next</h2>
      <p>
        Waiting on Apple. Once Pal actually clears processing, that&rsquo;s the post
        I&rsquo;m looking forward to writing.
      </p>
    </BlogPostShell>
  );
}
