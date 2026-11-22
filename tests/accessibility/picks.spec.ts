import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { healthyKit, mockHost, SAMPLE_PNG, sampleHome } from "./host";

/** Made-up picks (0.55.0): two pictures with their tries, as an art tool would offer them. */
function pick(id: string, title: string, tries: string[]) {
  return {
    id,
    title,
    kind: "picture",
    inUse: `C:/repo/mods/Sample/Textures/${id}.png`,
    inUseThere: true,
    tries: tries.map((n) => ({
      id: n,
      label: `Try ${n}`,
      path: `K:/art/cards/${id}/export/${id}-${n}.png`,
      note: "0 loose specks",
      there: true,
    })),
    context: "A redraw: the old one's spout was hidden.",
    from: "assets/sample/requests/redraw.json",
    asked: "2026-11-23",
    answer: null,
  };
}

const list = {
  waiting: 2,
  repositories: [
    {
      repository: "first-mods",
      root: "C:/repo",
      grounds: [{ name: "Soil", colour: "#5C4C3A" }],
      picks: [
        pick("billy-kettle", "The billy kettle", ["3", "4"]),
        pick("tent-lamp", "The tent lamp", ["1", "2"]),
      ],
    },
  ],
};

async function open(page: Page) {
  await mockHost(page, {
    home_status: { result: sampleHome() },
    kit_status: healthyKit,
    picks_list: { result: list },
    viewable_file: { result: SAMPLE_PNG },
    answer_pick: { result: { ok: true, refusal: null } },
  });
  await page.goto("/");
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
  test.describe(`Picks page, ${name}`, () => {
    test.use({ viewport });

    test("Home says how many wait, and the page shows a pick's tries against the one in use", async ({
      page,
    }) => {
      await open(page);
      await expect(
        page.getByText("2 pictures and sounds wait for your pick."),
      ).toBeVisible();
      await page.getByRole("button", { name: "Go to Picks" }).click();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        "Pictures and sounds to pick from",
      );
      await expect(
        page.getByRole("heading", { level: 2, name: "The billy kettle" }),
      ).toBeVisible();
      await expect(
        page.getByRole("img", { name: "The picture, In use now" }),
      ).toBeVisible();
      await expect(
        page.getByRole("img", { name: "The picture, Try 3" }),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: "Soil" })).toBeVisible();
      await audit(page);
    });

    test("J steps through the tries, a press keeps the pick, and the next waiting pick opens", async ({
      page,
    }) => {
      await open(page);
      await page.keyboard.press("Shift+P");
      await expect(
        page.getByRole("heading", { level: 2, name: "The billy kettle" }),
      ).toBeVisible();
      await page.keyboard.press("j");
      await expect(
        page.getByRole("button", { name: /^Try 4/ }),
      ).toHaveAttribute("aria-pressed", "true");
      await page.getByRole("button", { name: "Pick Try 4" }).click();
      await expect(
        page.getByRole("status").filter({ hasText: "Kept: Try 4" }),
      ).toContainText("Kept: Try 4 for The billy kettle.");
      await expect(
        page.getByRole("heading", { level: 2, name: "The tent lamp" }),
      ).toBeVisible();
      await page.keyboard.press("Shift+K");
      await expect(
        page.getByRole("heading", { level: 2, name: "The billy kettle" }),
      ).toBeVisible();
    });
  });
}
