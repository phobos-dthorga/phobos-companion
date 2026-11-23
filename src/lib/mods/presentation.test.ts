import { describe, expect, it } from "vitest";
import {
  blockedBy,
  changedMods,
  docsOnly,
  encodeTargets,
  entryParts,
  formatSize,
  groupByVersion,
  hasChanges,
  names,
  newMods,
  preflight,
  changedSources,
  rebuiltCount,
  shortCommit,
  unlogged,
} from "./presentation";
import type {
  Entry,
  ModInstall,
  RepositoryInstalls,
  TextureMod,
  TexturesReading,
} from "./types";

function entry(version: string, text: string, lead = ""): Entry {
  return { version, section: "Fixed", text, lead, aboutSaves: false };
}

describe("the Mods page's words", () => {
  it("groups entries under their versions in the changelog's order", () => {
    const groups = groupByVersion(
      [entry("0.2.0", "a"), entry("0.1.0", "b"), entry("0.2.0", "c")],
      { "0.2.0": "Second release" },
    );
    expect(groups.map((g) => [g.version, g.summary, g.entries.length])).toEqual(
      [
        ["0.2.0", "Second release", 2],
        ["0.1.0", "", 1],
      ],
    );
  });

  it("splits an entry's bold opening from the rest", () => {
    expect(
      entryParts(entry("1", "**Boats float.** On water.", "Boats float.")),
    ).toEqual({ lead: "Boats float.", rest: "On water." });
    expect(entryParts(entry("1", "Safe with a running save.", "Safe"))).toEqual(
      { lead: "", rest: "Safe with a running save." },
    );
  });

  it("lets a backup be made while the game runs, but nothing else", () => {
    expect(blockedBy("backup", ["rimworld.exe"])).toBeNull();
    expect(blockedBy("restore", ["rimworld.exe"])).toBe("mods-blocked-running");
    expect(blockedBy("install", ["rimworld.exe"])).toBe("mods-blocked-running");
    expect(blockedBy("install", [])).toBeNull();
  });

  it("says sizes and commits briefly", () => {
    expect(formatSize(8_177_320)).toBe("8 MB");
    expect(formatSize(1_288_490_189)).toBe("1.2 GB");
    expect(formatSize(null)).toBe("");
    expect(shortCommit("4d332ddf0123")).toBe("4d332ddf");
    expect(shortCommit(null)).toBe("");
  });
});

const emptyDelta = {
  gain: [],
  lose: [],
  reworded: [],
  saveNotes: [],
  summaries: {},
};

function mod(extra: Partial<ModInstall> = {}): ModInstall {
  const copy = {
    kind: "installed" as const,
    name: "Sample",
    version: "1.0.0",
    record: null,
    backup: null,
    taken: null,
    size: null,
    hasChangelog: true,
    direction: null,
  };
  return {
    mod: "Sample",
    name: "Sample",
    changelog: "mods/Sample/CHANGELOG.md",
    state: "up-to-date",
    repository: { ...copy, kind: "repository" },
    installed: copy,
    update: emptyDelta,
    uncommittedCount: 0,
    commitsSince: null,
    backups: [],
    installedCommit: null,
    files: { total: 0, counts: {}, paths: [] },
    build: { needsBuild: false, projects: [] },
    settings: null,
    settingsNote: null,
    lookOut: [],
    ...extra,
  };
}

function repo(
  mods: ModInstall[],
  gameRunning: string[] = [],
): RepositoryInstalls {
  return {
    repository: "sample-mods",
    command_line: "",
    status: {
      repository: "sample-mods",
      gameRunning,
      canBuild: true,
      needsBuild: mods.some((m) => m.build.needsBuild),
      space: { backups: 0, backupsFree: null, targetFree: null, spare: 0 },
      mods,
    },
  };
}

function textureMod(
  name: string,
  stale: number,
  missing: number,
  unpacked = 0,
): TextureMod {
  return {
    name,
    packageId: name.toLowerCase(),
    folderName: name,
    source: "Workshop",
    pictures: 10,
    stale,
    missing,
    leftOver: 0,
    unpacked,
    stalePaths: [],
    missingPaths: [],
    unpackedPaths: [],
  };
}

function texturesReady(mods: TextureMod[]): TexturesReading {
  return {
    state: "ready",
    status: {
      checkedAt: "",
      gameRunning: [],
      todds: "todds.exe",
      totals: {
        mods: mods.length,
        pictures: 0,
        staleMods: mods.filter((m) => m.stale > 0).length,
        missingMods: mods.filter((m) => m.missing > 0).length,
        unpackedMods: mods.filter(
          (m) => m.unpacked > 0 && m.stale === 0 && m.missing === 0,
        ).length,
        stale: mods.reduce((n, m) => n + m.stale, 0),
        missing: mods.reduce((n, m) => n + m.missing, 0),
        unpacked: mods.reduce((n, m) => n + m.unpacked, 0),
        leftOver: 0,
      },
      mods,
    },
  };
}

