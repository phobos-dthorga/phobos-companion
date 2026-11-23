# Third-party notices

No third-party code is copied into this repository. These packages are downloaded when it is built, at the versions
`package-lock.json` and `src-tauri/Cargo.lock` pin; their licences are as their authors publish them, read from each installed
package on 9 November 2026. Nothing from any game is included. A complete inventory of everything they pull in comes before the
first release anyone else can install.

## In the program

| Package | Licence | Why it is used |
| --- | --- | --- |
| [Tauri](https://tauri.app/) (`tauri`, `tauri-build`, `@tauri-apps/api`) | MIT OR Apache-2.0 | The desktop window and the host |
| [Svelte](https://svelte.dev/) | MIT | The window's interface |
| [Tauri's dialog plugin](https://github.com/tauri-apps/plugins-workspace) (`tauri-plugin-dialog` 2.8.4, with `tauri-plugin-fs` 2.7.1, which it needs) | MIT OR Apache-2.0 | Windows' own folder and file pickers on the Settings page (0.29.0). Only `src-tauri/src/pick.rs` uses it, from the host, so the window is given no permission of its own; it answers with a path and nothing more. Chosen over a picker of our own because the system's dialog is the one people know, with its address bar and keyboard use, and Tauri keeps it working on each Windows |
| [Fluent](https://projectfluent.org/) (`@fluent/bundle`) | Apache-2.0 | Words in one catalogue, with counts said properly |
| [serde](https://serde.rs/), `serde_json` | MIT OR Apache-2.0 | Reading the tools' answers |
| [Apache ECharts](https://echarts.apache.org/) (`echarts` 6.1.0), with its `zrender` 6.1.0 and `tslib` 2.3.0 | Apache-2.0; BSD-3-Clause; 0BSD | Drawing the tools' charts (read 10 November 2026). Only `src/lib/charts/echartsCore.ts` imports it, and only when a report has a chart |
| [highlight.js](https://highlightjs.org/) (`highlight.js` 11.11.1) | BSD-3-Clause | Colouring code in the code viewer by what each piece is (read 19 November 2026). Only `src/lib/code/highlightCore.ts` imports it, its core and one grammar at a time, and only when code is first shown. Chosen over a larger highlighter because it needs no web assembly or theme files of its own, covers every language the owner's mods use, and gives plain class names the theme can colour |
| [html-to-image](https://github.com/bubkoo/html-to-image) (`html-to-image` 1.11.13) | MIT | Save a picture and Something's off: drawing the page into a PNG (since 0.21.0; added to these notices 19 November 2026). Only `src/lib/pictures/capture.ts` imports it, and only when a picture is taken |
| [three.js](https://threejs.org/) (`three` 0.186.1), with its addons for orbit controls and wide lines | MIT | Drawing the atlas's globe (read 10 November 2026). Only `src/lib/atlas/globeScene.ts` imports it, and only when the atlas opens |
| [ureq](https://github.com/algesten/ureq) (`ureq` 3.5.2, with `rustls` and its root certificates) | MIT OR Apache-2.0 | Asking an AI service the person chose (0.71.0, read 23 November 2026). Only `src-tauri/core/src/ai_client.rs` uses it, only on a press. Chosen over a multi-service AI library (`genai`) because two small request shapes cover every service, Claude's own API among them, with far less carried in; rustls means no system TLS library on any system |
| [keyring-core](https://github.com/open-source-cooperative/keyring-core) (`keyring-core` 1.1.0) and one store for each system: `windows-native-keyring-store` 1.1.0, `apple-native-keyring-store` 1.0.3, `zbus-secret-service-keyring-store` 1.0.1 | MIT OR Apache-2.0 | Keeping a key for an AI service in the operating system's own key store, never in a file (0.71.0, read 23 November 2026). Only `src-tauri/core/src/ai_keys.rs` uses it. The keyring project's own advice is that new programs use `keyring-core` with a store per system; the Linux store is pure Rust, so it needs no system library |

## Carried by the installer (0.36.0)

| Package | Licence | Why it is carried |
| --- | --- | --- |
| [Python](https://www.python.org/) 3.14.10, the portable Windows build (`python-3.14.10-embed-amd64.zip`) | Python Software Foundation License (its `LICENSE.txt` travels with it, in the runtime folder) | Runs the tool kit on a PC where no Python is installed. Fetched by `scripts/installer.mjs` from python.org and checked against python.org's published SHA-256 before it is used |
| [phobos-modkit](https://github.com/phobos-dthorga/phobos-modkit), the tools' Python package at this repository's pin | MIT | Every page asks it; carried so the installed program works away from the repository it was built from. From 0.38.0 its compiled tools come too, built from its own source: the XML indexer (Rust, with the crates its `THIRD_PARTY_NOTICES.md` lists) and the assembly reader (C#, needing the .NET 10 runtime, which is not carried) |

## Only to build and check it

| Package | Licence | Why it is used |
| --- | --- | --- |
| `vite`, `@sveltejs/vite-plugin-svelte` | MIT | Builds the window |
| `@tauri-apps/cli` | MIT OR Apache-2.0 | Builds the program |
| `typescript`, `@types/node`, `@types/three` | Apache-2.0; MIT; MIT | Types |
| `svelte-check` | MIT | Checks the components |
| `vitest` | MIT | Unit tests |
| `@playwright/test` | Apache-2.0 | Opens the window in a test browser |
| `@axe-core/playwright` | MPL-2.0 | The accessibility audit |
| `prettier`, `prettier-plugin-svelte` | MIT | Formatting |

## Our own

[phobos-modkit](https://github.com/phobos-dthorga/phobos-modkit), MIT, pinned as a submodule at `external/phobos-modkit`.
