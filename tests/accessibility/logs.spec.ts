import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { healthyKit, mockHost, sampleAiStatus, sampleHome } from "./host";

const CONTROL_MIN_PX = 44;

/** An invented log, for the audit only. The program itself never shows sample data. */
const sampleLog = {
  available: true,
  command_line: "python -m phobos_modkit game-log --top 60",
  data: {
    log: {
      name: "Player.log",
      layout: "sample",
      lines: 2400,
      messages: 310,
      header: { version: "1.0.5000", started: "2026-11-19 08:38:58" },
    },
    notices: [
      {
        kind: "save-loaded",
        text: 'Save "Harbour" loaded at 2026-11-19 08:41:38 with 12 mods.',
      },
    ],
    limits: [],
    levels: {
      ERROR: { messages: 40, signatures: 2 },
      WARN: { messages: 200, signatures: 1 },
      INFO: { messages: 70, signatures: 60 },
    },
    groups: [
      {
        id: "bdd7badf",
        level: "ERROR",
        category: "Verse",
        signature: "Exception ticking Boat: System.NullReferenceException",
        fingerprint: "System.NullReferenceException at Boats.Hull.Tick",
        count: 37,
        first: { line: 300, time: "2026-11-19 08:45:18" },
        last: { line: 2100, time: "2026-11-19 08:46:33" },
        example: {
          headline: "Exception ticking Boat: System.NullReferenceException",
          body: [
            "   at Boats.Hull.Tick(Int32 ticks) in Hull.cs:line 307",
            "   at Sails.Rig.Pull() in Sails.dll:token 0x6000318+0x12",
          ],
          bodyLines: 2,
        },
        evidence: [
          {
            kind: "namespace",
            value: "Boats",
            mod: "Sample Boats",
            messages: 37,
          },
          {
            kind: "assembly",
            value: "Sails.dll",
            mod: "Sample Sails",
            messages: 37,
          },
        ],
        frames: [
          {
            method: "Boats.Hull.Tick",
            file: "C:\\src\\Hull.cs",
            line: 307,
            assembly: "",
          },
          {
            method: "Sails.Rig.Pull",
            file: "",
            line: 0,
            assembly: "Sails.dll",
          },
        ],
      },
      {
        id: "7ff8285e",
        level: "ERROR",
        category: "Verse",
        signature: "Could not find a Def named SampleLamp",
        fingerprint: "",
        count: 3,
        first: { line: 120, time: "2026-11-19 08:40:00" },
        last: { line: 125, time: "2026-11-19 08:40:01" },
        example: {
          headline: "Could not find a Def named SampleLamp",
          body: [],
          bodyLines: 0,
        },
        evidence: [],
        frames: [],
      },
      {
        id: "a1b2c3d4",
        level: "WARN",
        category: "Verse",
        signature: "Sample texture is not a power of two",
        fingerprint: "",
        count: 200,
        first: { line: 50, time: "2026-11-19 08:39:00" },
        last: { line: 60, time: "2026-11-19 08:39:01" },
        example: {
          headline: "Sample texture is not a power of two",
          body: [],
          bodyLines: 0,
        },
        evidence: [],
        frames: [],
      },
    ],
    comparison: {
      previous: "Player-prev.log",
      new: [
        {
          id: "bdd7badf",
          level: "ERROR",
          previous: 0,
          current: 37,
          headline: "Exception ticking Boat: System.NullReferenceException",
        },
      ],
      gone: [],
      changed: [],
      counts: { new: 1, gone: 0, changed: 0 },
    },
    brief: { shown: 3, of: 3 },
  },
};

const hull = {
  id: "cs:Boats.Hull.Tick",
  name: "Hull.Tick",
  kind: "method",
  language: "csharp",
  file: "src/Boats/Hull.cs",
  line: 300,
  end: 320,
  owner: null,
  external: false,
  assembly: null,
  exact: true,
  connections: 1,
};

