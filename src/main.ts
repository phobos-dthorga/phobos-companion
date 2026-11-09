import { mount } from "svelte";
import App from "./App.svelte";
import "./app.css";
import { applyTheme } from "./lib/theme/runtime";
import houseDthorga from "../themes/house-dthorga.json";

const target = document.getElementById("app");

if (!target) throw new Error("The application root is missing.");

applyTheme(houseDthorga.colours);
mount(App, { target });
