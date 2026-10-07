import { describe, expect, it } from "vitest";

import { cellAt, scrollKeys, ternCombo } from "../src/drive.ts";
import { semanticTree, type A11yNode, type ElementNode } from "../src/tree.ts";

const a11y: A11yNode = {
  id: 0,
  role: "Window",
  name: "Tern",
  bounds: [0, 0, 800, 600],
  children: [
    {
      id: 7,
      role: "Button",
      name: "Run",
      bounds: [10, 20, 80, 24],
    },
    {
      id: 9,
      role: "Region",
      name: "Agent block",
      bounds: [0, 40, 400, 500],
    },
  ],
};

function card(collapsed: boolean): ElementNode {
  return {
    class: `tn-pane${collapsed ? "" : ""}`,
    rect: [0, 40, 400, 500],
    children: [
      {
        class: `sf sf-tool card ${collapsed ? "collapsed" : ""} st-error`,
        rect: [12, 80, 200, 40],
        children: [
          { text: "Bash" },
          { text: "npm test" },
          { text: "exit 1" },
        ],
      },
    ],
  };
}

describe("semantic tree", () => {
  it("keeps a tool id when the card folds and marks the fold as a state", () => {
    const closed = semanticTree(a11y, [card(true)]);
    const open = semanticTree(a11y, [card(false)]);
    const closedCard = closed[1]?.children?.[0];
    const openCard = open[1]?.children?.[0];

    expect(closed[0]).toMatchObject({ role: "button", name: "Run", ref: { id: "a7" } });
    expect(closedCard?.ref.id).toBe("tool:Bash:npm test exit 1");
    expect(closedCard?.ref.id).toBe(openCard?.ref.id);
    expect(closedCard?.states?.expanded).toBe(false);
    expect(openCard?.states?.expanded).toBe(true);
    expect(closedCard?.text).toContain("error");
    expect(closedCard?.role).toBe("button");
  });
});

describe("drive", () => {
  it("maps a box center to a cell and a key to a tern combo", () => {
    expect(cellAt({ x: 10, y: 20, width: 80, height: 24 }, { x: 0, y: 0, width: 800, height: 600 }, 80, 24)).toEqual({
      col: 5,
      row: 1,
    });
    expect(ternCombo("Enter")).toBe("enter");
    expect(ternCombo("Control+a")).toBe("ctrl+a");
    expect(scrollKeys("up")).toBe("pagedown");
  });
});
