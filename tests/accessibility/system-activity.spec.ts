import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { healthyKit, mockHost, sampleHome } from "./host";

const MB = 1024 * 1024;

/** Invented: a minute of readings, the last one busy (0.86.0). */
const samples = Array.from({ length: 60 }, (_, i) => ({
  at: 1_795_000_000_000 + i * 1000,
  cpu: i === 59 ? 23 : 10 + (i % 7),
  memoryUsed: 12 * 1024 * MB,
  memoryTotal: 32 * 1024 * MB,
  diskRead: i === 59 ? 3 * MB : 200 * 1024,
  diskWrite: i === 59 ? 1.2 * MB : 0,
  netDown: i === 59 ? 2 * MB : 50 * 1024,
  netUp: 10 * 1024,
  ours: {
    cpu: i === 59 ? 4.6 : 1,
    memory: 380 * MB,
    diskRead: i === 59 ? MB : 0,
    diskWrite: 0,
  },
}));

for (const [name, viewport] of [
  ["desktop", { width: 1440, height: 900 }],
  ["narrow", { width: 480, height: 800 }],
] as const) {
  test.describe(`System activity, ${name}`, () => {
    test.use({ viewport });

    test("the status bar shows the computer's CPU, memory, disk and network, and the Companion's share (0.86.0)", async ({
      page,
    }) => {
      await mockHost(page, {
        home_status: { result: sampleHome() },
        kit_status: healthyKit,
        activity: { result: samples },
      });
      await page.goto("/");
      const meters = page.getByRole("group", {
        name: "This computer's activity, with the Companion's share",
      });
      await expect(meters).toContainText("CPU");
      await expect(meters).toContainText("23%");
      await expect(meters).toContainText("Memory");
      await expect(meters).toContainText("12 GB");
      await expect(meters).toContainText("4.2 MB/s");
      await expect(meters).toContainText("Network");
      // The words on hover say what each part is, network with no share.
      await expect(meters.locator(".meter").last()).toHaveAttribute(
        "title",
        /can't be told/,
      );
      if (name === "desktop") {
        await expect(meters).toContainText("Companion 5%");
        await expect(meters.locator("svg")).toHaveCount(4);
      } else {
        // A narrow window keeps the values and folds away the graphs and the shares.
        await expect(meters.locator("svg").first()).toBeHidden();
      }
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
        .analyze();
      expect(results.violations.map((v) => v.id)).toEqual([]);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });

    test("with no readings yet, the status bar shows nothing for them", async ({
      page,
    }) => {
      await mockHost(page, {
        home_status: { result: sampleHome() },
        kit_status: healthyKit,
      });
      await page.goto("/");
      await expect(page.getByRole("contentinfo")).toContainText(
        "An independent community project",
      );
      await expect(
        page.getByRole("group", {
          name: "This computer's activity, with the Companion's share",
        }),
      ).toHaveCount(0);
    });
  });
}
