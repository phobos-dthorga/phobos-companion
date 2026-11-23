---
title: Rule (for names between data and code)
kind: term
words: rule, found by a rule, translation key, Def, DefOf, data file, jump, key, data object
see: task-code-behind
---
A game's mods are part data files and part code, and each names the other: code asks for a translation key, a Def names the class
that runs it. Nothing in either language says so; it is only text that happens to be a name. So the tool kit keeps, for each game
it knows this about, a short table of **rules**: where such a name is written. "What `.Translate()` is called on is a translation
key" is one of RimWorld's.

A name found this way says **Found by a rule** on its card, and which rule. **A rule reads words, not meaning, so it can be
wrong**: every rule was counted on real mods before it was kept, and one that was wrong more than rarely was left out.

When nothing in the repository has the name, the card says so: it is the game's own, another mod's, or a mistake, such as a key
the code asks for that no English line gives.

RimWorld and Ostranauts have rules. A game without them is read as before.
