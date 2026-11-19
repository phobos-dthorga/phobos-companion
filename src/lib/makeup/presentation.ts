import { formatSize } from "../shell/sizes";
import { shelfOf } from "../tests/presentation";
import type { TestList } from "../tests/types";
import type { Churned, GrowthPoint, Kind, MadeFile, Measure } from "./types";

/** The kinds in the order every picture colours and stacks them: one fixed colour each, validated as a set (theme series 1 to 8). */
export const KINDS: Kind[] = [
  "code",
  "tests",
  "data",
  "words",
  "pictures",
  "sounds",
  "build",
  "other",
];

/** Each kind's words, written out so the catalogue check can find them. */
export const KIND_WORDS: Record<Kind, string> = {
  code: "makeup-kind-code",
  tests: "makeup-kind-tests",
  data: "makeup-kind-data",
  words: "makeup-kind-words",
  pictures: "makeup-kind-pictures",
  sounds: "makeup-kind-sounds",
  build: "makeup-kind-build",
  other: "makeup-kind-other",
};

/** The theme role holding each kind's colour. */
export function kindRole(kind: Kind): string {
  return `series-${KINDS.indexOf(kind) + 1}`;
}

/** How much a file counts for under a measure. */
export function measured(file: MadeFile, measure: Measure): number {
  return measure === "lines"
    ? file.lines
    : measure === "bytes"
      ? file.bytes
      : 1;
}

/** Who a file belongs to, in words: its product, or where it sits outside any. */
export function ownerOf(
  file: MadeFile,
  outside: (group: string) => string,
): string {
  return file.product ?? outside(file.group ?? "");
}

export type TreeNode = {
  name: string;
  value: number;
  /** The kind a leaf is, or the kind most of a folder is. */
  kind: Kind;
  path?: string;
  children?: TreeNode[];
};

type Building = {
  value: number;
  kinds: Map<Kind, number>;
  children: Map<string, Building>;
  path?: string;
  kind?: Kind;
};

function fresh(): Building {
  return { value: 0, kinds: new Map(), children: new Map() };
}

