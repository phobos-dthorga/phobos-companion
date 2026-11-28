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

/** One mod's cost by the newest recording (phobos-modkit 1.153.0's `costs`): its share of ticking, in %, against the earlier ones. */
export type ModCost = {
  name: string;
  package: string;
  share: number;
  earlier_middle: number | null;
  change: number | null;
  ours: boolean;
  flagged: boolean;
  version: string;
};

/** One busy method in the newest recording: its share of ticking (0 to 1) and who owns it. */
export type MethodCost = {
  name: string;
  share: number;
  of: string;
  of_kind: string;
};

/** What `costs` gives: the newest recording, our own mods' share and every mod's and busy method's cost. */
export type CostsData = {
  newest: string;
  recorded_at: string;
  label: string;
  first_finding: { text?: string; role?: string };
  recordings: number;
  own: {
    pattern: string;
    share: number;
    earlier_middle: number | null;
    note: string;
  };
  mods: ModCost[];
  methods: MethodCost[];
  game: GameFigures;
};
