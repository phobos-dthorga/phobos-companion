---
title: Finding
kind: term
words: finding, what matters, ranked, risk, performance
see: page-performance, term-stall, term-lock-wait, term-ms-a-tick
---
A **finding** is one sentence about something in a [recording](page-performance) that passed a mark: the game waiting on a lock for 2% of its time or more, one stall of 100 ms or more, a mod causing 5% of ticking, a busy thread that is not the game's own, garbage collection pausing the game, or ten errors logged. A recording shows **at most five, most important first**; one marked as a risk is something to act on.

Each finding names what it is about, and each name is a link: a mod, a method, a type or a log message, to the page that answers what to do about it. Everything a finding says is in a table below it too.
