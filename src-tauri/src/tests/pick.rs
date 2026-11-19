use super::*;

#[test]
fn only_a_folder_or_a_file_is_picked() {
    assert_eq!(Kind::named("folder").unwrap(), Kind::Folder);
    assert_eq!(Kind::named("file").unwrap(), Kind::File);
    assert!(Kind::named("anything").is_err());
}

#[test]
fn the_picker_opens_at_the_nearest_folder_that_exists() {
    let here = std::env::temp_dir();
    let shown = here.to_string_lossy().into_owned();
    assert_eq!(start_folder(Some(&shown)), Some(here.clone()));
    // A file's folder, a folder not made yet, and a path pasted with Explorer's quotes all open where they can.
    let missing = here.join("not-made-yet").join("deeper");
    assert_eq!(start_folder(Some(&missing.to_string_lossy())), Some(here.clone()));
    assert_eq!(start_folder(Some(&format!("\"{shown}\""))), Some(here));
    assert_eq!(start_folder(None), None);
    assert_eq!(start_folder(Some("   ")), None);
}
