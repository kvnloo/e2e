import { expect, test } from "vitest";
import { toolCards } from "../src/tsp.ts";

test("reads native tool heads from a TSP record", () => {
  const record = [
    JSON.stringify({
      body: {
        ops: [
          ["add", "u", "main", null, { id: "u", k: "tool", p: { name: "bash", target: "echo tool-card-ok", status: "done" } }],
          ["add", "v", "main", null, { id: "v", k: "text", p: { text: "tool-card-ok" } }],
        ],
      },
    }),
  ].join("\n");
  expect(toolCards(record)).toEqual([{ id: "u", name: "bash", target: "echo tool-card-ok", status: "done" }]);
});
