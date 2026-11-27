import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { healthyKit, mockHost, sampleHome } from "./host";

/**
 * Kept answers (0.116.0; the owner's choice of 28 Nov 2026, "Old at once, then fresh"): a slow page shows its last answer at once,
 * says when it was read, and holds every button that changes something until the fresh answer lands. Invented readings only.
 */
function row(id: string, title: string) {
  return {
    id,
    section: "Boats",
    title,
    status: "open",
    cells: { "#": id, "What it proves": title },
    seen: [],
    evidence_keys: [`boats.${id}`],
    versions: {},
    verdict: null,
    pending: null,
  };
}

function lists(title: string) {
  return [
    {
      repository: "first-mods",
      title: "In-game test pass",
      rows: [row("12", title)],
      unrowed: [],
      order_problems: [],
      command_line: "python -m phobos_modkit test-pass report",
    },
  ];
}

async function open(page: Page) {
  await mockHost(page, {
    home_status: { result: sampleHome() },
    kit_status: healthyKit,
    "kept_answer:test_lists": {
      result: {
        at: "2026-11-27T10:00:00Z",
        answer: lists("Boats floated last time"),
      },
    },
    // The fresh reading takes a moment, so the kept one is seen first.
    test_lists: {
      result: lists("Boats float now"),
      progress: [{}],
      pauseMs: 1500,
    },
    test_code: { result: { doc: "docs/tests.md", places: [], unplaced: [] } },
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Tests", exact: true }).click();
  await page.getByRole("button", { name: /^Waiting/ }).click();
}

test("a slow page shows its last answer at once, holds its changes, then shows the fresh one", async ({
  page,
}) => {
  await open(page);
  await expect(
    page.getByRole("heading", { name: "Boats floated last time" }),
  ).toBeVisible();
  await expect(page.getByText(/^Shown from the last reading/)).toBeVisible();
  const passed = page.getByRole("button", { name: /Passed/ }).first();
  await expect(passed).toBeDisabled();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
  await expect(
    page.getByRole("heading", { name: "Boats float now" }),
  ).toBeVisible();
  await expect(page.getByText(/^Shown from the last reading/)).toHaveCount(0);
  await expect(passed).toBeEnabled();
});
