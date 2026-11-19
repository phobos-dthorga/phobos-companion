import { describe, expect, it } from "vitest";
import { listedWith, standing } from "./presentation";
import type { About } from "./types";

const about: About = {
  version: "0.25.0",
  built_commit: "abc1234",
  built_unix: 1_795_000_000,
  built_from: "D:/repos/companion",
  repository_name: "companion",
  program: null,
  data_folder: null,
  source: null,
  repository_version: "0.25.0",
  commits_since: 0,
  this_version: null,
  newer: [],
  installer: null,
  libraries: [],
};

describe("where the running program stands", () => {
  it("says a newer version is in the repository, with its installer when built", () => {
    const newer = {
      ...about,
      repository_version: "0.26.0",
      newer: [{ version: "0.26.0", date: null, summary: "" }],
      installer: "C:/setup.exe",
    };
    expect(standing(newer)).toEqual({
      kind: "newer",
      version: "0.26.0",
      installer: "C:/setup.exe",
    });
  });

  it("tells changes not yet in a version from being up to date", () => {
    expect(standing({ ...about, commits_since: 3 })).toEqual({
      kind: "changes",
      commits: 3,
    });
    expect(standing(about)).toEqual({ kind: "current" });
    expect(standing({ ...about, commits_since: null })).toEqual({
      kind: "unknown",
    });
  });

  it("finds the list entry that holds the program's repository", () => {
    const games = [
      { id: "a", repositories: ["x"] },
      { id: "tools", repositories: ["kit", "companion"] },
    ];
    expect(listedWith(games, "companion")).toBe("tools");
    expect(listedWith(games, "elsewhere")).toBeNull();
  });
});
