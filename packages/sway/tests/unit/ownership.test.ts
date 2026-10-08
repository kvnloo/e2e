import { describe,expect,it } from 'vitest';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp,chmod,symlink,rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { processIdentity,ownedDescendant,stillOwned,ownedDirectory } from '../../src/ownership.ts';
describe.skipIf(process.platform!=='linux')('Linux lease ownership',()=>{
it('kernel ancestry accepts the real child but refuses a forged generation and parent',async()=>{
  const child=spawn(process.execPath,['-e','process.stdin.resume()'],{stdio:['pipe','ignore','ignore']});
  try{await once(child,'spawn');const identity=await processIdentity(child.pid!),root=await processIdentity(process.pid);
    expect(await ownedDescendant(identity,root)).toBe(true);expect(await ownedDescendant({...identity,start:'0'},root)).toBe(false);expect(await ownedDescendant(root,identity)).toBe(false);
    expect(await ownedDescendant(root,root)).toBe(false);
  }finally{const exited=once(child,'exit');child.kill('SIGTERM');await exited;}
});
  it('refuses stale process generations without signaling',async()=>{
    const identity=await processIdentity(process.pid);
    expect(await stillOwned(identity)).toBe(true);
    expect(await stillOwned({...identity,start:'different-generation'})).toBe(false);
  });
  it('refuses public directories and symlink ownership',async()=>{
    const directory=await mkdtemp(join(tmpdir(),'e2e-owned-test-')),link=directory+'-link';
    try{await ownedDirectory(directory);await symlink(directory,link);await expect(ownedDirectory(link)).rejects.toThrow('private and owned');await chmod(directory,0o755);await expect(ownedDirectory(directory)).rejects.toThrow('private and owned');}
    finally{await rm(link,{force:true});await rm(directory,{recursive:true});}
  });
});
