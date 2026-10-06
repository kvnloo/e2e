import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { defineEngine, resolveExpression, type EngineHandle, type SemanticNode } from "e2e/engine";
import { toolCards, type TernToolCard } from "./tsp.ts";

const exec = promisify(execFile);

export interface TernOptions {
  /** Program the attempt launches in a new pane. Default: a shell. */
  readonly command?: readonly string[];
  /** Observe this pane instead of launching one. */
  readonly pane?: string;
  /** Optional TSP record. Tool heads come from this file, not from cell text. */
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
      role: "status",
      name: line,
      text: line,
    }));
}

function cardNodes(cards: TernToolCard[]): SemanticNode[] {
  return cards.map((card) => ({
    ref: { id: card.id || `${card.name}:${card.target}`, revision: "" },
    role: "status",
    name: card.name,
    text: card.target,
    testId: card.id,
    states: card.status === "error" ? { invalid: true } : undefined,
  }));
}

/** One Tern pane. The runner launches, observes, and types through the tern CLI. */
export function ternEngine(options: TernOptions = {}): EngineHandle {
  let pane = options.pane;
  let owned = false;

  async function snapshot(): Promise<SemanticNode[]> {
    if (!pane) return [];
    const surface = await tern(["capture", "--surfaces", pane]).catch(() => "");
    const scroll = await tern(["capture", "--scrollback", pane]).catch(() => "");
    const capture = `${surface}\n${scroll}`;
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
        location: pane ? `tern:${pane}` : "tern:",
        root: { ref: { id: "root", revision: "" }, role: "window", name: pane ?? "tern", children: await snapshot() },
        viewport: { width: 80, height: 24, scale: 1 },
      };
    },
    async locate(expression) {
      return resolveExpression(expression, await snapshot());
    },
    async perform(_ref, action) {
      if (!pane) throw new Error("tern engine has no pane");
      if (action.kind === "press") {
        await tern(["send", pane, "keys", action.key]);
        return;
      }
      if (action.kind === "fill") {
        await tern(["send", pane, "text", action.value]);
        return;
      }
      throw new Error(`tern engine does not perform ${action.kind}`);
    },
    keyboard: {
      async type(text) {
        if (!pane) throw new Error("tern engine has no pane");
        await tern(["send", pane, "text", text]);
      },
      async press(key) {
        if (!pane) throw new Error("tern engine has no pane");
        await tern(["send", pane, "keys", key]);
      },
    },
    session: {
      async restart() {
        if (options.pane) {
          pane = options.pane;
          return;
        }
        const command = options.command ?? ["zsh"];
        const id = (await tern(["new", "tab", "--keep-open", "--", ...command])).trim().split(/\s+/)[0];
        if (!id) throw new Error("tern new tab returned no pane id");
        pane = id;
        owned = true;
      },
    },
    async endAttempt() {
      if (owned && pane) {
        await tern(["close", pane]).catch(() => undefined);
      }
      if (!options.pane) pane = undefined;
      owned = false;
    },
  });
}
