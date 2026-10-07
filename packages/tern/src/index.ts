import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import {
  ConfigurationError, defineEngine, EngineError, parseKey, resolveExpression,
  type EngineHandle, type EngineInitInfo, type EngineCleanupContext, type OperationContext, type NodeRef, type LocatorAction, type SemanticNode,
} from 'e2e/engine';
import { control, capture } from './control.ts';
import { actionSelector, flatten, semanticTree, type NativeAx, type NativeDump, type NativeElement } from './tree.ts';
import type { TernLease, TernProvider, TernRequest } from './provider.ts';
import { toolCards } from './tsp.ts';
export { toolCards, type TernToolCard } from './tsp.ts';
export { attachedTern } from './provider.ts';
export type { TernInput, TernLease, TernProvider, TernRequest } from './provider.ts';

export interface TernOptions { readonly provider: TernProvider }

/** Semantic native Tern control; capture mode never advertises actions or keyboard input. */
export function ternEngine({ provider }: TernOptions): EngineHandle {
  let info: EngineInitInfo | undefined;
  let request: TernRequest | undefined;
  let lease: TernLease | undefined;
  const native = provider.mode === 'native';
  const requireLease = (): TernLease => {
    if (!lease) throw new EngineError('INVALID_STATE', 'Tern has no active attempt', { retryable: false });
    return lease;
  };
  const end = async (context: EngineCleanupContext): Promise<void> => {
    if (!lease) return;
    const current = lease;
    await provider.release(current, context);
    if (lease === current) lease = undefined;
  };
  const snapshot = async (context: OperationContext) => {
    const current = requireLease();
    if (!native) {
      const counts = new Map<string, number>();
      const nodes: SemanticNode[] = (await capture(current, context)).split('\n').filter(line => line.trim()).map(line => {
        const hash = createHash('sha256').update(line).digest('hex').slice(0, 20);
        const count = (counts.get(hash) ?? 0) + 1;
        counts.set(hash, count);
        return { ref: { id: `text:${hash}:${count}`, revision: '' }, role: 'text', name: line, text: line };
      });
      if (current.recordPath) for (const card of toolCards(await readFile(current.recordPath, 'utf8'))) {
        nodes.push({ ref: { id: `tool:${JSON.stringify([card.surface, card.id])}`, revision: '' }, role: 'group',
          name: card.name, text: `${card.name} ${card.target}`,
          attributes: { target: card.target, surface: card.surface, nativeId: card.id, statusAtAdd: card.statusAtAdd, provenance: 'historical-tool-add' },
          states: { disabled: true },
        });
      }
      return { root: { ref: { id: 'root', revision: '' }, role: 'window', children: nodes }, viewport: { width: 80, height: 24 }, truncated: true, dump: [] as NativeDump[] };
    }
    const state = await control(current, 'state', context);
    const panes = state.panes as { id: number }[] | undefined;
    const focused = state.focused as { id?: number } | undefined;
    // A window-wide tree cannot safely address a sibling pane without a native scope identity.
    if (!Array.isArray(panes) || panes.length !== 1 || String(panes[0]?.id) !== current.pane || String(focused?.id) !== current.pane) {
      throw new EngineError('NOT_ACTIONABLE', 'Native Tern requires its explicitly leased, focused single-pane window', { retryable: false });
    }
    const ax = await control(current, 'a11y', context) as unknown as NativeAx;
    const tree = await control(current, 'tree', context);
    const dumped = await control(current, 'dump *', context);
    const header = dumped.header as { viewport?: { width: number; height: number } } | undefined;
    const viewport = header?.viewport;
    if (!viewport || !Number.isFinite(viewport.width) || !Number.isFinite(viewport.height) || !Array.isArray(tree.tree) || !Array.isArray(dumped.elements)) {
      throw new EngineError('ENGINE_FAILURE', 'Native Tern returned an incomplete semantic snapshot', { retryable: false });
    }
    const dump = dumped.elements as NativeDump[];
    return { root: semanticTree(ax, tree.tree as NativeElement[], dump, viewport), viewport, truncated: false, dump };
  };
  const target = async (id: string, context: OperationContext) => {
    const fresh = await snapshot(context);
    const node = flatten([fresh.root]).find(item => item.ref.id === id);
    if (!node) throw new EngineError('NODE_STALE', 'Native Tern control was replaced', { retryable: true });
    return { node, selector: actionSelector(node, fresh.dump) };
  };
  const sendKey = async (key: string, context: OperationContext): Promise<void> => {
    const current = requireLease();
    await snapshot(context);
    if (current.input) {
      try { await current.input.press(key, context.signal); }
      catch { throw new EngineError('ACTION_MAY_HAVE_COMMITTED', 'Compositor key delivery is uncertain', { retryable: false }); }
      return;
    }
    const parsed = parseKey(key);
    if (!parsed || parsed.modifiers.length) throw new EngineError('UNSUPPORTED_CAPABILITY', 'This native ctl backend has no verified modifier-key delivery; select a compositor keyboard', { retryable: false });
    const name = parsed.key.kind === 'named' ? parsed.key.name : parsed.key.char;
    await control(current, `key ${JSON.stringify(name)}`, context, true);
  };
  const editable = async (context: OperationContext) => {
    const fresh = await snapshot(context);
    const node = flatten([fresh.root]).find(item => item.states?.focused && ['textbox', 'searchbox'].includes(item.role ?? ''));
    if (!node) throw new EngineError('NOT_ACTIONABLE', 'No editable native control has focus', { retryable: false });
    return { node, selector: actionSelector(node, fresh.dump) };
  };
  const type = async (text: string, replace: boolean, context: OperationContext): Promise<void> => {
    const current = requireLease();
    const field = await editable(context);
    if (replace) await control(current, `a11y set-value ${JSON.stringify(field.selector)} ""`, context, true);
    if (current.input) {
      try { await current.input.type(text, context.signal); }
      catch { throw new EngineError('ACTION_MAY_HAVE_COMMITTED', 'Compositor text delivery is uncertain', { retryable: false }); }
    } else await control(current, `type ${JSON.stringify(text)}`, context, true);
  };
  return defineEngine({
    name: 'tern', version: '0.1.0', spiVersion: 1, platform: 'desktop',
    ...(provider.borrowed ? { workers: 1 } : {}),
    validateApp(app, { targetName }) {
      if (!provider.borrowed && !app.appPath) throw new ConfigurationError('INVALID_CONFIG', `target ${targetName} needs app.appPath for its native application`);
    },
    async prepare(context) {
      context.signal.throwIfAborted();
      if (!provider.name || !['native', 'capture'].includes(provider.mode)) throw new ConfigurationError('INVALID_CONFIG', 'Tern provider must declare its name and transport');
    },
    async init(value) { info = value; },
    async startAttempt(context) {
      if (!info) throw new EngineError('INVALID_STATE', 'Tern was not initialized', { retryable: false });
      request = { runId: info.runId, targetName: info.targetName, workerSlot: info.workerSlot, attemptId: context.attemptId,
        projectRoot: info.projectRoot, app: info.app, env: info.env, artifactsDir: context.artifactsDir, signal: context.signal };
      lease = await provider.acquire(request);
      if (lease.mode !== provider.mode) throw new EngineError('ENGINE_FAILURE', 'Tern provider changed its declared transport', { retryable: false });
    },
    async observe(context) {
      const fresh = await snapshot(context);
      return { location: `tern:${requireLease().id}`, root: fresh.root, viewport: fresh.viewport, truncated: fresh.truncated };
    },
    async locate(expression, context) { return resolveExpression(expression, [ (await snapshot(context)).root ]); },
    ...(native ? {
      actions: ['tap', 'doubleTap', 'secondaryTap', 'focus', 'fill', 'clear', 'press', 'swipe', 'scrollIntoView'] as const,
      async perform(ref: NodeRef, action: LocatorAction, context: OperationContext) {
        const current = requireLease();
        if (action.kind === 'press') {
          if (ref.id !== 'root') {
            const hit = await target(ref.id, context);
            await control(current, `a11y focus ${JSON.stringify(hit.selector)}`, context, true);
          }
          await sendKey(action.key, context);
          return;
        }
        if (action.kind === 'swipe') {
          if (ref.id !== 'root') {
            const hit = await target(ref.id, context);
            await control(current, `hover ${JSON.stringify(hit.selector)}`, context, true);
          } else await snapshot(context);
          const delta = action.direction === 'up' || action.direction === 'left' ? 12 : -12;
          const horizontal = action.direction === 'left' || action.direction === 'right';
          await control(current, `wheel ${horizontal ? delta : 0} ${horizontal ? 0 : delta} lines`, context, true);
          return;
        }
        const hit = await target(ref.id, context);
        const selector = JSON.stringify(hit.selector);
        switch (action.kind) {
          case 'tap':
            if (current.input?.tap) {
              const rect = hit.node.rect!;
              try { await current.input.tap(rect.x + rect.width / 2, rect.y + rect.height / 2, context.signal); }
              catch { throw new EngineError('ACTION_MAY_HAVE_COMMITTED', 'Compositor pointer delivery is uncertain', { retryable: false }); }
            } else await control(current, `click ${selector}`, context, true);
            break;
          case 'doubleTap': await control(current, `dblclick ${selector}`, context, true); break;
          case 'secondaryTap': await control(current, `click ${selector} right`, context, true); break;
          case 'focus': await control(current, `a11y focus ${selector}`, context, true); break;
          case 'scrollIntoView': await control(current, `a11y scroll-into-view ${selector}`, context, true); break;
          case 'clear': await control(current, `a11y set-value ${selector} ""`, context, true); break;
          case 'fill':
            await control(current, `a11y focus ${selector}`, context, true);
            await type(action.value, true, context);
            break;
          default: throw new EngineError('UNSUPPORTED_CAPABILITY', 'Native Tern does not support this action', { retryable: false });
        }
      },
      keyboard: {
        async type(text: string, options: { readonly replace: boolean }, context: OperationContext) { await type(text, options.replace, context); },
        async press(key: string, context: OperationContext) { await sendKey(key, context); },
      },
    } : {}),
    ...(native && !provider.borrowed ? { session: {
      async restart(context: OperationContext) {
        if (!request) throw new EngineError('INVALID_STATE', 'Tern has no app to restart', { retryable: false });
        await end(context);
        lease = await provider.acquire({ ...request, signal: context.signal });
      },
    } } : {}),
    endAttempt: end, dispose: end,
    async finish(context) { await provider.sweep?.({ runId: context.runId, targetName: context.targetName, env: context.env }, context); },
  });
}
