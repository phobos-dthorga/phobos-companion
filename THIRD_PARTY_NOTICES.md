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
| [Fluent](https://projectfluent.org/) (`@fluent/bundle`) | Apache-2.0 | Words in one catalogue, with counts said properly |
| [serde](https://serde.rs/), `serde_json` | MIT OR Apache-2.0 | Reading the tools' answers |
| [Apache ECharts](https://echarts.apache.org/) (`echarts` 6.1.0), with its `zrender` 6.1.0 and `tslib` 2.3.0 | Apache-2.0; BSD-3-Clause; 0BSD | Drawing the tools' charts (read 10 November 2026). Only `src/lib/charts/echartsCore.ts` imports it, and only when a report has a chart |
| [three.js](https://threejs.org/) (`three` 0.186.1), with its addons for orbit controls and wide lines | MIT | Drawing the atlas's globe (read 10 November 2026). Only `src/lib/atlas/globeScene.ts` imports it, and only when the atlas opens |

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
