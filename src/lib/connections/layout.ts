import type { Around, Flow, Group, Relation, Thing } from "./types";

/**
 * Where everything is drawn, worked out without a screen so it can be tested: the radial picture (the thing in the middle, a hub for
 * each kind of connection around it, its members fanned out beyond) and the flow (callers on the left, callees on the right).
 */

export const NODE_RADIUS = 24;
/** The most members a hub fans out; the rest are counted on a "more" node that opens the list. */
export const FANNED = 14;

const HUB_RING = 130;
const MEMBER_RING = 235;
const SECOND_RING = 290;
const MIN_GAP = 54;
const ROW_GAP = 86;
const COLUMN_STEP = 230;
const MARGIN = 66;
/** The radial picture is a square just big enough for its outer ring and the labels under it. */
export const RADIAL_SIZE = 2 * (SECOND_RING + MARGIN);

export type Placed = {
  key: string;
  x: number;
  y: number;
  role: "centre" | "hub" | "member" | "more";
  relation: Relation | null;
  thing: Thing | null;
  count: number;
};

export type Line = {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  relation: Relation | null;
  exact: boolean;
};

export type Picture = {
  width: number;
  height: number;
  nodes: Placed[];
  lines: Line[];
};

/** The groups worth drawing: the relations chosen, and outside things only when asked for. */
export function shownGroups(
  groups: Group[],
  relations: Set<Relation>,
  outside: boolean,
): Group[] {
  return groups
    .filter((g) => relations.has(g.relation))
    .map((g) => {
      const nodes = outside ? g.nodes : g.nodes.filter((n) => !n.external);
      const hidden = g.nodes.length - nodes.length;
      return { ...g, nodes, count: g.count - hidden };
    })
    .filter((g) => g.nodes.length > 0);
}

/** The radial picture: the thing in the middle, each group's hub around it, and each group's members beyond its hub. */
export function radial(around: Around, groups: Group[]): Picture {
  const height = RADIAL_SIZE;
  const width = RADIAL_SIZE;
  const centre = { x: width / 2, y: height / 2 };
  const nodes: Placed[] = [
    {
      key: around.centre.id,
      ...centre,
      role: "centre",
      relation: null,
      thing: around.centre,
      count: 0,
    },
  ];
  const lines: Line[] = [];
  if (groups.length === 0) return { width, height, nodes, lines };
  const weights = groups.map((g) => Math.min(g.nodes.length, FANNED) + 2);
  const total = weights.reduce((a, b) => a + b, 0);
  let angle = -Math.PI / 2 - (Math.PI * weights[0]) / total;
  groups.forEach((group, index) => {
    const sector = (2 * Math.PI * weights[index]) / total;
    const middle = angle + sector / 2;
    const hub = point(centre, HUB_RING, middle);
    const hubKey = `hub:${group.relation}`;
    nodes.push({
      key: hubKey,
      ...hub,
      role: "hub",
      relation: group.relation,
      thing: null,
      count: group.count,
    });
    lines.push({
      key: `${around.centre.id}->${hubKey}`,
      x1: centre.x,
      y1: centre.y,
      x2: hub.x,
      y2: hub.y,
      relation: group.relation,
      exact: group.exact,
    });
    const fanned = group.nodes.slice(0, FANNED);
    const more = group.count - fanned.length;
    const slots = fanned.length + (more > 0 ? 1 : 0);
    const usable = sector * 0.86;
    const twoRings = (usable * MEMBER_RING) / Math.max(slots, 1) < MIN_GAP;
    for (let slot = 0; slot < slots; slot++) {
      const at =
        slots === 1
          ? middle
          : middle - usable / 2 + (usable * slot) / (slots - 1);
      const ring = twoRings && slot % 2 === 1 ? SECOND_RING : MEMBER_RING;
      const place = point(centre, ring, at);
      const thing = fanned[slot] ?? null;
      const key = thing
        ? `${group.relation}:${thing.id}`
        : `more:${group.relation}`;
      nodes.push({
        key,
        ...place,
        role: thing ? "member" : "more",
        relation: group.relation,
        thing,
        count: thing ? 0 : more,
      });
      lines.push({
        key: `${hubKey}->${key}`,
        x1: hub.x,
        y1: hub.y,
        x2: place.x,
        y2: place.y,
        relation: group.relation,
        exact: thing ? (thing.exact ?? true) : group.exact,
      });
    }
    angle += sector;
  });
  return { width, height, nodes, lines };
}

/** The flow: a column for each step from the furthest caller to the furthest callee, the calls between them as lines. */
export function flowPicture(flow: Flow, outside: boolean): Picture {
  const columns = flow.columns.map((c) => ({
    ...c,
    nodes: outside
      ? c.nodes
      : c.nodes.filter((n) => !n.external || n.id === flow.centre),
  }));
  const tallest = Math.max(1, ...columns.map((c) => c.nodes.length));
  const height = Math.max(
    2 * MARGIN + (tallest - 1) * ROW_GAP,
    2 * MARGIN + ROW_GAP,
  );
  const width = Math.max(2 * MARGIN + (columns.length - 1) * COLUMN_STEP, 480);
  const step =
    columns.length > 1 ? (width - 2 * MARGIN) / (columns.length - 1) : 0;
  const nodes: Placed[] = [];
  const where = new Map<string, { x: number; y: number }>();
  columns.forEach((column, index) => {
    const x = columns.length > 1 ? MARGIN + step * index : width / 2;
    const top = height / 2 - ((column.nodes.length - 1) * ROW_GAP) / 2;
    column.nodes.forEach((thing, row) => {
      const y = top + row * ROW_GAP;
      where.set(thing.id, { x, y });
      nodes.push({
        key: `${column.step}:${thing.id}`,
        x,
        y,
        role: thing.id === flow.centre ? "centre" : "member",
        relation:
          column.step < 0 ? "called-by" : column.step > 0 ? "calls" : null,
        thing,
        count: 0,
      });
    });
  });
  const lines: Line[] = flow.edges
    .filter((e) => where.has(e.source) && where.has(e.target))
    .map((e) => {
      const from = where.get(e.source)!;
      const to = where.get(e.target)!;
      return {
        key: `${e.source}->${e.target}`,
        x1: from.x,
        y1: from.y,
        x2: to.x,
        y2: to.y,
        relation: "calls",
        exact: e.exact,
      };
    });
  return { width, height, nodes, lines };
}

/** A curve from one point to another, bent sideways so lines between columns read as flowing left to right. */
export function curve(line: Line): string {
  const bend = (line.x2 - line.x1) / 2;
  return `M ${line.x1} ${line.y1} C ${line.x1 + bend} ${line.y1}, ${line.x2 - bend} ${line.y2}, ${line.x2} ${line.y2}`;
}

function point(
  centre: { x: number; y: number },
  radius: number,
  angle: number,
) {
  return {
    x: round(centre.x + radius * Math.cos(angle)),
    y: round(centre.y + radius * Math.sin(angle)),
  };
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

/** The zoom a button press moves to: a step in or out, never past the limits. */
export function zoomed(scale: number, direction: 1 | -1): number {
  const next = direction > 0 ? scale * 1.25 : scale / 1.25;
  return Math.min(4, Math.max(0.4, Math.round(next * 100) / 100));
}
