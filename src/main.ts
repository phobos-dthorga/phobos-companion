import { mount } from "svelte";
import App from "./App.svelte";
import "./app.css";
import { applyTheme, rememberedTheme, useTheme } from "./lib/theme/runtime";
import { readCodeColours, readThemes } from "./lib/theme/desktopClient";
import { useCodeColours } from "./lib/code/codeColours";
import houseDthorga from "../themes/house-dthorga.json";
import { loadAgents } from "./lib/agents/state.svelte";
import { loadChat } from "./lib/chat/state.svelte";

const target = document.getElementById("app");

if (!target) throw new Error("The application root is missing.");

// House D'thorga underneath everything, then the theme in use last time, so the window draws in it at once (0.33.0); the host's
// answer then confirms it, or sets the one it holds.
applyTheme(houseDthorga.colours);
const remembered = rememberedTheme();
if (remembered) applyTheme(remembered);
mount(App, { target });
void readThemes().then((answer) => {
  if (answer.state === "ready") useTheme(answer.status.active.colours);
});
// Code colours brought in from a VS Code theme (0.77.0): the theme's own until the host answers.
void readCodeColours().then((answer) => {
  if (answer.state === "ready") useCodeColours(answer.status.active);
});
// Whether features for agent sessions show (0.37.0): hidden, or as last time, until the host answers.
void loadAgents();
// Whether the Chat page shows (0.74.0): hidden, or as last time, until the host answers.
void loadChat();
