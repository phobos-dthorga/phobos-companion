<script lang="ts">
  import Placeholder from "../shell/Placeholder.svelte";
  import SettingsToLook from "./SettingsToLook.svelte";
  import SinceLastPlayed from "./SinceLastPlayed.svelte";
  import Pager from "../shell/Pager.svelte";
  import { pageHolding, pageOf } from "../shell/paging";
  import { here, setFocus } from "../navigation/navigation.svelte";
  import { reveal } from "../shell/reveal";
  import { openDialog } from "../navigation/navigation.svelte";
  import { onMount, untrack } from "svelte";
  import type { GameHome } from "../home/types";
  import { t } from "../i18n/runtime";
  import GuideLink from "../guide/GuideLink.svelte";
  import type { EntryRequest } from "../code/types";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import RichText from "../shell/RichText.svelte";
  import { commitRuns, plainText } from "../shell/inline";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import {
    heard,
    started,
    type OnProgress,
    type ProgressState,
  } from "../shell/progress";
  import {
    encodeTextures,
    makeMove,
    readInstalls,
    readTextures,
  } from "./desktopClient";
  import {
    blockedBy,
    changedMods,
    CHECK_ACTION_WORDS,
    FILE_CHANGE_WORDS,
    encodeTargets,
    FILE_WORDS,
    FIRST_BACKUPS,
    FIRST_ENTRIES,
    formatSize,
    formatWhen,
    groupByVersion,
    hasChanges,
    MOVE_WORDS,
    names,
    newMods,
    SAME_WORDS,
    preflight,
    SETTING_WORDS,
    shortCommit,
    STATE_WORDS,
    changedSources,
    rebuiltCount,
    unlogged,
    type Check,
  } from "./presentation";
  import type {
    Backup,
    Delta,
    Entry,
    InstallsReading,
    ModInstall,
    Move,
    MoveReading,
    TextureMod,
    TexturesReading,
  } from "./types";

  let { game }: { game: GameHome } = $props();

  /** A move waiting for the owner's yes, and where on the page its question is shown. */
  type Asking =
    | {
        kind: "mod";
        place: string;
        repository: string;
        mod: ModInstall;
        move: Move;
        backup: Backup | null;
      }
    | {
        kind: "all";
        place: string;
        /** Mods never installed before, offered by name, rather than everything that changed. */
        fresh: boolean;
        groups: { repository: string; mods: ModInstall[] }[];
      }
    | { kind: "encode"; place: string; mods: TextureMod[] }
    | {
        kind: "dedupe";
        place: string;
        repository: string;
        count: number;
        size: number;
      };

  /** How long the page waits before reading again when the window comes back into focus. */
  const FOCUS_READ_AFTER_MS = 15_000;
  const STRIP = "strip";

  let reading = $state<InstallsReading>({ state: "reading" });
  let textures = $state<TexturesReading>({ state: "reading" });
  let readAt = 0;
  let asking = $state<Asking | null>(null);
  let busy = $state<string | null>(null);
  let said = $state("");
  let output = $state<string[]>([]);
  let showAll = $state<Record<string, boolean>>({});
  /** With every backup shown, a mod's backups page this many at a time, newest first. */
  const BACKUPS_PER_PAGE = 8;
  let backupPages = $state<Record<string, number>>({});
  /** How far along the first read, the texture check and the move in hand are; a move's is null when none is being made. */
  let readProgress = $state(started());
  /** A read again that keeps the page on screen: its own bar at the top, so the work never looks stalled. */
  let refreshing = $state<ProgressState | null>(null);
  let textureProgress = $state(started());
  let working = $state<ProgressState | null>(null);
  /** The changelog entry whose code is being shown, over the page. */

  /** Where a mod's changelog entries are found, for showing their code. */
  type Source = { repository: string; mod: ModInstall };

  const hearWork: OnProgress = (message) => {
    if (working !== null) working = heard(working, message);
  };

  function viewCode(request: EntryRequest) {
    openDialog({ kind: "code", request });
  }

  function showCode(source: Source, entry: Entry) {
    viewCode({
      repository: source.repository,
      changelog: source.mod.changelog,
      product: source.mod.name,
      entry,
    });
  }

  const repositories = $derived(
    reading.state === "ready" ? reading.repositories : [],
  );
  const running = $derived(repositories.flatMap((r) => r.status.gameRunning));
  const checks = $derived(
    reading.state === "ready"
      ? preflight(repositories, textures, game.name)
      : [],
  );

  /** Reads again. A quiet read keeps what is on screen until the answer arrives. */
  async function load(quiet = false) {
    if (quiet) refreshing = started(t("mods-reading-again"));
    if (!quiet) {
      reading = { state: "reading" };
      textures = { state: "reading" };
      readProgress = started();
      textureProgress = started();
    }
    const [nextInstalls, nextTextures] = await Promise.all([
      readInstalls(game.id, (message) => {
        readProgress = heard(readProgress, message);
        if (refreshing !== null) refreshing = heard(refreshing, message);
      }),
      readTextures(game.id, (message) => {
        textureProgress = heard(textureProgress, message);
      }),
    ]);
    if (!quiet || nextInstalls.state === "ready") reading = nextInstalls;
    if (!quiet || nextTextures.state === "ready") textures = nextTextures;
    readAt = Date.now();
    refreshing = null;
  }

  /** Coming back to the window reads again, so a change made elsewhere shows without a button. */
  function onFocus() {
    if (
      busy === null &&
      asking === null &&
      Date.now() - readAt > FOCUS_READ_AFTER_MS
    ) {
      void load(true);
    }
  }

  function ask(next: Asking) {
    asking = next;
    said = "";
    output = [];
  }

  /** What a move said back, in words at the top of the page, with its output folded away. */
  function hear(answer: MoveReading, name: string) {
    if (answer.state === "failed") {
      said = t("mods-move-failed", { name });
      reading = { state: "failed", failure: answer.failure };
      return;
    }
    const result = answer.result;
    said = result.ok
      ? result.title
      : t("mods-move-refused", {
          name,
          reason: result.refusal ?? result.title,
        });
    output = result.data.output ?? [];
  }

  /** Builds every project. It writes only inside the repository, so it needs no question and no closed game. */
  async function build() {
    busy = "build";
    said = "";
    working = started(t(MOVE_WORDS.build.working));
    output = [];
    for (const repository of repositories.filter((r) => r.status.canBuild)) {
      hear(
        await makeMove(
          game.id,
          repository.repository,
          "build",
          [],
          null,
          hearWork,
        ),
        repository.repository,
      );
    }
    working = started(t("mods-working-reading"));
    await load(true);
    working = null;
    busy = null;
  }

  async function confirm() {
    if (asking === null) return;
    const now = asking;
    busy = now.place;
    said = "";
    if (now.kind === "mod") {
      working = started(
        t(MOVE_WORDS[now.move].working, { name: now.mod.name }),
      );
      hear(
        await makeMove(
          game.id,
          now.repository,
          now.move,
          [now.mod.mod],
          now.backup?.backup ?? null,
          hearWork,
        ),
        now.mod.name,
      );
    } else if (now.kind === "all") {
      working = started(
        t(now.fresh ? "mods-working-install-new" : "mods-working-install-all"),
      );
      for (const group of now.groups) {
        hear(
          await makeMove(
            game.id,
            group.repository,
            "install",
            group.mods.map((m) => m.mod),
            null,
            hearWork,
          ),
          group.repository,
        );
      }
    } else if (now.kind === "dedupe") {
      working = started(t(MOVE_WORDS.dedupe.working, { count: now.count }));
      hear(
        await makeMove(game.id, now.repository, "dedupe", [], null, hearWork),
        now.repository,
      );
    } else {
      working = started(t("mods-working-encode", { count: now.mods.length }));
      hear(
        await encodeTextures(
          game.id,
          now.mods.map((m) => m.folderName),
          hearWork,
        ),
        t("mods-textures-name"),
      );
    }
    asking = null;
    working = started(t("mods-working-reading"));
    await load(true);
    working = null;
    busy = null;
  }

  /** Puts the keyboard on the confirmation when it opens, so it is read out and answered first. */
  function takeFocus(node: HTMLElement) {
    node.focus();
  }

  function toggle(key: string) {
    showAll[key] = !showAll[key];
  }

  function runCheck(check: Check) {
    if (check.action === "build") void build();
    else if (check.action === "install-all")
      ask({
        kind: "all",
        place: STRIP,
        fresh: false,
        groups: changedMods(repositories),
      });
    else if (check.action === "install-new")
      ask({
        kind: "all",
        place: STRIP,
        fresh: true,
        groups: newMods(repositories),
      });
    else if (check.action === "encode" && textures.state === "ready")
      ask({
        kind: "encode",
        place: STRIP,
        mods: encodeTargets(textures.status.mods),
      });
  }

  function checkBlocked(check: Check): string | null {
    if (
      check.action === "install-all" ||
      check.action === "install-new" ||
      check.action === "encode"
    )
      return running.length > 0 ? "mods-blocked-running" : null;
    return null;
  }

  /**
   * A mod the place names is scrolled to and outlined once the mods are read: by its folder (`mod`) or by its changelog (a
   * thing's history names the changelog an entry is in). With `before`, a moment, its newest backup from before then is opened
   * and marked: the way back from a change that broke something (cross-links L1).
   */
  const focusKey = $derived.by(() => {
    const focus = here().focus;
    if (!focus.repository) return null;
    if (focus.mod) return `${focus.repository}/${focus.mod}`;
    if (!focus.changelog) return null;
    const mod = repositories
      .find((r) => r.repository === focus.repository)
      ?.status.mods.find((m) => m.changelog === focus.changelog);
    return mod ? `${focus.repository}/${mod.mod}` : null;
  });
  const before = $derived(here().focus.before ?? null);

  /** The newest backup taken before the moment the place names, for the focused mod. */
  function backupBefore(key: string, mod: ModInstall): Backup | null {
    if (!before || key !== focusKey) return null;
    const moment = Date.parse(before);
    if (Number.isNaN(moment)) return null;
    return (
      mod.backups
        .filter((b) => b.taken && Date.parse(b.taken) < moment)
        .sort(
          (a, b) => Date.parse(b.taken ?? "") - Date.parse(a.taken ?? ""),
        )[0] ?? null
    );
  }

  // A link to the settings to look at (Home's count) brings them into view.
  $effect(() => {
    if (here().focus.panel === "settings")
      untrack(() => void reveal("settings-to-look"));
  });

  $effect(() => {
    if (focusKey && reading.state === "ready") {
      const target = before ? `${focusKey}/before` : focusKey;
      untrack(async () => {
        if (before && reading.state === "ready") {
          showAll[`${focusKey}/backups`] = true;
          const mod = reading.repositories
            .flatMap((r) =>
              r.status.mods.map(
                (m) => [`${r.repository}/${m.mod}`, m] as const,
              ),
            )
            .find(([key]) => key === focusKey)?.[1];
          const marked = mod ? backupBefore(focusKey, mod) : null;
          const index = mod && marked ? mod.backups.indexOf(marked) : -1;
          if (index >= 0)
            backupPages = {
              ...backupPages,
              [focusKey]: pageHolding(index, BACKUPS_PER_PAGE),
            };
        }
        if (!(await reveal(`mod-${target}`))) await reveal(`mod-${focusKey}`);
      });
    }
  });

  onMount(() => {
    void load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  });
