import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";

/**
 * The installed program's security policy, from src-tauri/tauri.conf.json, put on the page as the program would (0.69.1: the
 * browser checks ran without it, so a picture of the Picks page that the installed program refused passed here).
 */
export async function useInstalledPolicy(
  page: Page,
  change: (csp: string) => string = (csp) => csp,
) {
  const config = JSON.parse(
    readFileSync("src-tauri/tauri.conf.json", "utf-8"),
  ) as { app: { security: { csp: string } } };
  const csp = change(config.app.security.csp);
  await page.route("**/*", async (route) => {
    if (route.request().resourceType() !== "document") return route.fallback();
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: { ...response.headers(), "content-security-policy": csp },
    });
  });
}

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
    // Home's Workshop note (0.69.0) reads on every visit; a test that is not about it sees nothing waiting.
    publish_waiting: { result: { waiting: 0, mods: [] } },
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
          | { kind?: string; side?: string; request?: { op?: string } }
          | undefined;
        // The code viewer's two sides of a changed file (0.50.0) are told apart by their side.
        const kind = asked?.kind ?? asked?.request?.op ?? asked?.side;
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

/** A made-up picture 8 x 4 pixels (0.53.0), handed over wherever a page reads a picture. */
export const SAMPLE_PNG = Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAECAYAAACzzX7wAAAAHElEQVR4nGNsaGj4z4AEGhoaGJH5TMgcbIByBQDwkwQIPakIVQAAAABJRU5ErkJggg==",
    "base64",
  ),
);

/** Chooses a game from the picker in the top bar (0.66.0: the games left the side column for it). */
export async function chooseGame(page: Page, name: string) {
  await page.getByRole("button", { name: /Looking at/ }).click();
  await page
    .locator("#game-picker-list")
    .getByRole("button", { name: new RegExp(name) })
    .click();
}

/** Opens a tab of the page shown (0.66.0), by the words it starts with: a tab with something waiting adds them to its name. */
export async function openTab(page: Page, name: string) {
  await page.getByRole("tab", { name: new RegExp(`^${name}`) }).click();
}

/** A made-up tone a quarter of a second long, as a 16-bit mono WAV at 8 kHz. */
export function toneWav(hz: number, amplitude: number): number[] {
  const rate = 8000;
  const frames = 2000;
  const bytes = Buffer.alloc(44 + frames * 2);
  bytes.write("RIFF", 0);
  bytes.writeUInt32LE(36 + frames * 2, 4);
  bytes.write("WAVEfmt ", 8);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(rate, 24);
  bytes.writeUInt32LE(rate * 2, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36);
  bytes.writeUInt32LE(frames * 2, 40);
  for (let i = 0; i < frames; i++)
    bytes.writeInt16LE(
      Math.round(amplitude * 32767 * Math.sin((2 * Math.PI * hz * i) / rate)),
      44 + i * 2,
    );
  return Array.from(bytes);
}
