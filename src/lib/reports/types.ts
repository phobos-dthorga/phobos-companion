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
export type Block = TextBlock | BulletsBlock | TableBlockData | CodeBlock;

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
