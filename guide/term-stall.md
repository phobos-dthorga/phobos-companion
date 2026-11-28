---
title: Stall
kind: term
words: stall, hitch, stutter, freeze, frame, unbroken stretch
see: page-performance, term-finding, term-ms-a-tick
---
A **stall** is how long one method held the game's main thread without a break: while it ran, nothing else on that thread did, so no frame was drawn. At 60 frames a second a frame is about 17 ms, so a stall of 100 ms is six frames missed, and one of a second or more is a freeze you see.

The [Performance](page-performance) page lists the longest stalls with the mods whose code ran inside each, most first: the one to look at is usually the mod that caused most of it.
