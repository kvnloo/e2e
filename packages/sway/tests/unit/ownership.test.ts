import { describe,expect,it } from 'vitest';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp,chmod,symlink,rm,mkdir,lstat,readFile,writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { processIdentity,ownedDescendant,stillOwned,ownedDirectory } from '../../src/ownership.ts';
import {createHash} from 'node:crypto';
import {sway} from '../../src/index.ts';
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
  it('retains the pending parent receipt and runtime when cleanup authority is unavailable',async()=>{
    const directory=await mkdtemp('/tmp/pe-'),request={runId:'pending',targetName:'consumer',env:{}},root=join(directory,createHash('sha256').update(request.runId).update('\0').update(request.targetName).digest('hex').slice(0,24)),attempt=join(root,'attempt-owned'),input=join(directory,'close-helper');
    try{
      await mkdir(attempt,{recursive:true,mode:0o700});const receipt=join(attempt,'launch-owned.json');await writeFile(receipt,'untrusted-pending',{mode:0o600});const identity=await lstat(attempt);
      await writeFile(join(attempt,'lease.json'),JSON.stringify({version:1,runId:request.runId,targetName:request.targetName,directory:attempt,journalDirectory:attempt,processes:[],parentPending:receipt,runtimeIdentity:{dev:identity.dev,ino:identity.ino}}),{mode:0o600});
      // Only the lifecycle close protocol is substituted; no mocked native UI,
      // successful dispatch or authenticated process identity is claimed.
      await writeFile(input,`#!${process.execPath}\nconst fs=require('node:fs'),path=require('node:path');if(process.argv[2]!=='close')process.exit(2);fs.writeFileSync(path.join(path.dirname(process.argv[3]),'.closing'),'');\n`,{mode:0o700});
      const provider=sway({root:directory,binaries:{sway:process.execPath,swaymsg:process.execPath,tern:process.execPath,grim:process.execPath,input},parent:{runtimeDir:directory,waylandDisplay:'wayland-1',async launch(){throw new Error('Unexpected launch');},async recover(){return undefined;}}});
      await expect(provider.sweep!(request,{signal:new AbortController().signal,timeoutMs:1000})).rejects.toThrow('retain runtime and receipt');
      expect(await readFile(receipt,'utf8')).toBe('untrusted-pending');expect(await readFile(join(attempt,'lease.json'),'utf8')).toContain('parentPending');const remaining=await lstat(attempt);expect([remaining.dev,remaining.ino]).toEqual([identity.dev,identity.ino]);
    }finally{await rm(directory,{recursive:true});}
  });
});
