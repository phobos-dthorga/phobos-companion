//! Subscribing through Steam on the Mod list page (0.49.0; the owner, 22 Nov 2026: "Start step 5, subscribing through Steam"). The
//! owner's choices on question cards: **through the running Steam client, at once** (the kit borrows the game's own Steam library);
//! Subscribe beside missing mods on What's wrong and in Saved lists, a box for a Workshop link, and **Unsubscribe** in Edit the
//! list, which **asks first and switches the mods off**; a bar while Steam downloads, then an offer.
//!
//! The kit's `mod-list subscribe --apply` and `unsubscribe --apply`, each only on the owner's press and while the manifest calls it
//! `writes`. Subscribing only adds, so any well-formed Workshop number is accepted (the owner may paste one); unsubscribing deletes a
//! mod's files, so only numbers of mods the last listing or check named, after the owner's yes in the window.
//!
//! **What players say** (0.107.0; the owner's choice of 27 Nov 2026, "Workshop research on Mod list"): a mod's Workshop item read
//! by the kit's game-free `steam-workshop report` (its update date, the comments that mention problems, the uploader's latest
//! replies), keyless, on the owner's press, only for a number the last listing or check named, only while **Workshop pages** is
//! on (Going online) and while the manifest calls it `reads-online`. It only reads.
//!
//! **What players say about the game and its DLCs** (0.111.0; the owner, 27 Nov 2026: "We can still have 'what players say' for
//! the actual vanilla game itself and the DLCs, it'll just be reviews instead"): the kit's game-free `steam-reviews` (1.143.0),
//! Steam's public review counts and the game's newest reviews, keyless, on the owner's press, under the same **Workshop pages**
//! switch and only while the manifest calls it `reads-online`. The DLC is found by its name among the game's own DLC; a name that
//! matches none reads the game itself.

use crate::mod_list_page::{
    ChangeResult, TOOL, WORKSHOP, known_list, named, places, result_of, sane_text, workshop_number,
};
use companion_core::args::Args;
use companion_core::failure::Failure;
use companion_core::games::GamePlaces;
use companion_core::kit::{self, Answer, allowed_by_manifest};
use companion_core::online;
use std::collections::BTreeSet;
use std::path::Path;

const SUBSCRIBE: &str = "subscribe";
/// The kit's game-free reading of a Workshop item's page and comments (phobos-modkit `steam-workshop`).
const WORKSHOP_TOOL: &str = "steam-workshop";
const REPORT: &str = "report";
/// The going-online kind its calls belong to.
const WORKSHOP_PAGES: &str = "workshop-pages";
const UNSUBSCRIBE: &str = "unsubscribe";
/// The kit's game-free reading of a game's or a DLC's Steam reviews (phobos-modkit `steam-reviews`, 1.143.0).
const REVIEWS_TOOL: &str = "steam-reviews";
/// The most items one press subscribes to (the kit's own limit).
pub const MAX_ITEMS: usize = 500;
/// How long a subscribe waits for Steam's downloads before it answers (agent default): the bar shows how far it is meanwhile.
pub const WAIT_SECONDS: u32 = 900;

/// Several Workshop numbers: each well formed, none twice, not too many.
pub fn sane_numbers(numbers: &[String]) -> bool {
    let unique: BTreeSet<&String> = numbers.iter().collect();
    !numbers.is_empty()
        && numbers.len() <= MAX_ITEMS
        && unique.len() == numbers.len()
        && numbers.iter().all(|n| workshop_number(n))
}

pub fn subscribe_arguments(game: &GamePlaces, numbers: &[String], wait: bool) -> Vec<String> {
    let mut arguments = named(Args::new(TOOL, SUBSCRIBE), game);
    for number in numbers {
        arguments = arguments.given("--item", number);
    }
    let arguments = if wait { arguments.pair("--wait", &WAIT_SECONDS.to_string()) } else { arguments };
    arguments.flag("--apply").flag("--no-redact").json()
}

/// Subscribes through the running Steam client, at once; with `wait`, answers once Steam has downloaded them (or after
/// WAIT_SECONDS), its progress on the bar meanwhile.
pub fn subscribe(
    game: &str,
    numbers: &[String],
    wait: bool,
    listener: Option<kit::Listener>,
) -> Result<ChangeResult, Failure> {
    let found = places(game)?;
    if !sane_numbers(numbers) {
        return Err(Failure::refused("those are not Workshop numbers"));
    }
    allowed_by_manifest(&kit::read_manifest()?, TOOL, SUBSCRIBE).map_err(Failure::refused)?;
    let result = result_of(&kit::run_hearing(TOOL, &subscribe_arguments(&found, numbers, wait), listener)?);
    if let Ok(mut known) = WORKSHOP.lock() {
        known.extend(numbers.iter().cloned());
    }
    Ok(result)
}

