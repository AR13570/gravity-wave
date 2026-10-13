// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { it, expect } from "vitest";
it("gives every playground slider a label linked to its input", () => {
  document.body.innerHTML = readFileSync("demo/index.html", "utf8");
  for (const input of document.querySelectorAll<HTMLInputElement>(
    "input[type=range]",
  )) {
    const label = input.closest("label")!;
    expect(label.control, `label for ${input.id}`).toBe(input);
  }
});
