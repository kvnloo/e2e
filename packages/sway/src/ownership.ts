import { readFile, lstat, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { EngineError } from 'e2e/engine';

export interface ProcessIdentity { readonly pid: number; readonly start: string }
export async function processIdentity(pid: number): Promise<ProcessIdentity> {
  const text = await readFile(`/proc/${pid}/stat`, 'utf8');
  const fields = text.slice(text.lastIndexOf(')') + 2).split(' ');
  if (!fields[19]) throw new EngineError('ENGINE_FAILURE', 'Cannot establish native process identity', { retryable: false });
  return { pid, start: fields[19] };
}
export async function stillOwned(identity: ProcessIdentity): Promise<boolean> {
  try { return (await processIdentity(identity.pid)).start === identity.start; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT' || (error as NodeJS.ErrnoException).code === 'ESRCH') return false; throw error; }
}
export async function ownedDirectory(path: string): Promise<void> {
  const info = await lstat(path);
  if (!info.isDirectory() || info.uid !== process.getuid?.() || (info.mode & 0o077)) throw new EngineError('INVALID_STATE', 'Native lease directory is not private and owned', { retryable: false });
}
export async function childPids(pid: number): Promise<number[]> {
  const tasks = await readdir(`/proc/${pid}/task`);
  const children = await Promise.all(tasks.map(task => readFile(join('/proc', String(pid), 'task', task, 'children'), 'utf8')));
  return [...new Set(children.flatMap(text => text.trim().split(/\s+/).filter(Boolean).map(Number)))];
}
