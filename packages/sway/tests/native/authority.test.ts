import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {test} from 'node:test';
import {mkdtemp,mkdir,lstat,symlink,rm} from 'node:fs/promises';
import {join} from 'node:path';
const exec=promisify(execFile),binary=process.env.E2E_INPUT_BINARY;
assert(binary?.startsWith('/'),'explicit compiled E2E_INPUT_BINARY is required; this tests the real C helper');
test('atomic publication preserves an existing foreign directory and the owned stage',async()=>{
 const directory=await mkdtemp('/tmp/e2e-authority-');try{const stage=join(directory,'stage'),foreign=join(directory,'foreign');await mkdir(stage,{mode:0o700});await mkdir(foreign,{mode:0o700});const before=await lstat(foreign);await assert.rejects(exec(binary,['publish-root',stage,foreign]),{code:2});const after=await lstat(foreign);assert.equal(after.dev,before.dev);assert.equal(after.ino,before.ino);assert((await lstat(stage)).isDirectory());}finally{await rm(directory,{recursive:true});}
});
test('guest-planted ancestor symlink cannot redirect host publication or directory creation',async()=>{
 const directory=await mkdtemp('/tmp/e2e-authority-');try{const stage=join(directory,'stage'),sentinel=join(directory,'sentinel'),alias=join(directory,'alias');await mkdir(stage,{mode:0o700});await mkdir(sentinel,{mode:0o700});await symlink(sentinel,alias);await assert.rejects(exec(binary,['publish-root',stage,join(alias,'victim')]),{code:2});await assert.rejects(exec(binary,['mkdir-root',join(alias,'victim')]),{code:2});await assert.rejects(lstat(join(sentinel,'victim')),{code:'ENOENT'});}finally{await rm(directory,{recursive:true});}
});
test('a stale target generation cannot enter any namespace or dispatch its program',async()=>{
 const nsenter=process.env.E2E_NSENTER_BINARY;assert(nsenter?.startsWith('/'),'explicit E2E_NSENTER_BINARY is required');await assert.rejects(exec(binary,['enter-ns',String(process.pid),'0',nsenter,'/usr/bin/true']),{code:2});
});
