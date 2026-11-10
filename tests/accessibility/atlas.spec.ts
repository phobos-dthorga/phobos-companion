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
