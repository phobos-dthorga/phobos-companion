import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import {
  healthyKit,
  mockHost,
  openTab,
  sampleAiStatus,
  sampleHome,
} from "./host";

const CONTROL_MIN_PX = 44;

function setting(
  key: string,
  description: string,
  extra: Record<string, unknown> = {},
) {
  return {
    key,
    env: null,
    description,
    kind: "folder",
    game: null,
    declaredBy: "phobos-modkit",
    value: null,
    layer: "default",
    repository: null,
    central: null,
    default: null,
    exists: null,
    overridden: [],
    ...extra,
  };
}

/** Invented settings, for the audit only. */
const sampleSettings = {
  central_file: "C:\\Sample\\settings.json",
  central_exists: true,
  settings: [
    setting(
      "historyPath",
      "Where the record of what happened on this PC is kept",
      {
        name: "Record of what happened",
        value: "K:\\sample\\history",
        layer: "central",
        central: "K:\\sample\\history",
        default: "C:\\Sample\\history",
        exists: true,
      },
    ),
    setting("sampleGamePath", "The sample game's folder", {
      game: "first",
      value: "C:\\Games\\Sample",
      layer: "repository",
      repository: "first-mods",
      exists: false,
      overridden: [
        { repository: "first-mods", value: "C:\\Games\\Sample" },
        { repository: "second-mods", value: "D:\\Games\\Sample" },
      ],
    }),
  ],
};

/** Invented setup lines for an AI program (0.70.0), as the kit's `mcp setup` gives them. */
const sampleServer = {
  command: "C:\\Sample\\python.exe",
  args: ["-m", "phobos_modkit", "mcp", "serve"],
  env: { PYTHONPATH: "C:\\Sample\\kit" },
};
const sampleAiSetup = {
  name: "dthorga-reports",
  online: false,
  ...sampleServer,
  serversJson: JSON.stringify(
    { mcpServers: { "dthorga-reports": sampleServer } },
    null,
    2,
  ),
  claudeCode: `claude mcp add-json --scope user dthorga-reports '${JSON.stringify({ type: "stdio", ...sampleServer })}'`,
};

