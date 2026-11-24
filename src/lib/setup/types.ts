import type { Failed } from "../shell/types";

/** How one program stands (0.87.0). Set aside is the person's word that they don't need it; it is still not here. */
export type SetupState = "here" | "missing" | "set-aside";

/** One program the pages use beyond the Companion itself, as the host gives it (`companion_core::setup::Row`). */
export type SetupRow = {
  key: string;
  name: string;
  /** The game whose pages use it; null for what every game's pages use. */
  game: string | null;
  neededBy: string;
  /** How it was found, or what happens without it, in the tools' words. */
  how: string;
  state: SetupState;
  /** A page most people open needs it. */
  everyday: boolean;
  /** Whether it has a page to get it from by hand. */
  page: boolean;
  /** The command that fetches it on this system, as typed; null where none is known. */
  command: string | null;
  fetcher: string | null;
  fetcherHere: boolean;
  /** The programs that must be here first, and are not, by name. */
  waitsFor: string[];
  /** The pages that use it (0.88.0), which say so while it is missing. */
  pages: string[];
};

/** How a fetch command ended. */
export type SetupExit = { exitCode: number | null; signal: string | null };

/** A fetch running or ended. */
export type Fetching = {
  key: string;
  name: string;
  command: string;
  output: string;
  ended: SetupExit | null;
};

/** One starter file as a repository stands with it (0.89.0). */
export type StarterState = {
  id: string;
  path: string;
  present: boolean;
  /** Ticked when offered. */
  chosen: boolean;
  /** Offered only while the features for AI agent sessions are shown. */
  forAgents: boolean;
  content: string;
};

/** A repository on the games list, and which starter files it has (0.89.0). */
export type Readiness = {
  game: string;
  gameName: string;
  name: string;
  found: boolean;
  git: boolean;
  starters: StarterState[];
};

export type Setup = {
  system: string;
  rows: SetupRow[];
  repositories: Readiness[];
  /** How many games are on the list; null before First steps made one. */
  games: number | null;
  fetching: Fetching | null;
};

export type SetupReading =
  | { state: "reading" }
  | { state: "browser" }
  | { state: "ready"; setup: Setup }
  | Failed;
