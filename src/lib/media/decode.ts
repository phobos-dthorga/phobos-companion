import { decodeDds } from "./dds";
import type { Raster } from "./pixels";
import {
  levellingGain,
  loudness,
  REVIEW_LUFS,
  samplePeak,
  wavBytes,
  WHINE_PEAK_DB,
  WHINE_SOLO_HZ,
  WHINE_SOLO_WIDTH_HZ,
} from "./sound";

/**
 * Turning a changed file's bytes into something the code viewer can draw or play (0.50.0). The browser decodes the pictures and
 * sounds it knows; DDS textures go through `dds.ts`. Nothing here leaves the window.
 */

/** Pictures the browser draws itself, by extension. */
const PICTURES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  ico: "image/x-icon",
  avif: "image/avif",
  svg: "image/svg+xml",
};

/** Sounds the browser plays itself, by extension. */
const SOUNDS: Record<string, string> = {
  ogg: "audio/ogg",
  opus: "audio/ogg",
  wav: "audio/wav",
  mp3: "audio/mpeg",
  flac: "audio/flac",
  m4a: "audio/mp4",
  aac: "audio/aac",
};

export function extensionOf(path: string): string {
  const name = path.split("/").pop() ?? "";
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

/** How the viewer shows a file: drawn, played, or named in words with its sizes. */
export function showingOf(path: string): "picture" | "sound" | "words" {
  const extension = extensionOf(path);
  if (extension in PICTURES || extension === "dds") return "picture";
  if (extension in SOUNDS) return "sound";
  return "words";
}

/** A picture's pixels, or the reason it could not be drawn, in a word the page turns into a sentence. */
export type PictureReading =
  | { ok: true; raster: Raster; format: string | null; note: string | null }
  | { ok: false; problem: string; format?: string };

/** The largest side drawn, as for textures: a larger picture is named, not drawn (agent default). */
const MAX_SIDE = 8192;

export async function decodePicture(
  path: string,
  bytes: Uint8Array,
): Promise<PictureReading> {
  const extension = extensionOf(path);
  if (extension === "dds") {
    const found = decodeDds(bytes);
    if (!found.ok)
      return { ok: false, problem: found.problem, format: found.format };
    const { texture } = found;
    return {
      ok: true,
      raster: {
        width: texture.width,
        height: texture.height,
        pixels: texture.pixels,
      },
      format: texture.format,
      note: texture.layers > 1 ? "layers" : null,
    };
  }
  const type = PICTURES[extension];
  if (!type) return { ok: false, problem: "unsupported" };
  try {
    const source = await drawable(new Blob([bytes as BlobPart], { type }));
    try {
      const { width, height } = source;
      if (width === 0 || height === 0)
        return { ok: false, problem: "unreadable" };
      if (width > MAX_SIDE || height > MAX_SIDE)
        return { ok: false, problem: "too-large" };
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return { ok: false, problem: "unreadable" };
      context.drawImage(source.image, 0, 0);
      const data = context.getImageData(0, 0, width, height);
      return {
        ok: true,
        raster: { width, height, pixels: data.data },
        format: null,
        note: extension === "svg" ? "svg" : null,
      };
    } finally {
      source.close();
    }
  } catch {
    return { ok: false, problem: "unreadable" };
  }
}

type Drawable = {
  image: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
};

/** A picture ready to draw. An SVG goes through an image element, which never runs its scripts. */
async function drawable(blob: Blob): Promise<Drawable> {
  if (blob.type === "image/svg+xml") {
    const address = URL.createObjectURL(blob);
    const image = new Image();
    image.src = address;
    try {
      await image.decode();
    } catch (problem) {
      URL.revokeObjectURL(address);
      throw problem;
    }
    return {
      image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      close: () => URL.revokeObjectURL(address),
    };
  }
  const bitmap = await createImageBitmap(blob);
  return {
    image: bitmap,
    width: bitmap.width,
    height: bitmap.height,
    close: () => bitmap.close(),
  };
}

/** The rate every sound is decoded at for measuring: the browser resamples to it, so figures compare fairly. */
export const MEASURE_RATE = 48000;

export type SoundReading =
  | {
      ok: true;
      channels: Float32Array[];
      rate: number;
      seconds: number;
      /** The original file, for the player. */
      address: string;
    }
  | { ok: false; problem: string };

export async function decodeSound(
  path: string,
  bytes: Uint8Array,
): Promise<SoundReading> {
  const type = SOUNDS[extensionOf(path)];
  if (!type) return { ok: false, problem: "unsupported" };
  try {
    const context = new OfflineAudioContext(1, 1, MEASURE_RATE);
    const buffer = await context.decodeAudioData(bytes.slice().buffer);
    const channels = Array.from({ length: buffer.numberOfChannels }, (_, c) =>
      buffer.getChannelData(c),
    );
    return {
      ok: true,
      channels,
      rate: buffer.sampleRate,
      seconds: buffer.duration,
      address: URL.createObjectURL(new Blob([bytes as BlobPart], { type })),
    };
  } catch {
    return { ok: false, problem: "unreadable" };
  }
}

/**
 * The whine alone (sound_review.py's whine_solo_filter, in the browser): the band round it, twice band-passed, moved down to 1 kHz
 * by multiplying with a tone (so it keeps its shape, shifted rather than re-pitched), the copy above 2 kHz filtered off, then levelled
 * to the review loudness with its peak held under -6 dBFS. Mono. A listening aid only; never saved. Its WAV's address to play.
 */
export async function whineAlone(
  channels: Float32Array[],
  rate: number,
  hz: number,
): Promise<string> {
  const length = channels[0].length;
  // Rendered fast enough that the sum the multiplying makes stays below half the rate, so it never folds back into the low band.
  const renderRate = Math.max(rate, 96000);
  const context = new OfflineAudioContext(
    1,
    Math.ceil((length * renderRate) / rate),
    renderRate,
  );
  const input = context.createBuffer(channels.length, length, rate);
  channels.forEach((channel, c) =>
    input.copyToChannel(channel as Float32Array<ArrayBuffer>, c),
  );
  const source = context.createBufferSource();
  source.buffer = input;
  const bandPass = () => {
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = hz;
    filter.Q.value = hz / WHINE_SOLO_WIDTH_HZ;
    return filter;
  };
  const lowPass = () => {
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 2 * WHINE_SOLO_HZ;
    return filter;
  };
  const shifter = context.createGain();
  shifter.gain.value = 0;
  const carrier = context.createOscillator();
  carrier.frequency.value = hz - WHINE_SOLO_HZ;
  carrier.connect(shifter.gain);
  const chain = [bandPass(), bandPass(), shifter, lowPass(), lowPass()];
  let last: AudioNode = source;
  for (const node of chain) {
    last.connect(node);
    last = node;
  }
  last.connect(context.destination);
  carrier.start();
  source.start();
  const rendered = await context.startRendering();
  const samples = rendered.getChannelData(0);
  const gain = levellingGain(
    loudness([samples], renderRate),
    samplePeak([samples]),
    REVIEW_LUFS,
    WHINE_PEAK_DB,
  );
  const levelled = samples.map((value) => value * gain);
  const wav = wavBytes([levelled], renderRate);
  return URL.createObjectURL(
    new Blob([wav as BlobPart], { type: "audio/wav" }),
  );
}

/** The theme's colours, read from the page (lib/theme/runtime.ts sets them), for what is drawn on a canvas. */
export function themeColour(role: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(`--colour-${role}`)
    .trim();
}
