import type { GlobeBlockData } from "../atlas/types";
import type { Failure, Waiting } from "../shell/types";

export type Cell = string | number | boolean | null;

export type TextBlock = { type: "text"; text: string };
export type BulletsBlock = { type: "bullets"; items: string[] };
export type TableBlockData = {
  type: "table";
  headers: string[];
  rows: Cell[][];
  values: (number | null)[][];
  total: number;
};
export type CodeBlock = { type: "code"; language: string; lines: string[] };

/** What a series or line means; the window colours it from the theme. The kit never sends a colour. */
export type ChartRole =
  "accent" | "observed" | "comparison" | "risk" | "success" | "neutral";

export type ChartBlockData = {
  type: "chart";
  kind: "bar" | "line";
  title: string;
  description: string;
  unit: string;
  value_label: string;
  stacked: boolean;
  categories: string[];
  series: { label: string; role: ChartRole; values: (number | null)[] }[];
  lines: { label: string; value: number; role: ChartRole }[];
};

export type Block =
  | TextBlock
  | BulletsBlock
  | TableBlockData
  | CodeBlock
  | ChartBlockData
  | GlobeBlockData;

export type Section = { heading: string; level: number; blocks: Block[] };

/** A short labelled value saying where a report came from ("Save", "PG16.rws"); kit 1.48.0 on, absent before. */
export type Fact = { label: string; value: string };

export type Report = {
  format: number;
  title: string;
  facts?: Fact[];
  lines: string[];
  blocks: Block[];
  sections: Section[];
};

export type ReportEntry = {
  command: string;
  report: string | null;
  question: string;
  /** What the report mostly is when it has a page of its own, such as "globe". */
  surface: string | null;
  /** The count in its data that waits on you, when it has one (0.101.0; kit 1.129.0's `waits`). */
  waits?: string | null;
};

export type ReportResult = {
  report: Report;
  command_line: string;
  /** That count, read by the host from the report's data; null when the report has none (0.101.0). */
  waiting?: number | null;
};

export type CatalogueReading =
  Waiting | { state: "ready"; entries: ReportEntry[] };

export type RunReading =
  | { state: "ready"; result: ReportResult }
  | { state: "failed"; failure: Failure };

export type Sort = { column: number; descending: boolean };
