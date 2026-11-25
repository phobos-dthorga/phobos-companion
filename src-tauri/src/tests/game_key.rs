use super::*;

#[test]
fn the_key_is_named_as_the_plugin_reads_it_and_never_one_the_game_uses_alone() {
    assert_eq!(plugin_key("Ctrl+Alt+m").unwrap(), "Ctrl+Alt+M");
    assert_eq!(plugin_key("Alt+Shift+9").unwrap(), "Alt+Shift+9");
    // A key alone, or held only with Shift, would be taken from the game.
    for bad in ["m", "Shift+m", "", "Ctrl+Alt+", "Ctrl+Alt+F1", "Ctrl+Win+m", "Ctrl+Alt+mm"] {
        assert!(plugin_key(bad).is_err(), "{bad}");
    }
}
