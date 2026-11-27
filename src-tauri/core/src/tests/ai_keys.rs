use super::*;
use crate::ai::{Api, Service};
use std::cell::RefCell;
use std::collections::BTreeMap;

/// A key store of the test's own: the person's real one is never touched.
#[derive(Default)]
struct Kept(RefCell<BTreeMap<String, String>>, bool);

impl Secrets for Kept {
    fn get(&self, account: &str) -> Result<Option<String>, String> {
        Ok(self.0.borrow().get(account).cloned())
    }
    fn set(&self, account: &str, secret: &str) -> Result<(), String> {
        self.0.borrow_mut().insert(account.into(), secret.into());
        Ok(())
    }
    fn forget(&self, account: &str) -> Result<(), String> {
        self.0.borrow_mut().remove(account);
        Ok(())
    }
    fn name(&self) -> Option<&'static str> {
        (!self.1).then_some("Sample Store")
    }
}

fn online() -> Service {
    Service {
        id: "sample".into(),
        name: "Sample".into(),
        api: Api::Openai,
        address: "https://example.invalid/v1".into(),
        key_variable: Some("SAMPLE_API_KEY".into()),
        stream_usage: false,
        program: None,
    }
}

fn none(_: &str) -> Option<String> {
    None
}

#[test]
fn the_environment_variable_comes_before_the_store() {
    let store = Kept::default();
    keep(&online(), "kept-key-1234", &store).unwrap();
    assert_eq!(find(&online(), &none, &store), (Some("kept-key-1234".into()), KeySource::Store));
    let env = |name: &str| (name == "SAMPLE_API_KEY").then(|| " env-key-1234 ".to_owned());
    assert_eq!(
        find(&online(), &env, &store),
        (Some("env-key-1234".into()), KeySource::Environment { variable: "SAMPLE_API_KEY".into() })
    );
}

#[test]
fn keys_are_kept_under_the_service_and_forgotten() {
    let store = Kept::default();
    keep(&online(), "  kept-key-1234 ", &store).unwrap();
    assert_eq!(store.0.borrow().get("ai-sample").map(String::as_str), Some("kept-key-1234"));
    forget(&online(), &store).unwrap();
    forget(&online(), &store).unwrap();
    assert_eq!(find(&online(), &none, &store), (None, KeySource::None));
}

#[test]
fn odd_keys_local_services_and_computers_without_a_store_are_refused() {
    let store = Kept::default();
    assert!(keep(&online(), "short", &store).is_err());
    assert!(keep(&online(), "has a space in it", &store).is_err());
    let mut local = online();
    local.key_variable = None;
    assert!(keep(&local, "kept-key-1234", &store).is_err());
    assert_eq!(find(&local, &none, &store), (None, KeySource::None));
    let no_store = Kept(RefCell::default(), true);
    assert!(keep(&online(), "kept-key-1234", &no_store).is_err());
    assert!(store.0.borrow().is_empty());
}
