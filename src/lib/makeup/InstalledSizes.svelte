<script lang="ts">
  import { LOCALE, t } from "../i18n/runtime";
  import { formatSize } from "../shell/sizes";
  import type { Installed } from "./types";

  /**
   * Size as installed, on Make-up (0.97.0; the owner's answer on the Decisions page, "Add it"; kit 1.127.0): each mod's folder in
   * the game, encoded textures and all, beside its folder in the repository. Shown only for a repository whose installs.json says
   * where its mods install.
   */
  let { installed }: { installed: Installed } = $props();

  const total = $derived(installed.mods.reduce((n, m) => n + m.bytes, 0));
</script>

<section class="panel" aria-labelledby="makeup-installed-title">
  <h2 id="makeup-installed-title">{t("makeup-installed-title")}</h2>
  {#if installed.problem}
    <p class="muted">
      {t("makeup-installed-problem", { problem: installed.problem })}
    </p>
  {:else}
    <p class="muted small">
      {t("makeup-installed-how", { total: formatSize(total, LOCALE) })}
    </p>
    <div class="table">
      <table>
        <thead>
          <tr>
            <th scope="col">{t("makeup-installed-mod")}</th>
            <th scope="col" class="number">{t("makeup-installed-size")}</th>
            <th scope="col" class="number">{t("makeup-installed-files")}</th>
            <th scope="col" class="number"
              >{t("makeup-installed-repository")}</th
            >
          </tr>
        </thead>
        <tbody>
          {#each installed.mods as mod (mod.mod)}
            <tr>
              <th scope="row">{mod.mod}</th>
              <td class="number"
                >{mod.found
                  ? formatSize(mod.bytes, LOCALE)
                  : t("makeup-installed-not-installed")}</td
              >
              <td class="number">{mod.files.toLocaleString(LOCALE)}</td>
              <td class="number">{formatSize(mod.repositoryBytes, LOCALE)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</section>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-block-end: 16px;
    padding: 16px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  h2 {
    margin: 0;
  }

  .table {
    overflow-x: auto;
  }

  table {
    border-collapse: collapse;
    font-size: var(--type-small);
  }

  th,
  td {
    padding: 4px 10px;
    text-align: start;
    border-bottom: 1px solid var(--colour-line);
  }

  .number {
    text-align: end;
    font-variant-numeric: tabular-nums;
  }
</style>
