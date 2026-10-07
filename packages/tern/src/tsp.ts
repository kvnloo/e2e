export interface TernToolCard {
  readonly id: string;
  readonly name: string;
  readonly target: string;
  readonly status: string;
}

/** Tool heads Tern draws are `tool` nodes. Cell capture omits them. */
export function toolCards(record: string): TernToolCard[] {
  const found: TernToolCard[] = [];
  for (const line of record.split("\n")) {
    if (!line.startsWith("{")) continue;
    let obj: { body?: { ops?: unknown } };
    try {
      obj = JSON.parse(line) as { body?: { ops?: unknown } };
    } catch {
      continue;
    }
    const ops = obj.body?.ops;
    if (!Array.isArray(ops)) continue;
    for (const op of ops) {
      if (!Array.isArray(op) || op[0] !== "add") continue;
      const node = op[op.length - 1] as { id?: string; k?: string; p?: Record<string, unknown> } | undefined;
      if (!node || node.k !== "tool") continue;
      const props = node.p ?? {};
      found.push({
        id: String(node.id ?? ""),
        name: String(props.name ?? ""),
        target: String(props.target ?? props.title ?? ""),
        status: String(props.status ?? ""),
      });
    }
  }
  return found;
}
