import type { Page } from "@playwright/test";

const DAY = 86_400;
const nowSeconds = () => Math.floor(Date.now() / 1000);

/** Invented games, for the audit only. The program itself never shows sample data. */
export function sampleHome() {
  const now = nowSeconds();
  return {
    list_found: true,
    games: [
      {
        id: "first",
        name: "First Sample",
        repositories: ["first-mods", "first-tools"],
        last_worked: now,
        latest: [
          {
            repository: "first-mods",
            hash: "4d332dd",
            unix: now,
            subject: "A sample change made today",
          },
          {
            repository: "first-library",
            unix: now - 3 * DAY,
            subject: "An older sample change",
          },
        ],
        unfinished: [{ repository: "first-mods", files: 4 }],
        pending: [
          {
            product: "Sample Mod",
            repository: "first-mods",
            unreleased: 0,
            draft_version: "1.2.0",
            draft_date: "2026-11-09",
            earlier_drafts: 2,
          },
        ],
        open_work: ["A sample item still to do"],
        problems: [
          {
            repository: "first-gone",
            problem: "missing",
            detail: "/sample/first-gone",
          },
        ],
      },
      {
        id: "second",
        name: "Second Sample",
        repositories: ["second-mods"],
        last_worked: now - 40 * DAY,
        latest: [
          {
            repository: "second-mods",
            unix: now - 40 * DAY,
            subject: "A sample change from a while ago",
          },
        ],
        unfinished: [],
        pending: [],
        open_work: [],
        problems: [],
      },
      {
        id: "third",
        name: "Third Sample",
        repositories: [],
        last_worked: null,
        latest: [],
        unfinished: [],
        pending: [],
        open_work: [],
        problems: [],
      },
    ],
  };
}

/** What the stand-in host answers: a result or a failure, after any progress messages, each sent a pause apart. */
type Answer = {
  result?: unknown;
  failure?: unknown;
  progress?: unknown[];
  pauseMs?: number;
};

/** Stands in for the desktop host, through the same hooks Tauri provides. */
export async function mockHost(
  page: Page,
  answers: Record<string, Answer>,
): Promise<void> {
  // Features for agent sessions are shown unless a test says otherwise (0.37.0): most tests were written with them in view.
  const withDefaults: Record<string, Answer> = {
    agent_features: agentsShown,
    // Home's Safe copies card (0.42.0) reads on every visit; a test that is not about it sees a game that lists none.
    safe_copies_status: { result: [] },
    // And its daily run (0.44.0): not set, never run.
    safe_copies_daily: {
      result: {
        ok: true,
        title: "Daily safe copies: not set",
        refusal: null,
        data: {
          ok: true,
          schedule: { set: false, supported: true },
          next: null,
          last: null,
        },
      },
    },
    ...answers,
  };
  await page.addInitScript((given) => {
    const scope = window as unknown as Record<string, unknown>;
    scope.isTauri = true;
    let callbacks = 0;
    const pause = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));
    scope.__TAURI_INTERNALS__ = {
      // A progress channel registers its callback here; the stand-in reaches the channel through the request instead.
      transformCallback: () => ++callbacks,
      invoke: async (
        command: string,
        args?: {
          top?: number;
          onProgress?: { onmessage?: (message: unknown) => void };
        },
      ) => {
        const more = command === "run_report" && (args?.top ?? 0) > 100;
        // One command asked several kinds of question (connections) may have an answer for each kind: "command:kind"; a question
        // sent whole (the Explorer's) is told apart by its op.
        const asked = args as
          { kind?: string; request?: { op?: string } } | undefined;
        const kind = asked?.kind ?? asked?.request?.op;
        const answer =
          (kind ? given[`${command}:${kind}`] : undefined) ??
          given[more ? "run_report_more" : command];
        for (const message of answer.progress ?? []) {
          args?.onProgress?.onmessage?.(message);
          await pause(answer.pauseMs ?? 0);
        }
        if (answer.failure) throw answer.failure;
        return answer.result;
      },
    };
  }, withDefaults);
}

export const healthyKit: Answer = {
  result: { kit_version: "1.0.0", tools: 15 },
};

/** Features for agent sessions, shown because a repository uses them (0.37.0). */
export const agentsShown: Answer = {
  result: {
    choice: "found",
    shown: true,
    signs: [{ what: "AGENTS.md", repository: "first-mods" }],
  },
};

/** Nothing on this PC shows agent sessions at work, so their features are hidden. */
export const agentsHidden: Answer = {
  result: { choice: "found", shown: false, signs: [] },
};
