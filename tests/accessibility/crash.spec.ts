import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { healthyKit, mockHost, sampleHome } from "./host";

async function audit(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
}

/** Home's note after a crash (0.105.0): crashes since you last looked, and the look after an unexpected shutdown. */
test.describe("After a crash on Home (0.105.0)", () => {
  test("names the crashes, looks once after the shutdown, and Got it puts the crashes away", async ({
    page,
  }) => {
    // A fixed clock, so the stand-in crash is within the last week whatever today's date is.
    await page.clock.setFixedTime(new Date("2026-11-27T09:00:00Z"));
    await mockHost(page, {
      home_status: { result: sampleHome() },
      kit_status: healthyKit,
      crash_status: {
        result: {
          lastShutdown: "2026-11-22T15:24:15+00:00",
          lastCheck: null,
          due: true,
          days: 6,
          dumps: [
            {
              file: "Sample.exe.70556.dmp",
              program: "Sample",
              time: "2026-11-23T13:02:24+00:00",
              size: 73314872,
            },
          ],
        },
      },
      crash_look_now: {
        result: {
          lastShutdown: "2026-11-22T15:24:15+00:00",
          days: 6,
          files: [
            {
              path: "~\Sample\mods\Version.txt",
              kind: "tracked",
              repository: "~\Sample",
              size: 12,
              advice:
                "git's last commit holds a real copy: `zeroed restore --apply` writes it back.",
              restorable: true,
            },
          ],
        },
      },
    });
    await page.goto("/");
    const crashed = page.getByRole("listitem", { name: "A program crashed" });
    const look = page.getByRole("listitem", {
      name: "After the unexpected shutdown",
    });
    await expect(crashed).toContainText(
      "A program crashed since you last looked",
    );
    await expect(crashed).toContainText("Sample,");
    await expect(look).toContainText("left one file filled with zeros");
    await look.getByText("The file and what puts it right").click();
    await expect(look).toContainText("Version.txt");
    await audit(page);
    await crashed.getByRole("button", { name: "Got it" }).click();
    await expect(crashed).toHaveCount(0);
    await expect(look).toContainText("left one file filled with zeros");
  });

  test("says nothing when nothing crashed and no look is due", async ({
    page,
  }) => {
    await mockHost(page, {
      home_status: { result: sampleHome() },
      kit_status: healthyKit,
    });
    await page.goto("/");
    await expect(
      page.getByRole("listitem", { name: "A program crashed" }),
    ).toHaveCount(0);
  });
});
