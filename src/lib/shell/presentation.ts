import type { KitFailureCode } from "./types";

type FailureWords = { happened: string; next: string };

const FAILURES: Record<KitFailureCode, FailureWords> = {
  python_missing: {
    happened: "failure-python-missing",
    next: "failure-python-missing-next",
  },
  kit_missing: {
    happened: "failure-kit-missing",
    next: "failure-kit-missing-next",
  },
  tool_failed: {
    happened: "failure-tool-failed",
    next: "failure-tool-failed-next",
  },
  unreadable: {
    happened: "failure-unreadable",
    next: "failure-unreadable-next",
  },
};

/** The message keys for a failure: what happened and what to do. An unknown code reads as an unreadable answer. */
export function failureWords(code: string): FailureWords {
  return FAILURES[code as KitFailureCode] ?? FAILURES.unreadable;
}
