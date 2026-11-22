<script lang="ts">
  import { untrack } from "svelte";
  import { t } from "../i18n/runtime";
  import { pictureAddress } from "../media/addresses";
  import type { ModRow } from "./types";

  /**
   * The picture of the mod in focus on Edit the list (0.53.0; the owner's choice of 23 Nov 2026, "Mod list previews"): the one
   * the game's mod menu and the Workshop show, to know a mod at a glance among hundreds. A mod without one says so in words.
   */
  let { mod }: { mod: ModRow | null } = $props();

  let address = $state<string | null>(null);
  let failed = $state(false);

  $effect(() => {
    const path = mod?.preview ?? null;
    address = null;
    failed = false;
    if (!path) return;
    // Asking the host writes to the activity strip's state: untracked, so this effect never waits on its own write.
    void untrack(() => pictureAddress(path)).then((url) => {
      if ((mod?.preview ?? null) !== path) return;
      address = url;
      failed = url === null;
    });
  });
</script>

<!-- Always there, at one height: a panel that appeared or grew when a mod took focus moved the list under the pointer
     between a press and its release, so the click landed on another mod. -->
<section class="preview" aria-label={t("modlist-preview-label")}>
  <div class="picture">
    {#if !mod}
      <p class="muted small">{t("modlist-preview-choose")}</p>
    {:else if address}
      <img src={address} alt={t("modlist-preview-alt", { name: mod.name })} />
    {:else if mod.preview && !failed}
      <p class="muted small">{t("modlist-preview-reading")}</p>
    {:else}
      <p class="muted small">
        {failed ? t("modlist-preview-failed") : t("modlist-preview-none")}
      </p>
    {/if}
  </div>
  <div class="about">
    {#if mod}
      <h3>{mod.name}</h3>
      {#if mod.authors}<p class="muted small">{mod.authors}</p>{/if}
      {#if mod.versions.length > 0}
        <p class="muted small">
          {t("modlist-preview-versions", { versions: mod.versions.join(", ") })}
        </p>
      {/if}
    {/if}
  </div>
</section>

<style>
  .preview {
    display: grid;
    grid-template-columns: 240px minmax(0, 1fr);
    gap: 18px;
    height: 169px;
    margin-bottom: 16px;
    padding: 16px 20px;
    overflow: hidden;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  .picture {
    display: grid;
    place-items: center;
    height: 135px;
    overflow: hidden;
    background: var(--colour-canvas);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  img {
    display: block;
    max-width: 100%;
    max-height: 133px;
    object-fit: contain;
  }

  .about {
    min-width: 0;
    overflow: hidden;
  }

  @media (max-width: 600px) {
    .preview {
      grid-template-columns: 160px minmax(0, 1fr);
      height: 124px;
      padding: 16px;
    }

    .picture {
      height: 90px;
    }

    img {
      max-height: 88px;
    }
  }

  h3 {
    margin: 0 0 4px;
    font-size: 1.05rem;
    overflow-wrap: anywhere;
  }

  .small {
    margin: 2px 0;
    padding: 0 8px;
    font-size: var(--type-small);
  }
</style>
