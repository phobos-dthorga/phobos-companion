/**
 * Measuring a sound in the window (0.50.0; the owner's choice of 22 Nov 2026: spectrograms, waveform, loudness and a "whine alone"
 * copy for changed sounds). The owner cannot hear the highest frequencies, so a sound is shown as well as played: frequency over time,
 * its shape, how loud it is, how much of it sits up high, and any steady whine.
 *
 * The measures follow phobos-rimworld's sound review tool (`scripts/art/sound_review.py`), so a figure here means what it means there:
 * integrated loudness by ITU-R BS.1770 (the K-weighting filters as libebur128 designs them for any sample rate), the band above 4 kHz
 * where noise damage to hearing usually starts, and a whine as the narrow band standing furthest above the sound's own slope. Pure
 * arithmetic on samples, so it is tested without a screen; the browser only decodes and plays.
 */

/** Integrated loudness every review copy is levelled to (sound_review.py's REVIEW_LUFS). */
export const REVIEW_LUFS = -20;
/** "Highs": noise damage to hearing usually starts about here (HIGH_HZ). */
export const HIGH_HZ = 4000;
/** Flag strong highs when the band above HIGH_HZ is within this many dB of the whole (STRONG_HIGHS_DB). */
export const STRONG_HIGHS_DB = 12;
/** Narrow bands searched for a steady tone (WHINE_BANDS_HZ, WHINE_BAND_WIDTH_HZ). */
export const WHINE_FROM_HZ = 4000;
export const WHINE_TO_HZ = 20000;
export const WHINE_STEP_HZ = 500;
export const WHINE_BAND_WIDTH_HZ = 200;
/** A band this far above the median band is a whine (WHINE_PROMINENCE_DB). */
export const WHINE_PROMINENCE_DB = 12;
/** A whine is played alone, moved down to here, from this wide a band round it (WHINE_SOLO_HZ, WHINE_SOLO_WIDTH_HZ). */
export const WHINE_SOLO_HZ = 1000;
export const WHINE_SOLO_WIDTH_HZ = 1000;
/** The whine-alone copy's sample peak is held under this (sound_review.py's loudnorm TP=-6). */
export const WHINE_PEAK_DB = -6;

/** The Fourier transform's size for the spectrogram: 2048 samples, about 43 ms at 48 kHz, 23 Hz a bin. */
export const FFT_SIZE = 2048;

const SILENCE_DB = -120;

/** In place, radix 2: `real` and `imag` the same power-of-two length. */
export function fft(real: Float64Array, imag: Float64Array) {
  const n = real.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
  }
  for (let size = 2; size <= n; size <<= 1) {
    const step = (-2 * Math.PI) / size;
    for (let start = 0; start < n; start += size) {
      for (let k = 0; k < size / 2; k++) {
        const angle = step * k;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const a = start + k;
        const b = a + size / 2;
        const tr = real[b] * cos - imag[b] * sin;
        const ti = real[b] * sin + imag[b] * cos;
        real[b] = real[a] - tr;
        imag[b] = imag[a] - ti;
        real[a] += tr;
        imag[a] += ti;
      }
    }
  }
}

const hann = new Map<number, Float64Array>();
function window(size: number): Float64Array {
  let found = hann.get(size);
  if (!found) {
    found = new Float64Array(size);
    for (let i = 0; i < size; i++)
      found[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (size - 1));
    hann.set(size, found);
  }
  return found;
}

/** The channels mixed to one, as the spectrogram and the whine search hear it. */
export function mono(channels: Float32Array[]): Float32Array {
  if (channels.length === 1) return channels[0];
  const out = new Float32Array(channels[0].length);
  for (const channel of channels)
    for (let i = 0; i < out.length; i++) out[i] += channel[i] / channels.length;
  return out;
}

/** One frame's power in each bin, from `start`, windowed. */
function powerAt(
  samples: Float32Array,
  start: number,
  size: number,
): Float64Array {
  const real = new Float64Array(size);
  const imag = new Float64Array(size);
  const hannWindow = window(size);
  for (let i = 0; i < size; i++)
    real[i] = (samples[start + i] ?? 0) * hannWindow[i];
  fft(real, imag);
  const power = new Float64Array(size / 2);
  for (let k = 0; k < size / 2; k++)
    power[k] = real[k] * real[k] + imag[k] * imag[k];
  return power;
}

