<script lang="ts">
  import { t } from "../i18n/runtime";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import ProgressBar from "../shell/ProgressBar.svelte";
  import { heard, started } from "../shell/progress";
  import type { Failure } from "../shell/types";
  import { pickPath } from "../settings/desktopClient";
  import { cleanPath } from "../settings/presentation";
  import { addGame, readSteamGames } from "./desktopClient";
  import { idFor, idProblem, offered, preview } from "./presentation";
  import type { NewGame, SteamGame, SteamGames } from "./types";

  /**
   * Add a game from Steam (0.31.0; `docs/later.md` item 5, the owner's yes of 19 Nov 2026), on the Settings page: every game Steam
   * has installed and not yet on the list, its data folder chosen from the tools' guesses or with Windows' picker, its repositories
   * ticked, and the entry shown as it will be written before Add writes it. The list as it was is kept beside it.
   */
  let { taken, onchanged }: { taken: string[]; onchanged: () => void } =
    $props();

  const NONE = "";
  /** The picker's choice in the radio group; "<" cannot appear in a Windows path, so it never meets a guess. */
  const OTHER = "<other>";

  type Reading =
    | { state: "closed" }
    | { state: "reading" }
    | { state: "ready"; steam: SteamGames }
    | { state: "failed"; failure: Failure };

  let reading = $state<Reading>({ state: "closed" });
  let progress = $state(started());
  let chosen = $state<SteamGame | null>(null);
  let name = $state("");
  let id = $state("");
  let data = $state(NONE);
  let other = $state("");
  let repositories = $state<string[]>([]);
  let adding = $state(false);
  let said = $state<{ ok: boolean; words: string } | null>(null);

  async function open() {
    said = null;
    chosen = null;
    reading = { state: "reading" };
    progress = started();
    const answer = await readSteamGames((m) => {
      progress = heard(progress, m);
    });
    reading = answer;
  }

  function choose(game: SteamGame) {
    chosen = game;
    name = game.name;
    id = idFor(game.name);
    data = game.dataGuesses?.[0]?.path ?? NONE;
    other = "";
    repositories = [];
    said = null;
  }

  async function browse() {
    const picked = await pickPath(
      "folder",
      t("games-pick-title", { name: name || chosen?.name || "" }),
      data && data !== OTHER ? data : null,
    );
    if (picked.state === "picked") {
      other = cleanPath(picked.path);
      data = OTHER;
    } else if (picked.state === "closed") {
      said = { ok: true, words: t("games-pick-closed") };
    } else {
      said = {
        ok: false,
        words: t("games-failed", { reason: picked.failure.detail }),
      };
    }
  }

  function toggleRepository(repository: string) {
    repositories = repositories.includes(repository)
      ? repositories.filter((r) => r !== repository)
      : [...repositories, repository];
  }

  const steam = $derived(reading.state === "ready" ? reading.steam : null);
  const problem = $derived(idProblem(id, taken));
  const entry = $derived<NewGame | null>(
    chosen
      ? {
          id,
          name: name.trim(),
          steam_app_id: chosen.appId,
          data: data === OTHER ? other || null : data || null,
          repositories,
        }
      : null,
  );
  const ready = $derived(
    entry !== null &&
      problem === null &&
      entry.name.length > 0 &&
      !(data === OTHER && !other),
  );

  async function add() {
    if (!entry || !ready) return;
    adding = true;
    said = null;
    const answer = await addGame(entry);
    adding = false;
    if (answer.state !== "done") {
      said = {
        ok: false,
        words: t("games-failed", { reason: answer.failure.detail }),
      };
      return;
    }
    said = {
      ok: true,
      words: t("games-added", {
        name: entry.name,
        before: answer.added.before,
      }),
    };
    chosen = null;
    reading = { state: "closed" };
    onchanged();
  }
</script>

