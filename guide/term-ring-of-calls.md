---
title: Ring of calls
kind: term
words: ring, loop, recursion, calls round, ring made, ring cut
see: task-code-behind
---
Methods that call each other round in a loop: A calls B, B calls C, and C calls A again. The loop can pass through the game's own
code, when one of our methods hands on to the game's and the game's calls one of ours back.

A ring is not always a fault: a loop that stops itself, as a walk down a tree does, is fine. One that never stops runs until the
game runs out of room and closes. So the code viewer only says when a commit **made** a ring or **cut** one, draws it, and leaves
the judgement to you. C# only.
