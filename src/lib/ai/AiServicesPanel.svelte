<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../i18n/runtime";
  import { goTab } from "../navigation/navigation.svelte";
  import FailurePanel from "../shell/FailurePanel.svelte";
  import type { Failure } from "../shell/types";
  import {
    chooseAiLength,
    chooseAiTools,
    chooseAiModel,
    chooseAiService,
    forgetAiKey,
    keepAiKey,
    readAiModels,
    readAiStatus,
  } from "./desktopClient";
  import { ai, useAi } from "./state.svelte";
  import type { AiKind, AiLength, AiServiceStatus, AiStatus } from "./types";

  /**
   * Settings → AI, AI services (0.71.0; `docs/ai.md`, A2; the owner's choices of 23 Nov 2026): which service and model answer
   * help on pages, the service's key, and how long an answer may be. The host keeps every choice; a key goes to the system's key
   * store and never comes back to the window. An online service also needs AI services on in Going online, which starts off.
   *
   * Since 0.115.0 (`docs/ai.md`, A4; the owner's choices of 28 Nov 2026) the services are listed in three groups: on this
   * computer, programs the person logs in to (Claude Code, Codex, Gemini CLI: no key, nothing charged per question), and those
   * charged per use, last. A program says whether it is here, and Read the models also asks it whether the person is logged in.
   */
  const GROUPS: { kind: AiKind; title: string; body: string }[] = [
    {
      kind: "local",
      title: "ai-services-group-local",
      body: "ai-services-group-local-body",
    },
    {
      kind: "program",
      title: "ai-services-group-program",
      body: "ai-services-group-program-body",
    },
    {
      kind: "key",
      title: "ai-services-group-key",
      body: "ai-services-group-key-body",
    },
  ];
  const LENGTHS: { length: AiLength; key: string }[] = [
    { length: "short", key: "ai-services-length-short" },
    { length: "medium", key: "ai-services-length-medium" },
    { length: "long", key: "ai-services-length-long" },
  ];

  let unread = $state<Failure | null>(null);
  let browser = $state(false);
  let busy = $state(false);
  let said = $state<{ ok: boolean; words: string } | null>(null);
  let typedKey = $state("");
  let models = $state<{ service: string; list: string[] } | null>(null);
  let readingModels = $state(false);

  const chosen = $derived<AiServiceStatus | null>(
    ai.status?.services.find((s) => s.id === ai.status?.chosen) ?? null,
  );

  async function load() {
    unread = null;
    const answer = await readAiStatus();
    if (answer.state === "ready") useAi(answer.status);
    else if (answer.state === "failed") unread = answer.failure;
    else if (answer.state === "browser") browser = true;
  }

  /** Runs one change through the host, keeping the status it answers with, and says what happened. */
  async function change(
    work: () => Promise<
      | { state: "ready"; status: AiStatus }
      | { state: "failed"; failure: Failure }
    >,
    told: (status: AiStatus) => string,
  ) {
    busy = true;
    said = null;
    const answer = await work();
    busy = false;
    if (answer.state === "ready") {
      useAi(answer.status);
      said = { ok: true, words: told(answer.status) };
    } else {
      said = {
        ok: false,
        words: t("ai-services-failed", { reason: answer.failure.detail }),
      };
    }
  }

  /** Where a service is, under its name on its button. */
  function whereWords(service: AiServiceStatus): string {
    if (service.kind === "local") return t("ai-services-local");
    if (service.kind === "key") return t("ai-services-online");
    const here = service.found
      ? t("ai-services-program")
      : t("ai-services-program-missing");
    return service.tried ? here : t("ai-services-untried", { where: here });
  }

  /** What a program's own login check said, or that Read the models will ask it. */
  function loginWords(service: AiServiceStatus): string {
    const login = service.login;
    if (!login) return t("ai-services-login-unread", { service: service.name });
    if (!login.loggedIn)
      return t("ai-services-login-out", {
        service: service.name,
        get: service.get ?? "",
      });
    if (login.how === "key")
      return t("ai-services-login-key", { service: service.name });
    if (login.how === "plan")
      return login.plan
        ? t("ai-services-login-plan", {
            service: service.name,
            plan: login.plan,
          })
        : t("ai-services-login-plan-unnamed", { service: service.name });
    return t("ai-services-login-unknown", { service: service.name });
  }

  /** A model's name as the person reads it: a program's own choice in words. */
  function modelWords(service: AiServiceStatus, model: string): string {
    return service.kind === "program" && model === "default"
      ? t("ai-services-model-default")
      : model;
  }

  function keyWords(service: AiServiceStatus, store: string | null): string {
    if (service.key.from === "environment")
      return t("ai-services-key-environment", {
        variable: service.key.variable,
      });
    if (service.key.from === "store")
      return t("ai-services-key-store", { store: store ?? "" });
    return t("ai-services-key-none");
  }

  async function keepKey(service: AiServiceStatus) {
    const key = typedKey;
    typedKey = "";
    await change(
      () => keepAiKey(service.id, key),
      (status) =>
        t("ai-services-key-kept", {
          service: service.name,
          store: status.keyStore ?? "",
        }),
    );
  }

  async function showModels(service: AiServiceStatus) {
    readingModels = true;
    said = null;
    const answer = await readAiModels(service.id);
    readingModels = false;
    // A program's login check ran with it: read the status again to show what it said.
    if (service.kind === "program") await load();
    if (answer.state === "ready") {
      models = { service: service.id, list: answer.models };
      said = {
        ok: true,
        words: t("ai-services-models-read", {
          count: answer.models.length,
          service: service.name,
        }),
      };
    } else {
      said = {
        ok: false,
        words: t("ai-services-failed", { reason: answer.failure.detail }),
      };
    }
  }

  onMount(load);
