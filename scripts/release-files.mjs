// The files of one release (0.85.0; docs/releases.md, O1): the installer under a plain name, its signature, and latest.json,
// which the updater reads from the latest published release. Run by .github/workflows/release.yml after the signed build; its
// pure parts are tested by scripts/release-files.test.ts.
//
//   node scripts/release-files.mjs <bundle folder> <out folder> <tag>
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const REPOSITORY = "phobos-dthorga/phobos-companion";

/** The installer's name on the release: plain letters, since GitHub rewrites spaces and the curly apostrophe in an asset's name. */
export function plainName(version) {
  return `DthorgaCompanion_${version}_x64-setup.exe`;
}

/** The changelog's section for one version, without its heading: the release's notes. Empty when there is none. */
export function notesFor(changelog, version) {
  const lines = changelog.replace(/\r\n/g, "\n").split("\n");
  const start = lines.findIndex((line) => line.startsWith(`## [${version}]`));
  if (start < 0) return "";
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith("## ["));
  return (end < 0 ? rest : rest.slice(0, end)).join("\n").trim();
}

/** What the updater reads: the version, the notes, when, and the Windows installer's address and signature (its text, never a path). */
export function latestJson({ version, notes, date, tag, signature }) {
  return {
    version,
    notes,
    pub_date: date,
    platforms: {
      "windows-x86_64": {
        signature: signature.trim(),
        url: `https://github.com/${REPOSITORY}/releases/download/${tag}/${plainName(version)}`,
      },
    },
  };
}

/** The version a tag names (v0.85.0 → 0.85.0); refused when it is not one. */
export function versionOf(tag) {
  const found = /^v(\d+\.\d+\.\d+)$/.exec(tag);
  if (!found) throw new Error(`${tag} is not a version tag (vX.Y.Z)`);
  return found[1];
}

function main([bundle, out, tag]) {
  if (!bundle || !out || !tag) {
    throw new Error(
      "usage: node scripts/release-files.mjs <bundle folder> <out folder> <tag>",
    );
  }
  const version = versionOf(tag);
  const repository = join(fileURLToPath(import.meta.url), "..", "..");
  const configured = JSON.parse(
    readFileSync(join(repository, "src-tauri", "tauri.conf.json"), "utf8"),
  ).version;
  if (configured !== version) {
    throw new Error(
      `The tag says ${version} but tauri.conf.json says ${configured}: tag the commit that set the version.`,
    );
  }
  const installer = readdirSync(bundle).find(
    (name) =>
      name.endsWith(`_${version}_x64-setup.exe`) && !name.endsWith(".sig"),
  );
  if (!installer) throw new Error(`No installer for ${version} in ${bundle}`);
  const signature = join(bundle, `${installer}.sig`);
  if (!existsSync(signature)) {
    throw new Error(
      `${installer} has no signature: the build had no update key (TAURI_SIGNING_PRIVATE_KEY).`,
    );
  }
  mkdirSync(out, { recursive: true });
  copyFileSync(join(bundle, installer), join(out, plainName(version)));
  copyFileSync(signature, join(out, `${plainName(version)}.sig`));
  const changelog = readFileSync(join(repository, "CHANGELOG.md"), "utf8");
  const notes = notesFor(changelog, version);
  writeFileSync(join(out, "notes.md"), `${notes}\n`);
  writeFileSync(
    join(out, "latest.json"),
    `${JSON.stringify(
      latestJson({
        version,
        notes,
        date: new Date().toISOString(),
        tag,
        signature: readFileSync(signature, "utf8"),
      }),
      null,
      2,
    )}\n`,
  );
  console.log(`Release files for ${tag} in ${out}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main(process.argv.slice(2));
}
