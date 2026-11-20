<script lang="ts">
  import { onMount } from "svelte";
  import type { GameHome } from "../home/types";
  import { t } from "../i18n/runtime";
  import { go, here } from "../navigation/navigation.svelte";
  import { place } from "../navigation/place";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import Placeholder from "../shell/Placeholder.svelte";
  import { formatUnixDate } from "../shell/dates";
  import type { KitReading } from "../shell/types";
  import { readAbout } from "./desktopClient";
  import { listedWith, standing } from "./presentation";
  import type { AboutReading } from "./types";

  /**
   * About (0.25.0; the owner: "I keep forgetting which version I have installed"): the version running, what it was built from
   * and when, whether its repository holds a newer one and where that one's installer is, where it lives, and what it is built
   * with. It only reads.
   */
  let { games, kit }: { games: GameHome[]; kit: KitReading } = $props();

  let reading = $state<AboutReading>({ state: "reading" });

  async function load() {
    reading = { state: "reading" };
    reading = await readAbout();
  }

  const stands = $derived(
    reading.state === "ready" ? standing(reading.about) : null,
  );
  const listed = $derived(
    reading.state === "ready"
      ? listedWith(games, reading.about.repository_name)
      : null,
  );

  function whatsNew(repository: string) {
    if (!listed) return;
    go({
      page: "changes",
      game: listed,
      focus: { repository, changelog: "CHANGELOG.md" },
      dialog: null,
    });
  }

  onMount(load);
</script>

<div class="eyebrow accent">{t("about-kicker")}</div>
{#if reading.state === "ready"}
  {@const about = reading.about}
  <h1>{t("about-title", { version: about.version })}</h1>
  <p class="lead">
    {about.built_commit && about.built_unix
      ? t("about-built", {
          commit: about.built_commit,
          when: formatUnixDate(about.built_unix),
        })
      : t("about-built-unknown")}
  </p>

  {#if stands?.kind === "newer"}
    <section class="standing newer" aria-labelledby="about-newer">
      <h2 id="about-newer">
        {t("about-newer-title", { version: stands.version })}
      </h2>
      {#if stands.installer}
        <p>{t("about-installer-ready")}</p>
        <p class="path">{stands.installer}</p>
        <p class="small muted">{t("about-installer-how")}</p>
      {:else}
        <p>{t("about-installer-missing")}</p>
      {/if}
      <ul class="versions">
        {#each about.newer as note (note.version)}
          <li>
            <strong>{note.version}</strong>
            {#if note.date}<span class="muted">{note.date}</span>{/if}
            {#if note.summary}<p>{note.summary}</p>{/if}
          </li>
        {/each}
      </ul>
    </section>
  {:else if stands?.kind === "changes"}
    <section class="standing" aria-labelledby="about-changes">
      <h2 id="about-changes">{t("about-current-title")}</h2>
      <p>{t("about-changes", { count: stands.commits })}</p>
    </section>
  {:else if stands?.kind === "current"}
    <section class="standing current" aria-labelledby="about-current">
      <h2 id="about-current">{t("about-current-title")}</h2>
      <p>{t("about-current")}</p>
    </section>
  {/if}

  <section aria-labelledby="about-this">
    <h2 id="about-this">{t("about-this-title")}</h2>
    {#if about.this_version?.summary}
      <p class="text">{about.this_version.summary}</p>
    {:else}
      <p class="muted">{t("about-this-none")}</p>
    {/if}
    {#if listed}
      <button
        type="button"
        class="action"
        onclick={() => whatsNew(about.repository_name)}
        >{t("about-whats-new")}</button
      >
    {/if}
  </section>

  <section aria-labelledby="about-where">
    <h2 id="about-where">{t("about-where-title")}</h2>
    <dl>
      {#if about.program}
        <dt>{t("about-program")}</dt>
        <dd class="path">{about.program}</dd>
      {/if}
      <dt>{t("about-built-from")}</dt>
      <dd>
        <span class="path">{about.built_from}</span>
        <span class="small muted">{t("about-built-from-note")}</span>
      </dd>
      {#if about.data_folder}
        <dt>{t("about-records")}</dt>
        <dd class="path">{about.data_folder}</dd>
      {/if}
      <dt>{t("about-kit")}</dt>
      <dd>
        {#if kit.state === "ready"}
          {t("about-kit-version", {
            version: kit.status.kit_version,
            tools: kit.status.tools,
          })}
          {#if kit.status.source}
            <br /><span class="muted small"
              >{kit.status.source === "installed"
                ? t("about-kit-source-installed")
                : kit.status.source === "environment"
                  ? t("about-kit-source-environment")
                  : t("about-kit-source-build-folder")}</span
            >
          {/if}
          <br /><button
            type="button"
            class="action programs"
            onclick={() =>
              go(
                place("reports", here().game, {
                  command: "programs",
                  report: "status",
                }),
              )}>{t("about-programs")}</button
          >
        {:else if kit.state === "failed"}
          {t("about-kit-unreadable")}
        {:else}
          <span class="muted">{t("about-kit-reading")}</span>
        {/if}
      </dd>
      {#if about.source}
        <dt>{t("about-source")}</dt>
        <dd class="path">{about.source}</dd>
      {/if}
    </dl>
  </section>

  {#if about.libraries.length > 0}
    <section aria-labelledby="about-built-with">
      <h2 id="about-built-with">{t("about-built-with-title")}</h2>
      <ul class="libraries">
        {#each about.libraries as library (library.name)}
          <li>
            <strong>{library.name}</strong>
            <span class="muted">{library.licence}</span>
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  <p class="how">{t("about-licence")}</p>
{:else}
  <h1>{t("about-title-plain")}</h1>
  {#if reading.state === "reading"}
    <Placeholder shape="rows" rows={4} />
  {:else if reading.state === "browser"}
    <p class="muted">{t("about-browser")}</p>
  {:else}
    <FailurePanel failure={reading.failure} onretry={load} />
  {/if}
{/if}

<style>
  section {
    max-width: 90ch;
    margin-top: 20px;
  }

  h2 {
    margin: 0 0 8px;
    font-family: var(--font-display);
    font-size: 1.25rem;
    font-weight: 600;
  }

  .standing {
    padding: 12px 16px;
    background: var(--colour-surface);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .standing.newer {
    border: 2px solid var(--colour-accent);
  }

  .standing.current {
    border-color: var(--colour-success);
  }

  .standing p {
    margin: 0 0 6px;
  }

  .path {
    font-family: var(--font-mono, ui-monospace, Consolas, monospace);
    font-size: var(--type-small);
    overflow-wrap: anywhere;
    user-select: text;
  }

  .versions {
    margin: 10px 0 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 8px;
  }

  .versions p {
    margin: 2px 0 0;
    font-size: var(--type-small);
  }

  .versions .muted {
    margin-inline-start: 8px;
  }

  dl {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 6px 16px;
    margin: 0;
  }

  dt {
    color: var(--colour-text-muted);
  }

  dd {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 0;
    min-width: 0;
  }

  .libraries {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr));
    gap: 6px 16px;
  }

  .libraries li {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 8px;
  }

  @media (max-width: 600px) {
    dl {
      grid-template-columns: 1fr;
    }
  }
</style>