pub fn unsubscribe_arguments(game: &GamePlaces, list: &str, numbers: &[String]) -> Vec<String> {
    let mut arguments = named(Args::new(TOOL, UNSUBSCRIBE), game).given("--list", list);
    for number in numbers {
        arguments = arguments.given("--item", number);
    }
    arguments.flag("--apply").flag("--no-redact").json()
}

/// Switches the mods off (after a backup), then unsubscribes through Steam, after the owner's yes: only mods the last listing or
/// check named.
pub fn unsubscribe(
    game: &str,
    list: &str,
    numbers: &[String],
    listener: Option<kit::Listener>,
) -> Result<ChangeResult, Failure> {
    let found = places(game)?;
    if !sane_numbers(numbers) || !sane_text(list) {
        return Err(Failure::refused("those are not Workshop numbers"));
    }
    let known = WORKSHOP.lock().map(|known| numbers.iter().all(|n| known.contains(n))).unwrap_or(false);
    if !known || !known_list(game, list) {
        return Err(Failure::refused(
            "only mods the last listing named can be unsubscribed: read the list again first",
        ));
    }
    allowed_by_manifest(&kit::read_manifest()?, TOOL, UNSUBSCRIBE).map_err(Failure::refused)?;
    Ok(result_of(&kit::run_hearing(TOOL, &unsubscribe_arguments(&found, list, numbers), listener)?))
}

/// The arguments for What players say: one Workshop number, after `--`.
pub fn players_arguments(number: &str) -> Vec<String> {
    let mut arguments = Args::new(WORKSHOP_TOOL, REPORT).json();
    arguments.extend(["--".to_owned(), number.to_owned()]);
    arguments
}

/// What players say about a mod on its Workshop page, on the owner's press: only a number this run named, only while Workshop
/// pages is on, and only while the manifest calls the report `reads-online`.
pub fn players_say(data: &Path, number: &str, listener: Option<kit::Listener>) -> Result<Answer, Failure> {
    let known = WORKSHOP.lock().map(|known| known.contains(number)).unwrap_or(false);
    if !workshop_number(number) || !known {
        return Err(Failure::refused("only a Workshop item the last listing or check named can be read"));
    }
    if !online::is_on(data, WORKSHOP_PAGES) {
        return Err(Failure::refused("Workshop pages is off in Settings, Going online, so nothing was asked of Steam"));
    }
    kit::reads_online(&kit::read_manifest()?, WORKSHOP_TOOL, REPORT).map_err(Failure::refused)?;
    Ok(Answer::of(&kit::run_hearing(WORKSHOP_TOOL, &players_arguments(number), listener)?))
}

/// The arguments for What players say about the game or one of its DLCs: the game's Steam app ID and the mod's name to match.
pub fn reviews_arguments(app_id: u32, name: &str) -> Vec<String> {
    Args::command(REVIEWS_TOOL).given("--app-id", &app_id.to_string()).given("--match", name.trim()).json()
}

/// What players say about the game, or the DLC a game mod names, on Steam, on the owner's press (0.111.0): only for a game with a
/// Steam app ID, only while Workshop pages is on, and only while the manifest calls `steam-reviews` `reads-online`.
pub fn game_reviews(data: &Path, game: &str, name: &str, listener: Option<kit::Listener>) -> Result<Answer, Failure> {
    let found = places(game)?;
    if !sane_text(name) {
        return Err(Failure::refused("that is not a mod's name"));
    }
    let Some(app_id) = found.steam_app_id else {
        return Err(Failure::refused(format!("{} has no Steam app ID in the games list", found.name)));
    };
    if !online::is_on(data, WORKSHOP_PAGES) {
        return Err(Failure::refused("Workshop pages is off in Settings, Going online, so nothing was asked of Steam"));
    }
    kit::reads_online(&kit::read_manifest()?, REVIEWS_TOOL, "").map_err(Failure::refused)?;
    Ok(Answer::of(&kit::run_hearing(REVIEWS_TOOL, &reviews_arguments(app_id, name), listener)?))
}

#[cfg(test)]
#[path = "tests/mod_list_steam.rs"]
mod tests;
