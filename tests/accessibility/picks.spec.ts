import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import {
  healthyKit,
  mockHost,
  SAMPLE_PNG,
  sampleHome,
  toneWav,
  useInstalledPolicy,
} from "./host";

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

test.describe("a picture of the Picks page", () => {
  async function saveUnder(page: Page, change?: (csp: string) => string) {
    await useInstalledPolicy(page, change);
    await mockHost(page, {
      home_status: { result: sampleHome() },
      kit_status: healthyKit,
      picks_list: { result: list },
      viewable_file: { result: SAMPLE_PNG },
      save_picture: { result: "C:/Pictures/Picks.png" },
      show_picture: { result: null },
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Go to Picks" }).click();
    await expect(
      page.getByRole("img", { name: "The picture, Try 3" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Save a picture" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Saved to" }),
    ).toBeVisible({ timeout: 20_000 });
  }

  test("is made under the installed program's security policy, its tries' pictures in it", async ({
    page,
  }) => {
    // The owner's report of 23 Nov 2026: "The picture could not be made: [object Event]". The tries are shown from blob:
    // addresses, which the policy let the page show but not read back, so the picture had nothing to copy.
    await saveUnder(page);
  });

  test("is still made when a picture on the page cannot be read, a crossed box in its place", async ({
    page,
  }) => {
    await saveUnder(page, (csp) =>
      csp.replace("connect-src 'self' blob:", "connect-src 'self'"),
    );
  });
});

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
      // 0.69.2: opened by hand, another pick no longer shows the last "Kept" line (the owner's screen note of 23 Nov 2026).
      await expect(
        page.getByRole("status").filter({ hasText: "Kept:" }),
      ).toHaveCount(0);
    });
    test("which sound Y plays starts again on each sound, never carried from the last (0.68.1)", async ({
      page,
    }) => {
      const sound = (id: string, title: string) => ({
        ...pick(id, title, ["81", "82"]),
        kind: "sound",
        inUse: null,
        inUseThere: false,
        tries: ["81", "82"].map((n) => ({
          id: n,
          label: `Try ${n}`,
          path: `K:/sounds/${id}/${id}-${n}.wav`,
          note: "no flags",
          there: true,
        })),
      });
      await mockHost(page, {
        home_status: { result: sampleHome() },
        kit_status: healthyKit,
        picks_list: {
          result: {
            waiting: 2,
            repositories: [
              {
                repository: "first-mods",
                root: "C:/repo",
                grounds: [],
                picks: [
                  sound("window", "The window"),
                  sound("purge", "The purge"),
                ],
              },
            ],
          },
        },
        viewable_file: { result: toneWav(440, 0.5) },
      });
      await page.goto("/");
      await page.keyboard.press("Shift+P");
      await expect(
        page.getByRole("heading", { level: 2, name: "The window" }),
      ).toBeVisible();
      // Try 81 is in focus, set against Try 82: Y starts on the try in focus.
      const focusSide = page.getByRole("region", { name: "Try 81" });
      const otherSide = page.getByRole("region", { name: "Try 82" });
      await expect(
        focusSide.getByRole("button", { name: "Y plays this one" }),
      ).toBeVisible();
      await otherSide
        .getByRole("button", { name: "Have Y play this one" })
        .click();
      await expect(
        otherSide.getByRole("button", { name: "Y plays this one" }),
      ).toBeVisible();
      await page.keyboard.press("Shift+J");
      await expect(
        page.getByRole("heading", { level: 2, name: "The purge" }),
      ).toBeVisible();
      await expect(
        page
          .getByRole("region", { name: "Try 81" })
          .getByRole("button", { name: "Y plays this one" }),
      ).toBeVisible();
      await expect(
        page
          .getByRole("region", { name: "Try 82" })
          .getByRole("button", { name: "Have Y play this one" }),
      ).toBeVisible();
      await audit(page);
    });
    test("keeps the zoom, the ground and the marks from pick to pick, and compares one try with another (0.57.0)", async ({
      page,
    }) => {
      await open(page);
      await page.keyboard.press("Shift+P");
      const against = page.getByRole("group", {
        name: "What the try in focus is compared with",
      });
      await against.getByRole("button", { name: "Try 4" }).click();
      await expect(
        page.getByRole("img", { name: "The picture, Try 4" }),
      ).toBeVisible();
      await expect(
        page.getByRole("img", { name: "The picture, Try 3" }),
      ).toBeVisible();
      await page.getByRole("button", { name: "2×" }).click();
      await page.getByRole("button", { name: "Soil" }).click();
      await page
        .getByRole("button", { name: "Mark loose specks and fringes" })
        .click();
      await expect(page.getByText(/^Marked: /).first()).toBeVisible();
      await audit(page);
      await page.keyboard.press("Shift+J");
      await expect(
        page.getByRole("heading", { level: 2, name: "The tent lamp" }),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: "2×" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await expect(page.getByRole("button", { name: "Soil" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await expect(
        page.getByRole("button", { name: "Mark loose specks and fringes" }),
      ).toHaveAttribute("aria-pressed", "true");
      // 0.58.0: kept between runs too.
      await page.reload();
      await page.keyboard.press("Shift+P");
      await expect(page.getByRole("button", { name: "2×" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await expect(page.getByRole("button", { name: "Soil" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });
  });
}
