import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { defineEngine, type EngineHandle, type SemanticNode } from "e2e/engine";
import { toolCards, type TernToolCard } from "./tsp.ts";

const exec = promisify(execFile);

export interface TernOptions {
  readonly pane: string;
  readonly record?: string;
}

async function tern(args: string[]): Promise<string> {
  const result = await exec("tern", args, { encoding: "utf8" });
  return result.stdout;
}

function textNodes(capture: string): SemanticNode[] {
  return capture
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line, index) => ({
      ref: { id: `line-${index}`, revision: "" },
      role: "text",
      name: line,
      text: line,
    }));
}

function cardNodes(cards: TernToolCard[]): SemanticNode[] {
  return cards.map((card) => ({
    ref: { id: card.id || `${card.name}:${card.target}`, revision: "" },
    role: "tool",
    name: card.name,
    text: card.target,
    testId: card.id,
    states: card.status === "error" ? { invalid: true } : undefined,
  }));
}

/** One Tern pane. Tool heads come from the TSP record, not from cell text. */
export function ternEngine(options: TernOptions): EngineHandle {
  async function snapshot(): Promise<SemanticNode[]> {
    const capture = await tern(["capture", "--surfaces", options.pane]);
    const record = options.record ? await readFile(options.record, "utf8") : "";
    return [...cardNodes(toolCards(record)), ...textNodes(capture)];
  }
  return defineEngine({
    name: "tern",
    version: "0.0.1",
    spiVersion: 1,
    platform: "desktop",
    actions: ["press", "fill"],
    async observe() {
      return {
        location: `tern:${options.pane}`,
        root: { ref: { id: "root", revision: "" }, role: "window", name: options.pane, children: await snapshot() },
        viewport: { width: 80, height: 24, scale: 1 },
      };
    },
    async locate(expression) {
      const nodes = await snapshot();
      const name = "name" in expression ? expression.name : undefined;
      const role = "role" in expression ? expression.role : undefined;
      return nodes.filter((node) => {
        if (role && node.role !== role) return false;
        if (typeof name === "string" && node.name !== name && node.text !== name) return false;
        return true;
      });
    },
    async perform(ref, action) {
      if (action.kind === "press") {
        await tern(["send", options.pane, "keys", action.key]);
        return;
      }
      if (action.kind === "fill") {
        await tern(["send", options.pane, "text", action.value]);
        return;
      }
      throw new Error(`tern engine does not perform ${action.kind} on ${ref.id}`);
    },
    keyboard: {
      async type(text) {
        await tern(["send", options.pane, "text", text]);
      },
      async press(key) {
        await tern(["send", options.pane, "keys", key]);
      },
    },
  });
}
