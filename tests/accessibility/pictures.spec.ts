import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { healthyKit, mockHost, sampleHome } from "./host";

const SAVED =
  "C:\\Users\\Sample\\Pictures\\D'thorga Companion\\First Sample Home.png";

async function open(page: Page) {
  await mockHost(page, {
    home_status: { result: sampleHome() },
    kit_status: healthyKit,
    save_picture: { result: SAVED },
    show_picture: { result: null },
  });
  // Keeps what the window sends with a picture, to check it is a PNG of the page and named for it.
  await page.addInitScript(() => {
    const scope = window as unknown as {
      __TAURI_INTERNALS__: {
        invoke: (c: string, a: unknown, o: unknown) => Promise<unknown>;
      };
      sentPictures: {
        bytes: number;
        signature: number[];
        name: string;
        width: number;
      }[];
    };
    scope.sentPictures = [];
    const invoke = scope.__TAURI_INTERNALS__.invoke;
    scope.__TAURI_INTERNALS__.invoke = (command, args, options) => {
      if (command === "save_picture" && args instanceof Uint8Array) {
        const headers =
          (options as { headers?: Record<string, string> } | undefined)
            ?.headers ?? {};
        scope.sentPictures.push({
          bytes: args.length,
          signature: Array.from(args.slice(0, 4)),
          // A PNG's width is the four bytes after its header's name, high byte first.
          width: new DataView(args.buffer, args.byteOffset + 16, 4).getUint32(
            0,
          ),
          name: decodeURIComponent(headers["x-picture-name"] ?? ""),
        });
      }
      return invoke(command, args, options);
    };
  });
  await page.goto("/");
}

test.describe("Pictures of a page", () => {
  test("Save a picture draws the whole window as a PNG, saves it, and says where", async ({
    page,
  }) => {
    await open(page);
    await page.getByRole("button", { name: "Save a picture" }).click();
    const notice = page.getByRole("status").filter({ hasText: "Saved to" });
    await expect(notice).toContainText(SAVED);
    const sent = await page.evaluate(
      () =>
        (
          window as unknown as {
            sentPictures: {
              bytes: number;
              signature: number[];
              name: string;
              width: number;
            }[];
          }
        ).sentPictures,
    );
    expect(sent).toHaveLength(1);
    expect(sent[0].signature).toEqual([0x89, 0x50, 0x4e, 0x47]);
    expect(sent[0].bytes).toBeGreaterThan(1000);
    // The whole window since 0.68.0: as wide as the window, wider than the page alone.
    const widths = await page.evaluate(() => ({
      window: document.querySelector(".shell")?.scrollWidth ?? 0,
      main: document.querySelector("main")?.scrollWidth ?? 0,
      scale: Math.min(2, Math.max(1, window.devicePixelRatio || 1)),
    }));
    expect(sent[0].width).toBe(widths.window * widths.scale);
    expect(widths.window).toBeGreaterThan(widths.main);
    expect(sent[0].name).toMatch(
      /^First Sample Home \d{4}-\d{2}-\d{2} \d{2}\.\d{2}\.\d{2}$/,
    );
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
      .analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
    await page.getByRole("button", { name: "Close this note" }).click();
    await expect(notice).toHaveCount(0);
    await page.keyboard.press("p");
    await expect(
      page.getByRole("status").filter({ hasText: "Saved to" }),
    ).toBeVisible();
  });
});
