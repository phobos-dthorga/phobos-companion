---
title: Set up what the pages need
kind: task
go: settings?panel=setup
words: setup, set up, install, missing, programs, git, .NET, dotnet, SDK, ilspycmd, Steam, winget, fetch, download, requirements, needs
see: task-other-programs, page-settings, task-first-steps, term-tool-kit
---
**Settings → Setup lists every program the pages use beyond the Companion, says which are here, and can fetch a missing one for
you.** The Companion brings its own Python and tools; each program here is needed only by the pages it names, and nothing else
stops working without it.

1. Open **Settings** (the **9** key) and the **Setup** tab. Or press **Open Setup** on Home, which shows a line when a program an
   everyday page uses is missing (Steam, say). A page that uses a missing program says so at its top, with **Set it up in
   Settings → Setup** (the Memory page, when the .NET 10 SDK isn't here). git has its own line on every page while it is missing.
2. Missing programs come first, each with what uses it. Press **Fetch** and its name, for example **Fetch Steam…**.
3. **The command is shown whole first: nothing runs yet.** Read it, then press **Run it**, or **Not now**.
4. It runs on its own; the box shows what it printed. **Windows may ask you for an administrator's yes** for some installers.
   **Stop** ends it, though an installer Windows already started may finish by itself.
5. When it finishes, the program is believed only once it is found. If it says it **isn't found yet**, press **Look again**;
   if it still isn't there, close the Companion and open it again.

### When there's no Fetch button
- **"Needs … first":** the command uses another program on the list (ilspycmd needs the .NET 10 SDK). Fetch that one first.
- **No command known:** press **Open its download page**, which opens the program's own page in your browser.
- **"It comes with the Companion's installer":** the tool kit's own programs. Installing the Companion again brings them back.

### Don't need one?
Press **I don't need it**. It moves to **Set aside**, and Home stops naming it. **I need it after all** brings it back.

### How it fetches
- **winget**, Windows' own package manager, fetches git, .NET 10 and Steam from its catalogue and runs their installers.
- **.NET** fetches ilspycmd from NuGet, Microsoft's catalogue of .NET tools, for you alone.
- The command comes from the tool kit, never from what is typed, and only `winget` or `dotnet` may be started.
