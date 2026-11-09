<script lang="ts">
  import { t } from "../i18n/runtime";
  import { failureWords } from "./presentation";
  import type { Failure } from "./types";

  let { failure, onretry }: { failure: Failure; onretry: () => void } =
    $props();

  const words = $derived(failureWords(failure.code));
</script>

<p class="problem">{t(words.happened)}</p>
<p>{t("failure-safe")}</p>
<p>{t(words.next)}</p>
<button type="button" class="action" onclick={onretry}
  >{t("action-try-again")}</button
>
<details>
  <summary>{t("failure-details")}</summary>
  <pre>{failure.code}: {failure.detail}</pre>
</details>

<style>
  .problem {
    color: var(--colour-risk);
    font-weight: 600;
  }

  p + p {
    margin-top: 6px;
  }

  button {
    margin-top: 12px;
  }

  details {
    margin-top: 12px;
    font-size: var(--type-small);
  }

  summary {
    min-height: var(--control-min);
    display: flex;
    align-items: center;
    cursor: pointer;
  }

  pre {
    margin: 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font-size: var(--type-caption);
    color: var(--colour-text-muted);
  }
</style>
