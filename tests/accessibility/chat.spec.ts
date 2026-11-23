import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { healthyKit, mockHost, sampleHome } from "./host";

const CONTROL_MIN_PX = 44;

/** Invented: the Chat page on, Claude chosen and on this computer (0.74.0). */
const chatOn = {
  on: true,
  chosen: "claude",
  agents: [
    {
      id: "claude",
      name: "Claude (Claude Agent)",
      found: true,
      get: "Install it with npm.",
    },
    { id: "codex", name: "Codex", found: false, get: "Install it with npm." },
  ],
  running: null,
};

async function open(page: Page, more: Record<string, unknown> = {}) {
  await mockHost(page, {
    home_status: { result: sampleHome() },
    kit_status: healthyKit,
    chat_status: { result: chatOn },
    chat_end: { result: null },
    chat_start: {
      result: {
        agent: "Claude (Claude Agent)",
        repository: "first-mods",
        kitReports: true,
      },
    },
    ...more,
  });
  await page.goto("/");
}

async function audit(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
}

async function smallControls(page: Page) {
  return page
    .locator("main")
    .evaluate(
      (root, min) =>
        [...root.querySelectorAll("button, summary, textarea")]
          .map((e) => e.getBoundingClientRect())
          .filter((r) => r.width > 0 && r.height < min).length,
      CONTROL_MIN_PX,
    );
}

for (const [name, viewport] of [
  ["desktop", { width: 1440, height: 900 }],
  ["narrow", { width: 480, height: 800 }],
] as const) {
  test.describe(`Chat page, ${name}`, () => {
    test.use({ viewport });

    test("says what an agent can do before it starts, then talks, asks and reads (0.74.0)", async ({
      page,
    }) => {
      await open(page, {
        chat_prompt: {
          result: "end_turn",
          events: [
            { kind: "text", role: "thought", text: "Looking at the log." },
            {
              kind: "tool",
              id: "t1",
              title: "Read Player.log",
              tool: "read",
              status: "completed",
            },
            {
              kind: "read",
              path: "src/Boat.cs",
              allowed: true,
              reason: null,
            },
            { kind: "refused", what: "terminal/create" },
            {
              kind: "write",
              request: "w1",
              path: "src/Boat.cs",
              before: "hull = null\n",
              after: "hull = new Hull()\n",
            },
            {
              kind: "permission",
              request: "p1",
              title: "Edit Boat.cs",
              options: [
                { id: "allow-once", name: "Allow once", kind: "allow_once" },
                { id: "reject-once", name: "Reject", kind: "reject_once" },
              ],
            },
            {
              kind: "text",
              role: "agent",
              text: "A boat had no hull. <b>Fixed?</b>",
            },
          ],
        },
        chat_permission: { result: null },
        chat_write: { result: null },
      });
      await page.getByRole("button", { name: "Chat", exact: true }).click();
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        "Chat with Claude (Claude Agent)",
      );
      const main = page.locator("main");
      await expect(main).toContainText("Before you start");
      await expect(main).toContainText(
        "may change or delete files there by itself",
      );
      await audit(page);
      await page
        .getByRole("button", { name: "Start Claude (Claude Agent)" })
        .click();
      await expect(main).toContainText(
        "Claude (Claude Agent) is working in first-mods.",
      );
      await page
        .getByLabel("Your message to Claude (Claude Agent)")
        .fill("Why did my save fail?");
      await page.getByRole("button", { name: "Send", exact: true }).click();
      await expect(main).toContainText("Why did my save fail?");
      await expect(main).toContainText("Read Player.log: completed");
      await expect(main).toContainText(
        "Read through the Companion: src/Boat.cs",
      );
      await expect(main).toContainText(
        "It asked to run a command through the Companion, and was refused.",
      );
      await expect(main).toContainText(
        "Claude (Claude Agent) asks: Edit Boat.cs",
      );
      // The agent's words are text: markup in them is shown, never drawn.
      await expect(main).toContainText("<b>Fixed?</b>");
      await expect(main.locator("b")).toHaveCount(0);
      await audit(page);
      expect(await smallControls(page)).toBe(0);
      await page.getByRole("button", { name: "Reject", exact: true }).click();
      await expect(main).toContainText("You answered: Reject");
      // A change through the Companion: shown line by line, made only on a yes (0.75.0).
      await expect(main).toContainText(
        "Claude (Claude Agent) asks to change src/Boat.cs",
      );
      await expect(main).toContainText("hull = new Hull()");
      await page.getByRole("button", { name: "Make this change" }).click();
      await expect(
        page.getByRole("button", { name: "Make this change" }),
      ).toHaveCount(0);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });

    test("an agent not on this computer is not offered to start, and says where to get it", async ({
      page,
    }) => {
      await open(page, {
        chat_status: {
          result: { ...chatOn, chosen: "codex" },
        },
      });
      await page.getByRole("button", { name: "Chat", exact: true }).click();
      await expect(page.locator("main")).toContainText(
        "Codex is not on this computer.",
      );
      await expect(
        page.getByRole("button", { name: "Start Codex" }),
      ).toBeDisabled();
    });

    test("while switched off, Chat is not in the page list", async ({
      page,
    }) => {
      await open(page, { chat_status: { result: { ...chatOn, on: false } } });
      await expect(
        page.getByRole("button", { name: "Settings", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Chat", exact: true }),
      ).toHaveCount(0);
    });
  });
}
