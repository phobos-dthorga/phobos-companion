import type { Call, Calls, CallsMethod, RingStep } from "./types";

/**
 * What a commit did to its methods' calls, laid out for the code viewer's "How it connects" (0.82.0; kit 1.116.0's `connections
 * calls`). Pure: which methods to show for the thing chosen, each call's row and line, and a ring of calls drawn as a loop. Every
 * state is carried by a line's style and a word, never by colour alone.
 */

/** Before the commit (calls gone and kept), after it (new and kept), or the change (all three). */
export type CallsView = "before" | "after" | "change";

export type CallState = "gone" | "new" | "kept";

export type CallRow = {
  key: string;
  display: string;
  state: CallState;
  viaBase: boolean;
  /** Another assembly's, the game's most often. */
  outside: boolean;
  assembly: string | null;
  /** The connections id of a method of ours, to put in the middle of the picture. */
  node: string | null;
  /** Where a call that left this method went, whole, or where a new one came from. */
  movedTo: string | null;
  movedFrom: string | null;
};

const ORDER: Record<CallState, number> = { gone: 0, new: 1, kept: 2 };

/** The methods to show for the thing chosen: the method itself, or the methods of a type chosen. */
export function methodsFor(calls: Calls, chosen: string | null): CallsMethod[] {
  if (!chosen) return [];
  const exact = calls.methods.filter((m) => m.node === chosen);
  if (exact.length > 0) return exact;
  return calls.methods.filter((m) => m.node?.startsWith(`${chosen}.`));
}

function row(method: CallsMethod, call: Call, state: CallState): CallRow {
  const movedTo =
    state === "gone"
      ? (method.movedTo?.find((m) => m.calls.includes(call.key))?.display ??
        null)
      : null;
  const movedFrom =
    state === "new"
      ? (method.movedFrom?.find((m) => m.calls.includes(call.key))?.display ??
        null)
      : null;
  return {
    key: call.key,
    display: call.display,
    state,
    viaBase: call.viaBase,
    outside: !call.file,
    assembly: call.assembly ?? null,
    node: call.node ?? null,
    movedTo,
    movedFrom,
  };
}

/** One method's calls as the view shows them: gone first, then new, then kept, each in name order. */
export function callRows(method: CallsMethod, view: CallsView): CallRow[] {
  const rows = [
    ...(view === "after" ? [] : method.gone.map((c) => row(method, c, "gone"))),
    ...(view === "before" ? [] : method.new.map((c) => row(method, c, "new"))),
    ...method.kept.map((c) => row(method, c, "kept")),
  ];
  return rows.sort(
    (a, b) =>
      ORDER[a.state] - ORDER[b.state] || a.display.localeCompare(b.display),
  );
}

/** A straight line with its arrowhead's three points, shortened at both ends so it stops short of what it joins. */
export type Arrow = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  head: string;
};

