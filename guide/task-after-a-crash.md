---
title: Find out what a crash or power cut did
kind: task
go: home
words: crash, crashed, power cut, blackout, unexpected shutdown, crash dump, dmp, zero, zeros, zeroed, damaged file, corrupt
see: page-home, page-reports
---
**Home tells you by itself.** Open **Home**: a note called **After a crash** shows when there is something to say, and nothing otherwise.

1. **When a program crashed** since you last looked, and Windows kept a crash dump, the note names each program and when. **Why did it crash?** opens the Reports page at the newest dump's answer; **Got it** puts these away until the next crash.
2. **When your PC shut down unexpectedly** (a crash, a power cut, holding the power button), the note looks once, by itself, for files the shutdown left filled with zeros: a file being written at that moment can be left its full size with every byte zero. It takes a couple of minutes, shows a bar, and changes nothing.
3. **If it finds any**, it lists each with what puts it right: git's last commit for a file git keeps, a rebuild for something a build made, a safe copy for the rest.

The look runs only after Windows recorded an unexpected shutdown that no look has covered, reaching back to it, so it never repeats. It reads the repositories on your games list, the tool kit's build folder and this program's own records.

**On another system** than Windows, the crash dumps and the shutdown record are Windows' own, so the note stays quiet. The same questions are on the **Reports** page for every game: **Why did this program crash?**, **Did a crash leave any files filled with zeros?** and **Did my PC shut down unexpectedly since the last look for zero-filled files?**