async function open(
  page: Page,
  log: object = sampleLog,
  found: object[] = [hull],
  more: Record<string, { result: unknown }> = {},
) {
  await mockHost(page, {
    ...more,
    home_status: { result: sampleHome() },
    kit_status: healthyKit,
    read_log: { result: log },
    "connections:find": {
      result: { ok: true, refusal: null, data: { things: found } },
    },
    "connections:summary": {
      result: { ok: true, refusal: null, data: { readers: [], seconds: 0.1 } },
    },
    "connections:around": {
      result: { ok: true, refusal: null, data: { centre: hull, groups: [] } },
    },
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Logs", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "What First Sample's log says",
  );
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
        [...root.querySelectorAll("button, summary, input")]
          .map((e) => e.getBoundingClientRect())
          .filter((r) => r.width > 0 && r.height < min).length,
      CONTROL_MIN_PX,
    );
}

for (const [name, viewport] of [
  ["desktop", { width: 1440, height: 900 }],
  ["narrow", { width: 480, height: 800 }],
] as const) {
  test.describe(`Logs page, ${name}`, () => {
    test.use({ viewport });

    test("shows the log grouped, what is new, and passes the audit", async ({
      page,
    }) => {
      await open(page);
      const main = page.locator("main");
      await expect(main).toContainText("2,400 lines, 310 messages");
      await expect(main).toContainText('Save "Harbour" loaded');
      await expect(
        page.getByRole("region", { name: "New since the run before" }),
      ).toContainText("one kind of message not in Player-prev.log");
      await page.getByRole("button", { name: /^WARN: 200 messages/ }).click();
      await expect(main).not.toContainText("not a power of two");
      await page
        .getByRole("button", {
          name: "Exception ticking Boat: System.NullReferenceException",
        })
        .click();
      await expect(main).toContainText(
        "Points at: Sample Boats · Sample Sails",
      );
      await expect(main).toContainText("Hull.cs:307");
      await audit(page);
      expect(await smallControls(page)).toBe(0);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });

    test("Explain this fault shows what goes first, sends on a press, and shows the answer as text", async ({
      page,
    }) => {
      await open(page, sampleLog, [hull], {
        ai_status: { result: sampleAiStatus },
        ai_prepare_fault: {
          result: {
            id: 7,
            what: "explain-fault",
            service: "Ollama",
            model: "sample-model:8b",
            local: true,
            kind: "local",
            charged: false,
            instruction: "You help a person who plays and mods PC games.",
            text: "Game: First Sample\nMessage:\nException ticking Boat",
            characters: 49,
          },
        },
        ai_send: {
          result: {
            step: "answered",
            answer: {
              text: "A boat's hull was missing. <b>Check Sample Boats.</b>",
              stop: "finished",
              problem: null,
              inputTokens: 300,
              outputTokens: 60,
            },
            calls: [
              {
                tool: "find_reports",
                summary: 'Find reports about "boat"',
                text: "2 reports found.",
                characters: 16,
                failed: false,
                sent: true,
              },
            ],
            toolsUnavailable: false,
          },
        },
      });
      await page.locator("#log-bdd7badf > summary").click();
      await page.getByRole("button", { name: "Explain this fault" }).click();
      const main = page.locator("main");
      await expect(main).toContainText("This is what would be sent");
      await expect(main).toContainText(
        "To Ollama on this computer, model sample-model:8b. Nothing leaves the computer.",
      );
      await expect(main).toContainText("Exception ticking Boat");
      await audit(page);
      await page.getByRole("button", { name: "Send", exact: true }).click();
      await expect(main).toContainText("Ollama (sample-model:8b) says");
      // The answer is text: markup in it is shown, never drawn.
      await expect(main).toContainText("<b>Check Sample Boats.</b>");
      await expect(main.locator("b")).toHaveCount(0);
      await expect(main).toContainText("300 tokens sent, 60 received.");
      await expect(main).toContainText("It asked the tool kit once");
      await audit(page);
      expect(await smallControls(page)).toBe(0);
    });

    test("an online model's report waits, shown whole, until Send this report (0.73.0)", async ({
      page,
    }) => {
      const report = {
        tool: "ask_report",
        summary: "Ask decisions list about first-mods",
        text: "Decisions: 2 waiting",
        characters: 20,
        failed: false,
        sent: false,
      };
      await open(page, sampleLog, [hull], {
        ai_status: { result: sampleAiStatus },
        ai_prepare_fault: {
          result: {
            id: 8,
            what: "explain-fault",
            service: "Claude (Anthropic)",
            model: "sample-model",
            local: false,
            kind: "key",
            charged: true,
            tools: true,
            instruction: "You help a person who plays and mods PC games.",
            text: "Game: First Sample",
            characters: 18,
          },
        },
        ai_send: { result: { step: "waiting", call: report, calls: [] } },
        ai_answer_call: {
          result: {
            step: "answered",
            answer: {
              text: "Two decisions wait.",
              stop: "finished",
              problem: null,
              inputTokens: 500,
              outputTokens: 40,
            },
            calls: [{ ...report, sent: true }],
            toolsUnavailable: false,
          },
        },
      });
      await page.locator("#log-bdd7badf > summary").click();
      await page.getByRole("button", { name: "Explain this fault" }).click();
      const main = page.locator("main");
      await expect(main).toContainText(
        "you see its answer and choose whether it is sent",
      );
      await page.getByRole("button", { name: "Send", exact: true }).click();
      await expect(main).toContainText(
        "Claude (Anthropic) asks the tool kit for a report",
      );
      await expect(main).toContainText("Ask decisions list about first-mods");
      await expect(main).toContainText("Decisions: 2 waiting");
      await audit(page);
      expect(await smallControls(page)).toBe(0);
      await page.getByRole("button", { name: "Send this report" }).click();
      await expect(main).toContainText("Two decisions wait.");
      await expect(main).toContainText("It asked the tool kit once");
    });

    test("no AI service ready means no Explain this fault", async ({
      page,
    }) => {
      await open(page, sampleLog, [hull], {
        ai_status: { result: { ...sampleAiStatus, ready: false } },
      });
      await page.locator("#log-bdd7badf > summary").click();
      await expect(page.locator("main")).toContainText("Hull.cs:307");
      await expect(
        page.getByRole("button", { name: "Explain this fault" }),
      ).toHaveCount(0);
    });

    test("a stack frame found in the code opens on the Code map, and Back returns", async ({
      page,
    }) => {
      await page
        .context()
        .grantPermissions(["clipboard-read", "clipboard-write"]);
      await open(page);
      await page.locator("#log-bdd7badf > summary").click();
      await page
        .getByRole("button", { name: "Find in the code" })
        .first()
        .click();
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        "How First Sample's code fits together",
      );
      await page.getByRole("button", { name: "Copy address" }).click();
      expect(
        await page.evaluate(() => navigator.clipboard.readText()),
      ).toContain("node=cs%3ABoats.Hull.Tick");
      await page.getByRole("button", { name: "Back", exact: true }).click();
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        "What First Sample's log says",
      );
      await expect(page.locator("#log-bdd7badf")).toHaveAttribute("open", "");
    });

    test("a frame outside the game's repositories says so", async ({
      page,
    }) => {
      await open(page, sampleLog, []);
      await page.locator("#log-bdd7badf > summary").click();
      await page
        .getByRole("button", { name: "Find in the code" })
        .nth(1)
        .click();
      await expect(
        page.locator("main").getByRole("status").first(),
      ).toContainText("Not in this game's repositories");
      await audit(page);
    });

    test("a game whose tools cannot read its log is told so", async ({
      page,
    }) => {
      await open(page, { available: false, data: null, command_line: "" });
      await expect(page.locator("main")).toContainText(
        "The tools cannot read First Sample's log yet.",
      );
      await audit(page);
    });
  });
}
