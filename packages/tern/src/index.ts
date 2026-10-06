import { execFile } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import {
  defineEngine,
  EngineError,
  resolveExpression,
  type EngineHandle,
  type Key,
  type LocatorAction,
  type SemanticNode,
  type ViewportSize,
} from "e2e/engine";
import { cellAt, scrollKeys, ternCombo } from "./drive.ts";
import { toolCards } from "./tsp.ts";
import { boxOf, hitsOf, semanticTree, type A11yNode, type Box, type ElementNode, type Hit } from "./tree.ts";

const exec = promisify(execFile);

export interface TernOptions {
  /** Program the attempt launches in a new pane. Default: a shell. */
  readonly command?: readonly string[];
  /** Observe this pane instead of launching one. */
  readonly pane?: string;
  /** Optional TSP record. Tool heads come from this file when the control tree is absent. */
  readonly record?: string;
  /** Control socket. Default: `TERN_CONTROL`, else the socket whose state lists the pane. */
  readonly control?: string;
}

interface PaneGrid {
  readonly box: Box;
  readonly cols: number;
  readonly rows: number;
}

async function tern(args: string[]): Promise<string> {
  const result = await exec("tern", args, { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  return result.stdout;
}

async function ctl(socket: string, command: string): Promise<unknown> {
  const stdout = await tern(["ctl", "--control", socket, command]);
  return JSON.parse(stdout) as unknown;
}

function textNodes(capture: string): SemanticNode[] {
  const seen = new Map<string, number>();
  return capture
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const digest = createHash("sha1").update(line).digest("hex").slice(0, 12);
      const n = (seen.get(digest) ?? 0) + 1;
      seen.set(digest, n);
      return {
        ref: { id: n === 1 ? `cap:${digest}` : `cap:${digest}#${n}`, revision: "" },
        role: "status" as const,
        name: line,
        text: line,
      };
    });
}

function recordNodes(record: string): SemanticNode[] {
  return toolCards(record).map((card) => ({
    ref: { id: card.id === "" ? `tool:${card.name}:${card.target}` : `tool:${card.id}`, revision: "" },
    role: "button" as const,
    name: card.name,
    text: card.target,
    ...(card.status === "error" ? { states: { invalid: true } } : {}),
  }));
}