</script>

<section
  id="settings-ai-services"
  class="ai-services"
  aria-labelledby="ai-services-title"
>
  <h2 id="ai-services-title">{t("ai-services-title")}</h2>
  <p class="small">{t("ai-services-body")}</p>

  {#if browser}
    <p class="muted small">{t("ai-services-browser")}</p>
  {:else if unread}
    <FailurePanel failure={unread} onretry={load} />
  {:else if ai.status}
    {@const status = ai.status}
    {#each GROUPS as group (group.kind)}
      {@const listed = status.services.filter((s) => s.kind === group.kind)}
      {#if listed.length > 0}
        <h3 id={`ai-services-group-${group.kind}`}>{t(group.title)}</h3>
        <p class="small">{t(group.body)}</p>
        <div
          class="toggles services"
          role="group"
          aria-labelledby={`ai-services-group-${group.kind}`}
        >
          {#each listed as service (service.id)}
            <button
              type="button"
              class="toggle"
              aria-pressed={status.chosen === service.id}
              disabled={busy}
              onclick={() =>
                void change(
                  () => chooseAiService(service.id),
                  () => t("ai-services-chosen", { service: service.name }),
                )}
              >{service.name}
              <span class="where">{whereWords(service)}</span></button
            >
          {/each}
        </div>
      {/if}
    {/each}

    {#if chosen}
      <h3 id="ai-services-chosen-title">{chosen.name}</h3>
      <p class="small">
        {chosen.kind === "local"
          ? t("ai-services-local-body", { service: chosen.name })
          : chosen.kind === "program"
            ? t("ai-services-program-body", { service: chosen.name })
            : t("ai-services-online-body", { service: chosen.name })}
      </p>

      {#if chosen.kind === "program"}
        {#if !chosen.found}
          <p class="refused-line small">
            {t("ai-services-program-not-found", {
              service: chosen.name,
              get: chosen.get ?? "",
            })}
          </p>
        {/if}
        {#if !chosen.tried}
          <p class="small">
            {t("ai-services-program-untried-body", { service: chosen.name })}
          </p>
        {/if}
        <p class="small now">{loginWords(chosen)}</p>
      {/if}

      {#if !chosen.local && !status.onlineOn}
        <p class="refused-line small">{t("ai-services-switch-off")}</p>
        <button type="button" class="action" onclick={() => goTab("online")}
          >{t("ai-services-open-online")}</button
        >
      {/if}

      {#if chosen.needsKey}
        <h3 id="ai-services-key-title">{t("ai-services-key-title")}</h3>
        <p class="small now">{keyWords(chosen, status.keyStore)}</p>
        {#if status.keyStore}
          <form
            class="key"
            onsubmit={(event) => {
              event.preventDefault();
              void keepKey(chosen);
            }}
          >
            <label for="ai-services-key"
              >{t("ai-services-key-label", { service: chosen.name })}</label
            >
            <input
              id="ai-services-key"
              type="password"
              autocomplete="off"
              spellcheck="false"
              bind:value={typedKey}
            />
            <button
              type="submit"
              class="action"
              disabled={busy || typedKey.trim() === ""}
              >{t("ai-services-key-keep")}</button
            >
          </form>
          {#if chosen.key.from === "store"}
            <button
              type="button"
              class="action"
              disabled={busy}
              onclick={() =>
                void change(
                  () => forgetAiKey(chosen.id),
                  () =>
                    t("ai-services-key-forgotten", { service: chosen.name }),
                )}>{t("ai-services-key-forget")}</button
            >
          {/if}
        {:else}
          <p class="small">{t("ai-services-no-store")}</p>
        {/if}
      {/if}

      <h3 id="ai-services-model-title">{t("ai-services-model-title")}</h3>
      <p class="small now">
        {chosen.model
          ? t("ai-services-model-now", {
              model: modelWords(chosen, chosen.model),
            })
          : t("ai-services-model-none")}
      </p>
      <button
        type="button"
        class="action"
        disabled={readingModels ||
          busy ||
          (chosen.kind === "program" && !chosen.found)}
        onclick={() => void showModels(chosen)}
        >{readingModels
          ? t("ai-services-models-reading")
          : chosen.kind === "program"
            ? t("ai-services-models-read-program")
            : t("ai-services-models-read-button")}</button
      >
      {#if models && models.service === chosen.id && models.list.length > 0}
        <label class="model" for="ai-services-model"
          >{t("ai-services-model-label")}</label
        >
        <select
          id="ai-services-model"
          disabled={busy}
          value={chosen.model ?? ""}
          onchange={(event) => {
            const model = event.currentTarget.value;
            if (model)
              void change(
                () => chooseAiModel(chosen.id, model),
                () =>
                  t("ai-services-model-chosen", {
                    model: modelWords(chosen, model),
                  }),
              );
          }}
        >
          <option value="" disabled>{t("ai-services-model-pick")}</option>
          {#each models.list as model (model)}
            <option value={model}>{modelWords(chosen, model)}</option>
          {/each}
        </select>
      {/if}
    {/if}

    <h3 id="ai-services-length-title">{t("ai-services-length-title")}</h3>
    <div
      class="toggles"
      role="group"
      aria-labelledby="ai-services-length-title"
    >
      {#each LENGTHS as option (option.length)}
        <button
          type="button"
          class="toggle"
          aria-pressed={status.length === option.length}
          disabled={busy}
          onclick={() =>
            void change(
              () => chooseAiLength(option.length),
              () => t("ai-services-length-kept", { length: t(option.key) }),
            )}>{t(option.key)}</button
        >
      {/each}
    </div>

    <h3 id="ai-services-tools-title">{t("ai-services-tools-title")}</h3>
    <p class="small">{t("ai-services-tools-body")}</p>
    <div class="toggles" role="group" aria-labelledby="ai-services-tools-title">
      {#each [true, false] as on (on)}
        <button
          type="button"
          class="toggle"
          aria-pressed={status.tools === on}
          disabled={busy}
          onclick={() =>
            void change(
              () => chooseAiTools(on),
              () =>
                on
                  ? t("ai-services-tools-kept-on")
                  : t("ai-services-tools-kept-off"),
            )}
          >{on ? t("ai-services-tools-on") : t("ai-services-tools-off")}</button
        >
      {/each}
    </div>

    <p class="small now ready">
      {status.ready ? t("ai-services-ready") : t("ai-services-not-ready")}
    </p>
    <p class="muted small">
      {t("ai-services-month", {
        answers: status.month.answers,
        sent: status.month.inputTokens,
        received: status.month.outputTokens,
      })}
    </p>
  {/if}

  <div aria-live="polite">
    {#if said}
      <p class={said.ok ? "told" : "told refused"} role="status">
        {said.words}
      </p>
    {/if}
  </div>
</section>

<style>
  .ai-services {
    margin-bottom: 20px;
    padding: 16px 20px;
    background: var(--colour-surface-raised);
    border: 1px solid var(--colour-line);
    border-radius: 4px;
  }

  h2 {
    margin-bottom: 6px;
    font-family: var(--font-display);
    font-size: 1.25rem;
    font-weight: 600;
  }

  h3 {
    margin: 16px 0 4px;
    font-size: 1rem;
    font-weight: 600;
  }

  .services {
    flex-wrap: wrap;
  }

  .where {
    display: block;
    font-size: var(--type-small);
    font-weight: 400;
  }

  .now {
    font-weight: 600;
  }

  .key {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    margin: 6px 0;
  }

  .key input {
    min-width: 0;
    flex: 1 1 16rem;
    min-height: 44px;
  }

  .model {
    display: block;
    margin-top: 8px;
  }

  select {
    max-width: 100%;
    min-height: 44px;
  }

  .refused-line {
    padding-inline-start: 8px;
    border-inline-start: 3px solid var(--colour-risk);
    overflow-wrap: anywhere;
  }

  .told {
    margin-top: 10px;
    padding: 6px 10px;
    border: 1px solid var(--colour-success);
    border-radius: 4px;
    overflow-wrap: anywhere;
  }

  .told.refused {
    border-color: var(--colour-risk);
  }
</style>
