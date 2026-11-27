use super::*;

const PNG: [u8; 12] = [0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0];

fn folder(name: &str) -> PathBuf {
    let path = std::env::temp_dir().join(format!("companion-pictures-test-{name}-{}", std::process::id()));
    let _ = fs::remove_dir_all(&path);
    path
}

#[test]
fn a_name_keeps_words_and_drops_what_a_file_name_cannot_hold() {
    assert_eq!(clean_name("First Sample: Make-up 2026-11-19 18.03"), "First Sample Make-up 2026-11-19 18.03");
    assert_eq!(clean_name("..\\..\\windows/system32"), "windows system32");
    assert_eq!(clean_name("D'thorga Framework (Timeline)"), "D'thorga Framework (Timeline)");
    assert_eq!(clean_name("   "), "D'thorga Companion");
    assert_eq!(clean_name(&"x".repeat(300)).chars().count(), 100);
}

#[test]
fn a_name_comes_through_the_header_percent_encoded() {
    assert_eq!(decode_name("D'thorga%20Companion%3A%20%C3%A9t%C3%A9"), "D'thorga Companion: été");
    assert_eq!(decode_name("100%"), "100%");
    assert_eq!(decode_name("%zz"), "%zz");
}

#[test]
fn only_a_png_of_a_sensible_size_is_written() {
    assert!(check_png(&PNG).is_ok());
    assert!(check_png(b"GIF89a....").is_err());
    assert!(check_png(&[]).is_err());
}

#[test]
fn a_picture_is_saved_under_a_free_name_and_shown_only_from_the_folder() {
    let folder = folder("save");
    let first = save(&folder, "Make-up", &PNG).unwrap();
    let second = save(&folder, "Make-up", &PNG).unwrap();
    assert_eq!(first.file_name().unwrap(), "Make-up.png");
    assert_eq!(second.file_name().unwrap(), "Make-up 2.png");
    assert!(save(&folder, "Not a picture", b"hello").is_err());
    assert!(show(&folder, &std::env::temp_dir().join("elsewhere.png")).is_err());
    assert!(show(&folder, &folder.join("missing.png")).is_err());
    fs::remove_dir_all(&folder).unwrap();
}

#[test]
fn explorer_is_given_the_path_in_quotes_of_its_own_so_a_space_does_not_send_it_to_documents() {
    let path = Path::new(r"C:\Users\Sample\Google Drive\RimWorld by Ludeon Studios\Saves\PG1.rws");
    assert_eq!(
        select_argument(path),
        r#"/select,"C:\Users\Sample\Google Drive\RimWorld by Ludeon Studios\Saves\PG1.rws""#
    );
}
