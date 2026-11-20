// Builds the installer with the runtime it carries (0.35.0; docs/release-audit.md, A1 and A2): a portable Python, pinned and
// checked against python.org's own checksum, and the tool kit from this repository's pinned submodule. On a PC without the
// repository the program uses these; beside the repository (a developer's, the owner's) it keeps using the repository's own.
// Everything it makes stays outside the repository, beside Rust's build output, since a clone may sit in a synced folder.
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/** Python's portable Windows build, as python.org publishes it (its API's sha256_sum for this file, checked 20 Nov 2026). */
export const PYTHON = {
  version: "3.14.10",
  url: "https://www.python.org/ftp/python/3.14.10/python-3.14.10-embed-amd64.zip",
  sha256: "90905e64a840557d8c1bc4f5b74db3d7ee85e3ffb217611cac1c7813acea4159",
};

const repository = join(dirname(fileURLToPath(import.meta.url)), "..");
const base = process.env.LOCALAPPDATA ?? join(homedir(), ".cache");
const target =
  process.env.CARGO_TARGET_DIR ?? join(base, "phobos-modkit", "target");
const cache = join(target, "companion-runtime-cache");
const runtime = join(target, "companion-runtime");
const kitSource = join(
  repository,
  "external",
  "phobos-modkit",
  "python",
  "phobos_modkit",
);

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function run(executable, args, env = process.env) {
  const result = spawnSync(executable, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

/** The pinned Python, downloaded once and kept; a copy whose checksum differs is refused and fetched again. */
async function python() {
  mkdirSync(cache, { recursive: true });
  const zip = join(cache, basename(new URL(PYTHON.url).pathname));
  if (existsSync(zip) && sha256(zip) === PYTHON.sha256) return zip;
  console.log(`Fetching Python ${PYTHON.version} from python.org…`);
  const answer = await fetch(PYTHON.url);
  if (!answer.ok)
    throw new Error(`python.org answered ${answer.status} for ${PYTHON.url}`);
  writeFileSync(zip, Buffer.from(await answer.arrayBuffer()));
  const found = sha256(zip);
  if (found !== PYTHON.sha256) {
    rmSync(zip);
    throw new Error(
      `The download's checksum is ${found}, not python.org's ${PYTHON.sha256}: refused, and nothing was built.`,
    );
  }
  return zip;
}

/** The runtime folder: Python unpacked, told where the kit is, and the kit beside it, without compiled caches. */
function assemble(zip) {
  if (!existsSync(kitSource)) {
    throw new Error(
      `The tool kit is not at ${kitSource}: run git submodule update --init first.`,
    );
  }
  rmSync(runtime, { recursive: true, force: true });
  const pythonFolder = join(runtime, "python");
  mkdirSync(pythonFolder, { recursive: true });
  // Windows' own tar reads zip files; Git's tar, often first on the PATH, reads "C:" as a machine to connect to.
  const tar =
    process.platform === "win32"
      ? join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe")
      : "tar";
  run(tar, ["-xf", zip, "-C", pythonFolder]);
  const [major, minor] = PYTHON.version.split(".");
  // The portable Python reads its search path only from this file; the kit is one folder up, beside it.
  writeFileSync(
    join(pythonFolder, `python${major}${minor}._pth`),
    `python${major}${minor}.zip\n.\n..\\kit\n`,
  );
  cpSync(kitSource, join(runtime, "kit", "phobos_modkit"), {
    recursive: true,
    filter: (path) => !path.includes("__pycache__"),
  });
}

const zip = await python();
assemble(zip);
// The installer carries the runtime through its own hooks, not Tauri's resources: Tauri drops the drive letter from an absolute
// resource path (C:\… is read as \… on the repository's drive), and the runtime must stay out of the repository's synced folder.
// The hooks put it at <install folder>\runtime, which is where the program's resource folder is on Windows.
const hooks = join(target, "companion-runtime-hooks.nsh");
writeFileSync(
  hooks,
  [
    "; Written by scripts/installer.mjs: the Companion's own Python and tool kit.",
    "!macro NSIS_HOOK_POSTINSTALL",
    '  SetOutPath "$INSTDIR\\runtime"',
    `  File /r "${runtime}\\*.*"`,
    '  SetOutPath "$INSTDIR"',
    "!macroend",
    "!macro NSIS_HOOK_PREUNINSTALL",
    '  RMDir /r "$INSTDIR\\runtime"',
    "!macroend",
    "",
  ].join("\r\n"),
);
const config = join(target, "companion-runtime.tauri.json");
writeFileSync(
  config,
  JSON.stringify(
    { bundle: { windows: { nsis: { installerHooks: hooks } } } },
    null,
    2,
  ),
);
console.log(`Runtime ready in ${runtime}; building the installer…`);
run("npx", ["tauri", "build", "--bundles", "nsis", "--config", config], {
  ...process.env,
  CARGO_TARGET_DIR: target,
});
