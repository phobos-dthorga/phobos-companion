import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { healthyKit, mockHost, sampleHome } from "./host";

const LIST = {
  waiting: 1,
  repositories: [
    {
      repository: "first-mods",
      root: "C:\\Sample\\first-mods",
      decisions: [
        {
          id: "lamp-colour",
          question: "Which colour should the sample lamp be?",
          context: "The lamp is drawn in amber today.",
          options: [
            { id: "amber", label: "Amber", detail: "As it is" },
            { id: "blue", label: "Blue", detail: "Cooler" },
          ],
          lean: "amber",
          why: "It matches the other lamps",
          from: "docs/lamps.md",
          asked: "2026-11-19",
          answer: null,
        },
        {
          id: "lamp-size",
          question: "How big should the sample lamp be?",
          context: "",
          options: [
            { id: "small", label: "Small", detail: "" },
            { id: "large", label: "Large", detail: "" },
          ],
          lean: "small",
          why: "",
          from: "",
          asked: "2026-11-19",
          answer: {
            option: "large",
            words: "easier to see",
            time: "2026-11-19T09:00:00Z",
          },
        },
      ],
    },
  ],
};

async function open(page: Page) {
  await mockHost(page, {
    home_status: { result: sampleHome() },
    kit_status: healthyKit,
    decisions_list: { result: LIST },
    answer_decision: { result: { ok: true, refusal: null } },
  });
  await page.addInitScript(() => {
    const scope = window as unknown as {
      __TAURI_INTERNALS__: {
        invoke: (c: string, a: unknown, o: unknown) => Promise<unknown>;
      };
      sentAnswers: unknown[];
    };
    scope.sentAnswers = [];
    const invoke = scope.__TAURI_INTERNALS__.invoke;
    scope.__TAURI_INTERNALS__.invoke = (command, args, options) => {
      if (command === "answer_decision") scope.sentAnswers.push(args);
      return invoke(command, args, options);
    };
  });
  await page.goto("/");
}

async function audit(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
}

test.describe("Decisions", () => {
  test("Home counts what waits, and the page opens on the agent's lean", async ({
    page,
  }) => {
    await open(page);
    const note = page.getByRole("listitem", {
      name: "Decisions waiting for you",
    });
    await expect(note).toContainText("One decision waits for your word.");
    await note.getByRole("button", { name: "Go to Decisions" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Decisions waiting for you",
    );
    const card = page.getByRole("article", {
      name: "Which colour should the sample lamp be?",
    });
    await expect(card.getByRole("radio", { name: /Amber/ })).toBeChecked();
    await expect(card).toContainText("Agent's lean");
    await expect(page.getByText("You chose Large")).toBeVisible();
    await audit(page);
  });

  test("Decide sends the choice; something else needs words", async ({
    page,
  }) => {
    await open(page);
    await page.keyboard.press("d");
    const card = page.getByRole("article", {
      name: "Which colour should the sample lamp be?",
    });
    await card.getByRole("radio", { name: "Something else" }).check();
    const decide = card.getByRole("button", { name: "Decide" });
    await expect(decide).toBeDisabled();
    await card.getByLabel("What would you like instead?").fill("Green");
    await decide.click();
    await expect(
      page.getByRole("status").filter({ hasText: "Decided:" }),
    ).toContainText("Decided: Which colour should the sample lamp be?");
    const sent = await page.evaluate(
      () => (window as unknown as { sentAnswers: unknown[] }).sentAnswers,
    );
    expect(sent).toEqual([
      {
        repository: "first-mods",
        id: "lamp-colour",
        option: "other",
        words: "Green",
      },
    ]);
  });

  test("The page bar is grouped into Play, Code and Tools", async ({
    page,
  }) => {
    await open(page);
    const bar = page.getByRole("navigation", { name: "Pages" });
    for (const [group, first] of [
      ["Play", "Home"],
      ["Code", "Changes"],
      ["Tools", "Reports"],
    ]) {
      await expect(
        bar.getByRole("group", { name: group }).getByRole("button").first(),
      ).toHaveAccessibleName(first);
    }
    await audit(page);
  });
});