export type Spectrogram = {
  columns: number;
  /** Bins a column, from 0 Hz up to half the sample rate. */
  bins: number;
  rate: number;
  /** Level in dB, column by column, each `bins` long, low bins first. */
  levels: Float32Array;
  /** The loudest level anywhere, so a picture's brightness can be set from it. */
  loudest: number;
};

/** Frequency over time, as `columns` frames spread evenly across the sound. */
export function spectrogram(
  samples: Float32Array,
  rate: number,
  columns: number,
  size = FFT_SIZE,
): Spectrogram {
  const bins = size / 2;
  const levels = new Float32Array(columns * bins);
  const span = Math.max(0, samples.length - size);
  let loudest = SILENCE_DB;
  for (let c = 0; c < columns; c++) {
    const start = columns === 1 ? 0 : Math.round((span * c) / (columns - 1));
    const power = powerAt(samples, start, size);
    for (let k = 0; k < bins; k++) {
      const level = power[k] > 0 ? 10 * Math.log10(power[k]) : SILENCE_DB;
      levels[c * bins + k] = level;
      if (level > loudest) loudest = level;
    }
  }
  return { columns, bins, rate, levels, loudest };
}

/** The mean power in each bin over the whole sound (up to `frames` frames), for the high band and the whine search. */
export function averagePower(
  samples: Float32Array,
  frames = 200,
  size = FFT_SIZE,
): Float64Array {
  const sum = new Float64Array(size / 2);
  const span = Math.max(0, samples.length - size);
  const count = Math.max(
    1,
    Math.min(frames, Math.floor(span / (size / 2)) + 1),
  );
  for (let f = 0; f < count; f++) {
    const start = count === 1 ? 0 : Math.round((span * f) / (count - 1));
    const power = powerAt(samples, start, size);
    for (let k = 0; k < sum.length; k++) sum[k] += power[k] / count;
  }
  return sum;
}

function db(power: number): number {
  return power > 0 ? 10 * Math.log10(power) : SILENCE_DB;
}

/** The mean level of a band, in dB. */
export function bandLevel(
  power: Float64Array,
  rate: number,
  low: number,
  high: number,
): number {
  const binHz = rate / (power.length * 2);
  const from = Math.max(0, Math.ceil(low / binHz));
  const to = Math.min(power.length - 1, Math.floor(high / binHz));
  if (to < from) return SILENCE_DB;
  let sum = 0;
  for (let k = from; k <= to; k++) sum += power[k];
  return db(sum / (to - from + 1));
}

/** How far the band above HIGH_HZ sits below the whole sound's energy, in dB (a smaller gap is stronger highs). */
export function highsGap(power: Float64Array, rate: number): number | null {
  if (rate / 2 <= HIGH_HZ) return null;
  let whole = 0;
  let high = 0;
  const binHz = rate / (power.length * 2);
  for (let k = 0; k < power.length; k++) {
    whole += power[k];
    if (k * binHz >= HIGH_HZ) high += power[k];
  }
  if (whole <= 0) return null;
  return high > 0 ? db(whole) - db(high) : Infinity;
}

export type Whine = { hz: number; prominenceDb: number };

/**
 * The band standing furthest above the sound's own slope (sound_review.py's strongest_whine): a straight line fitted through the
 * bands' levels against the logarithm of frequency, each band judged by its rise above the line less the median rise.
 */