export function arrow(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  trim = 0,
): Arrow {
  const length = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = (x2 - x1) / length;
  const uy = (y2 - y1) / length;
  const sx = x1 + ux * trim;
  const sy = y1 + uy * trim;
  const ex = x2 - ux * trim;
  const ey = y2 - uy * trim;
  const back = 9;
  const wide = 4.5;
  const bx = ex - ux * back;
  const by = ey - uy * back;
  const head = [
    [ex, ey],
    [bx - uy * wide, by + ux * wide],
    [bx + uy * wide, by - ux * wide],
  ]
    .map(([x, y]) => `${round(x)},${round(y)}`)
    .join(" ");
  return { x1: round(sx), y1: round(sy), x2: round(ex), y2: round(ey), head };
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * How wide a piece of text is drawn, in pixels. The window measures with the page's own font; a test, or a window that cannot
 * measure, takes `estimate`. Every picture here is sized from its text (0.83.1), so a long name never runs out of its box or off
 * the picture's edge.
 */
export type Measure = (text: string, size: number, bold?: boolean) => number;

/** A rough width for a proportional font: a little over half the text's size a character, a little more when bold. */
export const estimate: Measure = (text, size, bold = false) =>
  text.length * size * (bold ? 0.62 : 0.58);

/** The text sizes the pictures are drawn in, in pixels, as their styles set them. */
export const TEXT = { name: 13, note: 11, word: 12, label: 13 };

export const ROW_HEIGHT = 34;
const BOX = { x: 12, height: 40, pad: 14, min: 120, max: 440 };
/** From the method's box to the arrowheads: room for the lines to fan out to every row. */
const FAN = 96;
const MARGIN = 16;

export type CallsPicture = {
  width: number;
  height: number;
  box: { x: number; y: number; width: number; height: number };
  /** The method's name as its box shows it: whole, or its parameters left out when it is too long; `full` when shortened. */
  label: string;
  full: string | null;
  /** Where the state words and the call names start. */
  wordX: number;
  nameX: number;
  rows: (CallRow & { y: number; line: Arrow; note: string })[];
};

/** A label that fits a width: whole, then without its parameters, then cut with an ellipsis. */
export function fitted(
  text: string,
  room: number,
  size: number,
  bold: boolean,
  measure: Measure,
): string {
  if (measure(text, size, bold) <= room) return text;
  const bare = text.replace(/\(.*\)$/, "(…)");
  if (bare !== text && measure(bare, size, bold) <= room) return bare;
  let cut = bare;
  while (cut.length > 1 && measure(`${cut}…`, size, bold) > room)
    cut = cut.slice(0, -1);
  return `${cut}…`;
}

/**
 * The method as a box on the left and each call a row on the right, a line from the box to each. The box is as wide as the
 * method's name (within limits), and the picture as wide as its longest call: it is drawn at the page's own size and scrolls
 * sideways when wide, never stretched to fill the window.
 */
export function callsPicture(
  rows: CallRow[],
  options: {
    label?: string;
    notes?: string[];
    words?: string[];
    measure?: Measure;
  } = {},
): CallsPicture {
  const measure = options.measure ?? estimate;
  const full = options.label ?? "";
  const label = fitted(full, BOX.max - 2 * BOX.pad, TEXT.label, true, measure);
  const boxWidth = Math.min(
    BOX.max,
    Math.max(BOX.min, measure(label, TEXT.label, true) + 2 * BOX.pad),
  );
  const height = Math.max(BOX.height + 24, rows.length * ROW_HEIGHT + 16);
  const box = {
    x: BOX.x,
    y: height / 2 - BOX.height / 2,
    width: round(boxWidth),
    height: BOX.height,
  };
  const heads = box.x + box.width + FAN;
  const wordX = heads + 10;
  const words = options.words ?? ["gone", "new", "kept"];
  const nameX = round(
    wordX + Math.max(...words.map((w) => measure(w, TEXT.word, true))) + 14,
  );
  const notes = rows.map((_, index) => options.notes?.[index] ?? "");
  const longest = Math.max(
    0,
    ...rows.map((r, index) =>
      Math.max(measure(r.display, TEXT.name), measure(notes[index], TEXT.note)),
    ),
  );
  return {
    width: Math.ceil(nameX + longest + MARGIN),
    height,
    box,
    label,
    full: label === full ? null : full,
    wordX: round(wordX),
    nameX,
    rows: rows.map((r, index) => {
      const y = 8 + ROW_HEIGHT * index + ROW_HEIGHT / 2;
      return {
        ...r,
        y,
        note: notes[index],
        line: arrow(box.x + box.width, height / 2, heads, y, 2),
      };
    }),
  };
}

const RING_HEIGHT = 300;
const RING_RADIUS = { x: 190, y: 100 };
const STEP_RADIUS = 9;
/** From a step's circle to the start of its name beside it. */
const LABEL_GAP = 16;

export type RingPicture = {
  width: number;
  height: number;
  /** The middle of the loop, where its word goes. */
  cx: number;
  cy: number;
  steps: (RingStep & {
    x: number;
    y: number;
    changed: boolean;
    anchor: "start" | "middle" | "end";
    label: string;
    labelX: number;
    labelY: number;
  })[];
  arrows: Arrow[];
  /** For a ring of one step: a loop back into itself. */
  loop: string | null;
};

/**
 * A ring drawn as a loop: its steps round an ellipse from the top, clockwise, an arrow from each to the next and the last to the
 * first. The picture is widened on either side until every step's name fits, a game's step marked with `gameWord`.
 */
export function ringPicture(
  ring: RingStep[],
  changed: Set<string>,
  options: { gameWord?: string; measure?: Measure } = {},
): RingPicture {
  const measure = options.measure ?? estimate;
  const count = ring.length;
  const placed = ring.map((step, index) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * index) / Math.max(count, 1);
    const x = RING_RADIUS.x * Math.cos(angle);
    const y = RING_RADIUS.y * Math.sin(angle);
    const anchor: "start" | "middle" | "end" =
      x > 20 ? "start" : x < -20 ? "end" : "middle";
    const label =
      step.outside && options.gameWord
        ? `${step.display} (${options.gameWord})`
        : step.display;
    const wide = measure(label, TEXT.label);
    const labelX =
      anchor === "start" ? x + LABEL_GAP : anchor === "end" ? x - LABEL_GAP : x;
    const left =
      anchor === "start"
        ? labelX
        : anchor === "end"
          ? labelX - wide
          : labelX - wide / 2;
    return { step, x, y, anchor, label, labelX, left, right: left + wide };
  });
  // Room on each side for the widest name, kept even so the loop stays in the middle.
  const reach = Math.max(
    RING_RADIUS.x + STEP_RADIUS,
    ...placed.map((p) => Math.max(-p.left, p.right)),
  );
  const cx = Math.ceil(reach + MARGIN);
  const cy = RING_HEIGHT / 2;
  const steps = placed.map((p) => ({
    ...p.step,
    x: round(cx + p.x),
    y: round(cy + p.y),
    changed: changed.has(p.step.key),
    anchor: p.anchor,
    label: p.label,
    labelX: round(cx + p.labelX),
    labelY:
      p.anchor === "middle"
        ? p.y < 0
          ? cy + p.y - 16
          : cy + p.y + 26
        : cy + p.y + 5,
  }));
  const arrows =
    count < 2
      ? []
      : steps.map((step, index) => {
          const next = steps[(index + 1) % count];
          return arrow(step.x, step.y, next.x, next.y, STEP_RADIUS + 4);
        });
  const loop =
    count === 1
      ? `M ${steps[0].x - 6} ${steps[0].y + 8} C ${steps[0].x - 60} ${steps[0].y + 80} ${steps[0].x + 60} ${steps[0].y + 80} ${steps[0].x + 6} ${steps[0].y + 8}`
      : null;
  return { width: 2 * cx, height: RING_HEIGHT, cx, cy, steps, arrows, loop };
}

/** A ring in words, from its first changed step round and back: "A → B → C → back to A". */
export function ringWords(ring: RingStep[], gameWord: string): string {
  if (ring.length === 0) return "";
  const named = ring.map((s) =>
    s.outside ? `${s.display} (${gameWord})` : s.display,
  );
  return `${named.join(" → ")} → ${ring[0].display}`;
}
