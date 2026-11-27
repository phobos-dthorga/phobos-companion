import { go, here } from "../navigation/navigation.svelte";
import type { OnProgress } from "../shell/progress";
import {
  askSnapshot,
  frozenAsk,
  releaseSnapshot,
  takeSnapshot,
} from "./desktopClient";
import type {
  Answer,
  AnswerReading,
  Ready,
  Released,
  Request,
  TakenReading,
} from "./types";

/** The snapshot this window holds: whose, its number in this run of the program, its first line and when that arrived. */
export type Held = {
  game: string;
  snapshot: number;
  ready: Ready;
  receivedAt: number;
  commandLine: string;
  /**
   * 0.103.0: browsing with the game frozen, with no snapshot held: each question is one frozen read of its own, and nothing found
   * in one can be followed into another (an address names an object only within one read).
   */
  frozen?: boolean;
};

/** A frozen session's stand-in for a snapshot's first line: nothing is held, so there is no pause, size or time limit to show. */
const FROZEN_READY: Ready = {
  ready: true,
  pid: 0,
  snapshotMs: 0,
  ageSeconds: 0,
  runtime: "",
  runtimeFolder: "",
  dac: "",
  modules: 0,
  threads: 0,
  segments: 0,
  objects: null,
  limitSeconds: 0,
};
let frozenSessions = 0;

/** Why the last snapshot went: the host's reasons, or "left" when the person left the page. */
export type LetGoReason = Released | "left";

/** An object opened in the held snapshot, kept under a token so no address is ever put into the trail or an address. */
export type Opened = { address: string; type: string; summary: string };

/**
 * The one snapshot the window holds (the host holds one at a time too), and why the last one went. Kept outside the page so the
 * page can say why when it is shown again; everything found in a snapshot is forgotten with it, since its addresses mean nothing
 * in the next.
 */
export const explorer = $state<{
  held: Held | null;
  letGo: { reason: LetGoReason; detail: string | null } | null;
}>({ held: null, letGo: null });

const tokens = new Map<string, Opened>();
const byAddress = new Map<string, string>();
const answers = new Map<string, Answer>();
let opened = 0;

function forget() {
  tokens.clear();
  byAddress.clear();
  answers.clear();
  opened = 0;
}

/** The token an object of the held snapshot is opened by: the same one each time it is opened again. */
export function tokenFor(object: Opened): string {
  const known = byAddress.get(object.address);
  if (known) return known;
  const token = `o${++opened}`;
  tokens.set(token, object);
  byAddress.set(object.address, token);
  return token;
}

/** The object a token stands for in the held snapshot, if it was opened in it. */
export function openedAs(token: string): Opened | undefined {
  return tokens.get(token);
}

/** Notes that a snapshot is no longer held, unless another has been taken since. */
function noteLetGo(
  snapshot: number,
  reason: LetGoReason,
  detail: string | null,
) {
  if (explorer.held?.snapshot !== snapshot) return;
  explorer.held = null;
  explorer.letGo = { reason, detail };
  forget();
}

/** Takes a snapshot of the running game, after the person's press and confirmation, and holds it in place of any other. */
export async function take(
  game: string,
  label: string,
  onProgress?: OnProgress,
): Promise<TakenReading> {
  const reading = await takeSnapshot(game, label, onProgress);
  if (
    reading.state === "ready" &&
    reading.taken.snapshot !== null &&
    reading.taken.ready?.ready === true
  ) {
    forget();
    explorer.held = {
      game,
      snapshot: reading.taken.snapshot,
      ready: reading.taken.ready,
      receivedAt: Date.now(),
      commandLine: reading.taken.command_line,
    };
    explorer.letGo = null;
  }
  return reading;
}

/**
 * Starts browsing with the game frozen (0.103.0), after the person's press and the frozen card: lets any snapshot held go first,
 * and holds nothing. Its number is below zero, so it is never taken for a snapshot's.
 */
export async function startFrozen(game: string): Promise<void> {
  const held = explorer.held;
  if (held && !held.frozen) await releaseSnapshot(held.snapshot);
  forget();
  explorer.held = {
    game,
    snapshot: -++frozenSessions,
    ready: FROZEN_READY,
    receivedAt: Date.now(),
    commandLine: "",
    frozen: true,
  };
  explorer.letGo = null;
}

/** An answer already given in the held snapshot, so going back to it asks nothing again. */
export function remembered<T>(request: Request): Answer<T> | undefined {
  return answers.get(JSON.stringify(request)) as Answer<T> | undefined;
}

/** Asks the held snapshot one question, or answers from what it already said; notes when the snapshot has gone. */
export async function question<T>(
  request: Request,
  onProgress?: OnProgress,
): Promise<AnswerReading<T>> {
  const held = explorer.held;
  if (!held)
    return {
      state: "ready",
      answer: { ok: false, data: null as T, error: null, released: "gone" },
    };
  const key = JSON.stringify(request);
  const known = answers.get(key) as Answer<T> | undefined;
  if (known) return { state: "ready", answer: known };
  const reading = held.frozen
    ? await frozenAsk<T>(held.game, request, onProgress)
    : await askSnapshot<T>(held.snapshot, request, onProgress);
  if (reading.state === "ready") {
    const answer = reading.answer;
    if (answer.released)
      noteLetGo(held.snapshot, answer.released, answer.error);
    else if (answer.ok && explorer.held?.snapshot === held.snapshot)
      answers.set(key, answer);
  }
  return reading;
}

/** Lets the held snapshot go: Let it go, the time limit as the window counts it, or leaving the page. */
export async function letGo(reason: LetGoReason = "asked"): Promise<void> {
  const held = explorer.held;
  if (!held) return;
  if (held.frozen) {
    // Nothing is held while browsing frozen: ending it only forgets what it read.
    explorer.held = null;
    explorer.letGo = null;
    forget();
    return;
  }
  noteLetGo(held.snapshot, reason, null);
  await releaseSnapshot(held.snapshot);
}

/** Opens a kind of the held snapshot, as a step on the trail. */
export function openKind(type: string) {
  go({ ...here(), focus: { view: "kind", kind: type }, dialog: null });
}

/** Opens an object of the held snapshot, as a step on the trail; the trail keeps its token, never its address. */
export function openObject(object: Opened) {
  const held = explorer.held;
  if (!held) return;
  go({
    ...here(),
    focus: {
      view: "object",
      snapshot: String(held.snapshot),
      object: tokenFor(object),
    },
    dialog: null,
  });
}

/** The live checks, asked of the held snapshot (0.91.0): a step on the trail; the answer is remembered while it is held. */
export function openChecks() {
  if (!explorer.held) return;
  go({ ...here(), focus: { view: "checks" }, dialog: null });
}

/** Back to the overview of the held snapshot (or the start, with none held), as a step on the trail. */
export function openOverview() {
  go({ ...here(), focus: {}, dialog: null });
}
