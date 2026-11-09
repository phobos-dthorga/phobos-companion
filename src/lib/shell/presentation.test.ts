import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { failureWords } from "./presentation";

describe("failure words", () => {
  it("names what happened and what to do for each failure", () => {
    expect(failureWords("python_missing")).toEqual({
      happened: "failure-python-missing",
      next: "failure-python-missing-next",
    });
  });

  it("treats an unknown failure as an unreadable answer", () => {
    expect(failureWords("something_new")).toEqual(failureWords("unreadable"));
  });
});

describe("versions", () => {
  const web = JSON.parse(readFileSync("package.json", "utf-8")).version;

  it("is the same in package.json and Cargo.toml", () => {
    const rust = /^version = "([^"]+)"/m.exec(
      readFileSync("src-tauri/Cargo.toml", "utf-8"),
    )?.[1];
    expect(rust).toBe(web);
  });

  it("is the same in package.json and tauri.conf.json", () => {
    const config = JSON.parse(
      readFileSync("src-tauri/tauri.conf.json", "utf-8"),
    );
    expect(config.version).toBe(web);
  });
});
