import { dayOf } from "../shell/dates";
import { ask } from "../shell/desktopClient";
import type { Failed } from "../shell/types";

/** One screenshot as the kit lists it (phobos-modkit `game-files`): its file, size and when it was taken, in Unix seconds. */
export type Shot = {
  path: string;
  name: string;
  bytes: number;
  taken: number;
  source: string;
};

/** One game's screenshots alone (phobos-modkit 1.59.0's `game-files screenshots`). */
export type ShotList = {
  name: string;
  folders: string[];
  list: Shot[];
  count: number;
  bytes: number;
};

/** One game's screenshots, for the Timeline's gallery (0.32.0). */
export async function readScreenshots(
  game: string,
): Promise<{ state: "ready"; shots: ShotList } | Failed> {
  return ask<ShotList, { state: "ready"; shots: ShotList }>(
    "game_screenshots",
    { game },
    (shots) => ({ state: "ready", shots }),
  );
}

/** One listed screenshot's bytes, raw. The host hands over only a picture a list in this run named. */
export async function readShot(
  path: string,
): Promise<{ state: "ready"; bytes: Uint8Array } | Failed> {
  return ask<ArrayBuffer | number[], { state: "ready"; bytes: Uint8Array }>(
    "screenshot",
    { path },
    (raw) => ({
      state: "ready",
      bytes:
        raw instanceof ArrayBuffer ? new Uint8Array(raw) : Uint8Array.from(raw),
    }),
  );
}

/** How wide a thumbnail is drawn, in pixels: twice its shown width, for sharp edges on a high-density screen (agent default). */
export const THUMB_WIDTH = 360;
/** Thumbnails made at once: each decodes a whole screenshot first (agent default). */
const AT_ONCE = 2;

const made = new Map<string, Promise<string | null>>();
let running = 0;
const waiting: (() => void)[] = [];

async function turn<T>(work: () => Promise<T>): Promise<T> {
  if (running >= AT_ONCE) await new Promise<void>((go) => waiting.push(go));
  running += 1;
  try {
    return await work();
  } finally {
    running -= 1;
    waiting.shift()?.();
  }
}

/** A small JPEG of the picture, drawn once per path and kept for this run; the whole picture is let go as soon as it is drawn. */
async function draw(bytes: Uint8Array): Promise<string | null> {
  const whole = new Blob([bytes as BlobPart]);
  const bitmap = await createImageBitmap(whole);
  try {
    const width = Math.min(THUMB_WIDTH, bitmap.width);
    const height = Math.max(
      1,
      Math.round((bitmap.height * width) / bitmap.width),
    );
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, width, height);
    const small = await new Promise<Blob | null>((done) =>
      canvas.toBlob(done, "image/jpeg", 0.82),
    );
    return small ? URL.createObjectURL(small) : null;
  } finally {
    bitmap.close();
  }
}

/** The thumbnail's address for an `<img>`, or null when the picture could not be read or drawn (the caller says so in words). */
export function thumbnail(path: string): Promise<string | null> {
  let found = made.get(path);
  if (!found) {
    found = turn(async () => {
      const answer = await readShot(path);
      if (answer.state !== "ready") return null;
      try {
        return await draw(answer.bytes);
      } catch {
        return null;
      }
    });
    made.set(path, found);
  }
  return found;
}

/** Screenshots grouped by the local day they were taken ("2026-11-20"), each day's newest first. */
export function shotsByDay(shots: Shot[]): Map<string, Shot[]> {
  const days = new Map<string, Shot[]>();
  for (const shot of [...shots].sort((a, b) => b.taken - a.taken)) {
    const day = localDay(shot.taken);
    const list = days.get(day);
    if (list) list.push(shot);
    else days.set(day, [shot]);
  }
  return days;
}

/** The local calendar day of a Unix time, named as the Timeline names its facts' days. */
export function localDay(unix: number): string {
  return dayOf(new Date(unix * 1000).toISOString());
}
