---
title: Compare a changed picture or sound
kind: task
go: changes
words: picture, texture, dds, sound, audio, image, spectrogram, whine, before and after, flick, diff, png, ogg, wav
see: task-code-behind, page-changes, page-mods, task-see-screenshots
---
1. Open the code behind an entry (**Show the code**), and pick the picture or sound from the file list (**J** and **K** step through
   the files).
2. Its kind and its size before and after come first, with **Save a copy of before** or **after** and **Open before** or **after
   with its own program**. A program is never opened, since that could run it.

### A picture or a texture

- **Side by side**, **Flick between them** (the **Z** key swaps before and after in the same place: the easiest way to spot a thin
  line appearing or vanishing) and **Show what changed** (every changed pixel solid in the accent colour, boxed, the rest dimmed,
  with a count).
- **Fit** shows the whole picture, enlarged by a whole number when it is small so its pixels stay even; **1×**, **2×**, **4×**
  and **8×** draw it at that many times its own pixels, to scroll round (the **=** key steps through them all). **Checks**, **Dark** or **Light** behind
  see-through parts: stray specks hide on the wrong ground.
- In **Show what changed**, **Exact**, **4 levels**, **16 levels** and **64 levels** say how far a pixel may differ before it is
  marked. A picture exported again, or encoded, shifts most pixels a little: **16 levels** leaves what really changed.
- **Mark loose specks and fringes** paints what the edge check finds in the accent colour: crumbs, loose strokes, pale paper left
  round a cut-out and haze, counted beside the picture.
- The view, the zoom, the ground, the tolerance and the marks stay as you left them when you move to the next file, pick or
  screenshot, and the next time you open the Companion, each place keeping its own.
- DDS textures are drawn too: BC1 to BC5 (DXT1 to DXT5) and BC7. Others are named, not drawn.

### A sound

- Each version has its own player. **Z** chooses the other version and **Y** plays or stops the chosen one.
- Each shows its length, its loudness (LUFS), its peak, how strong its highs are above 4 kHz, and any steady whine, then its shape
  and its **spectrogram**: time left to right, pitch upwards, brighter for louder, with lines at 4 kHz and 15 kHz.
- **Play the band near ... kHz alone, moved down** plays the strongest high band moved down to 1 kHz, where nearly every ear hears
  well, at a steady loudness. It is a listening aid, made in the window and never saved.

### Elsewhere

The same views are on the **Mods** page (**Compare** beside a changed picture or sound, and **Compare pictures with their encoded
textures**), on **Changes** for a repository with no changelog (its commits), and on a screenshot (**Compare with the one before**).
