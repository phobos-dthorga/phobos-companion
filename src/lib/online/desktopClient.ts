import {
  ask,
  BROWSER,
  inBrowser,
  progressChannel,
} from "../shell/desktopClient";
import type { OnProgress } from "../shell/progress";
import type { Failed } from "../shell/types";
import type {
  NightlyAnswer,
  OnlineStatus,
  ReportPlace,
  RepoStatusAnswer,
  TheirIssue,
} from "./types";

type Read = { state: "ready"; status: OnlineStatus } | Failed;
const ready = (status: OnlineStatus) => ({ state: "ready" as const, status });

/** Which kinds of online call the program may make by itself (0.61.0). */
export async function readOnline(): Promise<Read | typeof BROWSER> {
  if (inBrowser()) return BROWSER;
  return ask<OnlineStatus, Read>("online_status", {}, ready);
}

/** Keeps the person's choice for one kind: on or off. */
export async function chooseOnline(kind: string, on: boolean): Promise<Read> {
  return ask<OnlineStatus, Read>("choose_online", { kind, on }, ready);
}

type Lights = { state: "ready"; lights: RepoStatusAnswer } | Failed;

/** A game's repositories with their remotes, and GitHub's checks while Gate lights is on. `pressed` is Look now. */
export async function readRepoStatus(
  game: string,
  pressed: boolean,
  onProgress?: OnProgress,
): Promise<Lights | typeof BROWSER> {
  if (inBrowser()) return BROWSER;
  return ask<RepoStatusAnswer, Lights>(
    "repo_status",
    { game, pressed, onProgress: progressChannel(onProgress) },
    (lights) => ({ state: "ready", lights }),
  );
}

type Nightly = { state: "ready"; nightly: NightlyAnswer } | Failed;

/** What the nightly watch found for a game's repositories, while Nightly watch is on (0.63.0). */
export async function readNightly(
  game: string,
  onProgress?: OnProgress,
): Promise<Nightly | typeof BROWSER> {
  if (inBrowser()) return BROWSER;
  return ask<NightlyAnswer, Nightly>(
    "nightly_watch",
    { game, onProgress: progressChannel(onProgress) },
    (nightly) => ({ state: "ready", nightly }),
  );
}

type Places = { state: "ready"; places: ReportPlace[] } | Failed;

/** Ours, theirs or unknown for each mod the Logs page names (0.65.0). */
export async function readReportPlaces(
  game: string,
  mods: string[],
): Promise<Places | typeof BROWSER> {
  if (inBrowser()) return BROWSER;
  return ask<{ mods: ReportPlace[] }, Places>(
    "report_places",
    { game, mods },
    (answer) => ({ state: "ready", places: answer.mods }),
  );
}

type Opened = { state: "ready"; clipboard: string | null } | Failed;

/** Opens our own repository's new-issue form, filled in; a text too long for an address comes back for the clipboard. */
export async function reportOurs(
  game: string,
  repository: string,
  title: string,
  body: string,
): Promise<Opened> {
  return ask<{ clipboard: string | null }, Opened>(
    "report_ours",
    { game, repository, title, body },
    (answer) => ({ state: "ready", clipboard: answer.clipboard }),
  );
}

type Done = { state: "ready" } | Failed;

/** Opens another author's blank new-issue form. */
export async function openTheirForm(
  game: string,
  repository: string,
): Promise<Done> {
  return ask<null, Done>("report_their_form", { game, repository }, () => ({
    state: "ready",
  }));
}

/** Opens one issue in the browser. */
export async function openIssue(
  game: string,
  repository: string,
  number: number,
): Promise<Done> {
  return ask<null, Done>(
    "report_open_issue",
    { game, repository, number },
    () => ({ state: "ready" }),
  );
}

type Issues = { state: "ready"; issues: TheirIssue[] } | Failed;

/** Another author's issues, those naming the fault's words first (keyless, on a press). */
export async function readTheirReports(
  game: string,
  repository: string,
  words: string,
): Promise<Issues> {
  return ask<{ issues: TheirIssue[] }, Issues>(
    "report_theirs",
    { game, repository, words },
    (answer) => ({ state: "ready", issues: answer.issues }),
  );
}
