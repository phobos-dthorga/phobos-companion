import { FluentBundle, FluentResource } from "@fluent/bundle";
import type { FluentVariable } from "@fluent/bundle";
import catalogue from "../../../locales/en-AU.json";

const bundle = new FluentBundle(catalogue.locale, { useIsolating: false });

for (const [key, pattern] of Object.entries(catalogue.messages)) {
  const problems = bundle.addResource(
    new FluentResource(`${key} = ${pattern}`),
  );
  if (problems.length > 0) throw new Error(`The message ${key} is malformed.`);
}

/** A message from the catalogue. A key the catalogue lacks shows as itself, and a test keeps that from shipping. */
export function t(key: string, args?: Record<string, FluentVariable>): string {
  const message = bundle.getMessage(key);
  return message?.value ? bundle.formatPattern(message.value, args) : key;
}
