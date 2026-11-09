"""Every check before a commit, printing only what failed. A thin caller for phobos-modkit's gate; the steps are in
config/gate.json. Exit 0 only when everything passed, so a commit can be chained on it.

    python scripts/check-all.py                 everything
    python scripts/check-all.py --only "web *"  some of it (wildcards * and ?)
    python scripts/check-all.py --list          the steps, without running them
"""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
KIT = ROOT / "external" / "phobos-modkit" / "python"


def main(argv=None):
    if not (KIT / "phobos_modkit").is_dir():
        print("phobos-modkit is missing; fetch it with:  git submodule update --init", file=sys.stderr)
        return 2
    sys.path.insert(0, str(KIT))
    from phobos_modkit.gate.cli import main as gate
    argv = list(sys.argv[1:] if argv is None else argv)
    if "--root" not in argv:
        argv = ["--root", str(ROOT)] + argv
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    return gate(argv)


if __name__ == "__main__":
    sys.exit(main())
