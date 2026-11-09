import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { healthyKit, mockHost, sampleHome } from "./host";

const CONTROL_MIN_PX = 44;

const catalogue = {
  result: [
    {
      command: "sample-save",
      report: "summary",
      question: "What's in my save?",
    },
    { command: "sample-log", report: null, question: "Why did it log errors?" },
  ],
};

function sampleReport(rows: number) {
  return {
    format: 1,
    title: "Sample report",
    lines: ["An opening line that says what was read."],
    blocks: [],
    sections: [
      {
        heading: "Sample table",
        level: 2,
        blocks: [
          {
            type: "table",
            headers: ["Name", "Share"],
            rows: [
              ["Apple", "5%"],
              ["Pear", "12.5%"],
              ["Plum", "1%"],
              ...Array.from({ length: rows - 3 }, (_, i) => [
                `Extra ${i}`,
                "2%",
              ]),
            ],
            values: [
              [null, 5],
              [null, 12.5],
              [null, 1],
              ...Array.from({ length: rows - 3 }, () => [null, 2]),
            ],
            total: 8,
          },
        ],
      },
      {
        heading: "Sample notes",
        level: 2,
        blocks: [
          { type: "text", text: "A paragraph from the report." },
          { type: "bullets", items: ["First point", "Second point"] },
          { type: "code", language: "text", lines: ["line one", "line two"] },
        ],
      },
    ],
  };
}

const ready = (rows: number) => ({
  result: {
    report: sampleReport(rows),
    command_line: "python -m phobos_modkit sample-save summary --top 100",
  },
});

async function audit(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
}

async function noSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

async function openReports(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "First Sample today",
  );
  await page.getByRole("button", { name: "Reports", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "What do you want to know about First Sample?",
  );
}