describe("before you play", () => {
  it("is ready when every mod is built, installed and every texture current", () => {
    const checks = preflight([repo([mod()])], texturesReady([]), "Sample Game");
    expect(checks.map((c) => [c.kind, c.words])).toEqual([
      ["ready", "mods-pre-ready"],
    ]);
  });

  it("names what to do, with the press that does it", () => {
    const unbuilt = mod({
      name: "Code",
      build: { needsBuild: true, projects: [] },
    });
    const behind = mod({ name: "Words", state: "behind" });
    const checks = preflight(
      [repo([unbuilt, behind], ["game.exe"])],
      texturesReady([textureMod("Old", 2, 0), textureMod("New", 0, 5)]),
      "Sample Game",
    );
    expect(checks.map((c) => [c.kind, c.words, c.action])).toEqual([
      ["info", "mods-pre-running", null],
      ["todo", "mods-pre-build", "build"],
      ["todo", "mods-pre-install", "install-all"],
      ["todo", "mods-pre-textures-stale", "encode"],
      ["todo", "mods-pre-textures-missing", null],
    ]);
    expect(checks[2].args).toMatchObject({ count: 2, names: "Code, Words" });
  });

  it("offers encoding for textures Waylith unpacks, once nothing older needs it", () => {
    const alone = preflight(
      [repo([mod()])],
      texturesReady([textureMod("Big", 0, 0, 40)]),
      "G",
    );
    expect(alone.map((c) => [c.kind, c.words, c.action])).toEqual([
      ["todo", "mods-pre-textures-unpacked", "encode"],
    ]);
    expect(alone[0].args).toMatchObject({ count: 1, textures: 40 });
    const behind = preflight(
      [repo([mod()])],
      texturesReady([textureMod("Old", 1, 0), textureMod("Big", 0, 0, 40)]),
      "G",
    );
    expect(behind.map((c) => c.action)).toEqual(["encode", null]);
  });

  it("offers a mod never installed, without holding back Ready to play", () => {
    const fresh = mod({
      name: "Farming",
      installed: null,
      state: "not-installed",
    });
    const checks = preflight(
      [repo([mod(), fresh])],
      texturesReady([]),
      "Sample Game",
    );
    expect(checks.map((c) => [c.kind, c.words, c.action])).toEqual([
      ["info", "mods-pre-new", "install-new"],
      ["ready", "mods-pre-ready", null],
    ]);
    expect(checks[0].args).toMatchObject({
      count: 1,
      names: "Farming",
    });
  });

  it("keeps a mod never installed apart from the changes to install", () => {
    const fresh = mod({ name: "New", installed: null, state: "not-installed" });
    const behind = mod({ name: "Words", state: "behind" });
    const checks = preflight([repo([behind, fresh])], texturesReady([]), "G");
    expect(checks.map((c) => [c.words, c.args.names])).toEqual([
      ["mods-pre-install", "Words"],
      ["mods-pre-new", "New"],
    ]);
  });

  it("asks to install a docs-only change by default, as before, and only notes it when told to be quiet", () => {
    const docs = mod({
      name: "Words",
      state: "behind",
      files: { total: 2, counts: { docs: 2 }, paths: [] },
    });
    const code = mod({
      name: "Code",
      state: "behind",
      files: { total: 2, counts: { docs: 1, code: 1 }, paths: [] },
    });
    const loud = preflight([repo([docs, code])], texturesReady([]), "G");
    expect(loud.map((c) => [c.words, c.args.names])).toEqual([
      ["mods-pre-install", "Words, Code"],
    ]);
    const quiet = preflight([repo([docs, code])], texturesReady([]), "G", true);
    expect(quiet.map((c) => [c.kind, c.words, c.args.names])).toEqual([
      ["todo", "mods-pre-install", "Code"],
      ["info", "mods-pre-docs-only", "Words"],
    ]);
    const alone = preflight([repo([docs])], texturesReady([]), "G", true);
    expect(alone.map((c) => [c.kind, c.words])).toEqual([
      ["info", "mods-pre-docs-only"],
      ["ready", "mods-pre-ready"],
    ]);
  });

  it("says it is still checking textures rather than calling them current", () => {
    const checks = preflight([repo([mod()])], { state: "reading" }, "G");
    expect(checks.map((c) => c.words)).toEqual([
      "mods-pre-textures-reading",
      "mods-pre-ready-mods",
    ]);
  });
});

