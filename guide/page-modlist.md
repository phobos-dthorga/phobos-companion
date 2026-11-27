---
title: Mod list
kind: page
page: modlist
go: modlist
words: missing mod, rimsort, mod manager, load order, dependencies, requirements, workshop, removed, unsubscribed, incompatible, enable, disable, reorder, sort, sorter, drag, saved list, preset, rml, subscribe, unsubscribe
see: task-fix-mod-list, task-edit-mod-list, task-sort-mod-list, task-saved-lists, task-subscribe-mods, term-load-order-rule, task-add-game, term-last-reading
---
**What is wrong with your game's list of active mods, and why; the list itself, to switch mods on and off and move them; a sorter that explains every move; and saved lists.** RimWorld and Project Zomboid so far; any other game says so. **What's wrong** opens with [its last check](term-last-reading) while it checks again.

Four views, chosen at the top: **What's wrong**, **Edit the list**, **Sort** and **Saved lists**.

### What's wrong
- **After a change:** the first game run after your last change is compared with the run before. New errors show at the top of the list, with what the log points at, **Undo the last change** (asked first) and **Go back to a list that ran clean…**. A clean run is said in a line. New since is not the same as caused by: a save or a mod update can bring errors too.
- **Problems:** a mod switched on but not on this PC, with the likeliest reason (taken off the Workshop by its author, no longer subscribed, a download not finished, a folder gone); a mod another needs that is off or missing; two mods that refuse each other; a mod listed twice.
- **Workshop mods not up to date**, at the top when there are any: mods Steam knows a newer version of, or hasn't finished downloading, read from Steam's own record. Steam usually fetches them once the game closes; **Fetch them again** asks Steam to download them now (not while the game runs).
- **Warnings:** a mod loading in the wrong place; a mod the Workshop no longer has, or Steam no longer updates for you; and a **known problem**: mods on your list that are known to go wrong together, with what goes wrong, what to do and when it was checked (while Known problems is on in [Going online](task-going-online)). A known problem that depends on a mod's setting still shows when you have already changed that setting.
- **Notes:** mods that do not say they work with this game version; those likely to work anyway (a folder for the version, their Workshop page, the community's list, or no errors from them in your last game) share one note. A library several mods carry where an older copy loads first. A continued version of an old or missing mod, from the community's Use This Instead list, with **Subscribe**. And what the check could not see.
- **Clue:** when a missing mod was a patch between two others, the page says if one of them now names the other in its own files, so may do the job itself. A clue, not proof.

**A change offered here waits for your yes on its card.** **Open in Steam** opens a mod's Workshop page in Steam, where you subscribe. **Ask Steam too** (on by default) checks which Workshop items still exist; it takes a few seconds more.

### Edit the list
Two lists side by side, as RimSort lays them out: **Switched off** on the left, by name, and **switched on** on the right, in load order. Each has its own **filter** (by name, id or author). A badge says where each mod comes from: **Workshop**, **Your own folder** or **The game**.

- **Choose** with a click; **Ctrl + click** adds one, **Shift + click** a run; **↑** and **↓** walk a list, **Space** chooses, **Ctrl + A** chooses everything shown.
- **Switch** the chosen mods to the other list with **Enter**, a **double-click**, or **Switch on →** and **← Switch off**. A mod switched on goes just before the first mod that needs it, else last.
- **Move** the chosen mods with **Alt + ↑ ↓** (**Alt + Page Up, Page Down, Home, End** go further), or **To the top**, **Up**, **Down**, **To the bottom**. **Dragging** works too, as a shortcut.
- **Each row says what its own files warn of**, as the list you are making stands: a mod it needs that is off, one it should load after that sits below it, one it should load before that sits above it, one it does not work with, or files not on this PC. Move it and the warning goes.
- **Details of the mod in focus**: its picture, folder, what it needs and loads after or before, **What players say** (its Workshop page: last update, comments that mention problems, the author's latest replies; needs **Workshop pages** on in [Going online](task-going-online)); for **the game itself and each DLC**, **What players say** reads its **Steam reviews** instead (how many recommend it, all time and in the last 30 days; for the game, the newest reviews that do not recommend it first), under the same switch; and **Unsubscribe…** (asked first).
- **Start the game** sits beside Save: it asks Steam to start the game, as pressing Play in its library (or RimSort's Run game). With changes waiting it reads **Save and start**, and saves first; a refused save starts nothing. Steam isn't asked while the game is already running.
- **Nothing is written until you press Save** (**Ctrl + S**). The bar above says what is waiting: how many switched on, switched off and moved. **Undo** (**Ctrl + Z**) takes back one step, **Throw away changes** returns to the list as the game reads it. Save keeps a backup, and waits while the game or another mod manager is open. If the game, a save or RimSort changed the list meanwhile, Save says so and writes nothing.
- **Go back on the last change** puts the list back as it was before the last save (or any change made here).
- Unsaved changes stay while you visit other pages, until the program closes.
- **Add a mod from the Workshop** takes a link or number, subscribes, and chooses the mod on the left once it is here.

### Sort
- **Sort: fewest moves** keeps your order and moves only the mods a rule says are in the wrong place. **Full re-sort** rebuilds the order from the rules and groups, and **keeps your order wherever no rule decides**: no mod moves just for its name.
- Every move a rule asks for shows from where to where, which way, and **whose rule** (your rule, its code, its own files, needs, community, Workshop page). Rules that go round in a loop are named, with the one set aside (Workshop pages give way first).
- **Groups, as in RimSort:** the game's own and its loaders first, then frameworks and "top" mods (each with what it needs first), then the rest, then "bottom" mods. Mods moved only into their group, or only because others moved around them, are **folded below**: open them to see each one, and each group move's reason ("a known framework", or which mod loads after it). **When no rule needs any move, the page says so**: your order already obeys every rule, and a full re-sort would only regroup. **Not now** then comes first, and the other button reads **Use this order anyway**.
- A move counts as **into its group** only when the mod passes a mod of another group; one that only changes places inside its group is put **in order of names**. A group move's reason follows the links back to the framework ("Combat Extended loads after it, and Vehicle Framework after Combat Extended").
- **Nothing is written until you press Use this order.**
- **Your rules**: make one by finding the mods by name; **Take away** removes it. Your RimSort rules are read too, never changed.
- **Bring them over**, under your RimSort rules, copies them into your own, with their notes, so they stay when RimSort goes. RimSort's file isn't changed. Its copy is then no longer read, so no rule counts twice, unless you change it in RimSort again.
- **Community lists**, at the bottom: the four lists the RimWorld community keeps on GitHub that the sorter and What's wrong read (load-order rules, each Workshop item's required mods, mods known to work on a version they don't name, and replacements for old mods). Each says whose copy is read, the Companion's or RimSort's (whichever is newer), and how old it is. The Companion fetches any older than a week when the Mod list opens; **Fetch them now** fetches them all. Both need **Community lists** on in [Going online](task-going-online).

### Saved lists
- **Save the list** keeps it by name; **Save as a file…** writes it as the game's own list file (.rml), to share.
- Lists to load: **Saved by name**, **Kept at each game start** (a copy each time the game starts with a different list), **From your saves** (the mods each save was played with) and **RimSort's history**; or **Open a file…**.
- **Compare** shows what loading would switch on, switch off and move, and which mods are **not on this PC**, with why and **Open in Steam** or **Find on the Workshop**. **Nothing is loaded until you press Use this list.**
- Saves and RimSort's files are only read, never changed.

### Subscribing through Steam
- **Subscribe** beside a missing mod (What's wrong, Saved lists), **Subscribe to all** in Saved lists, and **Subscribe by Workshop link or number** in Edit the list: Steam subscribes at once, and a bar shows the download.
- **Unsubscribe…** in Edit the list asks first, switches the mods off, then Steam deletes their files.
- Steam must be running and signed in; it shows you as playing the game for the few seconds it is asked.

### Every view
- **Every change keeps a backup of the list first.** **Undo the last change** goes back on the latest; press it again for the one before.
- **Changes wait while the game or RimSort is open**, because either would write over them.

On **Edit the list**, **The mod in focus** shows the picture of the mod you last moved to or pressed in either list, as the
game's mod menu shows it, with its authors and the versions it was made for.

Home shows a note when a game's list has problems or warnings.

### Keys
- **3** opens Mod list.
- **R** reads again.
- In a list: **Up**, **Down**, **Page Up**, **Page Down**, **Home**, **End**, **Space** and **Enter**, as above.
