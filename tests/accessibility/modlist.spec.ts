import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { healthyKit, mockHost, sampleHome } from "./host";

/** Invented mods, for the audit only. The program itself never shows sample data. */
function sampleMod(key: string, name: string, source = "workshop") {
  return {
    key,
    id: key,
    name,
    source,
    workshop_id: "",
    authors: "Sample Author",
    versions: ["1.7"],
    needs: [],
  };
}

const ON = ["core", "alpha", "bravo", "charlie", "delta"];
const NAMES: Record<string, string> = {
  core: "Core",
  alpha: "Alpha Tools",
  bravo: "Bravo Beds",
  charlie: "Charlie Crops",
  delta: "Delta Doors",
  echo: "Echo Engines",
};

const listing = {
  game: "first",
  name: "First Sample",
  supported: true,
  version: "1.7",
  mods: Object.entries(NAMES).map(([key, name]) =>
    sampleMod(
      key,
      name,
      key === "core" ? "game" : key === "delta" ? "local" : "workshop",
    ),
  ),
  lists: [
    {
      key: "active",
      label: "Your active mods",
      writable: true,
      count: ON.length,
      entries: ON.map((key) => ({ id: key, key, remembered: "" })),
    },
  ],
  running: [],
  notes: [],
  changes: { active: 0 },
};

const check = {
  game: "first",
  name: "First Sample",
  supported: true,
  version: "1.7",
  online: false,
  notes: [],
  installed: 6,
  running: [],
  lists: [
    {
      key: "active",
      label: "Your active mods",
      path: "/sample/ModsConfig.xml",
      count: 5,
      writable: true,
    },
  ],
  problems: [],
  counts: { problem: 0, warning: 0, note: 0 },
  backups: [],
};

const changed = (ids: string[]) => ({
  result: {
    ok: true,
    title: "Mod list: a change",
    refusal: null,
    data: { change: "a change", ids, keys: ids },
  },
});

const sorted = {
  result: {
    ok: true,
    title: "Mod list: sort the list: 1 moved (preview)",
    refusal: null,
    data: {
      how: "fewest",
      ids: ["core", "delta", "alpha", "bravo", "charlie"],
      keys: ["core", "delta", "alpha", "bravo", "charlie"],
      moves: [
        {
          key: "delta",
          name: "Delta Doors",
          from: 5,
          to: 2,
          why: [
            "Alpha Tools loads after Delta Doors (Alpha Tools: its own files)",
          ],
          sources: ["own"],
        },
      ],
      set_aside: [],
      rules: { yours: 1, own: 4, needs: 2, community: 3 },
      placings: { top: 0, bottom: 0 },
      count: 5,
      applied: false,
      sets: [],
    },
  },
};

const rules = {
  result: {
    rules: [
      {
        mod: "echo",
        kind: "bottom",
        other: "",
        number: 1,
        words: "echo loads at the bottom",
      },
    ],
    theirs: [
      {
        mod: "bravo",
        kind: "after",
        other: "alpha",
        note: "Beds need tools",
        words: "",
      },
    ],
    sets: [
      {
        source: "yours",
        label: "Your rules here",
        where: "/sample/rules.json",
        editable: true,
        count: 1,
      },
      {
        source: "community",
        label: "The community rules",
        where: "/sample/communityRules.json",
        editable: false,
        count: 631,
      },
    ],
  },
};

