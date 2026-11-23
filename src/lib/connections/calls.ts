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

export const ROW_HEIGHT = 34;
const BOX = { x: 12, width: 210, height: 40 };
const CALLS_X = 330;

export type CallsPicture = {
  width: number;
  height: number;
  box: { x: number; y: number; width: number; height: number };
  rows: (CallRow & { y: number; line: Arrow })[];
};

/** The method as a box on the left and each call a row on the right, a line from the box to each. */
export function callsPicture(rows: CallRow[]): CallsPicture {
  const height = Math.max(BOX.height + 24, rows.length * ROW_HEIGHT + 16);
  const box = {
    x: BOX.x,
    y: height / 2 - BOX.height / 2,
    width: BOX.width,
    height: BOX.height,
  };
  return {
    width: 760,
    height,
    box,
    rows: rows.map((r, index) => {
      const y = 8 + ROW_HEIGHT * index + ROW_HEIGHT / 2;
      return {
        ...r,
        y,
        line: arrow(box.x + box.width, height / 2, CALLS_X - 8, y, 2),
      };
    }),
  };
}

export const RING_SIZE = { width: 640, height: 300 };
const RING_RADIUS = { x: 190, y: 100 };
const STEP_RADIUS = 9;

export type RingPicture = {
  width: number;
  height: number;
  steps: (RingStep & {
    x: number;
    y: number;
    changed: boolean;
    anchor: "start" | "middle" | "end";
    labelY: number;
  })[];
  arrows: Arrow[];
  /** For a ring of one step: a loop back into itself. */
  loop: string | null;
};

/** A ring drawn as a loop: its steps round an ellipse from the top, clockwise, an arrow from each to the next and the last to the first. */
export function ringPicture(
  ring: RingStep[],
  changed: Set<string>,
): RingPicture {
  const cx = RING_SIZE.width / 2;
  const cy = RING_SIZE.height / 2;
  const count = ring.length;
  const steps = ring.map((step, index) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * index) / Math.max(count, 1);
    const x = round(cx + RING_RADIUS.x * Math.cos(angle));
    const y = round(cy + RING_RADIUS.y * Math.sin(angle));
    const anchor: "start" | "middle" | "end" =
      x > cx + 20 ? "start" : x < cx - 20 ? "end" : "middle";
    const labelY = anchor === "middle" ? (y < cy ? y - 16 : y + 26) : y + 5;
    return { ...step, x, y, changed: changed.has(step.key), anchor, labelY };
  });
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
  return { ...RING_SIZE, steps, arrows, loop };
}

/** A ring in words, from its first changed step round and back: "A → B → C → back to A". */
export function ringWords(ring: RingStep[], gameWord: string): string {
  if (ring.length === 0) return "";
  const named = ring.map((s) =>
    s.outside ? `${s.display} (${gameWord})` : s.display,
  );
  return `${named.join(" → ")} → ${ring[0].display}`;
}
