import type { Pending } from "../shell/types";

/** One step of a message's stack, nearest the fault first (kit 1.35.0): a part the log does not give is "" or 0. */
export type Frame = {
  method: string;
  file: string;
  line: number;
  assembly: string;
};

/** A clue about which mod a message involves, strongest kind first. */
export type Clue = {
  kind: string;
  value: string;
  /** The mod's name, where the tools could tell it. */
  mod: string;
  messages: number;
};

/** Messages that differ only in numbers, names and codes: one signature. */
export type Signature = {
  id: string;
  level: string;
  category: string;
  signature: string;
  fingerprint: string;
  count: number;
  first: { line: number; time: string };
  last: { line: number; time: string };
  example: { headline: string; body: string[]; bodyLines: number };
  evidence: Clue[];
  frames?: Frame[];
};

export type Change = {
  id: string;
  level: string;
  previous: number;
  current: number;
  headline: string;
};

/** The kit's log triage, a page's worth (its --brief JSON). */
export type LogData = {
  log: {
    name: string;
    layout: string;
    lines: number;
    messages: number;
    header: Record<string, string>;
  };
  notices: { kind: string; text: string }[];
  limits: string[];
  levels: Record<string, { messages: number; signatures: number }>;
  groups: Signature[];
  comparison?: {
    previous: string;
    new: Change[];
    gone: Change[];
    changed: Change[];
    counts?: { new: number; gone: number; changed: number };
  };
  brief?: { shown: number; of: number };
};

export type LogReading = {
  available: boolean;
  data: LogData | null;
  command_line: string;
};

export type LogPageReading = Pending | { state: "ready"; reading: LogReading };