async function open(
  page: Page,
  saved: unknown = {
    ok: true,
    refusal: null,
    central_file: "C:\\Sample\\settings.json",
  },
) {
  await mockHost(page, {
    home_status: { result: sampleHome() },
    kit_status: healthyKit,
    settings_list: { result: sampleSettings },
    set_setting: { result: saved },
    ai_programs_setup: { result: sampleAiSetup },
    ai_status: { result: sampleAiStatus },
    ai_choose_service: {
      result: { ...sampleAiStatus, chosen: "anthropic", ready: false },
    },
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Where the tools keep and find things",
  );
  await openTab(page, "Folders and files");
}

/** Opens one setting's line (0.66.0: each setting is one line until pressed). */
async function openSetting(page: Page, key: string) {
  await page.locator(`#setting-${key} .line`).click();
}

async function audit(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
}

for (const [name, viewport] of [
  ["desktop", { width: 1440, height: 900 }],
  ["narrow", { width: 480, height: 800 }],
] as const) {
  test.describe(`Settings page, ${name}`, () => {
    test.use({ viewport });

    test("lists every setting with where its value comes from, and passes the audit", async ({
      page,
    }) => {
      await open(page);
      await expect(
        page.getByRole("heading", { name: "Every game" }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "First Sample" }),
      ).toBeVisible();
      await expect(page.locator("main")).toContainText(
        "the central settings file",
      );
      await expect(page.locator("main")).toContainText(
        "first-mods's own settings",
      );
      // One line each (0.66.0): the few words when a setting has them, its sentence when not, and the detail on a press.
      await expect(page.locator("#setting-historyPath .line")).toContainText(
        "Record of what happened",
      );
      await expect(
        page.getByRole("tab", { name: /^Folders and files/ }),
      ).toContainText("1 needs you");
      await expect(page.locator("main")).not.toContainText(
        "second-mods's own settings name",
      );
      await openSetting(page, "sampleGamePath");
      await expect(page.locator("main")).toContainText(
        "second-mods's own settings name D:\\Games\\Sample",
      );
      await audit(page);
      await page.getByRole("button", { name: /^Needs you/ }).click();
      await expect(page.locator("#setting-historyPath")).toHaveCount(0);
      await expect(page.locator("#setting-sampleGamePath")).toBeVisible();
      const small = await page
        .locator("main")
        .evaluate(
          (root, min) =>
            [...root.querySelectorAll("button, input")]
              .map((e) => e.getBoundingClientRect())
              .filter((r) => r.width > 0 && r.height < min).length,
          CONTROL_MIN_PX,
        );
      expect(small).toBe(0);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });

    test("changes a setting in the central file and says so", async ({
      page,
    }) => {
      await open(page);
      await openSetting(page, "historyPath");
      await page
        .getByRole("button", { name: "Type a path for historyPath" })
        .click();
      const field = page.getByLabel("New value for historyPath (a full path)");
      await expect(field).toBeFocused();
      await field.fill("K:\\elsewhere\\history");
      await audit(page);
      await page
        .getByRole("button", { name: "Save to the central file" })
        .click();
      await expect(page.locator("main").getByRole("status")).toContainText(
        "Saved historyPath to the central settings file.",
      );
    });

    test("the AI tab shows the lines for AI programs, copies them, and passes the audit", async ({
      page,
    }) => {
      await open(page);
      await openTab(page, "AI");
      await expect(
        page.getByRole("heading", { name: "AI programs" }),
      ).toBeVisible();
      await expect(page.locator("#settings-ai-programs")).toContainText(
        '"mcpServers"',
      );
      await expect(page.locator("#settings-ai-programs")).toContainText(
        "claude mcp add-json --scope user dthorga-reports",
      );
      await audit(page);
      await page.getByRole("button", { name: "Copy the list" }).click();
      await expect(
        page.locator("#settings-ai-programs").getByRole("status"),
      ).toContainText("clipboard");
      const small = await page
        .locator("#settings-ai-programs")
        .evaluate(
          (root, min) =>
            [...root.querySelectorAll("button")]
              .map((e) => e.getBoundingClientRect())
              .filter((r) => r.width > 0 && r.height < min).length,
          CONTROL_MIN_PX,
        );
      expect(small).toBe(0);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });

    test("the AI tab's services say what runs where, and an online one asks for its key and its switch", async ({
      page,
    }) => {
      await open(page);
      await openTab(page, "AI");
      const panel = page.locator("#settings-ai-services");
      await expect(
        page.getByRole("heading", { name: "AI services" }),
      ).toBeVisible();
      await expect(panel).toContainText("Model: sample-model:8b");
      await expect(panel).toContainText(
        "Ready: Explain this fault shows on the Logs page.",
      );
      await expect(panel).toContainText("This month: 3 answers");
      await audit(page);
      await panel
        .getByRole("button", { name: /^Claude \(Anthropic\)/ })
        .click();
      await expect(panel).toContainText("Online services are switched off.");
      await expect(panel).toContainText("No key yet.");
      await expect(
        panel.getByLabel("A key for Claude (Anthropic)"),
      ).toHaveAttribute("type", "password");
      await audit(page);
    });

    test("a refusal is shown in words and nothing is called saved", async ({
      page,
    }) => {
      await open(page, {
        ok: false,
        refusal: "A setting's value is a full path.",
        central_file: null,
      });
      await openSetting(page, "historyPath");
      await page
        .getByRole("button", { name: "Use the default for historyPath" })
        .click();
      await expect(page.locator("main").getByRole("status")).toContainText(
        "Not saved: A setting's value is a full path.",
      );
    });
  });
}
