/**
 * A picture of the page to share (the owner's request, 19 Nov 2026): the whole page, the parts scrolled out of view included,
 * drawn into a PNG by html-to-image. Only the page itself is drawn, never the bars around it.
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
