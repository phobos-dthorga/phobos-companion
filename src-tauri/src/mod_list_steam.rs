//! Subscribing through Steam on the Mod list page (0.49.0; the owner, 22 Nov 2026: "Start step 5, subscribing through Steam"). The
//! owner's choices on question cards: **through the running Steam client, at once** (the kit borrows the game's own Steam library);
//! Subscribe beside missing mods on What's wrong and in Saved lists, a box for a Workshop link, and **Unsubscribe** in Edit the
//! list, which **asks first and switches the mods off**; a bar while Steam downloads, then an offer.
//!
//! The kit's `mod-list subscribe --apply` and `unsubscribe --apply`, each only on the owner's press and while the manifest calls it
//! `writes`. Subscribing only adds, so any well-formed Workshop number is accepted (the owner may paste one); unsubscribing deletes a
//! mod's files, so only numbers of mods the last listing or check named, after the owner's yes in the window.

use crate::mod_list_page::{
    ChangeResult, TOOL, WORKSHOP, known_list, named, places, result_of, sane_text, workshop_number,
};
use companion_core::args::Args;
use companion_core::failure::Failure;
use companion_core::games::GamePlaces;
use companion_core::kit::{self, allowed_by_manifest};
use std::collections::BTreeSet;

const SUBSCRIBE: &str = "subscribe";
const UNSUBSCRIBE: &str = "unsubscribe";
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

#[cfg(test)]
#[path = "tests/mod_list_steam.rs"]
mod tests;
