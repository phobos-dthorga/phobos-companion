<script lang="ts">
  import { t } from "../i18n/runtime";
  import { inFolder, readViewable } from "../media/desktopClient";
  import MediaCompare from "../media/MediaCompare.svelte";
  import type { MediaSide, MediaSource } from "../media/source";
  import { formatWhen } from "./presentation";
  import type { FileChange, ModInstall } from "./types";

  /**
   * A changed picture or sound of one mod, installed now against the repository's copy or a backup (0.53.0; the owner's choice of
   * 23 Nov 2026, "Mods page: before installing"): what installing would bring, or what going back would. Only reads.
   */
  let { mod, file }: { mod: ModInstall; file: FileChange } = $props();

  /** Backups offered to compare with, newest first (agent default): older ones are a press away on the backups list. */
  const BACKUPS_OFFERED = 5;

  /** "repository", or a backup's folder name. */
  let against = $state("repository");

  const backups = $derived(
    mod.backups.filter((b) => b.folder && b.backup).slice(0, BACKUPS_OFFERED),
  );

  function side(
    folder: string | undefined,
    label: string,
    exists: boolean,
  ): MediaSide | null {
    if (!folder || !exists) return null;
    const path = inFolder(folder, file.path);
    return { label, path, read: () => readViewable(path) };
  }

  const source = $derived.by((): MediaSource => {
    const backup = backups.find((b) => b.backup === against);
    const after = backup
      ? side(
          backup.folder,
          t("mods-compare-backup", { when: formatWhen(backup.taken) }),
          true,
        )
      : side(
          mod.repository.folder,
          t("mods-compare-repository"),
          file.change !== "removed",
        );
    return {
      key: `${mod.mod}/${file.path}/${against}`,
      before: side(
        mod.installed?.folder,
        t("mods-compare-installed"),
        file.change !== "added",
      ),
      after,
      tolerance: 0,
      place: "mods",
      alone:
        file.change === "added" && !backup
          ? t("mods-compare-only-repository")
          : file.change === "removed" && !backup
            ? t("mods-compare-only-installed")
            : undefined,
    };
  });
</script>

<div class="compare">
  {#if backups.length > 0}
    <div class="toggles" role="group" aria-label={t("mods-compare-against")}>
      <button
        type="button"
        class="toggle"
        aria-pressed={against === "repository"}
        onclick={() => (against = "repository")}
        >{t("mods-compare-repository")}</button
      >
      {#each backups as backup (backup.backup)}
        <button
          type="button"
          class="toggle"
          aria-pressed={against === backup.backup}
          onclick={() => (against = backup.backup ?? "repository")}
          >{t("mods-compare-backup", {
            when: formatWhen(backup.taken),
          })}</button
        >
      {/each}
    </div>
  {/if}
  <MediaCompare {source} />
</div>

<style>
  .compare {
    margin: 6px 0 12px;
    padding: 8px 0;
    background: var(--colour-canvas);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .toggles {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin: 4px 12px 8px;
  }
</style>
