<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../../i18n/runtime";
  import { register } from "../../shortcuts/registry";
  import type { SoundReading } from "./decode";
  import SoundSide from "./SoundSide.svelte";

  type Ready = Extract<SoundReading, { ok: true }>;

  /**
   * A changed sound, before and after side by side (0.50.0). Z chooses the other version, Y plays or stops the chosen one; each has
   * its own player too. A sound added or removed has one side.
   */
  let { before, after }: { before: Ready | null; after: Ready | null } =
    $props();

  /** The version picked; one that does not exist is never the chosen one. */
  let picked = $state<"before" | "after">("after");
  const chosen = $derived<"before" | "after">(
    !after ? "before" : !before ? "after" : picked,
  );
  let players = $state<{
    before: HTMLAudioElement | null;
    after: HTMLAudioElement | null;
  }>({
    before: null,
    after: null,
  });

  function switchSide() {
    if (!before || !after) return;
    players[chosen]?.pause();
    picked = chosen === "before" ? "after" : "before";
  }

  function play() {
    const player = players[chosen];
    if (!player) return;
    const other = players[chosen === "before" ? "after" : "before"];
    other?.pause();
    if (player.paused) void player.play();
    else player.pause();
  }

  onMount(() =>
    register({
      scope: "code",
      inDialog: true,
      run: { "code.flick": switchSide, "code.play": play },
    }),
  );
</script>

<p class="small">{t("media-sound-how")}</p>
<div class="pair" class:one={!before || !after}>
  {#if before}
    <SoundSide
      label={t("media-side-before")}
      channels={before.channels}
      rate={before.rate}
      seconds={before.seconds}
      address={before.address}
      chosen={chosen === "before"}
      onchoose={() => (picked = "before")}
      bind:player={players.before}
    />
  {/if}
  {#if after}
    <SoundSide
      label={t("media-side-after")}
      channels={after.channels}
      rate={after.rate}
      seconds={after.seconds}
      address={after.address}
      chosen={chosen === "after"}
      onchoose={() => (picked = "after")}
      bind:player={players.after}
    />
  {/if}
</div>

<style>
  .small {
    margin: 0 12px 8px;
    font-size: var(--type-small);
  }

  .pair {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin: 0 12px 12px;
  }

  .pair.one {
    grid-template-columns: minmax(0, 1fr);
  }

  @media (max-width: 1100px) {
    .pair {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
