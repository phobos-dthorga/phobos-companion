use super::*;

const LIST: &str = "\
# Work

| # | Item | Mod | Status |
| --- | --- | --- | --- |
| A1 | Finished thing | docs | Done: 1.0.0 |
| A2 | **Still** to do | docs | Open |
| A3 | Waiting thing | docs | Waits for a second adapter |
| A4 | Partly done | docs | Done except the last part |
| A5 | Set aside | docs | Deferred: not worth it |
| A6 | See [the record](record.md) and `code` | docs | In progress |

## No status column

| Item | Reason |
| --- | --- |
| Not counted | Because |
";

#[test]
fn keeps_only_what_is_still_open_in_order() {
    assert_eq!(parse(LIST), ["Still to do", "Waiting thing", "Partly done", "See the record and code"]);
}

#[test]
fn a_table_without_a_status_column_is_ignored() {
    assert!(parse("| Item | Reason |\n| --- | --- |\n| A | Open |\n").is_empty());
}

#[test]
fn a_table_ends_at_the_first_other_line() {
    assert!(parse("| Item | Status |\n| --- | --- |\n\n| Stray | Open |\n").is_empty());
}

#[test]
fn a_status_table_without_an_item_column_gives_nothing() {
    assert!(parse("| Name | Status |\n| --- | --- |\n| A | Open |\n").is_empty());
}

#[test]
fn an_unfinished_link_does_not_hang() {
    assert_eq!(plain("a [b"), "a [b");
    assert_eq!(plain("a [b](c"), "a [b](c");
}
