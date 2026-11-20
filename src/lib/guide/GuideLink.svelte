<script lang="ts">
  import { t } from "../i18n/runtime";
  import { go, here } from "../navigation/navigation.svelte";
  import { place } from "../navigation/place";

  /**
   * A page's way into the Guide (0.37.0): one button, opening one entry as a step of the trail, so Back returns. Pages with nothing
   * to show use it to say how a repository gives them something (the release audit's B1).
   */
  let { entry, words }: { entry: string; words: string } = $props();
</script>

<button
  type="button"
  class="action"
  onclick={() => go(place("guide", here().game, { entry }))}>{words}</button
>