<section id="settings-games" class="games" aria-labelledby="games-title">
  <h2 id="games-title">{t("games-title")}</h2>
  <p class="small">{t("games-body")}</p>

  {#if reading.state === "closed"}
    <button type="button" class="action" onclick={open}
      >{t("games-open")}</button
    >
  {:else if reading.state === "reading"}
    <ProgressBar {progress} fallback={t("games-steam-reading")} />
  {:else if reading.state === "failed"}
    <FailurePanel failure={reading.failure} onretry={open} />
  {:else if steam && !steam.list_exists}
    <p>{t("games-no-list", { path: steam.list_file })}</p>
  {:else if steam && !chosen}
    <p class="muted small where">
      {t("games-list-file", { path: steam.list_file })}
    </p>
    <ul class="steam" aria-label={t("games-steam-label")}>
      {#each offered(steam.games) as game (game.appId)}
        <li>
          <button
            type="button"
            class="action game"
            disabled={game.listedAs !== null}
            onclick={() => choose(game)}
          >
            <span class="name">{game.name}</span>
            <span class="small muted">
              {game.listedAs
                ? t("games-listed-as", { id: game.listedAs })
                : game.dataGuesses?.length
                  ? t("games-guess", { path: game.dataGuesses[0].path })
                  : t("games-no-guess")}
            </span>
          </button>
        </li>
      {/each}
    </ul>
    <button
      type="button"
      class="action"
      onclick={() => (reading = { state: "closed" })}
      >{t("games-cancel")}</button
    >
  {:else if steam && chosen}
    <form
      class="form"
      onsubmit={(event) => {
        event.preventDefault();
        void add();
      }}
    >
      <h3>{t("games-adding", { name: chosen.name })}</h3>
      <label for="game-name">{t("games-name")}</label>
      <input id="game-name" type="text" bind:value={name} autocomplete="off" />
      <label for="game-id">{t("games-id")}</label>
      <input
        id="game-id"
        type="text"
        bind:value={id}
        autocomplete="off"
        spellcheck="false"
        aria-describedby="game-id-note"
      />
      <p id="game-id-note" class="small" class:refused-line={problem !== null}>
        {problem === "taken"
          ? t("games-id-taken", { id })
          : problem === "shape"
            ? t("games-id-shape")
            : t("games-id-note")}
      </p>

      <fieldset>
        <legend>{t("games-data")}</legend>
        {#each chosen.dataGuesses ?? [] as guess (guess.path)}
          <label class="choice">
            <input
              type="radio"
              name="game-data"
              value={guess.path}
              bind:group={data}
            />
            <span
              ><code>{guess.path}</code>
              <span class="small muted">{guess.reason}</span></span
            >
          </label>
        {/each}
        <label class="choice">
          <input
            type="radio"
            name="game-data"
            value={OTHER}
            bind:group={data}
          />
          <span
            >{other
              ? t("games-data-other", { path: other })
              : t("games-data-pick")}</span
          >
        </label>
        <button type="button" class="action" onclick={browse}
          >{t("games-data-browse")}</button
        >
        <label class="choice">
          <input type="radio" name="game-data" value={NONE} bind:group={data} />
          <span>{t("games-data-none")}</span>
        </label>
      </fieldset>

      <fieldset>
        <legend>{t("games-repositories")}</legend>
        {#if steam.repositories.length === 0}
          <p class="small muted">{t("games-repositories-none")}</p>
        {:else}
          <p class="small muted">{t("games-repositories-note")}</p>
          <div class="repositories">
            {#each steam.repositories as repository (repository)}
              <label class="choice">
                <input
                  type="checkbox"
                  checked={repositories.includes(repository)}
                  onchange={() => toggleRepository(repository)}
                />
                <span>{repository}</span>
              </label>
            {/each}
          </div>
        {/if}
      </fieldset>

      {#if entry}
        <p class="small">{t("games-preview", { path: steam.list_file })}</p>
        <pre class="preview">{preview(entry)}</pre>
      {/if}
      <div class="buttons">
        <button type="submit" class="action" disabled={!ready || adding}
          >{adding ? t("games-adding-now") : t("games-add")}</button
        >
        <button
          type="button"
          class="action"
          disabled={adding}
          onclick={() => (chosen = null)}>{t("games-back")}</button
        >
      </div>
    </form>
  {/if}
  <div aria-live="polite">
    {#if said}
      <p class={said.ok ? "told" : "told refused"} role="status">
        {said.words}
      </p>
    {/if}
  </div>
</section>

<style>
  .games {
    margin-bottom: 20px;
    padding: 16px 20px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  h2 {
    margin-bottom: 6px;
    font-family: var(--font-display);
    font-size: 1.25rem;
    font-weight: 600;
  }

  h3 {
    margin: 0 0 4px;
    font-size: var(--type-body);
    font-weight: 600;
  }

  .where {
    overflow-wrap: anywhere;
  }

  .steam {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
    gap: 8px;
    margin: 10px 0;
    padding: 0;
    list-style: none;
  }

  .game {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    width: 100%;
    min-height: 44px;
    padding: 8px 12px;
    text-align: start;
    overflow-wrap: anywhere;
  }

  .name {
    font-weight: 600;
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .form label {
    font-size: var(--type-small);
  }

  .form input[type="text"] {
    min-height: var(--control-min);
    padding-inline: 10px;
    font: inherit;
    color: var(--colour-text);
    background: var(--colour-canvas);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  fieldset {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    margin: 8px 0 0;
    padding: 10px 12px;
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  legend {
    padding-inline: 4px;
    font-weight: 600;
  }

  .choice {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    min-height: 32px;
    overflow-wrap: anywhere;
  }

  .choice input {
    margin-top: 4px;
  }

  .repositories {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr));
    gap: 2px 12px;
    width: 100%;
  }

  .preview {
    margin: 0;
    padding: 10px 12px;
    overflow-x: auto;
    font-size: var(--type-small);
    background: var(--colour-canvas);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 6px;
  }

  .refused-line {
    padding-inline-start: 8px;
    border-inline-start: 3px solid var(--colour-risk);
  }

  .told {
    margin-top: 10px;
    padding: 6px 10px;
    border: 1px solid var(--colour-success);
    border-radius: 4px;
    overflow-wrap: anywhere;
  }

  .told.refused {
    border-color: var(--colour-risk);
  }
</style>
