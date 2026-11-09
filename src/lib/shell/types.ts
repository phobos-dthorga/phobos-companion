export type KitStatus = { kit_version: string; tools: number };

export type KitFailureCode =
  "python_missing" | "kit_missing" | "tool_failed" | "unreadable";

export type KitFailure = { code: KitFailureCode; detail: string };

export type KitReading =
  | { state: "reading" }
  | { state: "browser" }
  | { state: "ready"; status: KitStatus }
  | { state: "failed"; failure: KitFailure };
