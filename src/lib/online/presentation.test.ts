import { describe, expect, it } from "vitest";
import {
  callsLeft,
  failedWorkflows,
  lateNightly,
  lightKey,
  markOf,
  oldestStale,
  toneOf,
} from "./presentation";
import type { CheckRun, RepoStatus, RepoStatusAnswer } from "./types";

const run = (workflow: string, conclusion: string | null): CheckRun => ({
  workflow,
  event: "push",
  status: "completed",
  conclusion,
  commit: "abc",
  when: null,
  link: null,
});

const repo = (name: string, extra: Partial<RepoStatus> = {}): RepoStatus => ({
  name,
  root: `/r/${name}`,
  branch: "main",
  upstream: "origin/main",
  github: `me/${name}`,
  pushed: "abc",
  ahead: 0,
  behind: 0,
  changed: 0,
  scheduled: false,
  ...extra,
});

const answer = (
  repositories: RepoStatus[],
  extra: Partial<RepoStatusAnswer> = {},
): RepoStatusAnswer => ({
  repositories,
  online: true,
  switchedOn: true,
  ...extra,
});

describe("the gate lights", () => {
  it("give every state a mark as well as a colour", () => {
    expect([toneOf("passed"), markOf("passed")]).toEqual(["good", "✓"]);
    expect([toneOf("failed"), markOf("failed")]).toEqual(["bad", "✗"]);
    expect([toneOf("running"), markOf("running")]).toEqual(["busy", "…"]);
    expect([toneOf("none"), markOf("none")]).toEqual(["quiet", "–"]);
    expect(lightKey("no-push-checks")).toBe("lights-state-no-push-checks");
  });

  it("name only the workflows that failed", () => {
    const checks = {
      state: "failed" as const,
      runs: [run("Checks", "failure"), run("Lint", "success")],
    };
    expect(failedWorkflows(checks)).toEqual(["Checks"]);
    expect(failedWorkflows(undefined)).toEqual([]);
  });

  it("pick out the nightly runs that are late", () => {
    const nightly = [
      { ...run("Watch", "success"), late: true },
      { ...run("Other", "success"), late: false },
    ];
    expect(lateNightly(nightly).map((n) => n.workflow)).toEqual(["Watch"]);
  });

  it("say how old the oldest earlier answer is, and nothing when all are fresh", () => {
    const fresh = repo("a", { checks: { state: "passed", runs: [] } });
    const older = repo("b", {
      checks: { state: "passed", runs: [], stale: true, asOf: 100 },
    });
    const oldest = repo("c", {
      checks: { state: "failed", runs: [], stale: true, asOf: 50 },
    });
    expect(oldestStale(answer([fresh]))).toBeNull();
    expect(oldestStale(answer([fresh, older, oldest]))).toBe(50);
  });

  it("show the calls left only while the hour they speak of lasts", () => {
    const allowance = {
      remaining: 41,
      size: 60,
      reset: 9,
      seen_at: 1,
      turned: false,
    };
    expect(callsLeft(answer([], { allowance }))).toEqual({
      remaining: 41,
      size: 60,
    });
    expect(
      callsLeft(answer([], { allowance: { ...allowance, turned: true } })),
    ).toBeNull();
    expect(callsLeft(answer([]))).toBeNull();
  });
});
