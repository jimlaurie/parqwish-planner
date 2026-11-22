// ==================== HTML PAGE → PDF ====================
// Turns a whole printable HTML page (its own <style>, photos as data URLs)
// into an A4 PDF download: the trade list and the Showcase
// (@shared/collection-trade, @shared/collection-showcase). The page is drawn in
// an offscreen iframe, so its styles can't touch the Planner's, then
// html2canvas and jsPDF cut it into pages, as the trip recap is.

const PAGE_WIDTH_PX = 794; // A4 at 96 dpi

/** An offscreen iframe holding the page, once it and its images have loaded. */
async function renderFrame(html: string): Promise<HTMLIFrameElement> {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = `position:fixed;left:-10000px;top:0;width:${PAGE_WIDTH_PX}px;height:1123px;border:0;`;
  const loaded = new Promise<void>((resolve) => { frame.onload = () => resolve(); });
  frame.srcdoc = html;
  document.body.appendChild(frame);
  await loaded;
  const doc = frame.contentDocument;
  if (!doc) throw new Error("[html-pdf] The page didn't load");
  await Promise.all(Array.from(doc.images).map((img) => img.decode().catch(() => undefined)));
  frame.style.height = `${doc.documentElement.scrollHeight}px`;
  return frame;
}

/** Downloads `html` as an A4 PDF named `fileName`; throws if it couldn't be made. */
export async function downloadHtmlAsPdf(html: string, fileName: string): Promise<void> {
  const html2canvas = (await import("html2canvas-pro")).default;
  const { jsPDF } = await import("jspdf");
  const frame = await renderFrame(html);
  try {
    const canvas = await html2canvas(frame.contentDocument!.body, {
      scale: 2, backgroundColor: "#FFFFFF", useCORS: true, logging: false, windowWidth: PAGE_WIDTH_PX,
    });
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * pageWidth) / canvas.width;
    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    for (let offset = 0; offset < imgHeight; offset += pageHeight) {
      if (offset > 0) pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, -offset, pageWidth, imgHeight);
    }
    pdf.save(fileName);
  } finally {
    frame.remove();
  }
}

/** A file name part from a category name ("Coins & Medallions" → "Coins-Medallions"). */
export function fileSafe(name: string): string {
  return name.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "") || "Collection";
}
