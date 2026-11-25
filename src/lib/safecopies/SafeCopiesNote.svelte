<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import { goPage } from "../navigation/navigation.svelte";
  import { readSafeCopies } from "./desktopClient";
  import { summarise, unsentOf } from "./presentation";
  import type { RepositoryCopies } from "./types";

  /**
   * On Home (0.95.0; the owner's choice: Safe copies on a page of its own, "Home would keep a one-line note when something
   * waits"): a set never copied, changed since its copy, or a repository's copy not sent yet, leading to the Safe copies page.
   * Nothing shows otherwise, or when the copies can't be read.
   */
  let { game }: { game: string } = $props();

  let repositories = $state<RepositoryCopies[] | null>(null);

  onMount(() => {
    void readSafeCopies(game).then((answer) => {
      if (answer.state === "ready" && Array.isArray(answer.repositories))
        repositories = answer.repositories;
    });
  });

  const waiting = $derived(
    repositories === null
      ? null
      : { ...summarise(repositories), unsent: unsentOf(repositories) },
  );
</script>

{#if waiting && (waiting.never > 0 || waiting.changed > 0 || waiting.unsent > 0)}
  <section class="panel" aria-labelledby="safe-copies-note-title">
    <h2 id="safe-copies-note-title">{t("safe-copies-note-title")}</h2>
    <p>
      {t("safe-copies-note-body", {
        never: waiting.never,
        changed: waiting.changed,
        unsent: waiting.unsent,
      })}
    </p>
    <button type="button" class="action" onclick={() => goPage("safecopies")}
      >{t("safe-copies-note-open")}</button
    >
  </section>
{/if}

<style>
  .panel {
    margin-bottom: 16px;
    padding: 10px 14px;
    background: var(--colour-surface);
    border: 1px solid var(--colour-line);
    border-inline-start: 3px solid var(--colour-accent);
    border-radius: 4px;
  }

  h2 {
    margin: 0 0 6px;
    font-size: var(--type-body);
    font-weight: 600;
  }

  p {
    margin: 0 0 8px;
  }
</style>
