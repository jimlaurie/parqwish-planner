import BlogPostShell from "@/components/blog/BlogPostShell";

export const metadata = {
  title: "Trip maps, photo imports, and a smarter Preview sidebar — ParQwish Updates",
};

export default function Post() {
  return (
    <BlogPostShell title="Trip maps, photo imports, and a smarter Preview sidebar" date="2026-08-17">
      <p>
        This week&rsquo;s batch was mostly about closing gaps between &ldquo;the app
        recorded something&rdquo; and &ldquo;you can actually see and use it&rdquo; —
        on the web planner side specifically. Three things shipped:
      </p>

      <h2>A real map of where you actually walked</h2>
      <p>
        If you&rsquo;ve got GPS trail recording turned on in the mobile app, the
        Publish page now has a proper trip map: your actual path through the park,
        drawn on top of it, with markers for the rides, shows, and dining you
        completed along the way. You can scrub through the day, filter to a time
        range, and — this is the part I&rsquo;m most pleased with — click a point on
        the trail and correct it if the GPS was off. Phone GPS gets weird indoors
        and near tall rides; now a wrong point doesn&rsquo;t have to just sit there
        wrong forever. Your filter and playback settings stick around too, so
        re-opening the map doesn&rsquo;t reset you back to the whole day every time.
      </p>

      <h2>Getting your photos in without emailing yourself</h2>
      <p>
        Previously, getting park photos into a trip meant manually attaching them
        one at a time. Now you can bulk-import straight from your camera roll —
        including PhotoPass-style photos — and the app reads the location baked
        into each photo to place it on the right day and, where possible, the
        right spot in the park automatically.
      </p>

      <h2>A recap you can hand to an AI</h2>
      <p>
        Also new on Publish: an AI Export panel. It packages up your trip — what
        you did, when, your photos, your GPS trail — into a tidy bundle plus a
        ready-made prompt, so you can drop it into Claude or ChatGPT and get a
        real recap post out the other end instead of staring at a blank caption
        box. No API key, no account — you export, you paste, you go.
      </p>

      <h2>Preview finally shows everything</h2>
      <p>
        The Preview page&rsquo;s day timeline was missing a way to add Places,
        Outfits, Equipment, or Sundries to your schedule — you could do it on
        mobile, but not from the web planner, which didn&rsquo;t make sense. That
        sidebar now lists all of it. There&rsquo;s also a new filter so you can
        narrow the timeline down to just what you care about right now — show me
        only the dining reservations and shows I&rsquo;ve actually booked, for
        instance, instead of everything at once.
      </p>

      <h2>What&rsquo;s next</h2>
      <p>
        Mostly App Store prep from here — real version numbers, the last round of
        polish, and getting ParQ Wish Pal in front of Apple&rsquo;s review. I&rsquo;ll
        post here when that&rsquo;s actually moving. If you want the fuller
        backstory on how any of this got started, it&rsquo;s on the{" "}
        <a href="/story">Story</a> page.
      </p>
    </BlogPostShell>
  );
}