export function strongestWhine(levels: Map<number, number>): Whine | null {
  const points = [...levels].filter(([, v]) => Number.isFinite(v));
  if (points.length < 3) return null;
  const xs = points.map(([hz]) => Math.log(hz));
  const ys = points.map(([, v]) => v);
  const meanX = xs.reduce((s, x) => s + x, 0) / xs.length;
  const meanY = ys.reduce((s, y) => s + y, 0) / ys.length;
  const spread = xs.reduce((s, x) => s + (x - meanX) ** 2, 0);
  const slope = spread
    ? xs.reduce((s, x, i) => s + (x - meanX) * (ys[i] - meanY), 0) / spread
    : 0;
  const rises = points.map(
    ([hz, v]) => [hz, v - (meanY + slope * (Math.log(hz) - meanX))] as const,
  );
  const sorted = rises.map(([, r]) => r).sort((p, q) => p - q);
  const median = sorted[Math.floor(sorted.length / 2)];
  const [hz, rise] = rises.reduce((best, next) =>
    next[1] > best[1] ? next : best,
  );
  return { hz, prominenceDb: Math.round((rise - median) * 10) / 10 };
}

/**
 * A band further than this under the sound's loudest part holds nothing to hear, only the arithmetic's own noise, so it is held at
 * this floor, as ffmpeg's volumedetect holds a silent band at -91 dB for the review tool (agent default, 0.50.0). Without it, a sound
 * with nothing above 4 kHz (one recorded at 8 kHz) showed a "whine" 60 dB proud among bands of near silence; dropping such bands
 * instead bent the slope, and lost the 13.5 kHz whine the review tool finds in phobos-ostranauts' washer pump loop (this gives 14.1 dB
 * there, the tool 12.8).
 */
export const WHINE_FLOOR_DB = 80;

/**
 * The strongest narrow band from 4 kHz up to 20 kHz or the sound's top, whether or not it is strong enough to call a whine; null when
 * fewer than three bands there rise above the floor.
 */
export function findWhine(power: Float64Array, rate: number): Whine | null {
  const levels = new Map<number, number>();
  const floor =
    db(power.reduce((most, value) => Math.max(most, value), 0)) -
    WHINE_FLOOR_DB;
  let heard = 0;
  const top = Math.min(WHINE_TO_HZ, rate / 2 - WHINE_BAND_WIDTH_HZ);
  for (let hz = WHINE_FROM_HZ; hz <= top; hz += WHINE_STEP_HZ) {
    const level = bandLevel(
      power,
      rate,
      hz - WHINE_BAND_WIDTH_HZ / 2,
      hz + WHINE_BAND_WIDTH_HZ / 2,
    );
    if (level > floor) heard++;
    levels.set(hz, Math.max(level, floor));
  }
  return heard >= 3 ? strongestWhine(levels) : null;
}

// ---------------------------------------------------------------- loudness (ITU-R BS.1770-4)

type Biquad = { b: [number, number, number]; a: [number, number, number] };

/** The two K-weighting stages for a sample rate, as libebur128 designs them. */
export function kWeighting(rate: number): [Biquad, Biquad] {
  let f0 = 1681.974450955533;
  const gain = 3.999843853973347;
  let q = 0.7071752369554196;
  let k = Math.tan((Math.PI * f0) / rate);
  const vh = 10 ** (gain / 20);
  const vb = vh ** 0.4996667741545416;
  const a0 = 1 + k / q + k * k;
  const shelf: Biquad = {
    b: [
      (vh + (vb * k) / q + k * k) / a0,
      (2 * (k * k - vh)) / a0,
      (vh - (vb * k) / q + k * k) / a0,
    ],
    a: [1, (2 * (k * k - 1)) / a0, (1 - k / q + k * k) / a0],
  };
  f0 = 38.13547087602444;
  q = 0.5003270373238773;
  k = Math.tan((Math.PI * f0) / rate);
  const d = 1 + k / q + k * k;
  const highPass: Biquad = {
    b: [1, -2, 1],
    a: [1, (2 * (k * k - 1)) / d, (1 - k / q + k * k) / d],
  };
  return [shelf, highPass];
}

function filtered(samples: Float32Array, stages: Biquad[]): Float64Array {
  let input: ArrayLike<number> = samples;
  let out = new Float64Array(samples.length);
  for (const { b, a } of stages) {
    out = new Float64Array(samples.length);
    let x1 = 0;
    let x2 = 0;
    let y1 = 0;
    let y2 = 0;
    for (let i = 0; i < input.length; i++) {
      const x = input[i];
      const y = b[0] * x + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2;
      x2 = x1;
      x1 = x;
      y2 = y1;
      y1 = y;
      out[i] = y;
    }
    input = out;
  }
  return out;
}