describe("a change only to docs", () => {
  const docsFiles = { total: 2, counts: { docs: 2 }, paths: [] };
  it("is every changed file a doc, nothing to build, and nothing the installed copy has alone", () => {
    expect(docsOnly(mod({ state: "behind", files: docsFiles }))).toBe(true);
    expect(docsOnly(mod({ state: "unlogged", files: docsFiles }))).toBe(true);
  });
  it("is not one when code changed too, a build waits, entries would be lost, or nothing changed", () => {
    const mixed = { total: 3, counts: { docs: 2, defs: 1 }, paths: [] };
    expect(docsOnly(mod({ state: "behind", files: mixed }))).toBe(false);
    expect(
      docsOnly(
        mod({
          state: "behind",
          files: docsFiles,
          build: { needsBuild: true, projects: [] },
        }),
      ),
    ).toBe(false);
    expect(docsOnly(mod({ state: "differs", files: docsFiles }))).toBe(false);
    expect(docsOnly(mod())).toBe(false);
    expect(
      docsOnly(mod({ state: "behind", files: docsFiles, installed: null })),
    ).toBe(false);
  });
});

describe("what counts as a change", () => {
  it("counts changelogs, files and builds, never a mod that isn't installed", () => {
    expect(hasChanges(mod())).toBe(false);
    expect(hasChanges(mod({ state: "behind" }))).toBe(true);
    expect(
      hasChanges(mod({ files: { total: 2, counts: {}, paths: [] } })),
    ).toBe(true);
    expect(hasChanges(mod({ build: { needsBuild: true, projects: [] } }))).toBe(
      true,
    );
    expect(hasChanges(mod({ installed: null, state: "not-installed" }))).toBe(
      false,
    );
  });

  it("flags files that differ with nothing new in the changelog, but not a rebuild", () => {
    expect(unlogged(mod({ state: "unlogged" }))).toBe(true);
    expect(unlogged(mod({ state: "rebuilt" }))).toBe(false);
    expect(unlogged(mod())).toBe(false);
  });

  it("names the sources that changed under a mod's code, each once", () => {
    const files = {
      total: 2,
      counts: { code: 2 },
      paths: [
        {
          path: "1.7/Assemblies/A.dll",
          change: "changed" as const,
          category: "code",
          sources: ["Directory.Build.props"],
          sourcesInAll: 1,
        },
        {
          path: "1.7/Assemblies/B.dll",
          change: "changed" as const,
          category: "code",
          sources: [
            "Directory.Build.props",
            "src/B/One.cs",
            "src/B/Two.cs",
            "src/B/Three.cs",
          ],
          sourcesInAll: 6,
        },
      ],
    };
    expect(changedSources(mod({ files }))).toEqual({
      names: ["Directory.Build.props", "src/B/One.cs", "src/B/Two.cs"],
      more: 3,
    });
    expect(changedSources(mod())).toEqual({ names: [], more: 0 });
  });

  it("counts the code files that were only rebuilt", () => {
    const files = {
      total: 2,
      counts: { code: 2 },
      paths: [
        {
          path: "1.7/Assemblies/A.dll",
          change: "changed" as const,
          category: "code",
          rebuilt: true,
        },
        {
          path: "1.7/Assemblies/B.dll",
          change: "changed" as const,
          category: "code",
        },
      ],
    };
    expect(rebuiltCount(mod({ files }))).toBe(1);
    expect(rebuiltCount(mod())).toBe(0);
  });

  it("installs only the changed mods, by repository", () => {
    const groups = changedMods([
      repo([mod({ mod: "A", state: "behind" }), mod({ mod: "B" })]),
    ]);
    expect(groups.map((g) => g.mods.map((m) => m.mod))).toEqual([["A"]]);
  });

  it("installs for the first time only the mods never installed, by repository", () => {
    const groups = newMods([
      repo([
        mod({ mod: "A", state: "behind" }),
        mod({ mod: "B", installed: null, state: "not-installed" }),
      ]),
      repo([mod({ mod: "C" })]),
    ]);
    expect(groups.map((g) => g.mods.map((m) => m.mod))).toEqual([["B"]]);
  });

  it("encodes stale textures first, then new ones, then those Waylith unpacks", () => {
    const order = encodeTargets([
      textureMod("Big", 0, 0, 12),
      textureMod("New", 0, 3),
      textureMod("Old", 1, 0, 5),
      textureMod("Fine", 0, 0),
    ]);
    expect(order.map((m) => m.name)).toEqual(["Old", "New", "Big"]);
  });

  it("names a few and counts the rest", () => {
    expect(names(["A", "B"])).toEqual({ names: "A, B", more: 0 });
    expect(names(["A", "B", "C", "D", "E"])).toEqual({
      names: "A, B, C",
      more: 2,
    });
  });
});
