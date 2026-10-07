import { createHash, randomUUID } from 'node:crypto';
import { spawn, execFile, type ChildProcess } from 'node:child_process';
import { promisify } from 'node:util';
import { createConnection } from 'node:net';
import { mkdir, mkdtemp, writeFile, readFile, readdir, rename, lstat, rm, rmdir } from 'node:fs/promises';
import { dirname, join, resolve, isAbsolute } from 'node:path';
import { tmpdir } from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';
import { ConfigurationError, EngineError, parseKey, type EngineCleanupContext } from 'e2e/engine';
import type { TernLease, TernProvider, TernRequest } from '@e2e-dev/tern';
import { processIdentity, stillOwned, ownedDirectory, childPids, type ProcessIdentity } from './ownership.ts';
const exec = promisify(execFile);

export interface OwnedWaylandParent {
  readonly runtimeDir: string;
  readonly waylandDisplay: string;
  /** The parent owns silent placement policy; no uncontained direct host spawn. */
  launch(binary: string, args: readonly string[], env: Readonly<Record<string, string>>, identityFile: string, signal: AbortSignal): Promise<ProcessIdentity>;
}
export interface SwayOptions {
  readonly binaries: { readonly sway: string; readonly swaymsg: string; readonly tern: string; readonly grim: string; readonly input: string };
  readonly size?: { readonly width: number; readonly height: number };
  readonly env?: Readonly<Record<string, string>>;
  readonly root?: string;
  readonly parent?: OwnedWaylandParent;
}
export interface SwayDisplay {
  readonly id: string;
  readonly seat: string;
  readonly output: string;
  readonly env: Readonly<Record<string, string>>;
  readonly directory: string;
  readonly nativeClient: ProcessIdentity | undefined;
  tap(x: number, y: number, signal: AbortSignal): Promise<void>;
  spawn(binary: string, args: readonly string[], signal: AbortSignal): Promise<ProcessIdentity>;
  focusClient(pid: number, signal: AbortSignal): Promise<void>;
  type(text: string, signal: AbortSignal): Promise<void>;
  press(key: string, signal: AbortSignal): Promise<void>;
  pointer(x: number, y: number, button: boolean, signal: AbortSignal): Promise<void>;
  capture(signal: AbortSignal): Promise<Buffer>;
  release(context: EngineCleanupContext): Promise<void>;
}
interface LeaseRecord { version: 1; runId: string; targetName: string; directory: string; processes: ProcessIdentity[] }
interface Container { id: number; pid?: number | null; rect: { x: number; y: number; width: number; height: number }; nodes?: Container[]; floating_nodes?: Container[] }
interface Seat { name: string; focus: number }
const keyNames: Readonly<Record<string, string>> = { Enter: 'Return', Escape: 'Escape', Tab: 'Tab', Backspace: 'BackSpace', Delete: 'Delete', Insert: 'Insert', Space: 'space', ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right', Home: 'Home', End: 'End', PageUp: 'Prior', PageDown: 'Next', F1: 'F1', F2: 'F2', F3: 'F3', F4: 'F4', F5: 'F5', F6: 'F6', F7: 'F7', F8: 'F8', F9: 'F9', F10: 'F10', F11: 'F11', F12: 'F12' };
const modifiers: Readonly<Record<string, number>> = { Shift: 1, Control: 2, ControlOrMeta: 2, Alt: 4, Meta: 8 };
const runDirectory = (options: SwayOptions, runId: string, targetName: string): string => join(options.root ?? join(tmpdir(), `e2e-sway-${process.getuid?.()}`), createHash('sha256').update(runId).update('\0').update(targetName).digest('hex').slice(0, 24));

async function stop(identity: ProcessIdentity, context: Pick<EngineCleanupContext, 'signal' | 'timeoutMs'>, binary: string): Promise<void> {
  if (!await stillOwned(identity)) return;
  await exec(binary, ['stop', String(identity.pid), identity.start], { env: { PATH: '/usr/bin:/bin' }, signal: context.signal, timeout: Math.max(1, context.timeoutMs) });
  const deadline = Date.now() + context.timeoutMs;
  while (await stillOwned(identity)) {
    context.signal.throwIfAborted();
    if (Date.now() >= deadline) throw new EngineError('ENGINE_FAILURE', 'Owned native supervisor did not release its descendants', { retryable: false });
    await delay(25, undefined, { signal: context.signal });
  }
}
async function recordedProcesses(directory: string, processes: readonly ProcessIdentity[]): Promise<ProcessIdentity[]> {
  const files = (await readdir(directory)).filter(file => /^process-[a-f0-9-]+\.json$/.test(file));
  const identities = [...processes, ...await Promise.all(files.map(async file => JSON.parse(await readFile(join(directory, file), 'utf8')) as ProcessIdentity))];
  for (const identity of identities) if (!Number.isSafeInteger(identity.pid) || identity.pid <= 0 || !/^\d+$/.test(identity.start)) throw new EngineError('INVALID_STATE', 'Invalid owned process identity', { retryable: false });
  return [...new Map(identities.map(identity => [`${identity.pid}:${identity.start}`, identity])).values()];
}

/** Fresh rootless compositor and input namespace; never discovers a host socket. */
export async function swayDisplay(options: SwayOptions, request: TernRequest): Promise<SwayDisplay> {
  if (process.platform !== 'linux') throw new ConfigurationError('INVALID_CONFIG', 'Sway requires Linux');
  for (const binary of Object.values(options.binaries)) if (!isAbsolute(binary)) throw new ConfigurationError('INVALID_CONFIG', 'Native binaries must be explicit absolute pinned paths');
  const size = options.size ?? { width: 1280, height: 900 };
  if (![size.width, size.height].every(value => Number.isInteger(value) && value >= 320 && value <= 8192)) throw new ConfigurationError('INVALID_CONFIG', 'Invalid isolated display size');
  const root = runDirectory(options, request.runId, request.targetName);
  if (!isAbsolute(root) || Buffer.byteLength(root) > 48) throw new ConfigurationError('INVALID_CONFIG', 'Native lease root exceeds Unix socket path limits');
  await mkdir(dirname(root), { recursive: true, mode: 0o700 });
  await ownedDirectory(dirname(root));
  await mkdir(root, { recursive: true, mode: 0o700 });
  await ownedDirectory(root);
  const directory = await mkdtemp(join(root, 'attempt-'));
  for (const name of ['run', 'home', 'config', 'cache', 'state']) await mkdir(join(directory, name), { mode: 0o700 });
  const seat = `agent-${createHash('sha256').update(directory).digest('hex').slice(0, 12)}`;
  const output = options.parent ? 'WL-1' : 'HEADLESS-1';
  const env: Record<string, string> = { PATH: request.env.PATH ?? '/usr/bin:/bin', LANG: 'C.UTF-8', ...options.env,
    HOME: join(directory, 'home'), XDG_CONFIG_HOME: join(directory, 'config'), XDG_CACHE_HOME: join(directory, 'cache'), XDG_STATE_HOME: join(directory, 'state'), XDG_RUNTIME_DIR: join(directory, 'run'),
    WLR_BACKENDS: options.parent ? 'wayland' : 'headless', WLR_RENDERER: 'pixman', WLR_HEADLESS_OUTPUTS: '1', WLR_WL_OUTPUTS: '1',
    TERN_CONFIG_DIR: join(directory, 'config', 'tern'), SHELL: '/bin/bash' };
  const config = join(directory, 'sway.conf');
  await writeFile(config, `output ${output} mode ${size.width}x${size.height}\noutput ${output} scale 1\ndefault_border none\nxwayland disable\nseat ${seat} fallback true\nseat ${seat} attach "*"\nfocus_follows_mouse yes\n`, { mode: 0o600 });
  const record: LeaseRecord = { version: 1, runId: request.runId, targetName: request.targetName, directory, processes: [] };
  const save = async () => {
    await writeFile(join(directory, 'lease.next'), JSON.stringify(record), { mode: 0o600 });
    await rename(join(directory, 'lease.next'), join(directory, 'lease.json'));
  };
  await save();
  const children: ChildProcess[] = [];
  const launch = async (binary: string, args: readonly string[], signal: AbortSignal): Promise<ProcessIdentity> => {
    signal.throwIfAborted();
    const identityFile = join(directory, `process-${randomUUID()}.json`);
    const child = spawn(options.binaries.input, ['supervise', identityFile, binary, ...args], { env, detached: true, stdio: 'ignore' });
    children.push(child);
    const identity = await new Promise<ProcessIdentity>((accept, reject) => {
      child.once('error', reject);
      child.once('spawn', () => { if (!child.pid) reject(new Error('Native supervisor has no PID')); else processIdentity(child.pid).then(accept, reject); });
    });
    record.processes.push(identity);
    await save();
    return identity;
  };
  let released = false;
  const release = async (context: EngineCleanupContext): Promise<void> => {
    if (released) return;
    for (const identity of (await recordedProcesses(directory, record.processes)).reverse()) await stop(identity, context, options.binaries.input);
    for (const child of children) child.unref();
    await rm(directory, { recursive: true, force: true });
    released = true;
  };
  try {
    if (options.parent) {
      const parentEnv = { ...env, WAYLAND_DISPLAY: join(options.parent.runtimeDir, options.parent.waylandDisplay) };
      const identityFile = join(directory, `process-${randomUUID()}.json`);
      const identity = await options.parent.launch(options.binaries.input, ['supervise', identityFile, options.binaries.sway, '--config', config], parentEnv, identityFile, request.signal);
      record.processes.push(identity); await save();
    } else await launch(options.binaries.sway, ['--config', config], request.signal);
    let socket = '';
    const deadline = Date.now() + 15000;
    while (!socket) {
      request.signal.throwIfAborted();
      if (Date.now() >= deadline) throw new EngineError('ENGINE_FAILURE', 'Isolated Sway IPC did not become ready', { retryable: false });
      const names = await readdir(env.XDG_RUNTIME_DIR!);
      socket = names.find(name => name.startsWith('sway-ipc.') && name.endsWith('.sock')) ?? '';
      if (!socket) await delay(50, undefined, { signal: request.signal });
    }
    env.SWAYSOCK = join(env.XDG_RUNTIME_DIR!, socket);
    const ipc = async <T>(type: string, signal: AbortSignal): Promise<T> => {
      const { stdout } = await exec(options.binaries.swaymsg, ['--socket', env.SWAYSOCK!, '--type', type, '--raw'], { env, signal, timeout: 5000, maxBuffer: 8 * 1024 * 1024 });
      return JSON.parse(stdout) as T;
    };
    const outputs = await ipc<Array<{ name: string; active: boolean }>>('get_outputs', request.signal);
    if (outputs.length !== 1 || outputs[0]?.name !== output || !outputs[0].active) throw new EngineError('NOT_ACTIONABLE', 'Isolated output identity differs from the lease', { retryable: false });
    const seats = await ipc<Seat[]>('get_seats', request.signal);
    if (seats.filter(item => item.name === seat).length !== 1) throw new EngineError('NOT_ACTIONABLE', 'Named isolated input seat is unavailable', { retryable: false });
    const names = await readdir(env.XDG_RUNTIME_DIR!);
    const displays = names.filter(name => /^wayland-\d+$/.test(name));
    if (displays.length !== 1) throw new EngineError('NOT_ACTIONABLE', 'Isolated Wayland socket is not unique', { retryable: false });
    env.WAYLAND_DISPLAY = displays[0]!;
    delete env.WLR_BACKENDS; delete env.WLR_RENDERER; delete env.WLR_HEADLESS_OUTPUTS; delete env.WLR_WL_OUTPUTS;
    delete env.DISPLAY; delete env.DBUS_SESSION_BUS_ADDRESS; delete env.HYPRLAND_INSTANCE_SIGNATURE;
    const inputSocket = join(directory, 'input.sock');
    await launch(options.binaries.input, ['serve', seat, inputSocket], request.signal);
    const inputDeadline = Date.now() + 5000;
    for (;;) {
      try { if ((await lstat(inputSocket)).isSocket()) break; }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
      if (Date.now() >= inputDeadline) throw new EngineError('NOT_ACTIONABLE', 'Persistent named-seat keyboard and pointer capabilities did not become ready', { retryable: false });
      await delay(20, undefined, { signal: request.signal });
    }
    const input = async (header: string, payload: string, signal: AbortSignal): Promise<void> => {
      signal.throwIfAborted();
      await new Promise<void>((accept, reject) => {
        const socket = createConnection({ path: inputSocket });
        const abort = () => socket.destroy(new Error('Native input cancelled'));
        let settled = false;
        const finish = (error?: Error) => {
          if (settled) return;
          settled = true;
          signal.removeEventListener('abort', abort); socket.destroy();
          if (error) reject(error); else accept();
        };
        signal.addEventListener('abort', abort, { once: true });
        socket.setTimeout(10000, () => socket.destroy(new Error('Native input timed out')));
        let reply = '';
        socket.once('connect', () => { socket.write(header); if (payload) socket.write(payload); });
        socket.on('data', data => {
          reply += data.toString();
          if (reply.includes('\n')) {
            finish(reply === 'OK\n' ? undefined : new EngineError('ACTION_MAY_HAVE_COMMITTED', 'Persistent input was not acknowledged', { retryable: false }));
          }
        });
        socket.once('error', () => finish(new EngineError('ACTION_MAY_HAVE_COMMITTED', 'Persistent input transport failed', { retryable: false })));
        socket.once('end', () => finish(new EngineError('ACTION_MAY_HAVE_COMMITTED', 'Persistent input disconnected before acknowledgment', { retryable: false })));
      });
    };
    let client: Container | undefined;
    let clientIdentity: ProcessIdentity | undefined;
    const assertFocus = async (signal: AbortSignal): Promise<void> => {
      if (!client || !clientIdentity || !await stillOwned(clientIdentity) || (await ipc<Seat[]>('get_seats', signal)).find(item => item.name === seat)?.focus !== client.id) throw new EngineError('NOT_ACTIONABLE', 'Named seat does not focus the leased native client generation', { retryable: false });
    };
    const pointer = async (x: number, y: number, button: boolean, signal: AbortSignal): Promise<void> => {
      if (![x, y].every(Number.isFinite) || x < 0 || y < 0 || x >= size.width || y >= size.height) throw new EngineError('NOT_ACTIONABLE', 'Pointer is outside the isolated output', { retryable: false });
      await input(`P ${Math.round(x)} ${Math.round(y)} ${size.width} ${size.height} ${button ? 1 : 0}\n`, '', signal);
    };
    return { id: directory, directory, seat, output, env, spawn: launch, release, pointer,
      get nativeClient() { return clientIdentity; },
      async tap(x, y, signal) { await assertFocus(signal); await pointer(x, y, true, signal); },
      async focusClient(pid, signal) {
        const tree = await ipc<Container>('get_tree', signal);
        const pending = [tree]; const matching: Container[] = [];
        while (pending.length) { const node = pending.pop()!; if (node.pid === pid) matching.push(node); pending.push(...node.nodes ?? [], ...node.floating_nodes ?? []); }
        if (!matching.length) throw new EngineError('NODE_STALE', 'This owned process has no current native client', { retryable: true });
        if (matching.length !== 1) throw new EngineError('NOT_ACTIONABLE', 'Native client identity is not unique in the owned display', { retryable: false });
        client = matching[0]!;
        clientIdentity = await processIdentity(pid);
        const r = client.rect;
        await pointer(r.x + r.width / 2, r.y + r.height / 2, true, signal);
        await assertFocus(signal);
      },
      async type(text, signal) { await assertFocus(signal); await input(`T ${Buffer.byteLength(text)}\n`, text, signal); },
      async press(key, signal) {
        await assertFocus(signal);
        const parsed = parseKey(key);
        if (!parsed) throw new EngineError('UNSUPPORTED_CAPABILITY', 'Invalid native key', { retryable: false });
        const symbol = parsed.key.kind === 'char' ? `U${parsed.key.char.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}` : keyNames[parsed.key.name];
        if (!symbol) throw new EngineError('UNSUPPORTED_CAPABILITY', 'Unknown native key', { retryable: false });
        const mask = parsed.modifiers.reduce((value, name) => value | modifiers[name]!, 0);
        await input(`K ${mask} ${symbol}\n`, '', signal);
      },
      async capture(signal) { const result = await exec(options.binaries.grim, ['-o', output, '-'], { env, signal, timeout: 5000, encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 }); return result.stdout; },
    };
  } catch (error) {
    await release({ signal: AbortSignal.timeout(15000), timeoutMs: 15000 } as EngineCleanupContext);
    throw error;
  }
}

/** Attempt-scoped native Tern, private seat and fresh inert profile. */
export function sway(options: SwayOptions): TernProvider {
  const displays = new Map<string, SwayDisplay>();
  return { name: 'sway', mode: 'native',
    async acquire(request) {
      const display = await swayDisplay(options, request);
      displays.set(display.id, display);
      try {
        const control = join(display.directory, 'control.sock');
        const supervisor = await display.spawn(options.binaries.tern, ['--control', control], request.signal);
        const deadline = Date.now() + 15000;
        let state: { ok: boolean; panes: unknown[]; focused: { id: string } } | undefined;
        while (!state) {
          request.signal.throwIfAborted();
          if (Date.now() >= deadline) throw new EngineError('ENGINE_FAILURE', 'Owned native Tern did not become ready', { retryable: false });
          try { const result = await exec(options.binaries.tern, ['ctl', '--control', control, 'state'], { env: display.env, signal: request.signal, timeout: 1000 }); state = JSON.parse(result.stdout) as typeof state; }
          catch { await delay(50, undefined, { signal: request.signal }); }
        }
        if (!state.ok || state.panes.length !== 1 || !['number', 'string'].includes(typeof state.focused?.id)) throw new EngineError('NOT_ACTIONABLE', 'Owned Tern must expose exactly one native pane', { retryable: false });
        const descendants = await childPids(supervisor.pid);
        for (let index = 0; index < descendants.length; index++) descendants.push(...await childPids(descendants[index]!));
        let focused = false;
        for (const pid of descendants) {
          try { await display.focusClient(pid, request.signal); focused = true; break; }
          catch (error) { if (!(error instanceof EngineError) || error.code !== 'NODE_STALE') throw error; }
        }
        if (!focused) throw new EngineError('NOT_ACTIONABLE', 'Owned Tern native client is not a supervisor child', { retryable: false });
        if (!request.app.appPath) throw new ConfigurationError('INVALID_CONFIG', 'Owned Tern needs app.appPath');
        try {
          const ready = await exec(options.binaries.tern, ['ctl', '--control', control, 'ready'], { env: display.env, signal: request.signal, timeout: 25000 });
          if (!(JSON.parse(ready.stdout) as { ok?: boolean }).ok) throw new Error('Shell not ready');
        } catch { throw new EngineError('ENGINE_FAILURE', 'Owned native shell did not become ready', { retryable: false }); }
        const quote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;
        const command = [resolve(request.projectRoot, request.app.appPath), ...request.app.launchArguments ?? []].map(quote).join(' ');
        try {
          const result = await exec(options.binaries.tern, ['ctl', '--control', control, `run ${JSON.stringify(command)}`], { env: display.env, signal: request.signal, timeout: 25000 });
          if (!(JSON.parse(result.stdout) as { ok?: boolean }).ok) throw new Error('Launch not acknowledged');
        } catch { throw new EngineError('ACTION_MAY_HAVE_COMMITTED', 'Owned app launch did not settle', { retryable: false }); }
        if (!display.nativeClient) throw new EngineError('INVALID_STATE', 'Owned native client identity was not established', { retryable: false });
        await mkdir(request.artifactsDir, { recursive: true, mode: 0o700 });
        await writeFile(join(request.artifactsDir, 'native-client.json'), JSON.stringify({ client: display.nativeClient, seat: display.seat, output: display.output, lease: display.id }), { mode: 0o600 });
        return { id: display.id, pane: String(state.focused.id), mode: 'native', control, binary: options.binaries.tern, env: display.env, client: display.nativeClient, input: { type: display.type, press: display.press, tap: display.tap } } satisfies TernLease;
      } catch (error) { await display.release({ signal: AbortSignal.timeout(15000), timeoutMs: 15000 } as EngineCleanupContext); displays.delete(display.id); throw error; }
    },
    async release(lease, context) { const display = displays.get(lease.id); if (!display) return; await display.release(context); displays.delete(lease.id); },
    async sweep(request, context) {
      const root = runDirectory(options, request.runId, request.targetName);
      let entries: string[];
      try { await ownedDirectory(root); entries = await readdir(root); }
      catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error; }
      for (const name of entries) {
        if (!name.startsWith('attempt-')) continue;
        const directory = join(root, name); await ownedDirectory(directory);
        const record = JSON.parse(await readFile(join(directory, 'lease.json'), 'utf8')) as LeaseRecord;
        if (record.version !== 1 || record.runId !== request.runId || record.targetName !== request.targetName || record.directory !== directory) throw new EngineError('INVALID_STATE', 'Refusing unowned native cleanup record', { retryable: false });
        for (const identity of (await recordedProcesses(directory, record.processes)).reverse()) await stop(identity, context, options.binaries.input);
        await rm(directory, { recursive: true });
      }
      await rmdir(root);
    },
  };
}