/**
 * Integrated loudness in LUFS: K-weighted, in 400 ms blocks every 100 ms, gated at -70 LUFS and then 10 LU under the mean. A sound
 * shorter than one block is measured whole. -Infinity for silence. Every channel weighs the same (no surround weighting).
 */
export function loudness(channels: Float32Array[], rate: number): number {
  const weighted = channels.map((channel) =>
    filtered(channel, kWeighting(rate)),
  );
  const length = weighted[0]?.length ?? 0;
  if (length === 0) return -Infinity;
  const block = Math.round(0.4 * rate);
  const step = Math.round(0.1 * rate);
  const powers: number[] = [];
  const blockPower = (start: number, size: number) =>
    weighted.reduce((sum, channel) => {
      let total = 0;
      for (let i = start; i < start + size; i++)
        total += channel[i] * channel[i];
      return sum + total / size;
    }, 0);
  if (length < block) powers.push(blockPower(0, length));
  else
    for (let start = 0; start + block <= length; start += step)
      powers.push(blockPower(start, block));
  const lufs = (power: number) => -0.691 + 10 * Math.log10(power);
  const loud = powers.filter((p) => p > 0 && lufs(p) > -70);
  if (loud.length === 0) return -Infinity;
  const relative = lufs(loud.reduce((s, p) => s + p, 0) / loud.length) - 10;
  const gated = loud.filter((p) => lufs(p) > relative);
  return lufs(gated.reduce((s, p) => s + p, 0) / gated.length);
}

/** The largest sample, in dB under full scale. A sample peak: the peak between samples can be a little higher. */
export function samplePeak(channels: Float32Array[]): number {
  let peak = 0;
  for (const channel of channels)
    for (let i = 0; i < channel.length; i++)
      peak = Math.max(peak, Math.abs(channel[i]));
  return peak > 0 ? 20 * Math.log10(peak) : -Infinity;
}

/** The waveform's outline: the lowest and highest sample in each of `columns` slices. */
export function outline(
  samples: Float32Array,
  columns: number,
): { low: Float32Array; high: Float32Array } {
  const low = new Float32Array(columns);
  const high = new Float32Array(columns);
  for (let c = 0; c < columns; c++) {
    const from = Math.floor((samples.length * c) / columns);
    const to = Math.max(
      from + 1,
      Math.floor((samples.length * (c + 1)) / columns),
    );
    let min = 0;
    let max = 0;
    for (let i = from; i < to && i < samples.length; i++) {
      if (samples[i] < min) min = samples[i];
      if (samples[i] > max) max = samples[i];
    }
    low[c] = min;
    high[c] = max;
  }
  return { low, high };
}

/** The gain, as a multiplier, that brings a measured loudness to `target` without lifting the sample peak above `ceiling` dB. */
export function levellingGain(
  measured: number,
  peak: number,
  target: number,
  ceiling: number,
): number {
  if (!Number.isFinite(measured) || !Number.isFinite(peak)) return 1;
  const gainDb = Math.min(target - measured, ceiling - peak);
  return 10 ** (gainDb / 20);
}

/** 16-bit PCM WAV bytes, for playing a copy made in the window. */
export function wavBytes(channels: Float32Array[], rate: number): Uint8Array {
  const frames = channels[0]?.length ?? 0;
  const count = channels.length;
  const data = frames * count * 2;
  const bytes = new Uint8Array(44 + data);
  const view = new DataView(bytes.buffer);
  const text = (at: number, words: string) =>
    [...words].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
  text(0, "RIFF");
  view.setUint32(4, 36 + data, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, count, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * count * 2, true);
  view.setUint16(32, count * 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, data, true);
  let at = 44;
  for (let i = 0; i < frames; i++) {
    for (const channel of channels) {
      const v = Math.max(-1, Math.min(1, channel[i]));
      view.setInt16(at, v < 0 ? v * 0x8000 : v * 0x7fff, true);
      at += 2;
    }
  }
  return bytes;
}
