import type { Failure } from "../shell/types";

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
  TextBlock | BulletsBlock | TableBlockData | CodeBlock | ChartBlockData;

export type Section = { heading: string; level: number; blocks: Block[] };

export type Report = {
  format: number;
  title: string;
  lines: string[];
  blocks: Block[];
  sections: Section[];
};

export type ReportEntry = {
  command: string;
  report: string | null;
  question: string;
};

export type ReportResult = { report: Report; command_line: string };

export type CatalogueReading =
  | { state: "reading" }
  | { state: "browser" }
  | { state: "ready"; entries: ReportEntry[] }
  | { state: "failed"; failure: Failure };

export type RunReading =
  | { state: "ready"; result: ReportResult }
  | { state: "failed"; failure: Failure };

export type Sort = { column: number; descending: boolean };
