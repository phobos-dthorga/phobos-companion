---
title: A check, and its figures
kind: term
words: check, checks, rule, rules, fault, worth a look, checks.json, figure, figures, save check, live check
see: task-check-saves, term-seen-working, term-snapshot
---
**A check is a rule a repository keeps about its game's state**: "a vehicle's oil stays between empty and full", "no part's health is below nothing". It lives in the repository's `config/checks.json`, written as plain data, so it can never run anything.

- **A fault** is a state the design says can never happen. **Worth a look** is a state that may be fine but usually isn't.
- **A save check** reads your saves, from a copy. The Companion runs them on your newest save by itself (see [find out whether my game is in a state it should never be](task-check-saves)).
- **A live check** reads the running game's memory, from a [snapshot](term-snapshot) you take on the Explorer page. It is never run by itself.
- **A check can note figures** too: numbers it reads from each thing, such as a part's health. Those figures go to the Tests page, where each row says what they should be. A figure that matches marks the row [seen working](term-seen-working); it never passes it.

A finding, and a figure, are things to look at: a rule can be wrong, and a save holds one moment. **Only your verdict passes a test row.**
