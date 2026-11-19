<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import type { ClaimsBoard } from "./types";
  import { readClaims } from "./desktopClient";

  /**
   * Who is working on what (0.22.0; docs/later.md, item 3), on Home: what each agent session holds on the claims board, for how
   * long, and what for. Only read: sessions take and release claims themselves. Nothing shows when the board cannot be read.
   */
  let board = $state<ClaimsBoard | null>(null);

  onMount(() => {
    void readClaims().then((answer) => {
      if (answer.state === "ready") board = answer.board;
    });
  });

  function age(hours: number | null): string {
    if (hours === null) return "";
    return hours < 1
      ? t("claims-minutes", { minutes: Math.max(1, Math.round(hours * 60)) })
      : t("claims-hours", { hours: Math.round(hours) });
  }
</script>

{#if board}
  <section class="panel" aria-labelledby="claims-title">
    <h2 id="claims-title">{t("claims-title")}</h2>
    {#if board.claims.length === 0}
      <p class="muted">{t("claims-none")}</p>
    {:else}
      <ul>
        {#each board.claims as claim (claim.what)}
          <li class="claim">
            <div class="what">
              <strong>{claim.what}</strong>
              {#if claim.note}<span class="muted small">
                  · {claim.note}</span
                >{/if}
            </div>
            <div class="small" class:old={claim.old}>
              {claim.old
                ? t("claims-held-old", { by: claim.by, age: age(claim.hours) })
                : t("claims-held", { by: claim.by, age: age(claim.hours) })}
            </div>
          </li>
        {/each}
      </ul>
    {/if}
    <p class="muted small more">{t("claims-how")}</p>
  </section>
{/if}

<style>
  .panel {
    margin-bottom: 16px;
    padding: 20px 24px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  h2 {
    margin-bottom: 8px;
    font-family: var(--font-display);
    font-size: 1.375rem;
    font-weight: 600;
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .claim {
    padding-block: 10px;
    border-top: 1px solid var(--colour-line);
    overflow-wrap: anywhere;
  }

  .old {
    color: var(--colour-accent);
    font-weight: 600;
  }

  .more {
    margin-top: 10px;
  }
</style>
