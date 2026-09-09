import BlogPostShell from "@/components/blog/BlogPostShell";

export const metadata = {
  title: "It's on TestFlight — ParQwish Updates",
};

export default function Post() {
  return (
    <BlogPostShell title="It's on TestFlight" date="2026-09-09">
      <p>
        Quick one. Build 68 cleared Apple&rsquo;s processing and just landed on a
        real phone. First time this app has run on a device that wasn&rsquo;t a
        simulator or my own phone plugged into Xcode.
      </p>

      <p>
        Not a public release yet — this is TestFlight, invite-only to whoever I
        add as a tester. But it&rsquo;s a real milestone for a one-person project:
        the thing exists outside my own machines now.
      </p>

      <p>
        Next is watching what turns up on a real device that a simulator
        can&rsquo;t show me — GPS trail recording, real notification permissions,
        real background behavior, that kind of thing. If it holds up, the actual
        App Store submission is the next real step after that.
      </p>
    </BlogPostShell>
  );
}
