import type { Report } from "../reports/types";
import type { Failed, Waiting } from "../shell/types";

/** Where a watch is (phobos-modkit 1.47.0): still sampling, reading in its counters and the log, done, or cut off unfinished. */
export type WatchState = "running" | "finishing" | "ended" | "cut-off";

/** The figures at a watch's latest sample, in bytes; a .NET figure is null until the runtime has counted. */
export type Latest = {
  t: number;
  claimed: number;
  in_ram: number;
  free_ram: number;
  collector: number | null;
  heap: number | null;
  gaps: number | null;
  live: number | null;
  outside: number | null;
};

/** A moment the owner marked, or a save the log shows loaded (seconds since 1970). */
export type Moment = { t: number; text: string };

/** One kept watch, as the status lists them, newest first. */
export type KeptWatch = {
  watch: string;
  started: number;
  label: string;
  minutes: number;
  samples: number;
  state: WatchState;
  reason: string | null;
  counters: boolean;
};

/** The kit's `watch-status` data: no watch kept yet, or the one it read. */
export type StatusData =
  | { state: "none"; watch: null; most_mark: number; kept: KeptWatch[] }
  | {
      state: WatchState;
      watch: string;
      most_mark: number;
      kept: KeptWatch[];
      label: string;
      started: number;
      minutes: number;
      every: number;
      seconds: number;
      elapsed: number;
      counters: boolean;
      reason: string | null;
      samples: number;
      marks: Moment[];
      saves: Moment[];
      latest: Latest | null;
    };

/** A watch the status read (any state but none). */
export type WatchStatus = Extract<StatusData, { watch: string }>;

/** What the host answers for a status or a report: word when the game's tools have no memory watch. */
export type MemoryReading = {
  available: boolean;
  report: Report | null;
  data: Record<string, unknown> | null;
  command_line: string;
};

export type StatusReading =
  | Waiting
  | { state: "ready"; reading: MemoryReading; status: StatusData | null };

export type ReportReading =
  Waiting | { state: "ready"; reading: MemoryReading };

/** What a stop or a mark did, or why the kit refused. */
export type StepResult = {
  ok: boolean;
  refusal: string | null;
  data: Record<string, unknown>;
};

export type StepReading = Failed | { state: "ready"; result: StepResult };

/** What the owner chose before starting a watch. */
export type StartChoice = {
  minutes: number;
  counters: boolean;
  label: string;
};
