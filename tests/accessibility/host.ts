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
        last_worked: now,
        latest: [
          {
            repository: "first-mods",
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

type Answer = { result?: unknown; failure?: unknown };

/** Stands in for the desktop host, through the same hooks Tauri provides. */
export async function mockHost(
  page: Page,
  answers: Record<string, Answer>,
): Promise<void> {
  await page.addInitScript((given) => {
    const scope = window as unknown as Record<string, unknown>;
    scope.isTauri = true;
    scope.__TAURI_INTERNALS__ = {
      invoke: async (command: string, args?: { top?: number }) => {
        const more = command === "run_report" && (args?.top ?? 0) > 100;
        const answer = given[more ? "run_report_more" : command];
        if (answer.failure) throw answer.failure;
        return answer.result;
      },
    };
  }, answers);
}

export const healthyKit: Answer = {
  result: { kit_version: "1.0.0", tools: 15 },
};
