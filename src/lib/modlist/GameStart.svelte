<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import type { GameHome } from "../home/types";
  import { register } from "../shortcuts/registry";
  import { startTheGame } from "./desktopClient";
  import { launches, loadLaunch } from "./launch.svelte";
  import LaunchLine from "./LaunchLine.svelte";

  /**
   * Start the game (0.117.0; the owner, 28 Nov 2026: "There should be a way to launch games via the Companion, to lessen user
   * confusion, especially if they are moving away from tools like RimSort"): on Home, above the Mod list's views and in Edit the
   * list's bar, with the key Shift+S wherever it shows. The kit runs the game's own program with the arguments line kept for it
   * (the owner's card "Always the game's program"); `withLine` shows that line to change beside the button. `before` runs first
   * (Edit the list's save), and nothing starts when it says no. Nothing shows for a game the tools cannot start.
   */
  let {
    game,
    withLine = false,
    before = undefined,
    label = "",
    disabled = false,
  }: {
    game: GameHome;
    withLine?: boolean;
    before?: () => Promise<boolean>;
    label?: string;
    disabled?: boolean;
  } = $props();

  let busy = $state(false);
  let said = $state<{ ok: boolean; words: string } | null>(null);
  let steamOff = $state(false);

  const launch = $derived(launches[game.id]);
  const ready = $derived(launch?.state === "ready");
  const line = $derived(launch?.state === "ready" ? launch.line : "");

  async function start() {
    if (busy || disabled || !ready) return;
    said = null;
    steamOff = false;
    const saving = before !== undefined;
    if (before && !(await before())) return;
    busy = true;
    const answer = await startTheGame(game.id);
    busy = false;
    const refusal =
      answer.state === "failed"
        ? answer.failure.detail
        : !answer.result.ok
          ? (answer.result.refusal ?? "")
          : null;
    if (refusal !== null) {
      said = {
        ok: false,
        words: t("modlist-board-start-failed", { reason: refusal }),
      };
      return;
    }
    if (answer.state === "ready") {
      steamOff = answer.result.data.steamRunning === false;
    }
    said = {
      ok: true,
      words: t(
        saving ? "modlist-board-saved-started" : "modlist-board-started",
        { game: game.name },
      ),
    };
  }

  onMount(() => {
    void loadLaunch(game.id);
    return register({
      scope: "everywhere",
      inDialog: false,
      run: { "game.start": () => void start() },
    });
  });
</script>

{#if ready}
  <div
    class="start"
    role="group"
    aria-label={t("start-label", { game: game.name })}
  >
    <div class="row">
      <button
        type="button"
        class="action strong"
        disabled={busy || disabled}
        onclick={() => void start()}
        >{busy
          ? t("modlist-board-starting")
          : label || t("modlist-board-start", { game: game.name })}</button
      >
      {#if !withLine && line}
        <span class="small muted">{t("start-with", { line })}</span>
      {/if}
    </div>
    {#if withLine}
      <LaunchLine game={game.id} />
    {/if}
    <div aria-live="polite">
      {#if said}
        <p class={said.ok ? "said" : "said refused"} role="status">
          {said.words}
        </p>
      {/if}
      {#if steamOff}
        <p class="said refused" role="status">{t("start-steam-off")}</p>
      {/if}
    </div>
  </div>
{/if}

<style>
  .start {
    display: grid;
    gap: 6px;
    margin-block: 8px 12px;
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
  }

  .said {
    margin: 0;
  }

  .refused {
    color: var(--colour-risk);
  }
</style>
