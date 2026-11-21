import { describe, expect, it } from "vitest";
import {
  averagePower,
  fft,
  findWhine,
  highsGap,
  levellingGain,
  loudness,
  mono,
  outline,
  samplePeak,
  spectrogram,
  strongestWhine,
  wavBytes,
} from "./sound";

const RATE = 48000;

function tone(
  hz: number,
  amplitude: number,
  seconds = 2,
  rate = RATE,
): Float32Array {
  const out = new Float32Array(Math.round(seconds * rate));
  for (let i = 0; i < out.length; i++)
    out[i] = amplitude * Math.sin((2 * Math.PI * hz * i) / rate);
  return out;
}

function noise(amplitude: number, seconds = 2, seed = 1): Float32Array {
  let state = seed;
  const out = new Float32Array(Math.round(seconds * RATE));
  for (let i = 0; i < out.length; i++) {
    state = (state * 1103515245 + 12345) % 2147483648;
    out[i] = amplitude * ((state / 2147483648) * 2 - 1);
  }
  return out;
}

function add(...parts: Float32Array[]): Float32Array {
  const out = new Float32Array(parts[0].length);
  for (const part of parts)
    for (let i = 0; i < out.length; i++) out[i] += part[i];
  return out;
}

describe("measuring a sound", () => {
  it("puts a tone in its own bin", () => {
    const real = new Float64Array(64);
    const imag = new Float64Array(64);
    for (let i = 0; i < 64; i++) real[i] = Math.cos((2 * Math.PI * 5 * i) / 64);
    fft(real, imag);
    const sizes = Array.from(real, (r, k) => Math.hypot(r, imag[k]));
    expect(sizes.indexOf(Math.max(...sizes.slice(0, 32)))).toBe(5);
    expect(sizes[5]).toBeCloseTo(32, 6);
  });

  it("measures a 1 kHz tone at -20 dBFS in one channel as -23 LUFS, the standard's own check", () => {
    expect(loudness([tone(997, 0.1)], RATE)).toBeCloseTo(-23.0, 1);
    expect(loudness([tone(997, 0.1, 2, 44100)], 44100)).toBeCloseTo(-23.0, 1);
    expect(loudness([tone(997, 0.1), tone(997, 0.1)], RATE)).toBeCloseTo(
      -20.0,
      1,
    );
    expect(loudness([new Float32Array(RATE)], RATE)).toBe(-Infinity);
  });

  it("gives the sample peak in dB under full scale", () => {
    expect(samplePeak([tone(1000, 0.5)])).toBeCloseTo(-6.02, 1);
    expect(samplePeak([new Float32Array(10)])).toBe(-Infinity);
  });

  it("finds a quiet 15 kHz whine under a louder hum, as the pilot's concentrator had", () => {
    const sound = add(tone(120, 0.5), tone(15000, 0.01), noise(0.01));
    const whine = findWhine(averagePower(sound), RATE);
    expect(whine?.hz).toBe(15000);
    expect(whine?.prominenceDb).toBeGreaterThan(12);
    const plain = findWhine(
      averagePower(add(tone(120, 0.5), noise(0.01))),
      RATE,
    );
    expect(plain?.prominenceDb ?? 0).toBeLessThan(12);
  });

  it("finds no whine in a sound with nothing up high, such as one recorded at 8 kHz", () => {
    expect(findWhine(averagePower(tone(440, 0.5)), RATE)).toBeNull();
  });

  it("judges a band by its rise above the sound's slope, not a plain median", () => {
    const sloping = new Map([
      [4000, -10],
      [8000, -20],
      [16000, -30],
    ]);
    expect(strongestWhine(sloping)?.prominenceDb).toBeCloseTo(0, 5);
    expect(strongestWhine(new Map([[4000, -10]]))).toBeNull();
  });

  it("says how far the highs sit below the whole", () => {
    const hiss = highsGap(averagePower(add(tone(200, 0.5), noise(0.3))), RATE);
    const quiet = highsGap(averagePower(tone(200, 0.5)), RATE);
    expect(hiss).toBeLessThan(12);
    expect(quiet).toBeGreaterThan(40);
  });

  it("draws frequency over time and the waveform's outline", () => {
    const found = spectrogram(tone(6000, 0.5, 0.5), RATE, 8);
    expect([found.columns, found.bins]).toEqual([8, 1024]);
    const column = Array.from(found.levels.slice(0, 1024));
    expect(column.indexOf(Math.max(...column))).toBe(256);
    const shape = outline(new Float32Array([0, 0.5, -0.25, 1]), 2);
    expect([...shape.low, ...shape.high]).toEqual([0, -0.25, 0.5, 1]);
  });

  it("mixes channels and levels a copy without lifting its peak too far", () => {
    expect(
      Array.from(mono([new Float32Array([1, 0]), new Float32Array([0, 1])])),
    ).toEqual([0.5, 0.5]);
    expect(levellingGain(-40, -30, -20, -6)).toBeCloseTo(10, 5);
    expect(levellingGain(-40, -10, -20, -6)).toBeCloseTo(10 ** (4 / 20), 5);
    expect(levellingGain(-Infinity, -10, -20, -6)).toBe(1);
  });

  it("writes a WAV a browser can play", () => {
    const bytes = wavBytes([new Float32Array([0, 1, -1])], 8000);
    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe("RIFF");
    expect(bytes.length).toBe(44 + 6);
    expect(new DataView(bytes.buffer).getInt16(46, true)).toBe(0x7fff);
  });
});
