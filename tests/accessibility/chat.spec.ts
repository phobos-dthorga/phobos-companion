import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { healthyKit, mockHost, openTab, sampleHome } from "./host";

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
  commands: "ask",
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
        "It asked to run a command through the Companion, and was refused: commands are refused in Settings → AI.",
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

    test("a command is shown whole with what it does, runs on a press, and one that only reads ran by itself (0.84.0)", async ({
      page,
    }) => {
      await open(page, {
        chat_prompt: {
          result: "end_turn",
          events: [
            {
              kind: "command-run",
              terminal: "term_1",
              command: "git status",
              cwd: ".",
              how: "automatic",
              why: ["reads"],
            },
            {
              kind: "command-ended",
              terminal: "term_1",
              code: 0,
              signal: null,
              tail: "nothing to commit, working tree clean",
              truncated: false,
            },
            {
              kind: "decided",
              title: "`git push --force`",
              command: "git push --force",
              outcome: "refused",
              why: ["force-push"],
            },
            {
              kind: "command-ask",
              request: "c1",
              command: "rm -rf build",
              cwd: "src",
              why: ["deletes"],
              warn: true,
            },
            {
              kind: "permission",
              request: "p1",
              title: "`npm install`",
              options: [
                { id: "allow-once", name: "Allow", kind: "allow_once" },
                { id: "reject-once", name: "Reject", kind: "reject_once" },
              ],
              command: "npm install",
              why: ["installs"],
              warn: true,
              remember: true,
            },
          ],
        },
        chat_command: { result: null },
        chat_allow_for_chat: { result: null },
      });
      await page.getByRole("button", { name: "Chat", exact: true }).click();
      await page
        .getByRole("button", { name: "Start Claude (Claude Agent)" })
        .click();
      await page
        .getByLabel("Your message to Claude (Claude Agent)")
        .fill("Clean the build folder");
      await page.getByRole("button", { name: "Send", exact: true }).click();
      const main = page.locator("main");
      // Reading ran by itself, with how it ended and its output folded away.
      await expect(main).toContainText("Ran by itself: git status");
      await expect(main).toContainText("Ended, exit code 0");
      await page.getByText("Its output", { exact: true }).click();
      await expect(main).toContainText("nothing to commit, working tree clean");
      // What is never done here was answered no for the person, and says why.
      await expect(main).toContainText(
        "Answered no, never done here: git push --force (force-pushing)",
      );
      // A command that changes something waits, shown whole, with what it does and a warning.
      const card = page.getByRole("region", {
        name: "Claude (Claude Agent) asks to run a command",
      });
      await expect(card).toContainText("rm -rf build");
      await expect(card).toContainText("In: src");
      await expect(card).toContainText("What it does: deletes files");
      await expect(card).toContainText("Look twice");
      // The agent's own question names its command too, and may be allowed for this chat.
      const question = page.getByRole("region", {
        name: "Claude (Claude Agent) asks: `npm install`",
      });
      await expect(question).toContainText("installs or removes a program");
      await audit(page);
      expect(await smallControls(page)).toBe(0);
      await card.getByRole("button", { name: "Run it" }).click();
      await expect(card.getByRole("button")).toHaveCount(0);
      await question
        .getByRole("button", { name: "Allow for this chat" })
        .click();
      await expect(question).toContainText("You answered: Allow for this chat");
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });

    test("Settings → AI chooses how commands are handled, starting on Ask (0.84.0)", async ({
      page,
    }) => {
      await open(page, {
        chat_commands: { result: { ...chatOn, commands: "automatic" } },
      });
      await page.getByRole("button", { name: "Settings", exact: true }).click();
      await openTab(page, "AI");
      const panel = page.locator("#settings-chat");
      const modes = panel.getByRole("group", { name: "Commands it runs" });
      await expect(
        modes.getByRole("button", { name: /^Ask every time/ }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect(panel).toContainText("not a sandbox");
      const results = await new AxeBuilder({ page })
        .include("#settings-chat")
        .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
        .analyze();
      expect(results.violations.map((v) => v.id)).toEqual([]);
      await modes.getByRole("button", { name: /^Automatic/ }).click();
      await expect(
        modes.getByRole("button", { name: /^Automatic/ }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect(panel).toContainText(
        "Kept: commands are handled as Automatic.",
      );
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
