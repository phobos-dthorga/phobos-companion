<script lang="ts">
  import { t } from "../i18n/runtime";
  import { isRisky, targetsAbout, type PatchTargets } from "./patches";
  import { openTheirCode, openUpdate } from "../othercode/navigation";

  /**
   * The risk around a thing's patches (cross-links L5): for each method it patches, or that it is, how many other mods patch the
   * same method and what the last update changed in it. Shown only when the game's tools can say, and the thing has patches.
   */
  let {
    targets,
    node,
    name,
    game,
    repository,
  }: {
    targets: PatchTargets | null;
    node: string;
    name: string;
    game: string;
    repository: string;
  } = $props();

  const about = $derived(
    targets?.data ? targetsAbout(targets.data.targets, node) : [],
  );
</script>

{#if targets?.data && about.length > 0}
  <section class="patches" aria-label={t("patches-title", { name })}>
    <h4>{t("patches-title", { name })}</h4>
    <ul>
      {#each about as target (target.node)}
        <li class:risky={isRisky(target)}>
          <p class="target"><code>{target.target}</code></p>
          <button
            type="button"
            class="action"
            onclick={() =>
              openTheirCode(game, repository, target.target.replace(/^\./, ""))}
            >{t("their-open")}</button
          >
          <p class="small">
            {target.mods.length === 0
              ? t("patches-alone")
              : t("patches-others", {
                  count: target.mods.length,
                  names: target.mods.slice(0, 6).join(", "),
                  more: Math.max(0, target.mods.length - 6),
                })}
            {#if target.skippers > 0}
              {t("patches-skippers", { count: target.skippers })}
            {/if}
          </p>
          {#each target.changed as change, index (index)}
            <p class="small changed">
              {t("patches-changed", {
                mod: change.mod,
                versions: change.versions,
                change: change.change,
              })}
              <button
                type="button"
                class="action"
                onclick={() =>
                  openUpdate(
                    game,
                    repository,
                    change.file,
                    target.target.replace(/^\./, ""),
                  )}>{t("updates-see-change")}</button
              >
            </p>
          {/each}
          {#if target.changed.length === 0 && targets.data.updates && !targets.data.updatesNote}
            <p class="small muted">{t("patches-unchanged")}</p>
          {/if}
        </li>
      {/each}
    </ul>
    {#if targets.data.updatesNote}
      <p class="small muted">{targets.data.updatesNote}</p>
    {/if}
  </section>
{/if}

<style>
  .patches {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
    overflow-wrap: anywhere;
  }

  .patches h4,
  .patches p {
    margin: 0;
  }

  .patches h4 {
    font-size: var(--type-small);
    font-weight: 600;
  }

  ul {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding-inline-start: 10px;
    border-inline-start: 3px solid var(--colour-line);
  }

  li.risky {
    border-inline-start-color: var(--colour-risk);
  }

  .changed {
    color: var(--colour-risk);
    font-weight: 600;
  }
</style>