async function open(page: Page) {
  await mockHost(page, {
    home_status: { result: sampleHome() },
    kit_status: healthyKit,
    mod_list_check: { result: check },
    mod_list_mods: { result: listing },
    mod_list_edit: changed(ON),
    mod_list_sort: sorted,
    mod_list_rules: rules,
    mod_list_add_rule: {
      result: { ok: true, title: "kept", refusal: null, data: {} },
    },
  });
  await page.goto("/");
  // What the page asks the host, as plain data, for the checks below.
  await page.evaluate(() => {
    const scope = window as unknown as Record<string, unknown>;
    const internals = scope.__TAURI_INTERNALS__ as {
      invoke: (
        command: string,
        args?: Record<string, unknown>,
      ) => Promise<unknown>;
    };
    const asked: unknown[] = [];
    scope.__asked = asked;
    const invoke = internals.invoke;
    internals.invoke = (command, args) => {
      const plain = Object.fromEntries(
        Object.entries(args ?? {}).filter(([key]) => key !== "onProgress"),
      );
      asked.push({ command, ...plain });
      return invoke(command, args);
    };
  });
  await page.getByRole("button", { name: "Mod list", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "First Sample",
  );
}

/** One request the page sent the host, without its progress channel. */
type Asked = { command: string; [field: string]: unknown };

async function asked(page: Page, command: string): Promise<Asked[]> {
  return page.evaluate(
    (wanted) =>
      ((window as unknown as { __asked: Asked[] }).__asked ?? []).filter(
        (a) => a.command === wanted,
      ),
    command,
  );
}

async function audit(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
}

async function shot(page: Page, name: string) {
  // Pictures for a person to look at, only when asked for (MODLIST_SHOTS names a folder outside the repository).
  if (process.env.MODLIST_SHOTS)
    await page.screenshot({
      path: `${process.env.MODLIST_SHOTS}/${name}.png`,
      fullPage: true,
    });
}

for (const [name, viewport] of [
  ["desktop", { width: 1440, height: 900 }],
  ["narrow", { width: 480, height: 800 }],
] as const) {
  test.describe(`Mod list, ${name}`, () => {
    test.use({ viewport });

    test("carrying with the keys moves the chosen mods as one block and saves once", async ({
      page,
    }) => {
      await open(page);
      await page
        .getByRole("button", { name: "Edit the list", exact: true })
        .click();
      const on = page.getByRole("listbox", { name: /Switched on/ });
      await on.getByRole("option", { name: /Core/ }).focus();
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Space");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Space");
      await expect(page.getByText("2 mods chosen.")).toBeVisible();
      await shot(page, `${name}-chosen`);
      await audit(page);
      await page.keyboard.press("Enter");
      await expect(
        page.getByText(/Carrying 2 mods: they will go to place 3/),
      ).toBeVisible();
      await page.keyboard.press("ArrowUp");
      await expect(page.getByText(/they will go to place 2/)).toBeVisible();
      await shot(page, `${name}-carrying`);
      await audit(page);
      await page.keyboard.press("Enter");
      await expect
        .poll(() => asked(page, "mod_list_edit"))
        .toEqual([
          {
            command: "mod_list_edit",
            game: "first",
            list: "active",
            action: "move",
            ids: ["bravo", "charlie"],
            place: 2,
          },
        ]);
    });

    test("a mod found by name takes the chosen mods just after it", async ({
      page,
    }) => {
      await open(page);
      await page
        .getByRole("button", { name: "Edit the list", exact: true })
        .click();
      await page.getByRole("option", { name: /Delta Doors/ }).click();
      await page.getByRole("button", { name: "Put after…" }).click();
      await page.keyboard.type("alp");
      await expect(
        page.getByRole("button", { name: "After Alpha Tools (place 2)" }),
      ).toBeVisible();
      await shot(page, `${name}-finder`);
      await page.keyboard.press("Enter");
      await expect
        .poll(() => asked(page, "mod_list_edit"))
        .toEqual([
          {
            command: "mod_list_edit",
            game: "first",
            list: "active",
            action: "move",
            ids: ["delta"],
            place: 3,
          },
        ]);
    });

    test("a mod switched off can be switched on just after one found by name", async ({
      page,
    }) => {
      await open(page);
      await page
        .getByRole("button", { name: "Edit the list", exact: true })
        .click();
      await page.getByRole("option", { name: /Echo Engines/ }).click();
      await page.getByRole("button", { name: "Switch on after…" }).click();
      await page.keyboard.type("core");
      await page.keyboard.press("Enter");
      await expect
        .poll(() => asked(page, "mod_list_edit"))
        .toEqual([
          {
            command: "mod_list_edit",
            game: "first",
            list: "active",
            action: "enable",
            ids: ["echo"],
            place: 2,
          },
        ]);
    });

    test("the sort shows each move and whose rule, and writes only on Use this order", async ({
      page,
    }) => {
      await open(page);
      await page.getByRole("button", { name: "Sort", exact: true }).click();
      await page.getByRole("button", { name: "Sort: fewest moves" }).click();
      await expect(page.getByText("1 mod of 5 moves.")).toBeVisible();
      await expect(
        page.getByText(
          "Alpha Tools loads after Delta Doors (Alpha Tools: its own files)",
        ),
      ).toBeVisible();
      await expect(
        page.getByText("Echo Engines loads at the bottom"),
      ).toBeVisible();
      await expect(
        page.getByText("Bravo Beds loads after Alpha Tools"),
      ).toBeVisible();
      await shot(page, `${name}-sort`);
      await audit(page);
      expect((await asked(page, "mod_list_sort")).map((a) => a.apply)).toEqual([
        false,
      ]);
      await page.getByRole("button", { name: "Use this order" }).click();
      await expect
        .poll(async () =>
          (await asked(page, "mod_list_sort")).map((a) => a.apply),
        )
        .toEqual([false, true]);
    });

    test("a rule of your own is made by finding the mods by name", async ({
      page,
    }) => {
      await open(page);
      await page.getByRole("button", { name: "Sort", exact: true }).click();
      await page
        .getByLabel("Make a rule for which mod? Type part of a name.")
        .fill("bravo");
      await page.keyboard.press("Enter");
      await page.getByRole("button", { name: "Before a mod" }).click();
      await page
        .getByLabel("Bravo Beds loads before which mod? Type part of a name.")
        .fill("charl");
      await page
        .getByRole("button", { name: "Keep: Bravo Beds before Charlie Crops" })
        .click();
      await expect
        .poll(() => asked(page, "mod_list_add_rule"))
        .toEqual([
          {
            command: "mod_list_add_rule",
            game: "first",
            id: "bravo",
            kind: "before",
            other: "charlie",
          },
        ]);
    });
  });
}
