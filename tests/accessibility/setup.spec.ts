import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { healthyKit, mockHost, sampleAiStatus, sampleHome } from "./host";

/** Invented rows (0.87.0): Steam missing, ilspycmd waiting for the SDK, a game's own program with no command, git here. */
function row(key: string, more: Record<string, unknown> = {}) {
  return {
    key,
    name: key,
    game: null,
    neededBy: "Some pages",
    how: "not on the PATH",
    state: "missing",
    everyday: false,
    page: true,
    command: null,
    fetcher: null,
    fetcherHere: false,
    waitsFor: [],
    pages: [],
    ...more,
  };
}

const rows = [
  row("steam", {
    name: "Steam",
    everyday: true,
    command: "winget install --id Valve.Steam --exact",
    fetcher: "winget",
    fetcherHere: true,
  }),
  row("dotnet-sdk", {
    name: ".NET 10 SDK",
    neededBy: "Watching a running game's memory",
    command: "winget install --id Microsoft.DotNet.SDK.10 --exact",
    fetcher: "winget",
    fetcherHere: true,
    pages: ["memory"],
  }),
  row("ilspycmd", {
    name: "ILSpy's command line (ilspycmd)",
    command: "dotnet tool install --global ilspycmd",
    fetcher: "dotnet",
    waitsFor: [".NET 10 SDK"],
  }),
  row("todds", { name: "RimSort's texture encoder", game: "first" }),
  row("git", { name: "git", state: "here", how: "on the PATH" }),
];

/** Invented (0.89.0): one repository with a changelog and nothing else, kept with git. */
const starter = (id: string, path: string, present: boolean, more = {}) => ({
  id,
  path,
  present,
  chosen: false,
  forAgents: false,
  content: `# ${id}\n`,
  ...more,
});
const repositories = [
  {
    game: "first",
    gameName: "First Sample",
    name: "first-mods",
    found: true,
    git: true,
    starters: [
      starter("changelog", "CHANGELOG.md", true, { chosen: true }),
      starter("open-work", "docs/development/outstanding-work.md", false),
      starter("decisions", "config/decisions.json", false, { forAgents: true }),
    ],
  },
];

const setup = (fetching: unknown = null) => ({
  result: { system: "windows", rows, repositories, games: 2, fetching },
});

const running = {
  key: "steam",
  name: "Steam",
  command: "winget install --id Valve.Steam --exact",
  output: "Found Steam [Valve.Steam]",
  ended: null,
};

async function openSetup(page: Page, answers: Record<string, unknown> = {}) {
  await mockHost(page, {
    home_status: { result: sampleHome() },
    kit_status: healthyKit,
    setup_status: setup(),
    ...answers,
  });
  await page.goto("/");
}

