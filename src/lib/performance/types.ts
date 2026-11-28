import type { Fact, Finding, Report } from "../reports/types";
import type { Waiting } from "../shell/types";

/** What the host answers: word when the game's tools have no recordings. */
export type PerformanceReading = {
  available: boolean;
  report: Report | null;
  data: Record<string, unknown> | null;
  command_line: string;
};

/** The game's own figures in a recording, from D'thorga Framework's meter; null where it did not run. */
export type GameFigures = {
  ticks_a_second?: number | null;
  frames_a_second?: number | null;
  ms_a_tick?: number | null;
  longest_frame_ms?: number | null;
  speed?: number | null;
  pawns?: number | null;
  maps?: number | null;
  gc_paused?: number | null;
};

/** One recording as `list` gives it (phobos-modkit 1.152.0): its summary file, or word why it could not be read. */
export type Summary = {
  recording: string;
  label: string;
  recorded_at: string;
  seconds: number | string;
  game: GameFigures;
  findings: Finding[];
  facts?: Fact[];
  mods?: Record<string, number>;
  error?: string;
};

export type ListReading =
  | Waiting
  | { state: "ready"; reading: PerformanceReading; recordings: Summary[] };

export type ReportReading =
  Waiting | { state: "ready"; reading: PerformanceReading };

/** A closer look the page offers. */
export type LookKind = "callers" | "mod" | "compare" | "trend";

/** What the owner chose before recording. */
export type RecordChoice = {
  seconds: number;
  allocations: boolean;
  label: string;
};

/** A press of the key in the game, as it starts and as it ends (0.118.0). */
export type GameRecorded = {
  at: number;
  ended: boolean;
  ok: boolean;
  refusal: string | null;
  recording: string | null;
};
