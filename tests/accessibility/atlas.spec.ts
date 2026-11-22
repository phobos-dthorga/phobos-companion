import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { healthyKit, mockHost, sampleHome } from "./host";

// The kit's own example world (phobos-modkit fixtures/README.md, 272 made-up tiles), as rimworld-save atlas reports it.
const CONTROL_MIN_PX = 44;
const report = JSON.parse(
  readFileSync(
    new URL("./example-atlas-report.json", import.meta.url),
    "utf-8",
  ),
);

const catalogue = {
  result: [
    {
      command: "sample-save",
      report: "summary",
      question: "What's in my save?",
      surface: null,
    },
    {
      command: "sample-save",
      report: "atlas",
      question: "What does my world look like?",
      surface: "globe",
    },
  ],
};

// Software WebGL, so the globe draws in a headless browser as on a PC without a graphics card.
test.use({
  launchOptions: {
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  },
});

async function audit(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
}

async function openAtlas(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Atlas", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "The world of First Sample",
  );
  await expect(page.getByText("Drawing the planet…")).toHaveCount(0);
}

for (const [name, viewport] of [
  ["desktop", { width: 1440, height: 900 }],
  ["narrow", { width: 480, height: 800 }],
] as const) {
  test.describe(`atlas ${name}`, () => {
    test.use({ viewport });

    test.beforeEach(async ({ page }) => {
      await mockHost(page, {
        home_status: { result: sampleHome() },
        kit_status: healthyKit,
        report_catalogue: catalogue,
        run_report: {
          result: {
            report,
            command_line: "python -m phobos_modkit sample-save atlas",
          },
        },
      });
      await openAtlas(page);
    });

    test("draws the planet and passes the audit", async ({ page }) => {
      await expect(page.locator(".globe canvas")).toBeVisible();
      await expect(page.getByRole("alert")).toHaveCount(0);
      await audit(page);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
      await page.screenshot({ path: `artifacts/atlas-${name}.png` });
    });

    test("opens with what the map shows and where it came from, not a long sentence", async ({
      page,
    }) => {
      await expect(page.locator("header.head .lead")).toContainText(
        "Every tile",
      );
      const facts = page.getByRole("group", { name: "Where this came from" });
      await expect(facts).toContainText("World seed");
      await expect(facts).toContainText("example seed");
      await expect(facts).toContainText("272 (3 subdivisions)");
      await expect(page.getByText("Index of Example.rws")).toHaveCount(0);
    });

    test("goes to a place from the list and tells about its tile", async ({
      page,
    }) => {
      await page.getByRole("button", { name: /^Example Home/ }).click();
      const tile = page.getByRole("region", { name: "The tile you picked" });
      await expect(tile).toContainText("Example Home");
      await expect(tile).toContainText("Temperate forest");
      await expect(tile).toContainText("Dirt road");
      await expect(tile).toContainText("120");
    });

    test("is moved and read from the keyboard alone", async ({ page }) => {
      const globe = page.getByRole("application");
      await globe.focus();
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("+");
      await page.keyboard.press("Enter");
      const tile = page.getByRole("region", { name: "The tile you picked" });
      await expect(tile).toContainText("Where");
    });

    test("switches views with buttons big enough to press", async ({
      page,
    }) => {
      const temperature = page.getByRole("button", {
        name: "Temperature",
        exact: true,
      });
      await temperature.click();
      await expect(temperature).toHaveAttribute("aria-pressed", "true");
      await expect(
        page.getByText("What the colours mean: Temperature"),
      ).toBeVisible();
      for (const control of await page.locator(".control, .chip").all()) {
        const box = await control.boundingBox();
        expect(box?.height ?? 0).toBeGreaterThanOrEqual(CONTROL_MIN_PX);
      }
    });
  });
}

test.describe("a picture of a page still loading", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("waits for the atlas to load, then takes it", async ({ page }) => {
    await mockHost(page, {
      home_status: { result: sampleHome() },
      kit_status: healthyKit,
      report_catalogue: catalogue,
      run_report: {
        progress: [
          { label: "Reading the save", step: 1, of: 2 },
          { label: "Drawing the world", step: 2, of: 2 },
        ],
        pauseMs: 1500,
        result: {
          report,
          command_line: "python -m phobos_modkit sample-save atlas",
        },
      },
      save_picture: { result: "C:\Pictures\First Sample Atlas.png" },
      show_picture: { result: null },
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Atlas", exact: true }).click();
    await expect(
      page.locator("main [data-picture-wait]").first(),
    ).toBeVisible();
    // A short page starts right under the bars: no empty band where the activity strip once took the spare height.
    const bars = await page.locator(".command-bar").boundingBox();
    const work = await page.locator(".workspace").boundingBox();
    expect(
      (work?.y ?? 0) - ((bars?.y ?? 0) + (bars?.height ?? 0)),
    ).toBeLessThan(80);
    await page.getByRole("button", { name: "Save a picture" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "still loading" }),
    ).toBeVisible();
    await expect(
      page.getByRole("status").filter({ hasText: "Saved to" }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(".globe canvas")).toBeVisible();
  });
});

test.describe("a set of tools on the list", () => {
  test("says the atlas has nothing for it, and asks the host nothing", async ({
    page,
  }) => {
    const home = sampleHome();
    const games = home.games.map((game, index) =>
      index === 0 ? { ...game, kind: "tools" } : game,
    );
    await mockHost(page, {
      home_status: { result: { ...home, games } },
      kit_status: healthyKit,
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Atlas", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Nothing to show here for First Sample",
    );
    await expect(page.locator("main")).toContainText("a set of tools");
    await audit(page);
  });
});

test.describe("a set of tools on the Mods page (0.26.2)", () => {
  test("says there are no mods to install, and leads to About", async ({
    page,
  }) => {
    const home = sampleHome();
    const games = home.games.map((game, index) =>
      index === 0 ? { ...game, kind: "tools" } : game,
    );
    await mockHost(page, {
      home_status: { result: { ...home, games } },
      kit_status: healthyKit,
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Mods", exact: true }).click();
    await expect(page.getByRole("main")).toContainText(
      "there are no mods to install",
    );
    await audit(page);
    await page.getByRole("button", { name: "Open About", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "About", exact: true }),
    ).toHaveAttribute("aria-current", "page");
  });
});