/** One Tern pane. Observe the control tree. Act through the tern CLI. */
export function ternEngine(options: TernOptions = {}): EngineHandle {
  let pane = options.pane;
  let owned = false;
  let socket = options.control ?? process.env.TERN_CONTROL;
  let grid: PaneGrid | undefined;
  let hits = new Map<string, Hit>();

  async function findSocket(id: string): Promise<string | undefined> {
    const candidates = [socket, "/tmp/tern.sock"].filter((item): item is string => Boolean(item));
    try {
      const names = await readdir("/tmp");
      for (const name of names) {
        if (name.startsWith("tern") && name.endsWith(".sock")) candidates.push(`/tmp/${name}`);
      }
    } catch {
      // A missing /tmp is not a reason to fail the observe.
    }
    const tried = new Set<string>();
    for (const candidate of candidates) {
      if (tried.has(candidate)) continue;
      tried.add(candidate);
      try {
        const state = (await ctl(candidate, "state")) as { panes?: { id?: number }[] };
        if ((state.panes ?? []).some((item) => String(item.id) === id)) return candidate;
      } catch {
        continue;
      }
    }
    return undefined;
  }

  async function readControl(id: string, found: string): Promise<{ nodes: SemanticNode[]; viewport: ViewportSize; truncated: boolean }> {
    const [a11yRaw, treeRaw, stateRaw] = await Promise.all([
      ctl(found, "a11y") as Promise<A11yNode>,
      ctl(found, "tree") as Promise<{ tree?: ElementNode[] }>,
      ctl(found, "state") as Promise<{ panes?: { id?: number; cols?: number; rows?: number }[] }>,
    ]);
    const elements = treeRaw.tree ?? [];
    const nodes = semanticTree(a11yRaw, elements);
    const paneState = (stateRaw.panes ?? []).find((item) => String(item.id) === id);
    const paneIndex = (stateRaw.panes ?? []).findIndex((item) => String(item.id) === id);
    const paneBoxes = elements
      .flatMap(function boxes(node: ElementNode): Box[] {
        const box = boxOf(node.rect);
        const own = (node.class ?? "").includes("tn-pane") && box !== undefined ? [box] : [];
        return [...own, ...(node.children ?? []).flatMap(boxes)];
      })
      .filter((box) => box.width > 0)
      .sort((a, b) => a.x - b.x);
    const paneBox = paneBoxes[paneIndex];
    if (paneBox !== undefined && paneState?.cols !== undefined && paneState.rows !== undefined) {
      grid = { box: paneBox, cols: paneState.cols, rows: paneState.rows };
    }
    hits = hitsOf(nodes);
    const windowBox = boxOf(a11yRaw.bounds);
    return {
      nodes,
      viewport: windowBox === undefined ? { width: 80, height: 24 } : { width: windowBox.width, height: windowBox.height },
      truncated: false,
    };
  }

  async function snapshot(): Promise<{ nodes: SemanticNode[]; viewport: ViewportSize; truncated: boolean }> {
    if (!pane) return { nodes: [], viewport: { width: 80, height: 24 }, truncated: false };
    const found = await findSocket(pane);
    if (found !== undefined) {
      socket = found;
      try {
        return await readControl(pane, found);
      } catch {
        // The socket answered state and then failed a later read. Fall back to text.
      }
    }
    const surface = await tern(["capture", "--surfaces", pane]).catch(() => "");
    const scroll = await tern(["capture", "--scrollback", pane]).catch(() => "");
    const record = options.record ? await readFile(options.record, "utf8") : "";
    const nodes = [...recordNodes(record), ...textNodes(`${surface}\n${scroll}`)];
    hits = hitsOf(nodes);
    grid = undefined;
    return { nodes, viewport: { width: 80, height: 24 }, truncated: true };
  }

  function requireHit(id: string): Hit {
    const hit = hits.get(id);
    if (hit === undefined) {
      throw new EngineError("NODE_STALE", `node ${id} is not on the current Tern screen`, { retryable: true });
    }
    return hit;
  }

  async function daemonPane(id: string): Promise<boolean> {
    try {
      await tern(["process", id, "--json"]);
      return true;
    } catch {
      return false;
    }
  }

  async function click(id: string, button: "left" | "right", times: number): Promise<void> {
    if (!pane) throw new EngineError("INVALID_STATE", "tern engine has no pane", { retryable: false });
    const hit = requireHit(id);
    const center = { x: Math.round(hit.rect.x + hit.rect.width / 2), y: Math.round(hit.rect.y + hit.rect.height / 2) };
    if (socket !== undefined && !(await daemonPane(pane))) {
      for (let i = 0; i < times; i += 1) {
        await tern(["ctl", "--control", socket, "click", String(center.x), String(center.y)]);
      }
      return;
    }
    if (grid === undefined) {
      throw new EngineError("UNSUPPORTED_CAPABILITY", "tern control tree has no pane grid, so a tap has no cell", { retryable: false });
    }
    const cell = cellAt(hit.rect, grid.box, grid.cols, grid.rows);
    for (let i = 0; i < times; i += 1) {
      const args = ["send", pane, "mouse", "press", String(cell.col), String(cell.row)];
      if (button === "right") args.push("--button", "right");
      await tern(args);
      await tern(["send", pane, "mouse", "release", String(cell.col), String(cell.row), ...(button === "right" ? ["--button", "right"] : [])]);
    }
  }
  async function useCtl(): Promise<boolean> {
    return socket !== undefined && pane !== undefined && !(await daemonPane(pane));
  }

  async function sendKeys(key: Key): Promise<void> {
    if (!pane) throw new EngineError("INVALID_STATE", "tern engine has no pane", { retryable: false });
    const combo = ternCombo(key);
    if (combo === undefined) {
      throw new EngineError("UNSUPPORTED_CAPABILITY", `tern cannot send key ${key}`, { retryable: false });
    }
    if ((await useCtl()) && socket !== undefined) await tern(["ctl", "--control", socket, "key", combo]);
    else await tern(["send", pane, "keys", combo]);
  }

  async function perform(id: string, action: LocatorAction): Promise<void> {
    if (!pane) throw new EngineError("INVALID_STATE", "tern engine has no pane", { retryable: false });
    if (id !== "root") requireHit(id);
    const headless = await useCtl();
    switch (action.kind) {
      case "tap":
      case "focus":
      case "scrollIntoView":
        await click(id, "left", 1);
        return;
      case "doubleTap":
        await click(id, "left", 2);
        return;
      case "secondaryTap":
        await click(id, "right", 1);
        return;
      case "fill":
        await click(id, "left", 1);
        if (headless && socket !== undefined) await tern(["ctl", "--control", socket, "type", action.value]);
        else await tern(["send", pane, "text", action.value]);
        return;
      case "clear":
        await click(id, "left", 1);
        if (headless && socket !== undefined) {
          await tern(["ctl", "--control", socket, "key", "ctrl+a"]);
          await tern(["ctl", "--control", socket, "key", "backspace"]);
        } else {
          await tern(["send", pane, "keys", "ctrl+a", "backspace"]);
        }
        return;
      case "press":
        await sendKeys(action.key);
        return;
      case "swipe":
        if (headless && socket !== undefined) {
          const lines = action.direction === "up" || action.direction === "left" ? "-12" : "12";
          await tern(["ctl", "--control", socket, "scroll", lines]);
        } else {
          await tern(["send", pane, "keys", scrollKeys(action.direction)]);
        }
        return;
      default:
        throw new EngineError("UNSUPPORTED_CAPABILITY", `tern engine does not perform ${action.kind}`, { retryable: false });
    }
  }

  return defineEngine({
    name: "tern",
    version: "0.2.0",
    spiVersion: 1,
    platform: "desktop",
    actions: ["tap", "doubleTap", "secondaryTap", "focus", "fill", "clear", "press", "swipe", "scrollIntoView"],
    async observe() {
      const snap = await snapshot();
      return {
        location: pane ? `tern:${pane}` : "tern:",
        root: { ref: { id: "root", revision: "" }, role: "window", name: pane ?? "tern", children: snap.nodes },
        viewport: snap.viewport,
        truncated: snap.truncated,
      };
    },
    async locate(expression) {
      return resolveExpression(expression, (await snapshot()).nodes);
    },
    async perform(ref, action) {
      await perform(ref.id, action);
    },
    keyboard: {
      async type(text) {
        if (!pane) throw new EngineError("INVALID_STATE", "tern engine has no pane", { retryable: false });
        if ((await useCtl()) && socket !== undefined) await tern(["ctl", "--control", socket, "type", text]);
        else await tern(["send", pane, "text", text]);
      },
      async press(key) {
        await sendKeys(key);
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
        if (!id) throw new EngineError("ENGINE_FAILURE", "tern new tab returned no pane id", { retryable: false });
        pane = id;
        owned = true;
      },
    },
    async endAttempt() {
      if (owned && pane) await tern(["close", pane]).catch(() => undefined);
      if (!options.pane) pane = undefined;
      owned = false;
      hits = new Map();
      grid = undefined;
    },
  });
}
