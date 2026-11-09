// Runs a command with Rust's build output outside the repository, since a clone may sit in a synced folder.
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const [executable, ...args] = process.argv.slice(2);
if (!executable) throw new Error("A command is required.");

const base = process.env.LOCALAPPDATA ?? join(homedir(), ".cache");
const target =
  process.env.CARGO_TARGET_DIR ?? join(base, "phobos-modkit", "target");
mkdirSync(target, { recursive: true });

const result = spawnSync(executable, args, {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, CARGO_TARGET_DIR: target },
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
