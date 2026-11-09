export type KitStatus = { kit_version: string; tools: number };

export type FailureCode =
  | "python_missing"
  | "kit_missing"
  | "tool_failed"
  | "unreadable"
  | "list_unreadable"
  | "refused";

export type Failure = { code: FailureCode; detail: string };

export type KitReading =
  | { state: "reading" }
  | { state: "browser" }
  | { state: "ready"; status: KitStatus }
  | { state: "failed"; failure: Failure };
