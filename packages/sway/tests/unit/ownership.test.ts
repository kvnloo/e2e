import { expect,test } from 'vitest';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { processIdentity,ownedDescendant } from '../../src/ownership.ts';
test('kernel ancestry accepts the real child but refuses a forged generation and parent',async()=>{
  const child=spawn(process.execPath,['-e','process.stdin.resume()'],{stdio:['pipe','ignore','ignore']});
  try{await once(child,'spawn');const identity=await processIdentity(child.pid!),root=await processIdentity(process.pid);
    expect(await ownedDescendant(identity,root)).toBe(true);expect(await ownedDescendant({...identity,start:'0'},root)).toBe(false);expect(await ownedDescendant(root,identity)).toBe(false);
  }finally{const exited=once(child,'exit');child.kill('SIGTERM');await exited;}
});
