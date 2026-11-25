/**
 * A picture of the window to share (the owner's request, 19 Nov 2026): the whole window since 0.68.0 (the bar, the page list, the
 * page and its details), the page's parts scrolled out of view included, drawn into a PNG by html-to-image.
 */

/** Room below the page in the picture, for text that draws a touch taller in a picture than on screen. */
const PICTURE_SPARE_PX = 48;

/** The picture's name: the game, the page, and when, in the owner's own time, so pictures sort by when they were taken. */
export function pictureName(game: string, page: string, when: Date): string {
  const two = (n: number) => String(n).padStart(2, "0");
  const day = `${when.getFullYear()}-${two(when.getMonth() + 1)}-${two(when.getDate())}`;
  const time = `${two(when.getHours())}.${two(when.getMinutes())}.${two(when.getSeconds())}`;
  return [game, page, day, time].filter(Boolean).join(" ");
}

/** How sharp the picture is: the screen's own, but never past twice, so a long page stays a size a message can carry. */
export function pictureScale(devicePixelRatio: number): number {
  return Math.min(2, Math.max(1, devicePixelRatio || 1));
}

/** The mark a progress bar, a placeholder or a globe still drawing carries while it is on the page (0.24.0). */
export const LOADING_MARK = "[data-picture-wait]";

/** How many looks in a row must find the page loaded before the picture is taken, so a page reading in stages is not caught
 * between two of them. */
export const SETTLED_LOOKS = 2;

/** Whether the page is still loading, so a picture taken now would show its loading and not the page. */
export function stillLoading(page: {
  querySelector(selector: string): unknown;
}): boolean {
  return page.querySelector(LOADING_MARK) !== null;
}

/** Counts looks that found the page loaded; one that finds it loading starts the count again. */
export function settledLooks(previous: number, loading: boolean): number {
  return loading ? 0 : previous + 1;
}

/**
 * Hides the person's home folder in the page's text before a picture another person may see (0.100.0, a report): each time it
 * shows, written with either slash, becomes "~". Returns a function that puts the text back.
 */
export function hideHome(
  element: HTMLElement,
  home: string | null,
): () => void {
  if (!home) return () => {};
  const forms = [home, home.replaceAll("\\", "/")].map((form) =>
    form.toLowerCase(),
  );
  const changed: { node: Text; text: string }[] = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent ?? "";
    let hidden = text;
    for (const form of forms) {
      let at = hidden.toLowerCase().indexOf(form);
      while (at >= 0) {
        hidden = `${hidden.slice(0, at)}~${hidden.slice(at + form.length)}`;
        at = hidden.toLowerCase().indexOf(form);
      }
    }
    if (hidden !== text) {
      changed.push({ node: node as Text, text });
      node.textContent = hidden;
    }
  }
  return () => {
    for (const { node, text } of changed) node.textContent = text;
  };
}

/** Leaves out of the picture anything marked as not belonging in it (a picture's own notice, say). */
export function belongsInPicture(node: Node): boolean {
  return !(node instanceof HTMLElement && node.dataset.noPicture !== undefined);
}

/**
 * Opens out every box inside the element that can scroll (a wide table, the Timeline's day grid), so the picture holds all of
 * it; returns a function that puts each back as it was.
 */
export function openScrollingBoxes(element: HTMLElement): () => void {
  const changed: { box: HTMLElement; overflow: string; maxHeight: string }[] =
    [];
  for (const box of element.querySelectorAll<HTMLElement>("*")) {
    const style = getComputedStyle(box);
    const scrolls = /(auto|scroll)/.test(
      style.overflow + style.overflowX + style.overflowY,
    );
    // Every scrolling box, overflowing or not: the picture copies each box's measured size, and text drawn into the picture can
    // measure a touch larger, so even a box that fits on screen would show scroll bars in the picture.
    if (!scrolls) continue;
    changed.push({
      box,
      overflow: box.style.overflow,
      maxHeight: box.style.maxHeight,
    });
    box.style.overflow = "visible";
    box.style.maxHeight = "none";
  }
  return () => {
    for (const { box, overflow, maxHeight } of changed) {
      box.style.overflow = overflow;
      box.style.maxHeight = maxHeight;
    }
  };
}

/**
 * What the picture shows where one of the page's pictures cannot be read (0.69.1): a grey box crossed through, so a gap is seen
 * rather than the whole picture failing, as it did on the Picks page with "[object Event]". Drawn only into the saved picture.
 */
export const UNREADABLE_PICTURE =
  "data:image/svg+xml;base64," +
  btoa(
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">' +
      '<rect width="64" height="64" fill="#808080" fill-opacity="0.35"/>' +
      '<path d="M0 0L64 64M64 0L0 64" stroke="#808080" stroke-width="3"/></svg>',
  );

/** A failure as words: a picture that would not load reaches here as a bare event, which says nothing as text. */
export function problemText(problem: unknown, unreadable: string): string {
  if (typeof Event !== "undefined" && problem instanceof Event)
    return unreadable;
  return problem instanceof Error ? problem.message : String(problem);
}

/** Draws an element whole, scrolled parts included, as PNG bytes. */
export async function capture(element: HTMLElement): Promise<Uint8Array> {
  const { toBlob } = await import("html-to-image");
  const background = getComputedStyle(document.body).backgroundColor;
  const putBack = openScrollingBoxes(element);
  let blob: Blob | null;
  try {
    blob = await toBlob(element, {
      pixelRatio: pictureScale(window.devicePixelRatio),
      backgroundColor: background,
      width: element.scrollWidth,
      height: element.scrollHeight + PICTURE_SPARE_PX,
      skipFonts: true,
      // One picture that cannot be read leaves a crossed box, never a failed picture of the whole page.
      imagePlaceholder: UNREADABLE_PICTURE,
      onImageErrorHandler: () => undefined,
      filter: belongsInPicture,
      style: { margin: "0", maxHeight: "none", overflow: "visible" },
    });
  } finally {
    putBack();
  }
  if (!blob) throw new Error("the page could not be drawn");
  return new Uint8Array(await blob.arrayBuffer());
}

/** Puts the picture on the clipboard, ready to paste; false when the window refuses. */
export async function copyPicture(bytes: Uint8Array): Promise<boolean> {
  try {
    const blob = new Blob([new Uint8Array(bytes)], { type: "image/png" });
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    return true;
  } catch {
    return false;
  }
}
