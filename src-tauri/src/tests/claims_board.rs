use super::*;

#[test]
fn the_board_is_read_as_json() {
    assert_eq!(arguments(), ["claims", "list", "--json"]);
}
