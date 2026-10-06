import { parseKey, type Key, type ParsedKey } from "e2e/engine";

import type { Box } from "./tree.ts";

export interface Cell {
  readonly col: number;
  readonly row: number;
}

const NAMED: Readonly<Record<string, string>> = {
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  Backspace: "backspace",
  Delete: "delete",
  End: "end",
  Enter: "enter",
  Escape: "escape",
  Home: "home",
  Insert: "insert",
  PageDown: "pagedown",
  PageUp: "pageup",
  Space: "space",
  Tab: "tab",
};

/** The cell under the center of `rect`, inside a pane of `cols` by `rows`. */
export function cellAt(rect: Box, pane: Box, cols: number, rows: number): Cell {
  const width = pane.width / Math.max(1, cols);
  const height = pane.height / Math.max(1, rows);
  const col = Math.min(cols - 1, Math.max(0, Math.floor((rect.x + rect.width / 2 - pane.x) / width)));
  const row = Math.min(rows - 1, Math.max(0, Math.floor((rect.y + rect.height / 2 - pane.y) / height)));
  return { col, row };
}

/** A `press` key as `tern send` spells a combo. */
export function ternCombo(key: Key): string | undefined {
  const parsed = parseKey(key);
  if (parsed === undefined) return undefined;
  return comboOf(parsed);
}

function comboOf(parsed: ParsedKey): string {
  const mods = parsed.modifiers.map((mod) => (mod === "Control" || mod === "ControlOrMeta" ? "ctrl" : mod === "Alt" ? "alt" : mod === "Shift" ? "shift" : "super"));
  const name = parsed.key.kind === "char" ? parsed.key.char : (NAMED[parsed.key.name] ?? parsed.key.name.toLowerCase());
  return [...mods, name].join("+");
}

/** Keys that scroll the focused pane. A finger moving up reveals what is below. */
export function scrollKeys(direction: "up" | "down" | "left" | "right"): string {
  if (direction === "up") return "pagedown";
  if (direction === "down") return "pageup";
  if (direction === "left") return "right";
  return "left";
}
