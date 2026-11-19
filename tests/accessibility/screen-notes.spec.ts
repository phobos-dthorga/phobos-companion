import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { healthyKit, mockHost, sampleHome } from "./host";

const NOTES = {
  open: [
    {
      id: "20261119-090000",
      time: "2026-11-18T22:00:00Z",
      game: "First Sample",
      page: "Mods",
      address: "dthorga://mods/first-sample",
      words: "The backups list runs off the right edge",
      has_picture: true,
      resolved: null,
    },
  ],
  dealt: [
    {
      id: "20261118-200000",
      time: "2026-11-18T09:00:00Z",
      game: "First Sample",
      page: "Timeline",
      address: "dthorga://timeline/first-sample",
      words: "",
      has_picture: true,
      resolved: { time: "2026-11-18T10:00:00Z", how: "Lanes now wrap" },
    },
  ],
  dealt_count: 1,
};

async function open(page: Page) {
  await mockHost(page, {
    home_status: { result: sampleHome() },
    kit_status: healthyKit,
    screen_notes_list: { result: NOTES },
    save_screen_note: { result: "20261119-101500" },
    show_screen_note: { result: null },
  });
  // Keeps what the window sends with a note, to check it carries the picture, the words and the page's address.
  await page.addInitScript(() => {
    const scope = window as unknown as {
      __TAURI_INTERNALS__: {
        invoke: (c: string, a: unknown, o: unknown) => Promise<unknown>;
      };
      sentNotes: { signature: number[]; note: Record<string, unknown> }[];
    };
    scope.sentNotes = [];
    const invoke = scope.__TAURI_INTERNALS__.invoke;
    scope.__TAURI_INTERNALS__.invoke = (command, args, options) => {
      if (command === "save_screen_note" && args instanceof Uint8Array) {
        const headers =
          (options as { headers?: Record<string, string> } | undefined)
            ?.headers ?? {};
        scope.sentNotes.push({
          signature: Array.from(args.slice(0, 4)),
          note: JSON.parse(
            decodeURIComponent(headers["x-screen-note"] ?? "{}"),
          ),
        });
      }
      return invoke(command, args, options);
    };
  });
  await page.goto("/");
}

test.describe("Screen notes", () => {
  test("Home lists open notes and what was done about the others", async ({
    page,
  }) => {
    await open(page);
    const panel = page.getByRole("region", { name: "Screen notes" });
    await expect(panel).toContainText("One note waits for an agent session");
    await expect(panel).toContainText(
      "The backups list runs off the right edge",
    );
    await panel.getByText("One dealt with").click();
    await expect(panel).toContainText("Lanes now wrap");
    await expect(
      panel.getByRole("button", { name: "Show the picture" }),
    ).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
      .analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });

  test("The ! key draws the page, asks for words, and saves both with the address", async ({
    page,
  }) => {
    await open(page);
    await expect(
      page.getByRole("region", { name: "Screen notes" }),
    ).toBeVisible();
    await page.keyboard.press("!");
    const dialog = page.getByRole("dialog", { name: "A note about Home" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("img")).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
      .analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
    const words = dialog.getByLabel("What looks wrong? (optional)");
    await expect(words).toBeFocused();
    await words.fill("The chart's legend hides the last bar");
    await words.press("Control+Enter");
    await expect(dialog).toHaveCount(0);
    await expect(
      page.getByRole("status").filter({ hasText: "Noted (20261119-101500)" }),
    ).toBeVisible();
    const sent = await page.evaluate(
      () =>
        (
          window as unknown as {
            sentNotes: { signature: number[]; note: Record<string, unknown> }[];
          }
        ).sentNotes,
    );
    expect(sent).toHaveLength(1);
    expect(sent[0].signature).toEqual([0x89, 0x50, 0x4e, 0x47]);
    expect(sent[0].note.words).toBe("The chart's legend hides the last bar");
    expect(sent[0].note.page).toBe("Home");
    expect(String(sent[0].note.address)).toMatch(/^dthorga:\/\/home\//);
    expect(String(sent[0].note.stamp)).toMatch(/^\d{8}-\d{6}$/);
  });

  test("Cancel saves nothing", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Something's off" }).click();
    const dialog = page.getByRole("dialog", { name: "A note about Home" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toHaveCount(0);
    const sent = await page.evaluate(
      () => (window as unknown as { sentNotes: unknown[] }).sentNotes.length,
    );
    expect(sent).toBe(0);
  });
});
