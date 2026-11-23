import {
  ask,
  BROWSER,
  inBrowser,
  progressChannel,
} from "../shell/desktopClient";
import type { OnProgress } from "../shell/progress";
import type { Failed } from "../shell/types";
import type {
  Card,
  PageText,
  PressResult,
  PublishReading,
  Sender,
  UploadKind,
} from "./types";

/**
 * The Publish page's requests (0.69.0). The host checks the game, the repository, the mod and the kit's manifest before each; an
 * upload runs only while the manifest calls it the owner's to press and the Workshop uploads setting is on.
 */
type Ready<T> = { state: "ready"; value: T };
const ready = <T>(value: T): Ready<T> => ({ state: "ready", value });

/** Every repository of the game that keeps a Workshop catalogue. Only reads. */
export async function readPublishing(
  game: string,
): Promise<Ready<PublishReading> | Failed | typeof BROWSER> {
  if (inBrowser()) return BROWSER;
  return ask<PublishReading, Ready<PublishReading>>(
    "publish_read",
    { game },
    ready,
  );
}

/** How many versions wait for an upload, for Home's note. Only reads. */
export async function readWaiting(
  game: string,
): Promise<Ready<{ waiting: number; mods: string[] }> | Failed> {
  return ask(
    "publish_waiting",
    { game },
    ready<{ waiting: number; mods: string[] }>,
  );
}

/** One mod's card. Only reads. */
export async function readCard(
  game: string,
  repository: string,
  modName: string,
): Promise<Ready<Card> | Failed> {
  return ask<Card, Ready<Card>>(
    "publish_show",
    { game, repository, modName },
    ready,
  );
}

/** A mod's Workshop page as text, with its problems. Only reads. */
export async function readPage(
  game: string,
  repository: string,
  modName: string,
): Promise<Ready<PageText> | Failed> {
  return ask<PageText, Ready<PageText>>(
    "publish_page_text",
    { game, repository, modName },
    ready,
  );
}

/** Checks a text without writing anything. */
export async function checkPage(
  game: string,
  repository: string,
  modName: string,
  text: string,
): Promise<Ready<PageText> | Failed> {
  return ask<PageText, Ready<PageText>>(
    "publish_check_page",
    { game, repository, modName, text },
    ready,
  );
}

/** Saves the page on the owner's press; the kit refuses a text with problems. */
export async function savePage(
  game: string,
  repository: string,
  modName: string,
  text: string,
): Promise<Ready<PressResult> | Failed> {
  return ask<PressResult, Ready<PressResult>>(
    "publish_save_page",
    { game, repository, modName, text },
    ready,
  );
}

/** Writes the release notes and stages a checked candidate, offline. */
export async function prepareMod(
  game: string,
  repository: string,
  modName: string,
  build: boolean,
  onProgress?: OnProgress,
): Promise<Ready<PressResult> | Failed> {
  return ask<PressResult, Ready<PressResult>>(
    "publish_prepare",
    {
      game,
      repository,
      modName,
      build,
      onProgress: progressChannel(onProgress),
    },
    ready,
  );
}

/** Sends a mod to the Workshop: only after the owner's press and yes. */
export async function uploadMod(
  game: string,
  repository: string,
  modName: string,
  kind: UploadKind,
  via: Sender,
  onProgress?: OnProgress,
): Promise<Ready<PressResult> | Failed> {
  return ask<PressResult, Ready<PressResult>>(
    "publish_upload",
    {
      game,
      repository,
      modName,
      kind,
      via,
      onProgress: progressChannel(onProgress),
    },
    ready,
  );
}

/** Updates every item with a newer version, dependencies first: only after the owner's press and yes. */
export async function updateAll(
  game: string,
  repository: string,
  via: Sender,
  onProgress?: OnProgress,
): Promise<Ready<PressResult> | Failed> {
  return ask<PressResult, Ready<PressResult>>(
    "publish_update_all",
    { game, repository, via, onProgress: progressChannel(onProgress) },
    ready,
  );
}

/** Reads each item back from Steam's public pages and writes what they show. */
export async function pullFromSteam(
  game: string,
  repository: string,
  onProgress?: OnProgress,
): Promise<Ready<PressResult> | Failed> {
  return ask<PressResult, Ready<PressResult>>(
    "publish_pull",
    { game, repository, onProgress: progressChannel(onProgress) },
    ready,
  );
}

/** Opens an item the last card named in the Steam client. */
export async function openItem(
  number: string,
): Promise<{ state: "ready" } | Failed> {
  return ask<null, { state: "ready" }>(
    "publish_open_in_steam",
    { number },
    () => ({
      state: "ready",
    }),
  );
}

/** The Workshop uploads setting: on unless the owner switched it off. */
export async function readUploadsSetting(): Promise<
  Ready<boolean> | Failed | typeof BROWSER
> {
  if (inBrowser()) return BROWSER;
  return ask<boolean, Ready<boolean>>("publish_uploads_setting", {}, ready);
}

/** Keeps the owner's choice. */
export async function chooseUploads(
  on: boolean,
): Promise<Ready<boolean> | Failed> {
  return ask<boolean, Ready<boolean>>("publish_choose_uploads", { on }, ready);
}
