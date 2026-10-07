import type { SemanticNode } from "e2e/engine";

export interface A11yNode {
  readonly id?: number;
  readonly role?: string;
  readonly name?: string;
  readonly bounds?: readonly number[];
  readonly children?: readonly A11yNode[];
}

export interface ElementNode {
  readonly tag?: string;
  readonly id?: string;
  readonly class?: string;
  readonly text?: string;
  readonly rect?: readonly number[];
  readonly children?: readonly ElementNode[];
}

export interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface Hit {
  readonly rect: Box;
}

const ROLE: Readonly<Record<string, string>> = {
  Button: "button",
  CheckBox: "checkbox",
  ComboBox: "combobox",
  Link: "link",
  ListBox: "listbox",
  MenuItem: "menuitem",
  RadioButton: "radio",
  SearchField: "searchbox",
  Slider: "slider",
  Switch: "switch",
  Tab: "tab",
  TextBox: "textbox",
  TextField: "textbox",
};

/** A box from a Tern `[x, y, width, height]` list. */
export function boxOf(raw: readonly number[] | undefined): Box | undefined {
  if (!raw || raw.length < 4) return undefined;
  const [x, y, width, height] = raw;
  if (x === undefined || y === undefined || width === undefined || height === undefined) return undefined;
  return { x, y, width, height };
}

function texts(node: ElementNode): string[] {
  const found: string[] = [];
  if (node.text) found.push(node.text);
  for (const child of node.children ?? []) found.push(...texts(child));
  return found;
}

function contains(outer: Box, inner: Box): boolean {
  const cx = inner.x + inner.width / 2;
  const cy = inner.y + inner.height / 2;
  return cx >= outer.x && cx <= outer.x + outer.width && cy >= outer.y && cy <= outer.y + outer.height;
}

/** Tool cards from a `tern ctl tree` payload. The id stays on the card, not its place on screen. */
export function toolNodes(tree: readonly ElementNode[]): SemanticNode[] {
  const cards: SemanticNode[] = [];
  const seen = new Map<string, number>();

  const walk = (node: ElementNode): void => {
    const parts = (node.class ?? "").split(/\s+/).filter(Boolean);
    const head = parts.includes("sf-tool") && !parts.some((part) => part.startsWith("sf-tool-"));
    if (head) {
      const bits = texts(node);
      const title = bits[0] ?? "tool";
      const target = bits.slice(1, 6).join(" ");
      const base = `tool:${title}:${target}`;
      const n = (seen.get(base) ?? 0) + 1;
      seen.set(base, n);
      const rect = boxOf(node.rect);
      const status = parts.includes("st-error") ? "error" : parts.includes("st-done") ? "done" : "";
      const text = [target, status].filter((part) => part !== "").join(" ");
      cards.push({
        ref: { id: n === 1 ? base : `${base}#${n}`, revision: "" },
        role: "button",
        name: title,
        ...(text === "" ? {} : { text }),
        ...(rect === undefined ? {} : { rect }),
        states: {
          expanded: !parts.includes("collapsed"),
        },
        attributes: {
          class: parts.join(" "),
          ...(status === "" ? {} : { status }),
        },
      });
    }
    for (const child of node.children ?? []) walk(child);
  };

  for (const node of tree) walk(node);
  return cards;
}

function a11yNode(node: A11yNode): SemanticNode | undefined {
  const role = node.role === undefined ? undefined : ROLE[node.role];
  const rect = boxOf(node.bounds);
  const children = (node.children ?? []).flatMap((child) => {
    const next = a11yNode(child);
    return next === undefined ? [] : [next];
  });
  const hidden = rect !== undefined && (rect.width <= 0 || rect.height <= 0);
  if (role === undefined && node.name === undefined && children.length === 0) return undefined;
  return {
    ref: { id: `a${node.id ?? "x"}`, revision: "" },
    ...(role === undefined ? {} : { role }),
    ...(node.name === undefined || node.name === "" ? {} : { name: node.name }),
    ...(rect === undefined ? {} : { rect }),
    ...(hidden ? { states: { hidden: true } } : {}),
    ...(children.length === 0 ? {} : { children }),
  };
}

function smallestHost(nodes: readonly SemanticNode[], card: Box): string | undefined {
  let best: { id: string; area: number } | undefined;
  const visit = (node: SemanticNode): void => {
    if (node.rect !== undefined && contains(node.rect, card)) {
      const area = node.rect.width * node.rect.height;
      if (best === undefined || area < best.area) best = { id: node.ref.id, area };
    }
    for (const child of node.children ?? []) visit(child);
  };
  for (const node of nodes) visit(node);
  return best?.id;
}

function insert(nodes: readonly SemanticNode[], host: string, card: SemanticNode): SemanticNode[] {
  return nodes.map((node) => {
    const children = node.children === undefined ? undefined : insert(node.children, host, card);
    if (node.ref.id !== host) return children === node.children ? node : { ...node, children };
    return { ...node, children: [...(children ?? node.children ?? []), card] };
  });
}

/**
 * One screen. Accessibility nodes keep Tern's numeric ids. Tool cards keep
 * a name and target id, so a fold or a badge is a change, not a new node.
 */
export function semanticTree(a11y: A11yNode | undefined, elements: readonly ElementNode[]): SemanticNode[] {
  const cards = toolNodes(elements);
  let nodes = a11y === undefined ? [] : (a11y.children ?? []).flatMap((child) => {
    const next = a11yNode(child);
    return next === undefined ? [] : [next];
  });
  if (nodes.length === 0) return cards;
  const loose: SemanticNode[] = [];
  for (const card of cards) {
    const host = card.rect === undefined ? undefined : smallestHost(nodes, card.rect);
    if (host === undefined) loose.push(card);
    else nodes = insert(nodes, host, card);
  }
  return [...nodes, ...loose];
}

/** Every node id that an action can address, with the box a tap uses. */
export function hitsOf(nodes: readonly SemanticNode[]): Map<string, Hit> {
  const hits = new Map<string, Hit>();
  const visit = (node: SemanticNode): void => {
    if (node.rect !== undefined) hits.set(node.ref.id, { rect: node.rect });
    for (const child of node.children ?? []) visit(child);
  };
  for (const node of nodes) visit(node);
  return hits;
}
