import { describe, expect, it } from 'vitest';
import { mkdtemp, chmod, symlink, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { processIdentity, stillOwned, ownedDirectory } from '../../src/ownership.ts';
describe.skipIf(process.platform !== 'linux')('Linux lease ownership', () => {
  it('refuses stale process generations without signaling', async () => {
    const identity = await processIdentity(process.pid);
    expect(await stillOwned(identity)).toBe(true);
    expect(await stillOwned({ ...identity, start: 'different-generation' })).toBe(false);
  });
  it('refuses public directories and symlink ownership', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'e2e-owned-test-'));
    const link = directory + '-link';
    try {
      await ownedDirectory(directory);
      await symlink(directory, link);
      await expect(ownedDirectory(link)).rejects.toThrow('private and owned');
      await chmod(directory, 0o755);
      await expect(ownedDirectory(directory)).rejects.toThrow('private and owned');
    } finally { await rm(link, { force: true }); await rm(directory, { recursive: true }); }
  });
});