test.describe("Setup", () => {
  test("a page that uses a missing program says so, and opens Setup (0.88.0)", async ({
    page,
  }) => {
    await openSetup(page);
    // Home uses none of them: no page line there.
    await expect(
      page.getByRole("region", { name: /Part of this page uses/ }),
    ).toHaveCount(0);
    await page
      .getByRole("navigation", { name: "Pages" })
      .getByRole("button", { name: "Memory", exact: true })
      .click();
    const line = page.getByRole("region", {
      name: "Part of this page uses a program that isn't on this computer",
    });
    await expect(line).toContainText(
      ".NET 10 SDK: Watching a running game's memory",
    );
    await expect(
      (
        await new AxeBuilder({ page }).include(".page-needs").analyze()
      ).violations.map((v) => v.id),
    ).toEqual([]);
    await line
      .getByRole("button", { name: "Set it up in Settings → Setup" })
      .click();
    await expect(
      page.getByRole("tab", { name: "Setup", selected: true }),
    ).toBeVisible();
  });

  test("Home names an everyday program that is missing, and opens Setup (0.87.0)", async ({
    page,
  }) => {
    await openSetup(page);
    const line = page.getByRole("region", {
      name: "A program the pages use isn't here",
    });
    await expect(line).toContainText("Missing: Steam");
    await line.getByRole("button", { name: "Open Setup" }).click();
    await expect(
      page.getByRole("tab", { name: "Setup", selected: true }),
    ).toBeVisible();
  });

  test("the tab lists what is missing first, says what each needs, and shows a command before it runs (0.87.0)", async ({
    page,
  }) => {
    await openSetup(page, {
      setup_fetch: { result: running },
      setup_fetching: {
        result: { ...running, ended: { exitCode: 0, signal: null } },
      },
    });
    await page.keyboard.press("9");
    await page.getByRole("tab", { name: "Setup" }).click();
    const panel = page.getByRole("region", { name: "What the pages need" });
    await expect(panel).toContainText("4 not here");
    await expect(panel).toContainText("Here (1)");
    // ilspycmd waits for the SDK; the game's own program has no command, only its page.
    await expect(panel).toContainText("Needs .NET 10 SDK first");
    await expect(panel).toContainText("use its download page");
    await expect(
      panel.getByRole("button", { name: /Fetch ILSpy/ }),
    ).toHaveCount(0);

    // A press shows the command whole; nothing runs until Run it.
    await panel.getByRole("button", { name: "Fetch Steam…" }).click();
    const confirm = panel.getByRole("group", {
      name: "This runs on your computer",
    });
    await expect(confirm).toContainText(
      "winget install --id Valve.Steam --exact",
    );
    await expect(confirm).toContainText("administrator's yes");
    await expect(
      (
        await new AxeBuilder({ page }).include(".setup").analyze()
      ).violations.map((v) => v.id),
    ).toEqual([]);
    await confirm.getByRole("button", { name: "Run it" }).click();

    // It runs, ends, and is believed only once the tools find it: still missing here, so the page says to look again.
    const fetching = panel.getByRole("group", { name: "Fetching Steam" });
    await expect(fetching).toContainText("isn't found yet");
    await expect(fetching.getByRole("button", { name: "Stop" })).toHaveCount(0);
  });

  test("a refused fetch says why, and a failed one shows what it printed (0.87.0)", async ({
    page,
  }) => {
    await openSetup(page, {
      setup_status: setup({
        ...running,
        output: "Installer failed with exit code: 1603",
        ended: { exitCode: 1603, signal: null },
      }),
      setup_fetch: {
        failure: {
          code: "refused",
          detail: "Steam is already on this computer",
        },
      },
    });
    await page.keyboard.press("9");
    await page.getByRole("tab", { name: "Setup" }).click();
    const panel = page.getByRole("region", { name: "What the pages need" });
    const fetching = panel.getByRole("group", { name: "Fetching Steam" });
    await expect(fetching).toContainText("ended with code 1603");
    await expect(fetching.locator(".output")).toBeVisible();
    await expect(fetching.locator(".output")).toContainText("1603");

    await panel.getByRole("button", { name: "Fetch Steam…" }).click();
    await panel.getByRole("button", { name: "Run it" }).click();
    await expect(panel).toContainText(
      "Not run: Steam is already on this computer",
    );
  });

  test("a repository is offered the starter files it lacks, each shown whole, written only on a press (0.89.0)", async ({
    page,
  }) => {
    const written = repositories.map((r) => ({
      ...r,
      starters: r.starters.map((s) => ({ ...s, present: true })),
    }));
    await openSetup(page, {
      setup_write_starters: {
        result: {
          setup: {
            system: "windows",
            rows,
            repositories: written,
            games: 2,
            fetching: null,
          },
          refused: [],
        },
      },
    });
    await page.keyboard.press("9");
    await page.getByRole("tab", { name: "Setup" }).click();
    const panel = page.getByRole("region", { name: "Your repositories" });
    await expect(panel).toContainText("first-mods");
    await expect(panel).toContainText("Kept with git.");
    await panel.getByRole("button", { name: "Add starter files…" }).click();
    const confirm = panel.getByRole("group", {
      name: "These would be written into first-mods",
    });
    await expect(confirm).toContainText("docs/development/outstanding-work.md");
    await expect(confirm).toContainText("# open-work");
    // Nothing is ticked by default here, so nothing can be written yet.
    const write = confirm.getByRole("button", {
      name: "Write the ticked files",
    });
    await expect(write).toBeDisabled();
    await confirm
      .getByRole("checkbox", { name: "docs/development/outstanding-work.md" })
      .check();
    await expect(
      (
        await new AxeBuilder({ page }).include(".repositories").analyze()
      ).violations.map((v) => v.id),
    ).toEqual([]);
    await write.click();
    await expect(panel).toContainText("Written into first-mods");
    await expect(panel).toContainText("It has every file the pages read.");
  });

  test("AI, if you want it: a local model is looked for and used, and an agent is tried, on a press (0.90.0)", async ({
    page,
  }) => {
    const chat = {
      on: false,
      chosen: null,
      agents: [
        { id: "claude", name: "Claude (Claude Agent)", found: true, get: "" },
        {
          id: "codex",
          name: "Codex",
          found: false,
          get: "Install it with npm.",
        },
      ],
      running: null,
      commands: "ask",
    };
    await openSetup(page, {
      ai_status: { result: { ...sampleAiStatus, chosen: null } },
      chat_status: { result: chat },
      ai_models: { result: ["small-model:3b", "sample-model:8b"] },
      ai_choose_service: { result: sampleAiStatus },
      ai_choose_model: { result: sampleAiStatus },
      chat_try: {
        result: {
          agent: "Claude (Claude Agent)",
          saidName: "Claude Agent",
          version: "0.9.1",
          signIn: ["Log in with Claude"],
        },
      },
      chat_choose: { result: { ...chat, chosen: "claude" } },
    });
    await page.keyboard.press("9");
    await page.getByRole("tab", { name: "Setup" }).click();
    const panel = page.getByRole("region", { name: "AI, if you want it" });
    await panel.getByRole("button", { name: "Look for Ollama" }).click();
    await expect(panel).toContainText("It's running, with 2 models.");
    await panel.getByRole("button", { name: "Use sample-model:8b" }).click();
    await expect(panel).toContainText(
      "Kept: help on pages uses sample-model:8b.",
    );

    // Codex isn't here: how to get it. Claude is: Try it, then use it.
    await expect(panel).toContainText("Install it with npm.");
    await panel
      .getByRole("button", { name: "Try Claude (Claude Agent)" })
      .click();
    await expect(panel).toContainText(
      "Claude Agent 0.9.1 answered: it starts and speaks to the Companion. It may ask you to sign in, with: Log in with Claude.",
    );
    await panel.getByRole("button", { name: "Use it for chat" }).click();
    await expect(panel).toContainText("chosen for chat");
    await expect(panel).toContainText("The Chat page is switched off.");
    await expect(
      (
        await new AxeBuilder({ page }).include(".setup-ai").analyze()
      ).violations.map((v) => v.id),
    ).toEqual([]);
  });

  test("a program set aside moves to its own group, and Home no longer names it (0.87.0)", async ({
    page,
  }) => {
    const aside = rows.map((r) =>
      r.key === "steam" ? { ...r, state: "set-aside" } : r,
    );
    await openSetup(page, {
      setup_set_aside: {
        result: {
          system: "windows",
          rows: aside,
          repositories,
          games: 2,
          fetching: null,
        },
      },
    });
    await page.keyboard.press("9");
    await page.getByRole("tab", { name: "Setup" }).click();
    const panel = page.getByRole("region", { name: "What the pages need" });
    const steam = panel.locator("li", { hasText: "Steam" });
    await steam.getByRole("button", { name: "I don't need it" }).click();
    await expect(panel).toContainText(
      "Set aside: you said you don't need these (1)",
    );
    await expect(
      panel.getByRole("button", { name: "I need it after all" }),
    ).toBeVisible();
    await page.keyboard.press("1");
    await expect(
      page.getByRole("region", { name: "A program the pages use isn't here" }),
    ).toHaveCount(0);
  });
});
