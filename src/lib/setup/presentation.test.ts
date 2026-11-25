import { describe, expect, it } from "vitest";
import {
  arrived,
  homeNeeds,
  inGroup,
  offer,
  offered,
  outcome,
  pageNeeds,
} from "./presentation";
import type { Fetching, Readiness, SetupRow } from "./types";

function row(key: string, more: Partial<SetupRow> = {}): SetupRow {
  return {
    key,
    name: key,
    game: null,
    neededBy: "",
    how: "",
    state: "missing",
    everyday: false,
    page: true,
    command: `winget install ${key}`,
    fetcher: "winget",
    fetcherHere: true,
    waitsFor: [],
    pages: [],
    ...more,
  };
}

function fetching(more: Partial<Fetching> = {}): Fetching {
  return {
    key: "steam",
    name: "Steam",
    command: "winget install Valve.Steam",
    output: "",
    ended: null,
    ...more,
  };
}

describe("setup", () => {
  it("groups rows by how they stand, everyday ones first, then by name", () => {
    const rows = [
      row("zeta"),
      row("alpha"),
      row("steam", { everyday: true }),
      row("git", { state: "here" }),
    ];
    expect(inGroup(rows, "missing").map((r) => r.key)).toEqual([
      "steam",
      "alpha",
      "zeta",
    ]);
    expect(inGroup(rows, "here").map((r) => r.key)).toEqual(["git"]);
    expect(inGroup(rows, "set-aside")).toEqual([]);
  });

  it("Home names only everyday programs missing and not set aside, and never git, said on every page", () => {
    const rows = [
      row("git", { everyday: true }),
      row("steam", { everyday: true }),
      row("ilspycmd"),
      row("other", { everyday: true, state: "set-aside" }),
      row("here", { everyday: true, state: "here" }),
    ];
    expect(homeNeeds(rows).map((r) => r.key)).toEqual(["steam"]);
  });

  it("a page names what it uses that is not here, a game's own only on that game's pages", () => {
    const rows = [
      row("dotnet-sdk", { pages: ["memory"] }),
      row("aside", { pages: ["memory"], state: "set-aside" }),
      row("here", { pages: ["memory"], state: "here" }),
      row("git", { pages: ["memory"] }),
      row("todds", { pages: ["memory"], game: "first" }),
    ];
    expect(pageNeeds(rows, "memory", "first").map((r) => r.key)).toEqual([
      "dotnet-sdk",
      "aside",
      "todds",
    ]);
    expect(pageNeeds(rows, "memory", "second").map((r) => r.key)).toEqual([
      "dotnet-sdk",
      "aside",
    ]);
    expect(pageNeeds(rows, "mods", "first")).toEqual([]);
  });

  it("offers a repository the starter files it lacks, one for agents only while those show (0.89.0)", () => {
    const starter = (
      id: string,
      present: boolean,
      forAgents = false,
      unavailable: string | null = null,
    ) => ({
      id,
      path: id,
      present,
      chosen: true,
      forAgents,
      content: "x",
      unavailable,
    });
    const repository: Readiness = {
      game: "first",
      gameName: "First",
      name: "mods",
      found: true,
      git: true,
      starters: [
        starter("changelog", true),
        starter("open-work", false),
        starter("decisions", false, true),
        starter("installs", false, false, "no install adapter"),
      ],
    };
    expect(offered(repository, false).map((s) => s.id)).toEqual(["open-work"]);
    expect(offered(repository, true).map((s) => s.id)).toEqual([
      "open-work",
      "decisions",
    ]);
  });

  it("offers a run only when the command can run now", () => {
    expect(offer(row("git"))).toEqual({ kind: "run" });
    expect(offer(row("ilspycmd", { waitsFor: [".NET 10 SDK"] }))).toEqual({
      kind: "waits",
      names: [".NET 10 SDK"],
    });
    expect(offer(row("git", { fetcherHere: false }))).toEqual({
      kind: "no-fetcher",
      fetcher: "winget",
    });
    expect(offer(row("todds", { command: null, fetcher: null }))).toEqual({
      kind: "page-only",
    });
    expect(
      offer(row("xml-index", { command: null, fetcher: null, page: false })),
    ).toEqual({ kind: "nothing" });
  });

  it("says how a fetch ended, and believes it only once the program is found", () => {
    expect(outcome(fetching())).toEqual({ kind: "running" });
    expect(outcome(fetching({ ended: { exitCode: 0, signal: null } }))).toEqual(
      { kind: "done" },
    );
    expect(
      outcome(fetching({ ended: { exitCode: 1603, signal: null } })),
    ).toEqual({ kind: "failed", code: 1603 });
    expect(
      outcome(fetching({ ended: { exitCode: null, signal: null } })),
    ).toEqual({ kind: "stopped" });
    expect(arrived(fetching(), [row("steam")])).toBe(false);
    expect(arrived(fetching(), [row("steam", { state: "here" })])).toBe(true);
  });
});
