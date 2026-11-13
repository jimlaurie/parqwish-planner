// ==================== SAVE-TO-PARQWISH LINKS ====================
// What the "Save pages to ParQwish" help (/share with nothing shared) hands
// out: a bookmarklet that opens this Planner's /share page for the page it's
// clicked on, and the address an iPhone or iPad Shortcut opens. Both point at
// the Planner they were taken from (app.parqwish.com, the beta, or localhost).

/**
 * The bookmarklet: the page's og:title (usually without the site's name) or
 * its title, its address and any selected text, in a new tab where the
 * browser allows one, else this one.
 */
export function bookmarkletCode(origin: string): string {
  const body = [
    "var m=document.querySelector('meta[property=\"og:title\"]');",
    "var t=(m&&m.content)||document.title;",
    "var s=String(window.getSelection?getSelection():'').trim().slice(0,500);",
    `var u=${JSON.stringify(`${origin}/share?`)}+'title='+encodeURIComponent(t)+'&url='+encodeURIComponent(location.href)+(s?'&text='+encodeURIComponent(s):'');`,
    "var w=window.open(u,'_blank');if(!w)location.href=u;",
  ].join("");
  return `javascript:(function(){${body}})();`;
}

/** What the Shortcut's Text action starts with; the URL-encoded address goes after it. */
export function shortcutAddress(origin: string): string {
  return `${origin}/share?url=`;
}
