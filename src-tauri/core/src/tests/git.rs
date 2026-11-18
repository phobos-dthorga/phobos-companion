use super::*;
use std::env;
use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicUsize, Ordering};

static NEXT: AtomicUsize = AtomicUsize::new(0);

/// A real repository in the temp folder, removed afterwards even though git makes its objects read-only.
struct TempRepository(PathBuf);

impl TempRepository {
    fn new() -> Self {
        let path = env::temp_dir().join(format!(
            "phobos-companion-test-{}-{}",
            std::process::id(),
            NEXT.fetch_add(1, Ordering::Relaxed)
        ));
        fs::create_dir_all(&path).unwrap();
        let repository = Self(path);
        repository.run(&["-c", "core.fsmonitor=false", "init", "-q"]);
        repository.run(&["config", "core.fsmonitor", "false"]);
        repository.run(&["config", "user.name", "Test"]);
        repository.run(&["config", "user.email", "test@example.invalid"]);
        repository
    }

    fn run(&self, args: &[&str]) {
        let done = Command::new("git").arg("-C").arg(&self.0).args(args).output().unwrap();
        assert!(done.status.success(), "{}", String::from_utf8_lossy(&done.stderr));
    }

    fn commit(&self, file: &str, subject: &str) {
        fs::write(self.0.join(file), subject).unwrap();
        self.run(&["add", file]);
        self.run(&["commit", "-q", "-m", subject]);
    }
}

fn make_writable(path: &Path) {
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let entry_path = entry.path();
            if entry_path.is_dir() {
                make_writable(&entry_path);
            } else if let Ok(metadata) = fs::metadata(&entry_path) {
                let mut permissions = metadata.permissions();
                #[allow(clippy::permissions_set_readonly_false)]
                permissions.set_readonly(false);
                let _ = fs::set_permissions(&entry_path, permissions);
            }
        }
    }
}

impl Drop for TempRepository {
    fn drop(&mut self) {
        make_writable(&self.0);
        let _ = fs::remove_dir_all(&self.0);
    }
}

#[test]
fn parses_git_log_records() {
    let text = "abc123\u{1f}1700000000\u{1f}First: with a colon\u{1e}\ndef456\u{1f}1600000000\u{1f}Second\u{1e}\n";
    let commits = parse_log(text);
    assert_eq!(commits.len(), 2);
    assert_eq!(
        commits[0],
        Commit { hash: "abc123".to_owned(), unix: 1_700_000_000, subject: "First: with a colon".to_owned() }
    );
}

#[test]
fn skips_a_damaged_record() {
    assert!(parse_log("abc\u{1f}not-a-number\u{1f}Subject\u{1e}").is_empty());
}

#[test]
fn reads_a_real_repository_newest_first() {
    let repository = TempRepository::new();
    repository.commit("a.txt", "The first change");
    repository.commit("b.txt", "The second change");
    let reading = read(&repository.0, 5).unwrap();
    assert_eq!(reading.commits.len(), 2);
    assert_eq!(reading.commits[0].subject, "The second change");
    assert_eq!(reading.uncommitted, 0);
}

#[test]
fn respects_the_limit() {
    let repository = TempRepository::new();
    repository.commit("a.txt", "One");
    repository.commit("b.txt", "Two");
    assert_eq!(read(&repository.0, 1).unwrap().commits.len(), 1);
}

#[test]
fn counts_files_not_committed() {
    let repository = TempRepository::new();
    repository.commit("a.txt", "One");
    fs::write(repository.0.join("a.txt"), "changed").unwrap();
    fs::write(repository.0.join("new.txt"), "new").unwrap();
    assert_eq!(read(&repository.0, 5).unwrap().uncommitted, 2);
}

#[test]
fn a_repository_with_no_commits_is_not_a_problem() {
    let repository = TempRepository::new();
    let reading = read(&repository.0, 5).unwrap();
    assert!(reading.commits.is_empty());
}

#[test]
fn reading_leaves_the_repository_unchanged() {
    let repository = TempRepository::new();
    repository.commit("a.txt", "One");
    let before = fs::read(repository.0.join(".git").join("index")).unwrap();
    read(&repository.0, 5).unwrap();
    assert_eq!(fs::read(repository.0.join(".git").join("index")).unwrap(), before);
}

#[test]
fn says_when_the_folder_is_missing() {
    let failure = read(Path::new("/no/such/folder/anywhere"), 5).unwrap_err();
    assert_eq!(failure.problem, RepositoryProblem::Missing);
}

#[test]
fn says_when_a_folder_has_no_history() {
    let folder = env::temp_dir().join(format!("phobos-companion-plain-{}", std::process::id()));
    fs::create_dir_all(&folder).unwrap();
    let failure = read(&folder, 5).unwrap_err();
    fs::remove_dir_all(&folder).unwrap();
    assert_eq!(failure.problem, RepositoryProblem::NotARepository);
}