function finish(name: string, node: Building): TreeNode {
  const kind =
    node.kind ??
    [...node.kinds.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
    "other";
  const children = [...node.children.entries()]
    .map(([childName, child]) => finish(childName, child))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  return {
    name,
    value: node.value,
    kind,
    ...(node.path ? { path: node.path } : {}),
    ...(children.length > 0 ? { children } : {}),
  };
}

/** The folders every one of these paths shares, to leave out of the tree: mods/PhobosFramework/ for most of a mod. */
export function sharedFolders(paths: string[]): string[] {
  if (paths.length === 0) return [];
  const split = paths.map((p) => p.split("/").slice(0, -1));
  const shared: string[] = [];
  for (let i = 0; i < split[0].length; i++) {
    const part = split[0][i];
    if (split.every((parts) => parts[i] === part)) shared.push(part);
    else break;
  }
  return shared;
}

/**
 * What the repository is made of as a tree: each owner (product, or the folder outside any), then its folders below what all its
 * files share, then the files. A file the measure gives nothing (a picture counted in lines) is left out.
 */
export function treeOf(
  files: MadeFile[],
  measure: Measure,
  owner: (file: MadeFile) => string,
): TreeNode[] {
  const byOwner = new Map<string, MadeFile[]>();
  for (const file of files) {
    if (measured(file, measure) <= 0) continue;
    const name = owner(file);
    const list = byOwner.get(name);
    if (list) list.push(file);
    else byOwner.set(name, [file]);
  }
  const roots: TreeNode[] = [];
  for (const [name, list] of byOwner) {
    const skip = sharedFolders(list.map((f) => f.path)).length;
    const root = fresh();
    for (const file of list) {
      const amount = measured(file, measure);
      const parts = file.path.split("/").slice(skip);
      let node = root;
      node.value += amount;
      node.kinds.set(file.kind, (node.kinds.get(file.kind) ?? 0) + amount);
      for (const part of parts) {
        let child = node.children.get(part);
        if (!child) {
          child = fresh();
          node.children.set(part, child);
        }
        node = child;
        node.value += amount;
        node.kinds.set(file.kind, (node.kinds.get(file.kind) ?? 0) + amount);
      }
      node.path = file.path;
      node.kind = file.kind;
    }
    roots.push(finish(name, root));
  }
  return roots.sort(
    (a, b) => b.value - a.value || a.name.localeCompare(b.name),
  );
}

export type Mix = {
  owners: string[];
  totals: Map<string, Map<Kind, number>>;
};

/** Each owner's total of each kind, biggest owner first. */
export function mixOf(
  files: MadeFile[],
  measure: Measure,
  owner: (file: MadeFile) => string,
): Mix {
  const totals = new Map<string, Map<Kind, number>>();
  for (const file of files) {
    const amount = measured(file, measure);
    if (amount <= 0) continue;
    const name = owner(file);
    const kinds = totals.get(name) ?? new Map<Kind, number>();
    kinds.set(file.kind, (kinds.get(file.kind) ?? 0) + amount);
    totals.set(name, kinds);
  }
  const sum = (kinds: Map<Kind, number>) =>
    [...kinds.values()].reduce((a, b) => a + b, 0);
  const owners = [...totals.keys()].sort(
    (a, b) => sum(totals.get(b)!) - sum(totals.get(a)!) || a.localeCompare(b),
  );
  return { owners, totals };
}

/** The kinds a mix or a growth holds anything of, in the fixed order. */
export function kindsPresent(totals: Iterable<Map<Kind, number>>): Kind[] {
  const seen = new Set<Kind>();
  for (const kinds of totals)
    for (const [kind, value] of kinds) if (value > 0) seen.add(kind);
  return KINDS.filter((kind) => seen.has(kind));
}

/** Growth day by day, one series a kind: lines, or size for the size measure (growth keeps no file counts, so files read as lines). */
export function growthOf(
  points: GrowthPoint[],
  measure: Measure,
): { days: string[]; series: { kind: Kind; values: number[] }[] } {
  const index = measure === "bytes" ? 1 : 0;
  const kinds = KINDS.filter((kind) =>
    points.some((p) => (p.kinds[kind]?.[index] ?? 0) > 0),
  );
  return {
    days: points.map((p) => p.day),
    series: kinds.map((kind) => ({
      kind,
      values: points.map((p) => p.kinds[kind]?.[index] ?? 0),
    })),
  };
}

export type TestState = "passed" | "seen" | "waiting" | "failed";

/** The states a test row is shown in here, in order: passed, seen working, waiting (or to look into), failed. */
export const TEST_STATES: TestState[] = ["passed", "seen", "waiting", "failed"];

export const TEST_STATE_WORDS: Record<TestState, string> = {
  passed: "makeup-tested-passed",
  seen: "makeup-tested-seen",
  waiting: "makeup-tested-waiting",
  failed: "makeup-tested-failed",
};

/** What state one row is in for this picture. */
export function testState(row: TestList["rows"][number]): TestState {
  const verdict = row.verdict?.verdict;
  if (verdict === "passed" || row.status === "passed") return "passed";
  if (verdict === "failed" || row.status === "failed") return "failed";
  const shelf = shelfOf(row);
  return shelf === "seen" ? "seen" : "waiting";
}

/**
 * How much of each product is tested in game: rows by state, by the products each row names a version of. A row naming none is
 * counted under `unnamed`.
 */
export function testedOf(
  lists: TestList[],
  unnamed: string,
): Map<string, Record<TestState, number>> {
  const found = new Map<string, Record<TestState, number>>();
  for (const list of lists)
    for (const row of list.rows) {
      const state = testState(row);
      const products = Object.keys(row.versions ?? {});
      for (const product of products.length > 0 ? products : [unnamed]) {
        const counts = found.get(product) ?? {
          passed: 0,
          seen: 0,
          waiting: 0,
          failed: 0,
        };
        counts[state] += 1;
        found.set(product, counts);
      }
    }
  return found;
}

/** The busiest files of some kinds, most often changed first. */
export function busiest(
  files: Churned[],
  kinds: Kind[],
  top: number,
): Churned[] {
  return files
    .filter((f) => kinds.includes(f.kind))
    .sort(
      (a, b) =>
        b.commits - a.commits ||
        b.added + b.removed - (a.added + a.removed) ||
        a.path.localeCompare(b.path),
    )
    .slice(0, top);
}

export { formatSize } from "../shell/sizes";

/** An amount under a measure, in words a person reads. */
export function formatAmount(
  value: number,
  measure: Measure,
  locale: string,
): string {
  return measure === "bytes"
    ? formatSize(value, locale)
    : value.toLocaleString(locale);
}