</script>

{#snippet entryList(
  list: Entry[],
  summaries: Record<string, string>,
  key: string,
  source: Source,
)}
  {@const shown = showAll[key] ? list : list.slice(0, FIRST_ENTRIES)}
  {#each groupByVersion(shown, summaries) as group (group.version)}
    <p class="version">
      <strong>{group.version}</strong>
      {#if group.summary}
        <span class="muted">{`— ${group.summary}`}</span>
      {/if}
    </p>
    {#each commitRuns(group.entries) as run, runIndex (runIndex)}
      <div class="run" class:shared={run.length > 1}>
        <ul class="entries">
          {#each run as entry, index (index)}
            <li>
              {#if entry.section}<span class="section-tag">{entry.section}</span
                >{/if}
              <RichText text={entry.text} />
            </li>
          {/each}
        </ul>
        <button
          type="button"
          class="action code-button"
          aria-label={run.length > 1
            ? t("code-show-for-run", {
                entry: plainText(run[0].lead),
                more: run.length - 1,
              })
            : t("code-show-for", { entry: plainText(run[0].lead) })}
          onclick={() => showCode(source, run[0])}
        >
          {run.length > 1
            ? t("code-show-run", { count: run.length })
            : t("code-show")}
        </button>
      </div>
    {/each}
  {/each}
  {#if list.length > FIRST_ENTRIES}
    <button
      type="button"
      class="action"
      aria-expanded={showAll[key] ?? false}
      onclick={() => toggle(key)}
    >
      {showAll[key]
        ? t("mods-show-fewer")
        : t("mods-show-all", { count: list.length })}
    </button>
  {/if}
{/snippet}

{#snippet saveNotes(delta: Delta)}
  {#if delta.saveNotes.length > 0}
    <div class="saves">
      <p class="saves-heading">
        <span aria-hidden="true">⚠</span>
        {t("mods-saves-heading")}
      </p>
      <ul>
        {#each delta.saveNotes as entry, index (index)}
          <li>
            <strong>{entry.version}:</strong>
            <RichText text={entry.text} />
          </li>
        {/each}
      </ul>
    </div>
  {/if}
{/snippet}

{#snippet reworded(delta: Delta)}
  {#if delta.reworded.length > 0}
    <details class="reworded">
      <summary>{t("mods-reworded", { count: delta.reworded.length })}</summary>
      <ul class="entries">
        {#each delta.reworded as pair, index (index)}
          <li>
            <strong>{pair.would.version}:</strong>
            <RichText text={pair.would.text} />
          </li>
        {/each}
      </ul>
    </details>
  {/if}
{/snippet}

{#snippet deltaView(delta: Delta, key: string, source: Source)}
  {@render saveNotes(delta)}
  {#if delta.gain.length > 0}
    <h5 class="gain">
      <span aria-hidden="true">+</span>
      {t("mods-gain", { count: delta.gain.length })}
    </h5>
    {@render entryList(delta.gain, delta.summaries, `${key}/gain`, source)}
  {/if}
  {#if delta.lose.length > 0}
    <h5 class="lose">
      <span aria-hidden="true">−</span>
      {t("mods-lose", { count: delta.lose.length })}
    </h5>
    {@render entryList(delta.lose, delta.summaries, `${key}/lose`, source)}
  {/if}
  {@render reworded(delta)}
  {#if delta.gain.length === 0 && delta.lose.length === 0 && delta.reworded.length === 0}
    <p class="muted">{t("mods-no-difference")}</p>
  {/if}
{/snippet}

{#snippet question()}
  {#if asking !== null}
    {@const now = asking}
    <div class="confirm" role="group" aria-label={t("mods-confirm-label")}>
      <p class="confirm-question" tabindex="-1" use:takeFocus>
        {#if now.kind === "all"}
          {@const all = now.groups.flatMap((g) => g.mods)}
          {t(
            now.fresh ? "mods-confirm-install-new" : "mods-confirm-install-all",
            {
              count: all.length,
              names: all.map((m) => m.name).join(", "),
              game: game.name,
            },
          )}
        {:else if now.kind === "dedupe"}
          {t(MOVE_WORDS.dedupe.confirm, {
            count: now.count,
            size: formatSize(now.size),
          })}
        {:else if now.kind === "encode"}
          {t("mods-confirm-encode", {
            count: now.mods.length,
            pictures: now.mods.reduce((sum, m) => sum + m.stale + m.missing, 0),
            textures: now.mods.reduce((sum, m) => sum + m.unpacked, 0),
            ...names(now.mods.map((m) => m.name)),
          })}
        {:else if now.move === "backup"}
          {t("mods-confirm-backup", {
            name: now.mod.name,
            version: now.mod.installed?.version ?? "",
            game: game.name,
          })}
        {:else if now.move === "restore" && now.backup}
          {t("mods-confirm-restore", {
            name: now.mod.name,
            when: formatWhen(now.backup.taken),
            version: now.backup.version || "?",
            installed: now.mod.installed?.version || "?",
            lose: now.backup.delta.lose.length,
            gain: now.backup.delta.gain.length,
          })}
        {:else}
          {t("mods-confirm-install", {
            name: now.mod.name,
            version: now.mod.repository.version || "?",
          })}
        {/if}
      </p>
      {#if now.kind === "mod" && now.move === "restore" && now.backup && now.backup.delta.saveNotes.length > 0}
        <p class="confirm-warning">
          <span aria-hidden="true">⚠</span>
          {t("mods-confirm-saves")}
        </p>
      {/if}
      {#if now.kind === "all" && now.groups.some( (g) => g.mods.some((m) => m.update.saveNotes.length > 0) )}
        <p class="confirm-warning">
          <span aria-hidden="true">⚠</span>
          {t("mods-confirm-all-saves")}
        </p>
      {/if}
      {#if now.kind === "all"}
        {@const unsure = now.groups
          .flatMap((g) => g.mods)
          .filter((m) => m.uncommittedCount > 0)}
        {#if unsure.length > 0}
          <p class="confirm-warning">
            <span aria-hidden="true">⚠</span>
            {t("mods-confirm-all-uncommitted", {
              count: unsure.length,
              ...names(unsure.map((m) => m.name)),
            })}
          </p>
        {/if}
      {/if}
      {#if now.kind === "mod" && now.move === "install" && now.mod.uncommittedCount > 0}
        <p class="confirm-warning">
          <span aria-hidden="true">⚠</span>
          {t("mods-confirm-uncommitted", { count: now.mod.uncommittedCount })}
        </p>
      {/if}
      <div class="buttons">
        <button
          type="button"
          class="move-button"
          disabled={busy !== null}
          onclick={confirm}
        >
          {now.kind === "all"
            ? now.fresh
              ? t("mods-yes-install-new", {
                  count: now.groups.reduce((sum, g) => sum + g.mods.length, 0),
                })
              : t("mods-yes-install-all")
            : now.kind === "encode"
              ? t("mods-yes-encode")
              : now.kind === "dedupe"
                ? t(MOVE_WORDS.dedupe.yes)
                : t(MOVE_WORDS[now.move].yes)}
        </button>
        <button
          type="button"
          class="action"
          disabled={busy !== null}
          onclick={() => (asking = null)}
        >
          {t("mods-action-cancel")}
        </button>
      </div>
    </div>
  {/if}
{/snippet}

{#snippet moveButton(
  repository: string,
  mod: ModInstall,
  move: Move,
  backup: Backup | null,
  place: string,
)}
  {@const blocked = blockedBy(move, running)}
  <button
    type="button"
    class="move-button"
    disabled={busy !== null || blocked !== null}
    aria-pressed={asking?.place === place}
    onclick={() => ask({ kind: "mod", place, repository, mod, move, backup })}
  >
    {t(MOVE_WORDS[move].button)}
  </button>
  {#if blocked}
    <span class="muted blocked">{t(blocked, { game: game.name })}</span>
  {/if}
{/snippet}

{#snippet nowColumn(mod: ModInstall, key: string, source: Source)}
  {@const record = mod.installed?.record ?? null}
  <section class="column" aria-label={t("mods-now")}>
    <h4>{t("mods-now")}</h4>
    <p class="column-version">{mod.installed?.version || "?"}</p>
    {#if record}
      <p class="muted small">
        {t("mods-record", {
          when: formatWhen(record.installed),
          commit: shortCommit(record.commit) || "?",
        })}
      </p>
    {:else if mod.installedCommit}
      <p class="muted small">
        {t("mods-record-approximate", {
          commit: shortCommit(mod.installedCommit.commit),
        })}
      </p>
    {:else}
      <p class="muted small">{t("mods-no-record")}</p>
    {/if}
    {#if mod.commitsSince}
      <p class="muted small">
        {t("mods-commits-since", { count: mod.commitsSince })}
      </p>
    {/if}
    {#if mod.update.lose.length > 0}
      <h5 class="lose">
        <span aria-hidden="true">−</span>
        {t("mods-lose", { count: mod.update.lose.length })}
      </h5>
      {@render entryList(
        mod.update.lose,
        mod.update.summaries,
        `${key}/lose`,
        source,
      )}
    {:else}
      <p class="muted small">{t("mods-lose-nothing")}</p>
    {/if}
    {@render unlisted(mod.update, key, source)}
  </section>
{/snippet}

<!-- Entries the repository's changelog does not hold now, which it cannot call lost: a number used twice, or uncommitted work. -->
{#snippet unlisted(delta: Delta, key: string, source: Source)}
  {@const entries = delta.unlisted ?? []}
  {#if entries.length > 0}
    <h5 class="unlisted">
      <span aria-hidden="true">#</span>
      {t("mods-unlisted", { count: entries.length })}
    </h5>
    {#each Object.entries(delta.unlistedWhy ?? {}) as [version, why] (version)}
      <p class="small">
        {why === "reused"
          ? t("mods-unlisted-reused", { version })
          : t("mods-unlisted-uncommitted", { version })}
      </p>
    {/each}
    {@render entryList(entries, delta.summaries, `${key}/unlisted`, source)}
  {/if}
{/snippet}

{#snippet afterColumn(mod: ModInstall, key: string, source: Source)}
  <section class="column" aria-label={t("mods-after")}>
    <h4>{t("mods-after")}</h4>
    <p class="column-version">{mod.repository.version || "?"}</p>
    {#if mod.build.needsBuild}
      <p class="small needs-build">
        <span aria-hidden="true">⚙</span>
        {t("mods-needs-build")}
      </p>
    {/if}
    {#if mod.uncommittedCount > 0}
      <p class="muted small">
        {t("mods-uncommitted", { count: mod.uncommittedCount })}
      </p>
    {/if}
    {#if mod.update.gain.length > 0}
      <h5 class="gain">
        <span aria-hidden="true">+</span>
        {t("mods-gain", { count: mod.update.gain.length })}
      </h5>
      {@render entryList(
        mod.update.gain,
        mod.update.summaries,
        `${key}/gain`,
        source,
      )}
    {/if}
    {#if unlogged(mod)}
      {@const sources = changedSources(mod)}
      <p class="small unlogged">
        <span aria-hidden="true">⚠</span>
        {sources.names.length > 0
          ? t("mods-unlogged-sources", {
              names: sources.names.join(", "),
              more: sources.more,
            })
          : t("mods-unlogged")}
      </p>
    {:else if rebuiltCount(mod) > 0}
      <p class="small rebuilt-note">
        <span aria-hidden="true">⚙</span>
        {t("mods-rebuilt", { count: rebuiltCount(mod) })}
      </p>
    {/if}
    {#if mod.files && mod.files.total > 0}
      <h5>{t("mods-files", { count: mod.files.total })}</h5>
      <p class="small">
        {Object.entries(mod.files.counts)
          .map(([kind, count]) =>
            t(FILE_WORDS[kind] ?? "mods-files-other", { count }),
          )
          .join(" · ")}
      </p>
      <button
        type="button"
        class="action"
        aria-expanded={showAll[`${key}/files`] ?? false}
        onclick={() => toggle(`${key}/files`)}
      >
        {showAll[`${key}/files`] ? t("mods-hide-files") : t("mods-show-files")}
      </button>
      {#if showAll[`${key}/files`]}
        <ul class="entries files">
          {#each mod.files.paths as file (file.path)}
            <li>
              <span class="section-tag"
                >{t(FILE_CHANGE_WORDS[file.change])}</span
              >
              {file.path}
              {#if file.rebuilt}
                <span class="muted">{t("mods-file-rebuilt")}</span>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    {/if}
    {#if mod.settings && mod.settings.length > 0}
      <h5>{t("mods-settings", { count: mod.settings.length })}</h5>
      <ul class="entries">
        {#each mod.settings as change (change.key)}
          <li>
            {t(SETTING_WORDS[change.what], {
              label: change.label ?? change.key,
              before: change.before ?? "",
              after: change.after ?? "",
            })}
          </li>
        {/each}
      </ul>
    {:else if mod.settingsNote}
      <p class="muted small">{t("mods-settings-unknown")}</p>
    {/if}
    {#if mod.lookOut.length > 0}
      <h5>{t("mods-look-out", { count: mod.lookOut.length })}</h5>
      <ul class="entries">
        {#each mod.lookOut as row (row.id)}
          <li>
            <span class="section-tag">{row.id}</span>
            {row.title}
            <span class="muted">({row.version})</span>
          </li>
        {/each}
      </ul>
    {/if}
    {@render reworded(mod.update)}
  </section>
{/snippet}

<div class="eyebrow accent">{t("mods-kicker")}</div>
<h1>{t("mods-title", { game: game.name })}</h1>
<p class="lead">{t("mods-lead")}</p>

{#if working !== null}
  <ProgressBar progress={working} fallback={t("mods-working")} />
{:else if refreshing !== null}
  <ProgressBar progress={refreshing} fallback={t("mods-reading-again")} />
{:else}
  <p class="status" role="status" aria-live="polite">{said}</p>
{/if}
{#if output.length > 0}
  <details class="output">
    <summary>{t("mods-output")}</summary>
    <pre>{output.join("\n")}</pre>
  </details>
{/if}

{#if reading.state === "reading"}
  <ProgressBar progress={readProgress} fallback={t("mods-reading")} />
  <Placeholder shape="rows" rows={5} />
{:else if reading.state === "browser"}
  <p class="muted">{t("mods-browser")}</p>
{:else if reading.state === "failed"}
  <FailurePanel failure={reading.failure} onretry={() => load()} />
{:else if repositories.length === 0}
  <p class="lead">{t("mods-none", { game: game.name })}</p>
  <GuideLink entry="task-repository-ready" words={t("guide-ready-link")} />
{:else}
  <section class="strip" aria-labelledby="before-you-play">
    <h2 id="before-you-play">{t("mods-pre-heading")}</h2>
    <ul class="checks">
      {#each checks as check (check.words)}
        {@const blocked = checkBlocked(check)}
        <li class="check check-{check.kind}">
          <span class="mark" aria-hidden="true"
            >{check.kind === "ready"
              ? "✓"
              : check.kind === "todo"
                ? "◆"
                : "●"}</span
          >
          {#if check.words === "mods-pre-textures-reading"}
            <span class="check-bar">
              <ProgressBar
                progress={textureProgress}
                fallback={t(check.words, check.args)}
              />
            </span>
          {:else}
            <span class="check-words">{t(check.words, check.args)}</span>
          {/if}
          {#if check.action}
            <button
              type="button"
              class="move-button"
              disabled={busy !== null || blocked !== null}
              aria-pressed={asking?.place === STRIP &&
                ((check.action === "install-all" &&
                  asking.kind === "all" &&
                  !asking.fresh) ||
                  (check.action === "install-new" &&
                    asking.kind === "all" &&
                    asking.fresh) ||
                  (check.action === "encode" && asking.kind === "encode"))}
              onclick={() => runCheck(check)}
            >
              {t(CHECK_ACTION_WORDS[check.action])}
            </button>
            {#if blocked}
              <span class="muted blocked"
                >{t(blocked, { game: game.name })}</span
              >
            {/if}
          {/if}
        </li>
      {/each}
    </ul>
    {#if asking?.place === STRIP}
      {@render question()}
    {/if}
    <SinceLastPlayed
      game={game.id}
      repositories={repositories.map((r) => r.repository)}
      running={running.length > 0}
    />
    <div class="buttons">
      <button
        type="button"
        class="action"
        disabled={busy !== null || refreshing !== null}
        onclick={() => load(true)}
      >
        {refreshing !== null
          ? t("mods-action-reading")
          : t("mods-action-read-again")}
      </button>
      {#if repositories.some((r) => r.status.canBuild)}
        <button
          type="button"
          class="action"
          disabled={busy !== null}
          onclick={build}
        >
          {busy === "build" ? t("mods-building") : t("mods-action-build")}
        </button>
      {/if}
    </div>
  </section>

  <SettingsToLook game={game.id} />

  {#each repositories as repository (repository.repository)}
    {#if repositories.length > 1}
      <h2 class="repository">{repository.repository}</h2>
    {/if}
    <ol class="mods">
      {#each repository.status.mods as mod (mod.mod)}
        {@const key = `${repository.repository}/${mod.mod}`}
        {@const fromBefore = backupBefore(key, mod)}
        {@const words = STATE_WORDS[mod.state]}
        {@const pagedBackups = pageOf(
          mod.backups,
          backupPages[key] ?? 1,
          BACKUPS_PER_PAGE,
        )}
        {@const backupsShown = showAll[`${key}/backups`]
          ? pagedBackups.items
          : mod.backups.slice(0, FIRST_BACKUPS)}
        <li>
          <article class="mod" aria-label={mod.name} id={`mod-${key}`}>
            <div class="mod-head">
              <h3>{mod.name}</h3>
              <p class="state state-{mod.state}">
                <span aria-hidden="true">{words.mark}</span>
                {t(words.label)}
              </p>
              {#if mod.build.needsBuild}
                <p class="state needs-build">
                  <span aria-hidden="true">⚙</span>
                  {t("mods-needs-build")}
                </p>
              {/if}
            </div>

            {#if !mod.installed}
              <p class="small">
                {t("mods-not-installed-line", {
                  version: mod.repository.version || "?",
                })}
              </p>
            {:else if hasChanges(mod)}
              {@render saveNotes(mod.update)}
              <div class="columns">
                {@render nowColumn(mod, key, {
                  repository: repository.repository,
                  mod,
                })}
                {@render afterColumn(mod, key, {
                  repository: repository.repository,
                  mod,
                })}
              </div>
            {:else}
              <p class="muted small">
                {t("mods-in-step", { version: mod.installed.version || "?" })}
              </p>
            {/if}

            <div class="buttons">
              {@render moveButton(
                repository.repository,
                mod,
                "install",
                null,
                `${key}/install`,
              )}
              {#if mod.installed}
                {@render moveButton(
                  repository.repository,
                  mod,
                  "backup",
                  null,
                  `${key}/backup`,
                )}
              {/if}
            </div>
            {#if asking?.place === `${key}/install` || asking?.place === `${key}/backup`}
              {@render question()}
            {/if}

            {#if before && key === focusKey && !fromBefore}
              <p class="before-note" id={`mod-${key}/before`}>
                {t("mods-before-none", { when: formatWhen(before) })}
              </p>
            {/if}
            {#if mod.backups.length > 0}
              <details class="backups" open={fromBefore !== null || undefined}>
                <summary>
                  {t("mods-backups", {
                    count: mod.backups.length,
                    size: formatSize(
                      mod.backups.reduce((sum, b) => sum + (b.size ?? 0), 0),
                    ),
                  })}
                </summary>
                <ol class="backup-list">
                  {#each backupsShown as backup (backup.backup)}
                    {@const backupKey = `${key}/${backup.backup}`}
                    <li
                      class="backup"
                      class:before={backup === fromBefore}
                      id={backup === fromBefore
                        ? `mod-${key}/before`
                        : undefined}
                    >
                      {#if backup === fromBefore}
                        <p class="before-note">
                          {t("mods-before-this", { when: formatWhen(before) })}
                        </p>
                      {/if}
                      <p>
                        <strong>{formatWhen(backup.taken)}</strong>
                        <span>· {backup.version || "?"}</span>
                        <span class="muted">· {formatSize(backup.size)}</span>
                      </p>
                      {#if backup.sameAs && backup.sameKind}
                        {@const twin = mod.backups.find(
                          (b) => b.backup === backup.sameAs,
                        )}
                        <p class="repeat">
                          <span aria-hidden="true">≡</span>
                          {t(SAME_WORDS[backup.sameKind], {
                            when: twin ? formatWhen(twin.taken) : backup.sameAs,
                          })}
                        </p>
                      {/if}
                      <p class="muted">
                        {t("mods-backup-change", {
                          lose: backup.delta.lose.length,
                          gain: backup.delta.gain.length,
                        })}
                        {#if backup.delta.saveNotes.length > 0}
                          <span aria-hidden="true">⚠</span>
                          {t("mods-backup-saves", {
                            count: backup.delta.saveNotes.length,
                          })}
                        {/if}
                      </p>
                      <div class="buttons">
                        <button
                          type="button"
                          class="action"
                          aria-expanded={showAll[backupKey] ?? false}
                          onclick={() => toggle(backupKey)}
                        >
                          {showAll[backupKey]
                            ? t("mods-hide-changes")
                            : t("mods-show-changes")}
                        </button>
                        {@render moveButton(
                          repository.repository,
                          mod,
                          "restore",
                          backup,
                          backupKey,
                        )}
                      </div>
                      {#if showAll[backupKey]}
                        <div class="backup-delta">
                          {@render deltaView(backup.delta, backupKey, {
                            repository: repository.repository,
                            mod,
                          })}
                        </div>
                      {/if}
                      {#if asking?.place === backupKey}
                        {@render question()}
                      {/if}
                    </li>
                  {/each}
                </ol>
                {#if showAll[`${key}/backups`]}
                  <Pager
                    page={pagedBackups.page}
                    pages={pagedBackups.pages}
                    first={pagedBackups.first}
                    last={pagedBackups.last}
                    total={pagedBackups.total}
                    label={t("mods-backup-pages", { mod: mod.name })}
                    onchange={(page) =>
                      (backupPages = { ...backupPages, [key]: page })}
                  />
                {/if}
                {#if mod.backups.length > FIRST_BACKUPS}
                  <button
                    type="button"
                    class="action"
                    aria-expanded={showAll[`${key}/backups`] ?? false}
                    onclick={() => toggle(`${key}/backups`)}
                  >
                    {showAll[`${key}/backups`]
                      ? t("mods-show-fewer-backups")
                      : t("mods-show-all-backups", {
                          count: mod.backups.length,
                        })}
                  </button>
                {/if}
              </details>
            {/if}
          </article>
        </li>
      {/each}
    </ol>
    <p class="muted how">
      {t("mods-space", {
        size: formatSize(repository.status.space.backups),
        free: formatSize(repository.status.space.backupsFree) || "?",
      })}
    </p>
    {#if (repository.status.space.duplicates ?? 0) > 0}
      {@const place = `${repository.repository}/dedupe`}
      <div class="repeats">
        <p>
          <span aria-hidden="true">≡</span>
          {t("mods-repeats", {
            count: repository.status.space.duplicates ?? 0,
            size: formatSize(repository.status.space.duplicatesSize ?? 0),
          })}
        </p>
        <button
          type="button"
          class="move-button"
          disabled={busy !== null}
          aria-pressed={asking?.place === place}
          onclick={() =>
            ask({
              kind: "dedupe",
              place,
              repository: repository.repository,
              count: repository.status.space.duplicates ?? 0,
              size: repository.status.space.duplicatesSize ?? 0,
            })}>{t(MOVE_WORDS.dedupe.button)}</button
        >
        {#if asking?.place === place}
          {@render question()}
        {/if}
      </div>
    {/if}
  {/each}

  {#if textures.state === "ready" && encodeTargets(textures.status.mods).length > 0}
    <section class="textures" aria-labelledby="textures-heading">
      <h2 id="textures-heading">{t("mods-textures-heading")}</h2>
      <p class="small">
        {t("mods-textures-lead")}
        {#if textures.status.mods.some((m) => m.unpacked > 0)}
          {t("mods-textures-lead-unpacked")}
        {/if}
      </p>
      <ul class="entries">
        {#each encodeTargets(textures.status.mods) as found (found.folderName)}
          <li>
            <strong>{found.name}</strong>
            <span class="muted">({found.source})</span>
            {#if found.stale > 0}
              <span class="lose"
                >{t("mods-textures-stale", { count: found.stale })}</span
              >
            {/if}
            {#if found.missing > 0}
              <span>{t("mods-textures-missing", { count: found.missing })}</span
              >
            {/if}
            {#if found.unpacked > 0}
              <span
                >{t("mods-textures-unpacked", { count: found.unpacked })}</span
              >
            {/if}
          </li>
        {/each}
      </ul>
    </section>
  {/if}
  <p class="muted how">{t("mods-how")}</p>
{/if}

<style>
  h2 {
    margin-block: 0 8px;
    font-family: var(--font-display);
    font-size: 1.25rem;
  }

  .status {
    min-height: 1.5em;
    margin-block: 8px;
    font-weight: 600;
    color: var(--colour-observed);
  }

  .small {
    margin-block: 4px;
    font-size: var(--type-small);
  }

  .strip,
  .textures {
    margin-block: 8px 20px;
    padding: 14px 18px;
    background: var(--colour-surface-raised);
    border: 2px solid var(--colour-accent);
    border-radius: 4px;
  }

  .textures {
    margin-top: 20px;
    border-width: 1px;
    border-color: var(--colour-line);
  }

  .checks {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .check {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 12px;
  }

  .check-words {
    max-width: 80ch;
  }

  .check-ready .mark {
    color: var(--colour-success);
  }

  .check-todo .mark {
    color: var(--colour-accent);
  }

  .check-info .mark {
    color: var(--colour-observed);
  }

  .check-ready {
    font-weight: 600;
  }

  .repository {
    margin-block: 20px 8px;
  }

  .mods,
  .backup-list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .mod {
    padding: 16px 18px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .mod-head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 16px;
  }

  h3 {
    margin: 0;
    font-size: var(--type-lead);
    font-weight: 600;
  }

  h4 {
    margin-block: 0 4px;
    font-size: var(--type-small);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--colour-text-muted);
  }

  h5 {
    margin-block: 10px 4px;
    font-size: var(--type-small);
    font-weight: 600;
  }

  .state {
    margin: 0;
    font-size: var(--type-small);
    font-weight: 600;
  }

  .state-behind,
  .state-differs,
  .needs-build {
    color: var(--colour-accent);
  }

  .state-up-to-date {
    color: var(--colour-success);
  }

  .state-ahead {
    color: var(--colour-observed);
  }

  .gain {
    color: var(--colour-success);
  }

  .lose {
    color: var(--colour-risk);
  }

  .unlisted {
    color: var(--colour-comparison);
  }

  .columns {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
    align-items: start;
    gap: 12px;
    margin-block: 10px;
  }

  .column {
    min-width: 0;
    padding: 10px 12px;
    background: var(--colour-surface-soft);
    border-radius: 4px;
  }

  .column-version {
    margin: 0;
    font-size: var(--type-lead);
    font-weight: 600;
  }

  .unlogged {
    padding-inline-start: 8px;
    border-inline-start: 3px solid var(--colour-accent);
  }

  .version {
    margin-block: 8px 2px;
    font-size: var(--type-small);
  }

  .entries {
    margin: 0;
    padding-inline-start: 20px;
    font-size: var(--type-small);
    max-width: 90ch;
  }

  .entries li + li {
    margin-top: 4px;
  }

  .run {
    margin-block: 4px 10px;
  }

  .run.shared {
    padding-inline-start: 10px;
    border-inline-start: 2px solid var(--colour-line);
  }

  .code-button {
    display: block;
    margin-top: 6px;
  }

  .rebuilt-note {
    color: var(--colour-text-muted);
  }

  .check-bar {
    flex: 1;
    min-width: 240px;
  }

  .files li {
    overflow-wrap: anywhere;
  }

  .section-tag {
    display: inline-block;
    margin-inline-end: 6px;
    padding-inline: 6px;
    font-size: var(--type-caption);
    color: var(--colour-text-muted);
    border: 1px solid var(--colour-line);
    border-radius: 3px;
  }

  .saves,
  .confirm {
    margin-block: 10px;
    padding: 10px 14px;
    background: var(--colour-surface-soft);
  }

  .saves {
    border-inline-start: 4px solid var(--colour-risk);
  }

  .saves-heading {
    margin: 0 0 4px;
    font-weight: 600;
  }

  .saves ul {
    margin: 0;
    padding-inline-start: 20px;
    font-size: var(--type-small);
  }

  .confirm {
    border: 2px solid var(--colour-accent);
    border-radius: 4px;
  }

  .confirm-question {
    margin: 0 0 6px;
    font-weight: 600;
    max-width: 80ch;
  }

  .confirm-warning {
    margin-block: 4px;
    font-size: var(--type-small);
  }

  .buttons {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    margin-top: 10px;
  }

  .move-button {
    min-height: var(--control-min);
    padding-inline: 20px;
    font: inherit;
    font-weight: 600;
    color: var(--colour-text);
    background: var(--colour-surface-soft);
    border: 2px solid var(--colour-accent);
    border-radius: 4px;
    cursor: pointer;
  }

  .move-button:disabled {
    cursor: not-allowed;
    opacity: 0.7;
  }

  .move-button[aria-pressed="true"] {
    background: var(--colour-surface);
  }

  .blocked {
    font-size: var(--type-small);
  }

  details > summary {
    display: flex;
    align-items: center;
    min-height: var(--control-min);
    font-weight: 600;
    cursor: pointer;
  }

  .backups {
    margin-top: 12px;
    border-top: 1px solid var(--colour-line);
  }

  .repeat {
    color: var(--colour-comparison);
    font-size: var(--type-small);
  }

  .repeats {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    margin-block: 4px 16px;
    padding: 12px 14px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-inline-start: 3px solid var(--colour-comparison);
    border-radius: 4px;
  }

  .repeats p {
    margin: 0;
  }

  .backup {
    padding: 10px 12px;
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .backup.before {
    border-color: var(--colour-accent);
    border-width: 2px;
  }

  .before-note {
    margin: 0 0 6px;
    font-size: var(--type-small);
    font-weight: 600;
    color: var(--colour-accent);
  }

  .backup p {
    margin: 0 0 4px;
    font-size: var(--type-small);
  }

  .backup-delta {
    margin-top: 8px;
  }

  .output pre {
    max-height: 18rem;
    overflow: auto;
    padding: 10px;
    font-size: var(--type-caption);
    white-space: pre-wrap;
    background: var(--colour-canvas);
    border: 1px solid var(--colour-line);
  }

  @media (max-width: 700px) {
    .columns {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
