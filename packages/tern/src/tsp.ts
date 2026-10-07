export interface TernToolCard {
  readonly id: string;
  readonly surface: string;
  readonly name: string;
  readonly target: string;
  readonly statusAtAdd: string;
}

/** Historical native tool heads. A terminal cell capture omits these nodes.
 * Only an explicit record is read; add-time status is never called live status. */
export function toolCards(record: string): TernToolCard[] {
  const cards = new Map<string, TernToolCard>();
  for (const line of record.split('\n')) {
    if (!line.startsWith('{')) continue;
    let packet: { body?: { sf?: unknown; ops?: unknown } };
    try { packet = JSON.parse(line) as typeof packet; } catch { continue; }
    if (!Array.isArray(packet.body?.ops)) continue;
    const surface = String(packet.body.sf ?? '');
    for (const operation of packet.body.ops) {
      if (!Array.isArray(operation) || operation[0] !== 'add') continue;
      const node = operation.at(-1) as { id?: unknown; k?: unknown; p?: Record<string, unknown> } | undefined;
      if (!node || node.k !== 'tool' || typeof node.id !== 'string') continue;
      const props = node.p ?? {};
      const id = JSON.stringify([surface, node.id]);
      cards.set(id, { id: node.id, surface,
        name: typeof props.name === 'string' ? props.name : '',
        target: typeof props.target === 'string' ? props.target : typeof props.title === 'string' ? props.title : '',
        statusAtAdd: typeof props.status === 'string' ? props.status : '',
      });
    }
  }
  return [...cards.values()];
}
