//! Keys for AI services (0.71.0; `docs/ai.md`, A2; the owner's choice of 23 Nov 2026: "keys for AI services only"). A key the person
//! adds is kept in the operating system's own key store, never in a file of ours: Windows Credential Manager, the macOS Keychain, or
//! the Secret Service on Linux. **An environment variable named by the service is read first**, so a computer with no key store
//! running still works. A key is never shown again, never logged, and never sent to the window. Nothing else is ever kept here:
//! Steam passwords stay never held.

use crate::ai::Service;
use serde::Serialize;

/// The name the keys are kept under in the key store; each key's account is `ai-<service id>`.
pub const STORE_SERVICE: &str = "D'thorga Companion";
const MIN_KEY: usize = 8;
const MAX_KEY: usize = 512;

/// Where a service's key comes from now.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(tag = "from", rename_all = "lowercase")]
pub enum KeySource {
    /// The environment variable the service names.
    Environment { variable: String },
    /// The operating system's key store.
    Store,
    /// No key yet.
    None,
}

/// A key store, passed in so tests never touch the person's own.
pub trait Secrets {
    fn get(&self, account: &str) -> Result<Option<String>, String>;
    fn set(&self, account: &str, secret: &str) -> Result<(), String>;
    fn forget(&self, account: &str) -> Result<(), String>;
    /// The store's name as a person knows it, or None when this system has none the program can use.
    fn name(&self) -> Option<&'static str>;
}

fn account(service: &Service) -> String {
    format!("ai-{}", service.id)
}

/// A key as the person typed it, trimmed, when it looks like a key: one piece of text of a sane length.
pub fn checked_key(key: &str) -> Result<String, String> {
    let key = key.trim();
    if key.len() < MIN_KEY || key.len() > MAX_KEY || key.chars().any(|c| c.is_whitespace() || c.is_control()) {
        return Err("a key is one piece of text, without spaces, as the service gave it".to_owned());
    }
    Ok(key.to_owned())
}

/// The service's key and where it came from: its environment variable first, then the key store.
pub fn find(
    service: &Service,
    environment: &dyn Fn(&str) -> Option<String>,
    secrets: &dyn Secrets,
) -> (Option<String>, KeySource) {
    let Some(variable) = service.key_variable.as_deref() else {
        return (None, KeySource::None);
    };
    if let Some(key) = environment(variable).map(|k| k.trim().to_owned()).filter(|k| !k.is_empty()) {
        return (Some(key), KeySource::Environment { variable: variable.to_owned() });
    }
    match secrets.get(&account(service)) {
        Ok(Some(key)) if !key.is_empty() => (Some(key), KeySource::Store),
        _ => (None, KeySource::None),
    }
}

/// Keeps a key the person typed for a service that takes one.
pub fn keep(service: &Service, key: &str, secrets: &dyn Secrets) -> Result<(), String> {
    if service.key_variable.is_none() {
        return Err(format!("{} runs on this computer and needs no key", service.name));
    }
    if secrets.name().is_none() {
        return Err(
            "this computer has no key store the program can use; set the service's environment variable instead".into(),
        );
    }
    secrets.set(&account(service), &checked_key(key)?)
}

/// Forgets a service's kept key; forgetting one never kept is not an error.
pub fn forget(service: &Service, secrets: &dyn Secrets) -> Result<(), String> {
    secrets.forget(&account(service))
}

/// The operating system's own key store.
pub struct SystemSecrets;

#[cfg(windows)]
fn store() -> Result<std::sync::Arc<keyring_core::CredentialStore>, String> {
    let store: std::sync::Arc<keyring_core::CredentialStore> =
        windows_native_keyring_store::Store::new().map_err(|e| e.to_string())?;
    Ok(store)
}

#[cfg(target_os = "macos")]
fn store() -> Result<std::sync::Arc<keyring_core::CredentialStore>, String> {
    let store: std::sync::Arc<keyring_core::CredentialStore> =
        apple_native_keyring_store::keychain::Store::new().map_err(|e| e.to_string())?;
    Ok(store)
}

#[cfg(target_os = "linux")]
fn store() -> Result<std::sync::Arc<keyring_core::CredentialStore>, String> {
    let store: std::sync::Arc<keyring_core::CredentialStore> =
        zbus_secret_service_keyring_store::Store::new().map_err(|e| e.to_string())?;
    Ok(store)
}

#[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
fn store() -> Result<std::sync::Arc<keyring_core::CredentialStore>, String> {
    Err("this system has no key store the program knows".to_owned())
}

fn entry(account: &str) -> Result<keyring_core::Entry, String> {
    keyring_core::Entry::new_in_store(&store()?, STORE_SERVICE, account).map_err(|e| e.to_string())
}

impl Secrets for SystemSecrets {
    fn get(&self, account: &str) -> Result<Option<String>, String> {
        match entry(account)?.get_password() {
            Ok(key) => Ok(Some(key)),
            Err(keyring_core::Error::NoEntry) => Ok(None),
            Err(problem) => Err(problem.to_string()),
        }
    }

    fn set(&self, account: &str, secret: &str) -> Result<(), String> {
        entry(account)?.set_password(secret).map_err(|e| e.to_string())
    }

    fn forget(&self, account: &str) -> Result<(), String> {
        match entry(account)?.delete_credential() {
            Ok(()) | Err(keyring_core::Error::NoEntry) => Ok(()),
            Err(problem) => Err(problem.to_string()),
        }
    }

    fn name(&self) -> Option<&'static str> {
        store().ok()?;
        if cfg!(windows) {
            Some("Windows Credential Manager")
        } else if cfg!(target_os = "macos") {
            Some("the macOS Keychain")
        } else if cfg!(target_os = "linux") {
            Some("your desktop's keyring (Secret Service)")
        } else {
            None
        }
    }
}

#[cfg(test)]
#[path = "tests/ai_keys.rs"]
mod tests;
