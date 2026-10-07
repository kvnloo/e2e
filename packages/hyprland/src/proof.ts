import { EngineError } from 'e2e/engine';
export interface Monitor { id: number; name: string; width: number; height: number; scale: number; x: number; y: number; activeWorkspace: { id: number; name: string }; specialWorkspace: { id: number }; focused: boolean; disabled: boolean }
export interface Client { address: string; pid: number; monitor: number; workspace: { id: number; name: string }; tags: string[]; size: [number, number]; mapped: boolean; hidden: boolean; xwayland: boolean }
export interface HumanProof { monitors: Array<{ id: number; workspace: number; special: number; focused: boolean; x: number; y: number }>; activeWindow: string; cursor: { x: number; y: number } }
export function humanProof(monitors: readonly Monitor[], active: { address?: string }, cursor: { x: number; y: number }, excludedOutput: string): HumanProof {
  if (!Number.isFinite(cursor.x) || !Number.isFinite(cursor.y)) throw new EngineError('INVALID_STATE', 'Invalid host cursor readback', { retryable: false });
  return { monitors: monitors.filter(m => m.name !== excludedOutput).map(m => ({ id: m.id, workspace: m.activeWorkspace.id, special: m.specialWorkspace.id, focused: m.focused, x: m.x, y: m.y })).sort((a,b) => a.id-b.id), activeWindow: active.address ?? '', cursor: { x: cursor.x, y: cursor.y } };
}
export function unchanged(before: HumanProof, after: HumanProof): void {
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new EngineError('ACTION_MAY_HAVE_COMMITTED', 'Human desktop state changed across the owned operation; do not repeat input or restore focus', { retryable: false });
}
export function ownedClient(client: Client, pid: number, tag: string, output: Monitor, workspace: string, size: { width: number; height: number }): void {
  if (client.pid !== pid || !client.tags.some(t => t === tag || t === `${tag}*`) || client.monitor !== output.id || client.workspace.name !== workspace || !client.mapped || client.hidden || client.xwayland || client.size[0] !== size.width || client.size[1] !== size.height || output.focused) throw new EngineError('NOT_ACTIONABLE', 'Nested client PID/tag/output/workspace/geometry containment did not read back', { retryable: false });
}
