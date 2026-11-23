use super::*;
use crate::ai_keys::{KeySource, Secrets};
use std::env;
use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicUsize, Ordering};

static NEXT: AtomicUsize = AtomicUsize::new(0);

fn scratch() -> PathBuf {
    let folder =
        env::temp_dir().join(format!("companion-ai-{}-{}", std::process::id(), NEXT.fetch_add(1, Ordering::SeqCst)));
    fs::create_dir_all(&folder).unwrap();
    folder
}

/// A key store with nothing in it: the person's own is never touched.
struct Empty;

impl Secrets for Empty {
    fn get(&self, _: &str) -> Result<Option<String>, String> {
        Ok(None)
    }
    fn set(&self, _: &str, _: &str) -> Result<(), String> {
        Ok(())
    }
    fn forget(&self, _: &str) -> Result<(), String> {
        Ok(())
    }
    fn name(&self) -> Option<&'static str> {
        Some("Sample Store")
    }
}

fn no_environment(_: &str) -> Option<String> {
    None
}

#[test]
fn the_shipped_services_are_all_usable_local_ones_first() {
    let found = checked_services(SERVICES).unwrap();
    assert_eq!(found.len(), services().len());
    assert!(found.len() >= 5);
    assert!(found[0].local() && found[1].local());
    assert!(found.iter().filter(|s| !s.local()).all(|s| s.address.starts_with("https://") && s.key_variable.is_some()));
    assert_eq!(found.iter().find(|s| s.id == "anthropic").unwrap().api, Api::Anthropic);
}

#[test]
fn a_service_file_that_breaks_the_rules_is_refused() {
    let one = |service: &str| format!("{{\"services\": [{service}]}}");
    assert!(
        checked_services(&one(
            r#"{"id":"x","name":"X","api":"openai","address":"http://example.com/v1","keyVariable":"X_KEY"}"#
        ))
        .is_err()
    );
    assert!(
        checked_services(&one(
            r#"{"id":"x","name":"X","api":"openai","address":"https://example.com/v1","keyVariable":null}"#
        ))
        .is_err()
    );
    assert!(
        checked_services(&one(
            r#"{"id":"x","name":"X","api":"openai","address":"http://localhost:1/v1","keyVariable":"X_KEY"}"#
        ))
        .is_err()
    );
    assert!(
        checked_services(&one(
            r#"{"id":"X Y","name":"X","api":"openai","address":"http://localhost:1/v1","keyVariable":null}"#
        ))
        .is_err()
    );
    assert!(
        checked_services(&one(
            r#"{"id":"x","name":"X","api":"other","address":"http://localhost:1/v1","keyVariable":null}"#
        ))
        .is_err()
    );
    assert!(
        checked_services(&one(
            r#"{"id":"x","name":"X","api":"openai","address":"http://localhost:1/v1","keyVariable":null}"#
        ))
        .is_ok()
    );
}

#[test]
fn loopback_is_only_this_computer() {
    for local in
        ["http://127.0.0.1:11434/v1", "http://localhost:1234/v1", "http://[::1]:8080/v1", "http://LOCALHOST/v1"]
    {
        assert!(is_loopback(local), "{local}");
    }
    for elsewhere in [
        "https://api.openai.com/v1",
        "http://127.0.0.1.example.com/v1",
        "http://localhost.example.com:80/v1",
        "http://example.com/127.0.0.1",
        "file://localhost/x",
        "localhost:1234",
    ] {
        assert!(!is_loopback(elsewhere), "{elsewhere}");
    }
}

#[test]
fn nothing_is_ready_until_a_service_and_model_are_chosen() {
    let data = scratch();
    let status = status_with(&data, &no_environment, &Empty);
    assert_eq!((status.chosen.as_deref(), status.ready, status.online_on), (None, false, false));
    assert_eq!(status.key_store.as_deref(), Some("Sample Store"));
    assert!(ready(&data).is_err());
    choose_service(&data, "ollama").unwrap();
    assert!(!status_with(&data, &no_environment, &Empty).ready);
    choose_model(&data, "ollama", " llama3.2 ").unwrap();
    let status = status_with(&data, &no_environment, &Empty);
    assert!(status.ready, "a model on this computer needs no key and no switch");
    assert_eq!(status.services.iter().find(|s| s.id == "ollama").unwrap().model.as_deref(), Some("llama3.2"));
    fs::remove_dir_all(&data).unwrap();
}

#[test]
fn an_online_service_waits_for_its_switch_and_its_key() {
    let data = scratch();
    choose_service(&data, "anthropic").unwrap();
    choose_model(&data, "anthropic", "sample-model").unwrap();
    let with_key = |name: &str| (name == "ANTHROPIC_API_KEY").then(|| "sample-key-1234".to_owned());
    assert!(!status_with(&data, &with_key, &Empty).ready, "AI services starts off");
    let claude = service("anthropic").unwrap();
    assert!(allowed(&data, claude, Some("k")).unwrap_err().detail.contains("Going online"));
    online::choose(&data, ONLINE_KIND, true).unwrap();
    assert!(allowed(&data, claude, None).unwrap_err().detail.contains("no key"));
    assert!(allowed(&data, claude, Some("k")).is_ok());
    let status = status_with(&data, &with_key, &Empty);
    assert!(status.ready);
    assert_eq!(
        status.services.iter().find(|s| s.id == "anthropic").unwrap().key,
        KeySource::Environment { variable: "ANTHROPIC_API_KEY".into() }
    );
    assert!(!status_with(&data, &no_environment, &Empty).ready);
    fs::remove_dir_all(&data).unwrap();
}

#[test]
fn choices_are_checked_and_kept() {
    let data = scratch();
    assert!(choose_service(&data, "telemetry").is_err());
    assert!(choose_model(&data, "ollama", "two\nlines").is_err());
    assert!(choose_model(&data, "ollama", "").is_err());
    assert!(!data.join(CHOICES).exists());
    choose_length(&data, Length::Long).unwrap();
    assert_eq!(status_with(&data, &no_environment, &Empty).length, Length::Long);
    assert_eq!((Length::Short.max_tokens(), Length::Long.words()), (4_000, "under 800 words"));
    fs::remove_dir_all(&data).unwrap();
}

#[test]
fn the_months_count_adds_only_that_month() {
    let data = scratch();
    record_usage(&data, "ollama", "llama3.2", "explain-fault", Some(100), Some(20)).unwrap();
    record_usage(&data, "ollama", "llama3.2", "explain-fault", None, None).unwrap();
    let mut file = fs::OpenOptions::new().append(true).open(data.join(USAGE)).unwrap();
    writeln!(file, "{{\"time\":\"1999-01-01T00:00:00Z\",\"input\":5000,\"output\":5000}}").unwrap();
    writeln!(file, "not json").unwrap();
    let month = month_of(&data, &time::now_utc()[..7]);
    assert_eq!((month.answers, month.input_tokens, month.output_tokens), (2, 100, 20));
    fs::remove_dir_all(&data).unwrap();
}