for (const [name, viewport] of [
  ["desktop", { width: 1440, height: 900 }],
  ["narrow", { width: 480, height: 800 }],
] as const) {
  test.describe(`reports ${name}`, () => {
    test.use({ viewport });

    test.describe("with reports", () => {
      test.beforeEach(async ({ page, context }) => {
        await context.grantPermissions(["clipboard-read", "clipboard-write"]);
        await mockHost(page, {
          home_status: { result: sampleHome() },
          kit_status: healthyKit,
          report_catalogue: catalogue,
          run_report: ready(3),
          run_report_more: ready(8),
        });
        await openReports(page);
      });

      test("lists questions and passes the audit", async ({ page }) => {
        await expect(
          page.getByRole("button", { name: "What's in my save?" }),
        ).toBeVisible();
        await audit(page);
      });

      test("opens a report from the keyboard and moves there", async ({
        page,
      }) => {
        await page.getByRole("button", { name: "What's in my save?" }).focus();
        await page.keyboard.press("Enter");
        const heading = page.getByRole("heading", { level: 1 });
        await expect(heading).toContainText("What's in my save?");
        await expect(heading).toBeFocused();
        await expect(page.locator(".canvas")).toContainText(
          "An opening line that says what was read.",
        );
        await expect(page.locator(".canvas")).toContainText("First point");
        await page.screenshot({
          path: `artifacts/report-${name}.png`,
          fullPage: true,
        });
      });

      test.describe("an open report", () => {
        test.beforeEach(async ({ page }) => {
          await page
            .getByRole("button", { name: "What's in my save?" })
            .click();
          await expect(page.locator("table")).toBeVisible();
        });

        test("passes the audit and holds its layout", async ({ page }) => {
          await audit(page);
          await noSidewaysScroll(page);
        });

        test("keeps every control big enough", async ({ page }) => {
          const heights = await page
            .getByRole("button")
            .evaluateAll((all) =>
              all.map((b) => b.getBoundingClientRect().height),
            );
          expect(Math.min(...heights)).toBeGreaterThanOrEqual(CONTROL_MIN_PX);
        });

        test("sorts a column of percentages as numbers", async ({ page }) => {
          await page.getByRole("button", { name: "Share" }).click();
          const firstColumn = page.locator("tbody tr td:first-child");
          await expect(firstColumn).toHaveText(["Pear", "Apple", "Plum"]);
          await expect(
            page.getByRole("columnheader", { name: /Share/ }),
          ).toHaveAttribute("aria-sort", "descending");
          await page.getByRole("button", { name: /Share/ }).click();
          await expect(firstColumn).toHaveText(["Plum", "Apple", "Pear"]);
        });

        test("says how much is shown, and shows more", async ({ page }) => {
          await expect(page.locator(".canvas")).toContainText(
            "Showing 3 of 8.",
          );
          await page.getByRole("button", { name: "Show more" }).click();
          await expect(page.locator("tbody tr")).toHaveCount(8);
          await expect(
            page.getByRole("button", { name: "Show more" }),
          ).toHaveCount(0);
        });

        test("copies the command and says so", async ({ page }) => {
          await page.getByRole("button", { name: "Copy as command" }).click();
          await expect(page.locator(".toolbar")).toContainText("Copied.");
          const text = await page.evaluate(() =>
            navigator.clipboard.readText(),
          );
          expect(text).toBe(
            "python -m phobos_modkit sample-save summary --top 100",
          );
        });

        test("goes back to the list", async ({ page }) => {
          await page.getByRole("button", { name: "Back to the list" }).click();
          await expect(
            page.getByRole("button", { name: "Why did it log errors?" }),
          ).toBeVisible();
        });
      });

      test("changing game goes back to that game's list", async ({ page }) => {
        await page.getByRole("button", { name: "What's in my save?" }).click();
        await expect(page.locator("table")).toBeVisible();
        await page.getByRole("button", { name: /Second Sample/ }).click();
        await expect(page.getByRole("heading", { level: 1 })).toContainText(
          "What do you want to know about Second Sample?",
        );
      });
    });

    test("a wide table keeps its words whole and scrolls", async ({ page }) => {
      const headers = Array.from({ length: 14 }, (_, i) => `Column ${i}`);
      const words = headers.map(() => "Humanlike");
      const report = sampleReport(3);
      report.sections = [
        {
          heading: "Wide",
          level: 2,
          blocks: [
            {
              type: "table",
              headers,
              rows: [words],
              values: [headers.map(() => null)],
              total: 1,
            } as never,
          ],
        },
      ];
      await mockHost(page, {
        home_status: { result: sampleHome() },
        kit_status: healthyKit,
        report_catalogue: catalogue,
        run_report: { result: { report, command_line: "x" } },
      });
      await openReports(page);
      await page.getByRole("button", { name: "What's in my save?" }).click();
      const firstCell = page.locator("tbody td").first();
      await expect(firstCell).toHaveText("Humanlike");
      const lines = await firstCell.evaluate((cell) => {
        const range = document.createRange();
        range.selectNodeContents(cell);
        return range.getClientRects().length;
      });
      expect(lines).toBe(1);
      const scrolls = await page
        .locator(".scroll")
        .evaluate((box) => box.scrollWidth > box.clientWidth);
      expect(scrolls).toBe(true);
      await noSidewaysScroll(page);
      await audit(page);
    });

    test("a game with no reports says so", async ({ page }) => {
      await mockHost(page, {
        home_status: { result: sampleHome() },
        kit_status: healthyKit,
        report_catalogue: { result: [] },
      });
      await openReports(page);
      await expect(page.locator(".canvas")).toContainText(
        "No reports for First Sample yet.",
      );
      await audit(page);
    });

    test("a report that fails says what happened and offers another go", async ({
      page,
    }) => {
      await mockHost(page, {
        home_status: { result: sampleHome() },
        kit_status: healthyKit,
        report_catalogue: catalogue,
        run_report: {
          failure: { code: "tool_failed", detail: "No save was found." },
        },
      });
      await openReports(page);
      await page.getByRole("button", { name: "What's in my save?" }).click();
      const canvas = page.locator(".canvas");
      await expect(canvas).toContainText(
        "The tool kit started but stopped with an error.",
      );
      await expect(canvas).toContainText("Nothing was changed.");
      await expect(
        page.getByRole("button", { name: "Try again" }),
      ).toBeVisible();
      await audit(page);
    });
  });
}
